import { isSameOrigin, json, readJson } from "@/lib/api-helpers"
import { heroSecret, verifyCertificate } from "@/lib/hero-certification"
import { getAuthContext, isAuthConfigured, serviceRest } from "@/lib/supabase-auth"

// Hero enrollment: a signed-in account with a valid 100% certificate. Nearby help requests stay
// off until a separate safety and privacy review approves them (no location is collected here).

export const dynamic = "force-dynamic"

const enrollmentAvailable = () => isAuthConfigured() && Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY) && Boolean(heroSecret())

export async function GET() {
  return json({ enrollment: enrollmentAvailable(), certification: Boolean(heroSecret()), nearbyRequests: false })
}

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return json({ error: "Cross-origin request rejected" }, 403)
  if (!enrollmentAvailable()) return json({ error: "Hero enrollment is not switched on yet." }, 503)
  const body = await readJson(request)
  const certificate = verifyCertificate(body?.certificate, heroSecret()!)
  if (!certificate) return json({ error: "Pass the certification test with every answer correct before enrolling." }, 403)
  const auth = await getAuthContext().catch(() => null)
  if (!auth) return json({ error: "Sign in to enroll." }, 401)
  const response = await serviceRest("hero_certifications?on_conflict=auth_user_id", {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify({ auth_user_id: auth.user.id, test_version: certificate.v, passed_at: new Date(certificate.passedAt).toISOString(), expires_at: new Date(certificate.exp).toISOString(), enrolled: true }),
  }).catch(() => null)
  if (!response?.ok) return json({ error: "Enrollment is unavailable." }, 503)
  return json({ enrolled: true, expiresAt: certificate.exp })
}
