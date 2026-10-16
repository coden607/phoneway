import { createHmac, timingSafeEqual } from "node:crypto"

// Emergency-contact text alerts, consent first:
// 1. The person adds a contact on their device and shares a signed invite link themselves.
// 2. The contact opens the link, proves they own the number with a Twilio Verify code, and is
//    shown a pairing code to give back to the person.
// 3. The pairing code turns the invite into a signed consent proof stored only on the person's
//    device. Alerts go only to numbers inside valid proofs, with a fixed server-side message, and
//    only when the person presses send after seeing a preview. NarcoGuard stores no contacts.

import { NAME_MAX, type InvitePayload } from "@/lib/contact-alerts-shared"

export { MAX_CONTACTS, NAME_MAX, alertMessage, deliveryLabel, inviteShareText, peekInvite, type InvitePayload } from "@/lib/contact-alerts-shared"
export const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000

export type ConsentPayload = { k: "consent"; v: 1; p: string; n: string; s: string; iat: number }
export type SidPayload = { k: "sid"; v: 1; sid: string; p: string }
type Payload = InvitePayload | ConsentPayload | SidPayload

export interface AlertsConfig {
  accountSid: string
  authToken: string
  from?: string
  messagingServiceSid?: string
  verifyServiceSid: string
  secret: string
}

/** All settings must be present and SMS_ALERTS_ENABLED must be "true"; otherwise alerts are off. */
export function alertsConfig(env: Record<string, string | undefined>): AlertsConfig | null {
  const accountSid = env.TWILIO_ACCOUNT_SID
  const authToken = env.TWILIO_AUTH_TOKEN
  const from = env.TWILIO_PHONE_NUMBER || undefined
  const messagingServiceSid = env.TWILIO_MESSAGING_SERVICE_SID || undefined
  const verifyServiceSid = env.TWILIO_VERIFY_SERVICE_SID
  const secret = env.CONTACT_ALERTS_SECRET
  if (env.SMS_ALERTS_ENABLED !== "true") return null
  if (!accountSid || !authToken || !verifyServiceSid || !secret || secret.length < 32 || (!from && !messagingServiceSid)) return null
  return { accountSid, authToken, from, messagingServiceSid, verifyServiceSid, secret }
}

/** US numbers only (NANP), returned as E.164. */
export function normalizeUsPhone(input: unknown): string | null {
  if (typeof input !== "string") return null
  let digits = input.replace(/[^\d]/g, "")
  if (digits.length === 11 && digits.startsWith("1")) digits = digits.slice(1)
  if (!/^[2-9]\d{2}[2-9]\d{6}$/.test(digits)) return null
  if (/^555(01\d{2})$/.test(digits.slice(3))) return null
  return `+1${digits}`
}

export function maskPhone(e164: string) {
  return `(•••) •••-${e164.slice(-4)}`
}

/** Plain names only: no links or control characters, so a name cannot smuggle content into a text. */
export function cleanName(input: unknown): string | null {
  if (typeof input !== "string") return null
  const name = input.replace(/[\u0000-\u001f\u007f]/g, "").replace(/\s+/g, " ").trim()
  if (!name || name.length > NAME_MAX) return null
  if (/https?:|www\.|:\/\/|\.(com|net|org|ly|io|co|app|me)\b/i.test(name)) return null
  if (!/^[\p{L}\p{M}0-9 .'’-]+$/u.test(name)) return null
  return name
}

const b64 = (value: string | Buffer) => Buffer.from(value).toString("base64url")
const hmac = (secret: string, data: string) => createHmac("sha256", secret).update(data).digest()

export function signToken(payload: Payload, secret: string) {
  const body = b64(JSON.stringify(payload))
  return `${body}.${b64(hmac(secret, body))}`
}

export function verifyToken<K extends Payload["k"]>(token: unknown, secret: string, kind: K): Extract<Payload, { k: K }> | null {
  if (typeof token !== "string" || token.length > 2000) return null
  const [body, signature, extra] = token.split(".")
  if (!body || !signature || extra !== undefined) return null
  const expected = hmac(secret, body)
  const given = Buffer.from(signature, "base64url")
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null
  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as Payload
    return payload.k === kind && payload.v === 1 ? (payload as Extract<Payload, { k: K }>) : null
  } catch {
    return null
  }
}

export function inviteExpired(invite: InvitePayload, now = Date.now()) {
  return now - invite.iat > INVITE_TTL_MS || invite.iat > now + 60_000
}

/** Eight digits derived from the invite; the server reveals it only after the contact's number is verified. */
export function pairingCode(inviteToken: string, secret: string) {
  const value = hmac(secret, `pair:${inviteToken}`).readUInt32BE(0) % 100_000_000
  return value.toString().padStart(8, "0")
}

export function pairingCodeMatches(inviteToken: string, code: unknown, secret: string) {
  if (typeof code !== "string") return false
  const digits = code.replace(/\D/g, "")
  const expected = pairingCode(inviteToken, secret)
  return digits.length === 8 && timingSafeEqual(Buffer.from(digits), Buffer.from(expected))
}

export function locationLink(lat: unknown, lon: unknown) {
  if (typeof lat !== "number" || typeof lon !== "number" || !Number.isFinite(lat) || !Number.isFinite(lon)) return undefined
  if (Math.abs(lat) > 90 || Math.abs(lon) > 180) return undefined
  return `https://maps.google.com/?q=${lat.toFixed(5)},${lon.toFixed(5)}`
}

/** Best-effort limiter for a single server instance; Twilio Verify adds its own per-number limits. */
export function createRateLimiter(limit: number, windowMs: number) {
  const hits = new Map<string, number[]>()
  return (key: string, now = Date.now()) => {
    const recent = (hits.get(key) ?? []).filter((time) => now - time < windowMs)
    if (recent.length >= limit) {
      hits.set(key, recent)
      return false
    }
    recent.push(now)
    hits.set(key, recent)
    if (hits.size > 5000) hits.delete(hits.keys().next().value as string)
    return true
  }
}
