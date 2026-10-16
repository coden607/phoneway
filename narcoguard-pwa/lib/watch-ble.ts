// Phone side of the NG owner-lock Bluetooth protocol (GATT service NG_SERVICE_UUID).
//
// Characteristics (UTF-8 JSON, each value under the 512-byte GATT attribute limit):
// - state (read):            { serial, state: "unbound" | "active" | "locked", nonce, certificate }
//                            nonce is the watch's current random unlock challenge; it changes after every grant.
// - challenge (write, read): the phone writes a registry challenge nonce; reading back gives { signature },
//                            the secure element's signature proving the watch is genuine.
// - grant (write):           { binding } to store a new owner record, or { grant } to unlock.
//
// The flow below is transport-agnostic so it can be tested against a simulated watch.

import type { LockState } from "@/lib/watch-ownership"
import { NG_CHALLENGE_CHARACTERISTIC, NG_GRANT_CHARACTERISTIC, NG_SERVICE_UUID, NG_STATE_CHARACTERISTIC, isValidSerial } from "@/lib/watch-ownership"

export const MAX_GATT_VALUE = 512

export interface WatchState { serial: string; state: LockState; nonce: string; certificate: string }

export interface WatchLink {
  readState(): Promise<string>
  signChallenge(nonce: string): Promise<string>
  writeGrant(value: string): Promise<void>
  disconnect(): void
}

export interface RegistryApi {
  post<T>(url: string, body: unknown): Promise<{ ok: boolean; data: T & { error?: string } }>
}

export function parseWatchState(text: string): WatchState | null {
  try {
    const value = JSON.parse(text) as Partial<WatchState>
    if (!isValidSerial(value.serial) || !["unbound", "active", "locked"].includes(value.state as string)) return null
    if (typeof value.nonce !== "string" || typeof value.certificate !== "string") return null
    return value as WatchState
  } catch {
    return null
  }
}

export type PairStep = "reading" | "registering" | "unlocking" | "done"
export type PairResult = { ok: true; watch: WatchState; registered: boolean } | { ok: false; error: string; watch?: WatchState }

async function read(link: WatchLink) {
  return parseWatchState(await link.readState())
}

async function write(link: WatchLink, value: Record<string, string>) {
  const text = JSON.stringify(value)
  if (new TextEncoder().encode(text).length > MAX_GATT_VALUE) throw new Error("Value too large for the watch.")
  await link.writeGrant(text)
}

/** Registers the watch if it is new, then unlocks it for the signed-in owner. */
export async function pairAndUnlock(link: WatchLink, api: RegistryApi, onStep: (step: PairStep) => void = () => undefined): Promise<PairResult> {
  onStep("reading")
  let watch = await read(link)
  if (!watch) return { ok: false, error: "This device did not answer like a NarcoGuard watch." }
  let registered = false

  if (watch.state === "unbound") {
    onStep("registering")
    const start = await api.post<{ challengeToken?: string; nonce?: string }>("/api/watch/register", { step: "challenge" })
    if (!start.ok || !start.data.challengeToken || !start.data.nonce) return { ok: false, error: start.data.error ?? "Registration could not start.", watch }
    let signature: string
    try {
      signature = (JSON.parse(await link.signChallenge(start.data.nonce)) as { signature?: string }).signature ?? ""
    } catch {
      return { ok: false, error: "The watch did not sign the challenge.", watch }
    }
    const done = await api.post<{ bindingToken?: string }>("/api/watch/register", { challengeToken: start.data.challengeToken, certificate: watch.certificate, signature })
    if (!done.ok || !done.data.bindingToken) return { ok: false, error: done.data.error ?? "Registration failed.", watch }
    await write(link, { binding: done.data.bindingToken })
    registered = true
    watch = await read(link)
    if (!watch) return { ok: false, error: "The watch stopped answering." }
  }

  onStep("unlocking")
  const grant = await api.post<{ grant?: string }>("/api/watch/grant", { serial: watch.serial, nonce: watch.nonce })
  if (!grant.ok || !grant.data.grant) return { ok: false, error: grant.data.error ?? "Unlock was refused.", watch }
  await write(link, { grant: grant.data.grant })
  const after = await read(link)
  if (!after) return { ok: false, error: "The watch stopped answering." }
  onStep("done")
  return after.state === "active" ? { ok: true, watch: after, registered } : { ok: false, error: "The watch did not accept the unlock proof.", watch: after }
}

// Web Bluetooth transport (the API is not in TypeScript's DOM library).
interface GattCharacteristic { readValue(): Promise<DataView>; writeValueWithResponse(value: BufferSource): Promise<void> }
interface GattService { getCharacteristic(uuid: string): Promise<GattCharacteristic> }
interface GattServer { getPrimaryService(uuid: string): Promise<GattService>; disconnect(): void }
interface GattDevice { gatt?: { connect(): Promise<GattServer> } }
interface BluetoothNavigator { bluetooth?: { requestDevice(options: unknown): Promise<GattDevice> } }

export const hasWebBluetooth = () => typeof navigator !== "undefined" && Boolean((navigator as BluetoothNavigator).bluetooth)

/** Opens the browser's device chooser filtered to NarcoGuard watches. Must run from a tap. */
export async function connectWatch(): Promise<WatchLink> {
  const bluetooth = (navigator as BluetoothNavigator).bluetooth
  if (!bluetooth) throw new Error("This browser has no Web Bluetooth. Use Chrome or Edge on Android, Windows, macOS or ChromeOS.")
  const device = await bluetooth.requestDevice({ filters: [{ services: [NG_SERVICE_UUID] }] })
  if (!device.gatt) throw new Error("The watch did not offer a connection.")
  const server = await device.gatt.connect()
  const service = await server.getPrimaryService(NG_SERVICE_UUID)
  const [state, challenge, grant] = await Promise.all([
    service.getCharacteristic(NG_STATE_CHARACTERISTIC),
    service.getCharacteristic(NG_CHALLENGE_CHARACTERISTIC),
    service.getCharacteristic(NG_GRANT_CHARACTERISTIC),
  ])
  const decode = (view: DataView) => new TextDecoder().decode(view)
  return {
    readState: async () => decode(await state.readValue()),
    signChallenge: async (nonce) => {
      await challenge.writeValueWithResponse(new TextEncoder().encode(nonce))
      return decode(await challenge.readValue())
    },
    writeGrant: (value) => grant.writeValueWithResponse(new TextEncoder().encode(value)),
    disconnect: () => server.disconnect(),
  }
}
