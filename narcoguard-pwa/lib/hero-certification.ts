import { createHmac, randomUUID, timingSafeEqual } from "node:crypto"
import { HERO_TEST_VERSION } from "@/lib/hero-test-bank"

// Signed, stateless Hero test attempts and certificates (HMAC-SHA-256 with HERO_CERT_SECRET).
// Without the secret the test still runs and is graded on the server, but no certificate is issued.

export const ATTEMPT_TTL_MS = 20 * 60 * 1000
export const CERTIFICATE_TTL_MS = 365 * 24 * 60 * 60 * 1000

type Attempt = { k: "attempt"; id: string; q: string[]; iat: number; exp: number }
type Certificate = { k: "hero"; v: number; attempt: string; passedAt: number; exp: number }
type Payload = Attempt | Certificate

const b64 = (text: string) => Buffer.from(text).toString("base64url")
const mac = (secret: string, body: string) => createHmac("sha256", secret).update(`ng-hero:${body}`).digest()

export const heroSecret = () => {
  const secret = process.env.HERO_CERT_SECRET ?? ""
  return secret.length >= 32 ? secret : null
}

export function sign(payload: Payload, secret: string) {
  const body = b64(JSON.stringify(payload))
  return `${body}.${mac(secret, body).toString("base64url")}`
}

export function verify<K extends Payload["k"]>(token: unknown, secret: string, kind: K, now = Date.now()): Extract<Payload, { k: K }> | null {
  if (typeof token !== "string" || token.length > 2000) return null
  const [body, signature, extra] = token.split(".")
  if (!body || !signature || extra !== undefined) return null
  const given = Buffer.from(signature, "base64url")
  const expected = mac(secret, body)
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null
  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as Payload
    return payload.k === kind && payload.exp >= now ? (payload as Extract<Payload, { k: K }>) : null
  } catch {
    return null
  }
}

export const newAttemptId = () => randomUUID()

/**
 * Opaque option ids for one attempt. Without the secret, the ids a client sees reveal nothing
 * about which option is correct, and they differ on every attempt.
 */
export function attemptLabeler(secret: string, attemptId: string) {
  return (questionId: string, optionId: string) => createHmac("sha256", secret).update(`ng-hero-option:${attemptId}:${questionId}:${optionId}`).digest("base64url").slice(0, 16)
}

export function issueAttempt(questionIds: string[], secret: string, now = Date.now(), id = newAttemptId()) {
  const attempt: Attempt = { k: "attempt", id, q: questionIds, iat: now, exp: now + ATTEMPT_TTL_MS }
  return { token: sign(attempt, secret), attempt }
}

export function issueCertificate(attemptId: string, secret: string, now = Date.now()) {
  const certificate: Certificate = { k: "hero", v: HERO_TEST_VERSION, attempt: attemptId, passedAt: now, exp: now + CERTIFICATE_TTL_MS }
  return { token: sign(certificate, secret), certificate }
}

/** A certificate counts only for the current test version. */
export function verifyCertificate(token: unknown, secret: string, now = Date.now()) {
  const certificate = verify(token, secret, "hero", now)
  return certificate && certificate.v === HERO_TEST_VERSION ? certificate : null
}

// Each attempt can be graded once. In-memory, so best-effort across serverless instances; the
// attempt also expires after 20 minutes.
const graded = new Map<string, number>()
export function markGraded(id: string, now = Date.now()) {
  for (const [key, expiry] of graded) if (expiry < now) graded.delete(key)
  if (graded.has(id)) return false
  graded.set(id, now + ATTEMPT_TTL_MS)
  return true
}
