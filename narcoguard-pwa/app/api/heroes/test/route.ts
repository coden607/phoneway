import { clientKey, isSameOrigin, json, readJson } from "@/lib/api-helpers"
import { attemptLabeler, heroSecret, issueAttempt, issueCertificate, markGraded, newAttemptId, verify } from "@/lib/hero-certification"
import { HERO_TEST_VERSION, drawQuestions, gradeAttempt } from "@/lib/hero-test-bank"
import { getAuthContext, isAuthConfigured, serviceRest } from "@/lib/supabase-auth"

// Hero certification test. Questions come without answers; grading happens here and requires
// every answer to be correct. Answers are never logged or stored.

export const dynamic = "force-dynamic"

const starts = new Map<string, number[]>()
function limited(key: string) {
  const now = Date.now()
  const recent = (starts.get(key) ?? []).filter((at) => now - at < 60 * 60_000)
  recent.push(now)
  starts.set(key, recent)
  return recent.length > 30
}

export async function GET(request: Request) {
  if (limited(clientKey(request))) return json({ error: "Too many attempts this hour. Take a break and review the steps." }, 429)
  const secret = heroSecret()
  const attemptId = newAttemptId()
  const questions = drawQuestions(undefined, undefined, secret ? attemptLabeler(secret, attemptId) : undefined)
  const issued = secret ? issueAttempt(questions.map((question) => question.id), secret, Date.now(), attemptId) : null
  return json({ version: HERO_TEST_VERSION, questions, attempt: issued?.token ?? null, expiresAt: issued?.attempt.exp ?? null, certifying: Boolean(secret) })
}

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return json({ error: "Cross-origin request rejected" }, 403)
  const body = await readJson(request)
  if (!body || !body.answers || typeof body.answers !== "object") return json({ error: "Invalid request" }, 400)
  const answers = body.answers as Record<string, unknown>
  const secret = heroSecret()

  let questionIds: string[]
  let attemptId: string | undefined
  if (secret) {
    const attempt = verify(body.attempt, secret, "attempt")
    if (!attempt) return json({ error: "This attempt has expired or is not valid. Start a new one." }, 400)
    if (!markGraded(attempt.id)) return json({ error: "This attempt was already graded. Start a new one." }, 409)
    questionIds = attempt.q
    attemptId = attempt.id
  } else {
    questionIds = Array.isArray(body.questionIds) ? body.questionIds.filter((id): id is string => typeof id === "string") : []
  }

  // Practice mode (no secret) uses plain option ids and never issues a certificate.
  const grade = gradeAttempt(questionIds, answers, secret && attemptId ? attemptLabeler(secret, attemptId) : undefined)
  if (!grade) return json({ error: "Invalid attempt" }, 400)
  if (!grade.passed || !secret || !attemptId) return json({ ...grade, certificate: null, recorded: false })

  const { token, certificate } = issueCertificate(attemptId, secret)
  let recorded = false
  if (isAuthConfigured() && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const auth = await getAuthContext().catch(() => null)
    if (auth) {
      const response = await serviceRest("hero_certifications?on_conflict=auth_user_id", {
        method: "POST",
        headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
        body: JSON.stringify({ auth_user_id: auth.user.id, test_version: certificate.v, passed_at: new Date(certificate.passedAt).toISOString(), expires_at: new Date(certificate.exp).toISOString() }),
      }).catch(() => null)
      recorded = Boolean(response?.ok)
    }
  }
  return json({ ...grade, certificate: token, expiresAt: certificate.exp, recorded })
}
