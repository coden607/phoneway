"use client"

import { useSyncExternalStore } from "react"
import { Bluetooth } from "lucide-react"
import { Button } from "@/components/ui/button"
import { isStale } from "@/lib/ble-vitals"
import { useBluetoothVitals } from "@/lib/hooks/use-bluetooth-vitals"

const subscribeClock = (onTick: () => void) => {
  const id = window.setInterval(onTick, 1000)
  return () => window.clearInterval(id)
}
const readClock = () => Math.floor(Date.now() / 1000) * 1000

function Reading({ label, value, unit, at, now }: { label: string; value?: number; unit: string; at?: number; now: number }) {
  const stale = isStale(at, now)
  return (
    <div className="rounded-lg border p-3">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="text-2xl font-bold" aria-live="polite">
        {value === undefined ? "—" : stale ? <span className="text-muted-foreground">{value}{unit} <span className="text-sm font-normal">(not current)</span></span> : `${value}${unit}`}
      </p>
    </div>
  )
}

export function BluetoothVitals() {
  const { supported, status, deviceName, message, vitals, connect, disconnect } = useBluetoothVitals()
  const now = useSyncExternalStore(subscribeClock, readClock, () => 0)

  return (
    <section className="space-y-3 text-left" aria-labelledby="ble-vitals-heading" data-testid="bluetooth-vitals">
      <h4 id="ble-vitals-heading" className="font-semibold flex items-center gap-2">
        <Bluetooth className="w-4 h-4" aria-hidden="true" /> Use your own Bluetooth device
      </h4>
      {!supported ? (
        <p className="text-sm text-muted-foreground">
          This browser cannot connect to Bluetooth health devices. Chrome or Edge on Android, Windows, macOS or ChromeOS can; iPhone browsers cannot.
        </p>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">
            Connect a standard heart-rate strap, watch in heart-rate broadcast mode, or Bluetooth pulse oximeter to see its readings here. Readings stay on this device.
          </p>
          {status === "connected" ? (
            <>
              <p className="text-sm" role="status">Connected to {deviceName}.</p>
              <div className="grid grid-cols-2 gap-3">
                <Reading label="Heart rate" value={vitals.heartRate} unit=" bpm" at={vitals.heartRateAt} now={now} />
                <Reading label="Blood oxygen (SpO2)" value={vitals.spO2} unit="%" at={vitals.spO2At} now={now} />
              </div>
              <Button variant="outline" onClick={disconnect}>Disconnect</Button>
            </>
          ) : (
            <Button onClick={connect} disabled={status === "connecting"}>
              {status === "connecting" ? "Connecting…" : "Connect a Bluetooth device"}
            </Button>
          )}
          {message && <p className="text-sm text-muted-foreground" role="status">{message}</p>}
        </>
      )}
      <p className="text-xs text-muted-foreground">
        Consumer devices are not validated for medical use, and NarcoGuard does not use these readings to detect overdoses or alert anyone.
      </p>
    </section>
  )
}
