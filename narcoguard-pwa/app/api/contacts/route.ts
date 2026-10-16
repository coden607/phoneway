import { alertsConfig } from "@/lib/contact-alerts"
import { json } from "@/lib/api-helpers"

export function GET() {
  return json({ available: alertsConfig(process.env) !== null })
}
