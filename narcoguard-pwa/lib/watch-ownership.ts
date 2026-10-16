// NG owner lock ("activation lock"). The watch works fully only for the person it was registered to;
// a sold, traded or stolen watch keeps its life-safety functions but nothing else.
//
// Roles and keys (ECDSA P-256, SHA-256):
// - Device key: generated inside the watch's secure element (ST54K eSE) and never exported.
// - Registry key: held by NarcoGuard's server; its public half is built into the firmware.
// Records, each signed by the registry and checked on the watch:
// - DeviceCertificate: this serial owns this device public key (issued at manufacture).
// - OwnerBinding: this serial belongs to this owner (a salted hash of the account id), with a
//   generation number the secure element only lets go up, so old bindings cannot be replayed.
// - ActivationGrant: short-lived proof, issued only to the signed-in owner, answering the watch's
//   random challenge. The watch unlocks connected features only with a valid grant.
// Factory reset does not clear the binding, which lives in the secure element.

export const NG_SERVICE_UUID = "8e0c0001-4e47-4c4b-a0d1-6e6172636f67"
export const NG_CHALLENGE_CHARACTERISTIC = "8e0c0002-4e47-4c4b-a0d1-6e6172636f67"
export const NG_GRANT_CHARACTERISTIC = "8e0c0003-4e47-4c4b-a0d1-6e6172636f67"
export const NG_STATE_CHARACTERISTIC = "8e0c0004-4e47-4c4b-a0d1-6e6172636f67"

export const GRANT_TTL_MS = 5 * 60 * 1000

export type DeviceCertificate = { k: "device"; v: 1; serial: string; devicePublicKey: JsonWebKey; issuedAt: number }
export type OwnerBinding = { k: "binding"; v: 1; serial: string; owner: string; generation: number; boundAt: number }
export type ActivationGrant = { k: "grant"; v: 1; serial: string; owner: string; generation: number; nonce: string; expiresAt: number }
export type TransferRelease = { k: "release"; v: 1; serial: string; generation: number; reason: TransferReason; releasedAt: number }
/** Server-issued challenge the watch signs during registration, proving the phone holds the watch now. */
export type RegistrationChallenge = { k: "challenge"; v: 1; nonce: string; expiresAt: number }
type SignedRecord = DeviceCertificate | OwnerBinding | ActivationGrant | TransferRelease | RegistrationChallenge

/** The only reasons NarcoGuard support releases a binding. A sale or trade is not one of them. */
export const TRANSFER_REASONS = ["warranty-replacement", "recovered-after-theft", "owner-deceased-estate", "returned-to-program"] as const
export type TransferReason = (typeof TRANSFER_REASONS)[number]

export type LockState = "unbound" | "active" | "locked"

/** Functions that work in every state, including on a sold or stolen watch. Never gate these. */
export const SAFETY_FUNCTIONS = ["sos-button", "emergency-call", "overdose-steps-on-screen", "local-alarm"] as const
export const CONNECTED_FUNCTIONS = ["vitals-monitoring", "contact-alerts", "hero-alerts", "cellular-data", "app-sync"] as const
export type WatchFunction = (typeof SAFETY_FUNCTIONS)[number] | (typeof CONNECTED_FUNCTIONS)[number] | "owner-setup"

export function allowedFunctions(state: LockState): WatchFunction[] {
  if (state === "active") return [...SAFETY_FUNCTIONS, ...CONNECTED_FUNCTIONS]
  if (state === "unbound") return [...SAFETY_FUNCTIONS, "owner-setup"]
  return [...SAFETY_FUNCTIONS]
}

const subtle = () => globalThis.crypto.subtle
const ALGORITHM = { name: "ECDSA", namedCurve: "P-256" } as const
const SIGN = { name: "ECDSA", hash: "SHA-256" } as const

const toB64 = (bytes: ArrayBuffer | Uint8Array) => {
  const array = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes)
  let binary = ""
  for (const byte of array) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")
}
const fromB64 = (text: string) => Uint8Array.from(atob(text.replace(/-/g, "+").replace(/_/g, "/")), (char) => char.charCodeAt(0))

/** Stable JSON with sorted keys, so the signed bytes never depend on property order. */
export function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`
  if (value && typeof value === "object") {
    return `{${Object.keys(value as object).sort().map((key) => `${JSON.stringify(key)}:${canonical((value as { [k: string]: unknown })[key])}`).join(",")}}`
  }
  return JSON.stringify(value)
}

export async function generateKeyPair() {
  return subtle().generateKey(ALGORITHM, true, ["sign", "verify"]) as Promise<CryptoKeyPair>
}

export async function importPublicKey(jwk: JsonWebKey) {
  return subtle().importKey("jwk", jwk, ALGORITHM, true, ["verify"])
}

export async function importPrivateKey(jwk: JsonWebKey) {
  return subtle().importKey("jwk", jwk, ALGORITHM, false, ["sign"])
}

export async function signRecord(record: SignedRecord, privateKey: CryptoKey) {
  const body = toB64(new TextEncoder().encode(canonical(record)))
  const signature = await subtle().sign(SIGN, privateKey, new TextEncoder().encode(body))
  return `${body}.${toB64(signature)}`
}

export async function verifyRecord<K extends SignedRecord["k"]>(token: unknown, publicKey: CryptoKey, kind: K): Promise<Extract<SignedRecord, { k: K }> | null> {
  if (typeof token !== "string" || token.length > 4000) return null
  const [body, signature, extra] = token.split(".")
  if (!body || !signature || extra !== undefined) return null
  try {
    if (!(await subtle().verify(SIGN, publicKey, fromB64(signature), new TextEncoder().encode(body)))) return null
    const record = JSON.parse(new TextDecoder().decode(fromB64(body))) as SignedRecord
    return record.k === kind && record.v === 1 ? (record as Extract<SignedRecord, { k: K }>) : null
  } catch {
    return null
  }
}

/** Salted hash of the account id, so the watch and public checks never carry the owner's identity. */
export async function ownerTag(accountId: string, serial: string) {
  const digest = await subtle().digest("SHA-256", new TextEncoder().encode(`ng-owner:${serial}:${accountId}`))
  return toB64(digest)
}

export function randomNonce() {
  return toB64(globalThis.crypto.getRandomValues(new Uint8Array(16)))
}

export function isValidSerial(serial: unknown): serial is string {
  return typeof serial === "string" && /^NG-[0-9A-HJ-NP-Z]{4}-[0-9A-HJ-NP-Z]{4}$/.test(serial)
}

export interface WatchSecureState {
  serial: string
  bindingToken?: string
  /** Highest binding generation ever accepted; a monotonic counter in the secure element. */
  highestGeneration: number
}

export interface Evaluation {
  state: LockState
  reason: string
  functions: WatchFunction[]
}

const result = (state: LockState, reason: string): Evaluation => ({ state, reason, functions: allowedFunctions(state) })

/**
 * Runs on the watch each time a phone connects: checks the stored binding, then the grant the phone
 * relays for the watch's fresh challenge. Any failure leaves safety functions on and everything else off.
 */
export async function evaluateActivation(input: { registryKey: CryptoKey; secure: WatchSecureState; grantToken?: string; challenge: string; now?: number }): Promise<Evaluation> {
  const now = input.now ?? Date.now()
  if (!input.secure.bindingToken) return result("unbound", "No owner is registered yet.")
  const binding = await verifyRecord(input.secure.bindingToken, input.registryKey, "binding")
  if (!binding || binding.serial !== input.secure.serial) return result("locked", "The owner record is not valid for this watch.")
  if (binding.generation < input.secure.highestGeneration) return result("locked", "This owner record has been replaced.")
  if (!input.grantToken) return result("locked", "Sign in as the owner on the paired phone to unlock.")
  const grant = await verifyRecord(input.grantToken, input.registryKey, "grant")
  if (!grant) return result("locked", "The unlock proof is not valid.")
  if (grant.serial !== binding.serial || grant.generation !== binding.generation) return result("locked", "The unlock proof is for a different watch or owner record.")
  if (grant.owner !== binding.owner) return result("locked", "This account is not the registered owner.")
  if (grant.nonce !== input.challenge) return result("locked", "The unlock proof does not answer this watch's challenge.")
  if (grant.expiresAt < now) return result("locked", "The unlock proof has expired.")
  return result("active", "Unlocked for the registered owner.")
}

/** Registry side: issue a grant only after confirming the signed-in account owns the binding. */
export async function issueGrant(input: { registryPrivateKey: CryptoKey; binding: OwnerBinding; accountId: string; nonce: string; now?: number }) {
  const owner = await ownerTag(input.accountId, input.binding.serial)
  if (owner !== input.binding.owner) return null
  const now = input.now ?? Date.now()
  return signRecord({ k: "grant", v: 1, serial: input.binding.serial, owner, generation: input.binding.generation, nonce: input.nonce, expiresAt: now + GRANT_TTL_MS }, input.registryPrivateKey)
}

/** Registry side: bind an unbound serial, or rebind after an approved release (generation goes up). */
export async function issueBinding(input: { registryPrivateKey: CryptoKey; serial: string; accountId: string; previous?: OwnerBinding; release?: TransferRelease; now?: number }) {
  if (input.previous) {
    const released = input.release && input.release.serial === input.serial && input.release.generation === input.previous.generation && TRANSFER_REASONS.includes(input.release.reason)
    if (!released) return null
  }
  const binding: OwnerBinding = { k: "binding", v: 1, serial: input.serial, owner: await ownerTag(input.accountId, input.serial), generation: (input.previous?.generation ?? 0) + 1, boundAt: input.now ?? Date.now() }
  return { binding, token: await signRecord(binding, input.registryPrivateKey) }
}

/** Watch side: store a new binding only if it is genuine and newer than anything seen before. */
export async function acceptBinding(secure: WatchSecureState, bindingToken: string, registryKey: CryptoKey): Promise<WatchSecureState | null> {
  const binding = await verifyRecord(bindingToken, registryKey, "binding")
  if (!binding || binding.serial !== secure.serial || binding.generation <= secure.highestGeneration) return null
  return { ...secure, bindingToken, highestGeneration: binding.generation }
}

/** Proves the watch is genuine: it signs the phone's challenge with its secure-element key. */
export async function verifyDeviceResponse(input: { registryKey: CryptoKey; certificateToken: string; challenge: string; signature: string }) {
  const certificate = await verifyRecord(input.certificateToken, input.registryKey, "device")
  if (!certificate) return null
  try {
    const deviceKey = await importPublicKey(certificate.devicePublicKey)
    const ok = await subtle().verify(SIGN, deviceKey, fromB64(input.signature), new TextEncoder().encode(`ng-device:${certificate.serial}:${input.challenge}`))
    return ok ? certificate.serial : null
  } catch {
    return null
  }
}

export async function signDeviceChallenge(devicePrivateKey: CryptoKey, serial: string, challenge: string) {
  return toB64(await subtle().sign(SIGN, devicePrivateKey, new TextEncoder().encode(`ng-device:${serial}:${challenge}`)))
}

/** Registry side: a short-lived signed challenge, so registration needs no server-side session state. */
export async function issueRegistrationChallenge(registryPrivateKey: CryptoKey, now = Date.now()) {
  return signRecord({ k: "challenge", v: 1, nonce: randomNonce(), expiresAt: now + GRANT_TTL_MS }, registryPrivateKey)
}

export async function checkRegistrationChallenge(token: unknown, registryKey: CryptoKey, now = Date.now()) {
  const challenge = await verifyRecord(token, registryKey, "challenge")
  return challenge && challenge.expiresAt >= now ? challenge : null
}

/** Reads the registry key pair from a private P-256 JWK (the public half drops the private scalar). */
export async function registryKeysFromJwk(json: string | undefined) {
  if (!json) return null
  try {
    const jwk = JSON.parse(json) as JsonWebKey
    if (jwk.kty !== "EC" || jwk.crv !== "P-256" || !jwk.d) return null
    const { d: _private, key_ops: _ops, ...publicJwk } = jwk
    void _private
    void _ops
    return { privateKey: await importPrivateKey(jwk), publicKey: await importPublicKey(publicJwk) }
  } catch {
    return null
  }
}

/** Minimal public JWK for a device certificate, keeping the record under the GATT value limit. */
export async function compactPublicJwk(key: CryptoKey): Promise<JsonWebKey> {
  const { kty, crv, x, y } = await subtle().exportKey("jwk", key)
  return { kty, crv, x, y }
}
