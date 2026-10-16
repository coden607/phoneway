import { MAX_CONTACTS, alertMessage, alertsConfig, createRateLimiter, locationLink, maskPhone, signToken, verifyToken } from "@/lib/contact-alerts"
import { clientKey, json, readJson } from "@/lib/api-helpers"
import { TwilioError, sendSms } from "@/lib/twilio"

const phoneLimit = createRateLimiter(6, 60 * 60 * 1000)
const ipLimit = createRateLimiter(10, 60 * 60 * 1000)

const failure = (error: unknown) => {
  if (error instanceof TwilioError && error.code === 21610) return { state: "opted-out", label: "Opted out (replied STOP)" }
  if (error instanceof TwilioError && error.code === 21608) return { state: "failed", label: "Not sent: a Twilio trial account can only text verified numbers" }
  return { state: "failed", label: "Not sent" }
}

/**
 * Sends the fixed alert (or test) text to consenting contacts. Only numbers inside valid consent
 * proofs are texted, the wording is fixed here, and nothing is stored. The person has already seen
 * a preview and pressed send; this route is never called automatically.
 */
export async function POST(request: Request) {
  const config = alertsConfig(process.env)
  if (!config) return json({ available: false, error: "Text alerts are not switched on yet." }, 503)
  if (!ipLimit(clientKey(request))) return json({ error: "Too many alerts from this device. Call 911 if you need help now." }, 429)
  const body = await readJson(request)
  const proofs = Array.isArray(body?.proofs) ? body.proofs.slice(0, MAX_CONTACTS) : []
  const test = body?.test === true
  const location = body?.location as { lat?: unknown; lon?: unknown } | undefined
  const locationUrl = test ? undefined : locationLink(location?.lat, location?.lon)

  const contacts = new Map<string, { name: string; sender: string }>()
  for (const proof of proofs) {
    const consent = verifyToken(proof, config.secret, "consent")
    if (consent && !contacts.has(consent.p)) contacts.set(consent.p, { name: consent.n, sender: consent.s })
  }
  if (contacts.size === 0) return json({ error: "No confirmed contacts to text." }, 400)

  const results = await Promise.all(
    [...contacts].map(async ([phone, contact]) => {
      const base = { name: contact.name, masked: maskPhone(phone) }
      if (!phoneLimit(phone)) return { ...base, state: "failed", label: "Not sent: too many texts to this contact this hour" }
      try {
        const sent = await sendSms(config, phone, alertMessage({ senderName: contact.sender, locationUrl, test }))
        return { ...base, state: "pending", label: "Sending…", statusToken: signToken({ k: "sid", v: 1, sid: sent.sid, p: phone }, config.secret) }
      } catch (error) {
        return { ...base, ...failure(error) }
      }
    }),
  )
  // Counts only: no names, numbers, locations or message text.
  console.info(`[alerts] ${test ? "test" : "alert"} accepted ${results.filter((result) => "statusToken" in result).length}/${results.length}`)
  return json({ results })
}
