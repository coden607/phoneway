import type { AlertsConfig } from "@/lib/contact-alerts"

// Minimal Twilio REST client (Messaging and Verify) over fetch. Credentials stay server side; errors
// carry only Twilio's numeric code and HTTP status, never phone numbers or message bodies.

export class TwilioError extends Error {
  constructor(readonly status: number, readonly code: number | undefined) {
    super(`Twilio responded ${status}${code ? ` (${code})` : ""}`)
    this.name = "TwilioError"
  }
}

async function call(config: AlertsConfig, url: string, form?: Record<string, string>) {
  const response = await fetch(url, {
    method: form ? "POST" : "GET",
    headers: {
      Authorization: `Basic ${Buffer.from(`${config.accountSid}:${config.authToken}`).toString("base64")}`,
      ...(form ? { "Content-Type": "application/x-www-form-urlencoded" } : {}),
    },
    body: form ? new URLSearchParams(form).toString() : undefined,
    signal: AbortSignal.timeout(15_000),
    cache: "no-store",
  })
  const body = (await response.json().catch(() => ({}))) as Record<string, unknown>
  if (!response.ok) throw new TwilioError(response.status, typeof body.code === "number" ? body.code : undefined)
  return body
}

const api = (config: AlertsConfig) => `https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(config.accountSid)}`
const verify = (config: AlertsConfig) => `https://verify.twilio.com/v2/Services/${encodeURIComponent(config.verifyServiceSid)}`

export async function sendSms(config: AlertsConfig, to: string, body: string) {
  const sender: Record<string, string> = config.messagingServiceSid ? { MessagingServiceSid: config.messagingServiceSid } : { From: config.from! }
  const result = await call(config, `${api(config)}/Messages.json`, { To: to, Body: body, ...sender })
  return { sid: String(result.sid), status: String(result.status) }
}

export async function messageStatus(config: AlertsConfig, sid: string) {
  if (!/^(SM|MM)[0-9a-f]{32}$/i.test(sid)) throw new TwilioError(400, undefined)
  const result = await call(config, `${api(config)}/Messages/${sid}.json`)
  return { status: String(result.status), errorCode: typeof result.error_code === "number" ? result.error_code : null }
}

export async function startVerification(config: AlertsConfig, to: string) {
  const result = await call(config, `${verify(config)}/Verifications`, { To: to, Channel: "sms" })
  return String(result.status)
}

/** True only when Twilio says the code is approved; wrong or expired codes return false. */
export async function checkVerification(config: AlertsConfig, to: string, code: string) {
  try {
    const result = await call(config, `${verify(config)}/VerificationCheck`, { To: to, Code: code })
    return result.status === "approved"
  } catch (error) {
    if (error instanceof TwilioError && error.status === 404) return false
    throw error
  }
}
