import { alertsConfig, createRateLimiter, inviteExpired, maskPhone, pairingCodeMatches, signToken, verifyToken } from "@/lib/contact-alerts"
import { json, readJson } from "@/lib/api-helpers"

const limit = createRateLimiter(10, 10 * 60 * 1000)

/** Exchanges the contact's pairing code for a signed consent proof kept on the person's device. */
export async function POST(request: Request) {
  const config = alertsConfig(process.env)
  if (!config) return json({ available: false, error: "Text alerts are not switched on yet." }, 503)
  const body = await readJson(request)
  const token = typeof body?.token === "string" ? body.token : ""
  const invite = verifyToken(token, config.secret, "invite")
  if (!invite) return json({ error: "This invite is not valid. Create a new one." }, 400)
  if (inviteExpired(invite)) return json({ error: "This invite has expired. Create a new one." }, 410)
  if (!limit(token)) return json({ error: "Too many tries. Wait a few minutes." }, 429)
  if (!pairingCodeMatches(token, body?.code, config.secret)) return json({ error: "That code doesn't match. Check the 8 digits your contact sees." }, 400)
  const proof = signToken({ k: "consent", v: 1, p: invite.p, n: invite.n, s: invite.s, iat: Date.now() }, config.secret)
  return json({ proof, contact: { name: invite.n, masked: maskPhone(invite.p) } })
}
