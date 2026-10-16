import { alertsConfig, cleanName, createRateLimiter, maskPhone, normalizeUsPhone, signToken } from "@/lib/contact-alerts"
import { clientKey, json, readJson } from "@/lib/api-helpers"

const limit = createRateLimiter(20, 60 * 60 * 1000)

/** Signs an invite link for the person to share themselves. No text is sent from here. */
export async function POST(request: Request) {
  const config = alertsConfig(process.env)
  if (!config) return json({ available: false, error: "Text alerts are not switched on yet." }, 503)
  if (!limit(clientKey(request))) return json({ error: "Too many invites. Try again later." }, 429)
  const body = await readJson(request)
  const phone = normalizeUsPhone(body?.phone)
  const contactName = cleanName(body?.contactName)
  const senderName = cleanName(body?.senderName)
  if (!phone) return json({ error: "Enter a 10-digit US mobile number." }, 400)
  if (!contactName || !senderName) return json({ error: "Use plain names of up to 40 letters, without links." }, 400)
  const token = signToken({ k: "invite", v: 1, p: phone, n: contactName, s: senderName, iat: Date.now() }, config.secret)
  const origin = new URL(request.url).origin
  return json({ token, link: `${origin}/consent#${token}`, masked: maskPhone(phone) })
}
