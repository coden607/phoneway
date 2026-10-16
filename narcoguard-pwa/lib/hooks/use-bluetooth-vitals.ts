"use client"

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react"
import {
  HEART_RATE_MEASUREMENT,
  HEART_RATE_SERVICE,
  PLX_CONTINUOUS,
  PLX_SPOT_CHECK,
  PULSE_OXIMETER_SERVICE,
  parseHeartRateMeasurement,
  parsePlxMeasurement,
} from "@/lib/ble-vitals"

// Minimal Web Bluetooth surface used here (the API is not in TypeScript's DOM library).
interface BleCharacteristic extends EventTarget {
  value?: DataView
  startNotifications(): Promise<BleCharacteristic>
  stopNotifications(): Promise<BleCharacteristic>
}
interface BleService { getCharacteristic(uuid: number): Promise<BleCharacteristic> }
interface BleServer { connected: boolean; getPrimaryService(uuid: number): Promise<BleService>; disconnect(): void }
interface BleDevice extends EventTarget { name?: string; gatt?: { connect(): Promise<BleServer> } }
interface BleNavigator { bluetooth?: { requestDevice(options: unknown): Promise<BleDevice> } }

const noSubscription = () => () => undefined

export type BluetoothStatus = "unsupported" | "idle" | "connecting" | "connected" | "disconnected" | "error"

export interface BluetoothVitals {
  heartRate?: number
  heartRateAt?: number
  spO2?: number
  spO2At?: number
}

/** Live readings from a standard Bluetooth heart-rate or pulse-oximeter device. Kept in memory only. */
export function useBluetoothVitals() {
  const [status, setStatus] = useState<BluetoothStatus>("idle")
  const [deviceName, setDeviceName] = useState<string>()
  const [message, setMessage] = useState<string>()
  const [vitals, setVitals] = useState<BluetoothVitals>({})
  const serverRef = useRef<BleServer | null>(null)
  const manualDisconnectRef = useRef(false)
  // Server render and hydration assume no support; the client value follows without a mismatch.
  const supported = useSyncExternalStore(noSubscription, () => !!(navigator as BleNavigator).bluetooth, () => false)

  const disconnect = useCallback(() => {
    manualDisconnectRef.current = true
    serverRef.current?.disconnect()
    serverRef.current = null
  }, [])

  useEffect(() => disconnect, [disconnect])

  const subscribe = async (server: BleServer, service: number, characteristic: number, onValue: (view: DataView) => void) => {
    try {
      const char = await (await server.getPrimaryService(service)).getCharacteristic(characteristic)
      char.addEventListener("characteristicvaluechanged", () => { if (char.value) onValue(char.value) })
      await char.startNotifications()
      return true
    } catch {
      return false
    }
  }

  const connect = useCallback(async () => {
    const bluetooth = (navigator as BleNavigator).bluetooth
    if (!bluetooth) { setStatus("unsupported"); return }
    setStatus("connecting")
    setMessage(undefined)
    try {
      const device = await bluetooth.requestDevice({
        filters: [{ services: [HEART_RATE_SERVICE] }, { services: [PULSE_OXIMETER_SERVICE] }],
        optionalServices: [HEART_RATE_SERVICE, PULSE_OXIMETER_SERVICE],
      })
      device.addEventListener("gattserverdisconnected", () => {
        serverRef.current = null
        setStatus("disconnected")
        setVitals({})
        setMessage(manualDisconnectRef.current ? "Disconnected." : "The device disconnected. Readings stopped.")
        manualDisconnectRef.current = false
      })
      const server = await device.gatt?.connect()
      if (!server) throw new Error("no-gatt")
      serverRef.current = server
      setDeviceName(device.name || "Bluetooth device")
      const results = await Promise.all([
        subscribe(server, HEART_RATE_SERVICE, HEART_RATE_MEASUREMENT, (value) => {
          const reading = parseHeartRateMeasurement(value)
          if (reading) setVitals((prev) => ({ ...prev, heartRate: reading.heartRate, heartRateAt: Date.now() }))
        }),
        subscribe(server, PULSE_OXIMETER_SERVICE, PLX_CONTINUOUS, (value) => {
          const reading = parsePlxMeasurement(value)
          if (reading) setVitals((prev) => ({ ...prev, spO2: reading.spO2, spO2At: Date.now() }))
        }),
        subscribe(server, PULSE_OXIMETER_SERVICE, PLX_SPOT_CHECK, (value) => {
          const reading = parsePlxMeasurement(value)
          if (reading) setVitals((prev) => ({ ...prev, spO2: reading.spO2, spO2At: Date.now() }))
        }),
      ])
      if (!results.some(Boolean)) {
        disconnect()
        setStatus("error")
        setMessage("This device does not share standard heart-rate or blood-oxygen readings.")
        return
      }
      setStatus("connected")
    } catch (error) {
      const name = error instanceof Error ? error.name : ""
      // NotFoundError: the person closed the chooser without picking a device.
      setStatus(name === "NotFoundError" ? "idle" : "error")
      setMessage(
        name === "NotFoundError" ? undefined
          : name === "SecurityError" || name === "NotAllowedError" ? "Bluetooth permission was denied."
            : "Could not connect to the device. Make sure it is on, nearby and not connected to another app.",
      )
    }
  }, [disconnect])

  return { supported, status: supported ? status : "unsupported", deviceName, message, vitals, connect, disconnect }
}
