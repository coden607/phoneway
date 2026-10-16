import { alertsConfig, createRateLimiter, inviteExpired, maskPhone, pairingCode, verifyToken } from "@/lib/contact-alerts"
import { clientKey, json, readJson } from "@/lib/api-helpers"
import { TwilioError, checkVerification, startVerification } from "@/lib/twilio"

const sendLimit = createRateLimiter(3, 10 * 60 * 1000)
const ipLimit = createRateLimiter(10, 60 * 60 * 1000)
const checkLimit = createRateLimiter(10, 10 * 60 * 1000)

/**
 * Contact-side consent. Without a code, texts a Twilio Verify code to the invited number; with a
 * code, checks it and only then reveals the pairing code the contact gives back to the person.
 */
export async function POST(request: Request) {
  const config = alertsConfig(process.env)
  if (!config) return json({ available: false, error: "Text alerts are not switched on yet." }, 503)
  const body = await readJson(request)
  const token = typeof body?.token === "string" ? body.token : ""
  const invite = verifyToken(token, config.secret, "invite")
  if (!invite) return json({ error: "This invite link is not valid. Ask for a new one." }, 400)
  if (inviteExpired(invite)) return json({ error: "This invite has expired. Ask for a new one." }, 410)

  try {
    if (body?.code === undefined) {
      if (!sendLimit(token) || !ipLimit(clientKey(request))) return json({ error: "Too many codes requested. Wait a few minutes." }, 429)
      await startVerification(config, invite.p)
      return json({ sent: true, masked: maskPhone(invite.p) })
    }
    const code = typeof body.code === "string" ? body.code.replace(/\s/g, "") : ""
    if (!/^\d{4,10}$/.test(code)) return json({ error: "Enter the code from the text." }, 400)
    if (!checkLimit(token)) return json({ error: "Too many tries. Wait a few minutes." }, 429)
    if (!(await checkVerification(config, invite.p, code))) return json({ error: "That code didn't match or has expired." }, 400)
    const pairing = pairingCode(token, config.secret)
    return json({ verified: true, pairingCode: `${pairing.slice(0, 4)} ${pairing.slice(4)}` })
  } catch (error) {
    console.warn(`[contacts] verification failed: ${error instanceof TwilioError ? error.message : "network"}`)
    if (error instanceof TwilioError && (error.status === 429 || error.code === 60203)) return json({ error: "Too many codes requested. Wait a few minutes." }, 429)
    return json({ error: "The code could not be sent or checked. Try again shortly." }, 502)
  }
}
