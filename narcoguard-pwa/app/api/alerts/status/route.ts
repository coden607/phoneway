import { MAX_CONTACTS, alertsConfig, deliveryLabel, verifyToken } from "@/lib/contact-alerts"
import { json, readJson } from "@/lib/api-helpers"
import { messageStatus } from "@/lib/twilio"

/** Delivery status for texts this app sent, looked up by the signed tokens the send route returned. */
export async function POST(request: Request) {
  const config = alertsConfig(process.env)
  if (!config) return json({ available: false, error: "Text alerts are not switched on yet." }, 503)
  const body = await readJson(request)
  const tokens = Array.isArray(body?.tokens) ? body.tokens.slice(0, MAX_CONTACTS) : []
  const statuses = await Promise.all(
    tokens.map(async (token) => {
      const sid = verifyToken(token, config.secret, "sid")
      if (!sid) return { token, state: "failed", label: "Unknown message" }
      try {
        const { status, errorCode } = await messageStatus(config, sid.sid)
        return { token, ...deliveryLabel(status, errorCode) }
      } catch {
        return { token, state: "pending", label: "Status unavailable; still checking" }
      }
    }),
  )
  return json({ statuses })
}
