import { strict as assert } from "node:assert"
import { readFileSync, readdirSync } from "node:fs"
import { test } from "node:test"
import { ATTEMPT_TTL_MS, attemptLabeler, heroSecret, issueAttempt, issueCertificate, markGraded, verify, verifyCertificate } from "../lib/hero-certification"
import { HERO_BANK, QUESTIONS_PER_ATTEMPT, drawQuestions, gradeAttempt } from "../lib/hero-test-bank"

const SECRET = "x".repeat(40)
const key = Object.fromEntries(HERO_BANK.map((question) => [question.id, question.answer]))

test("the bank is well formed: unique ids, four options, one valid answer, an explanation", () => {
  assert.ok(HERO_BANK.length >= QUESTIONS_PER_ATTEMPT * 2, "enough questions for varied draws")
  assert.equal(new Set(HERO_BANK.map((question) => question.id)).size, HERO_BANK.length)
  for (const question of HERO_BANK) {
    assert.equal(question.options.length, 4, question.id)
    assert.equal(new Set(question.options.map((option) => option.id)).size, 4, question.id)
    assert.ok(question.options.some((option) => option.id === question.answer), question.id)
    assert.ok(question.why.length > 20, question.id)
  }
})

test("draws are random, never include answers, and shuffle options", () => {
  const draws = Array.from({ length: 20 }, () => drawQuestions())
  for (const draw of draws) {
    assert.equal(draw.length, QUESTIONS_PER_ATTEMPT)
    assert.ok(!JSON.stringify(draw).includes("\"answer\"") && !JSON.stringify(draw).includes("\"why\""))
  }
  assert.ok(new Set(draws.map((draw) => draw.map((q) => q.id).join())).size > 1)
  assert.ok(draws.some((draw) => draw.some((q) => q.options[0].id !== "a")), "correct answer is not always first")
})

test("only a perfect score passes", () => {
  const ids = drawQuestions().map((question) => question.id)
  const perfect = Object.fromEntries(ids.map((id) => [id, key[id]]))
  assert.equal(gradeAttempt(ids, perfect)?.passed, true)
  const oneWrong = { ...perfect, [ids[0]]: perfect[ids[0]] === "a" ? "b" : "a" }
  const grade = gradeAttempt(ids, oneWrong)!
  assert.equal(grade.passed, false)
  assert.equal(grade.correct, QUESTIONS_PER_ATTEMPT - 1)
  assert.deepEqual(grade.missed.map((item) => item.id), [ids[0]])
  const { [ids[1]]: _skipped, ...unanswered } = perfect
  void _skipped
  assert.equal(gradeAttempt(ids, unanswered)?.passed, false, "a blank answer is wrong")
  assert.equal(gradeAttempt(ids.slice(1), perfect), null, "short attempts are refused")
  assert.equal(gradeAttempt([...ids.slice(1), ids[1]], perfect), null, "repeated questions are refused")
  assert.equal(gradeAttempt([...ids.slice(1), "made-up"], perfect), null)
})

test("attempts and certificates are signed, expire, and are single-use", () => {
  const { token, attempt } = issueAttempt(["a", "b"], SECRET)
  assert.deepEqual(verify(token, SECRET, "attempt")?.q, ["a", "b"])
  assert.equal(verify(token, "y".repeat(40), "attempt"), null, "another secret fails")
  assert.equal(verify(token, SECRET, "attempt", Date.now() + ATTEMPT_TTL_MS + 1000), null, "expired")
  assert.equal(verify(token.replace(/^eyJ/, "eyK"), SECRET, "attempt"), null, "tampered")
  assert.equal(verify(token, SECRET, "hero"), null, "an attempt is not a certificate")
  assert.equal(markGraded(attempt.id), true)
  assert.equal(markGraded(attempt.id), false, "grading twice is refused")

  const certificate = issueCertificate(attempt.id, SECRET)
  assert.ok(verifyCertificate(certificate.token, SECRET))
  assert.equal(verifyCertificate(certificate.token, SECRET, Date.now() + 366 * 24 * 3600 * 1000), null, "certificates expire after a year")
})

test("the answer key is only imported by server code", async () => {
  const { readdirSync, readFileSync, statSync } = await import("node:fs")
  const { join } = await import("node:path")
  const offenders: string[] = []
  const walk = (dir: string) => {
    for (const name of readdirSync(dir)) {
      const path = join(dir, name)
      if (statSync(path).isDirectory()) walk(path)
      else if (/\.(ts|tsx)$/.test(name) && readFileSync(path, "utf8").includes("hero-test-bank") && (readFileSync(path, "utf8").includes("\"use client\"") || !path.includes(join("app", "api")) && !path.startsWith("lib"))) offenders.push(path)
    }
  }
  for (const dir of ["app", "components", "lib"]) walk(dir)
  assert.deepEqual(offenders, [])
})

test("certified attempts hide which option is correct behind per-attempt opaque ids", () => {
  const labelA = attemptLabeler(SECRET, "attempt-a")
  const labelB = attemptLabeler(SECRET, "attempt-b")
  const draw = drawQuestions(undefined, undefined, labelA)
  for (const question of draw) {
    assert.ok(question.options.every((option) => /^[A-Za-z0-9_-]{16}$/.test(option.id)), "no plain a-d ids")
    assert.equal(new Set(question.options.map((option) => option.id)).size, 4)
  }
  const ids = draw.map((question) => question.id)
  const perfect = Object.fromEntries(ids.map((id) => [id, labelA(id, key[id])]))
  assert.equal(gradeAttempt(ids, perfect, labelA)?.passed, true)
  assert.equal(gradeAttempt(ids, Object.fromEntries(ids.map((id) => [id, key[id]])), labelA)?.passed, false, "plain ids do not pass a certified attempt")
  assert.equal(gradeAttempt(ids, perfect, labelB)?.passed, false, "answers from another attempt do not carry over")
})

// --- Task 1: certification and enrollment status must be truthful -------------
// These assertions guard claims the UI makes about training, certificates and
// enrollment. They read component source because this suite has no DOM harness;
// the Playwright cases in tests/pwa.spec.ts cover the rendered behaviour.

const sourceOf = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8")

test("no component treats simulated module clicks as completed training", () => {
  const components = readdirSync(new URL("../components/hero", import.meta.url))
  for (const file of components) {
    const source = sourceOf(`components/hero/${file}`)
    assert.ok(
      !/setTrainingProgress|completedModules/.test(source),
      `${file} drives training progress from clicks, which claims training the app did not deliver`,
    )
    assert.ok(
      !/certified Hero/i.test(source) || !/trainingProgress/.test(source),
      `${file} promises certification from simulated progress`,
    )
  }
})

test("a practice-mode pass never claims a certificate", () => {
  const source = sourceOf("components/hero/certification-test.tsx")
  // The certificate claim must be conditioned on an actual issued certificate.
  assert.match(source, /phase\.result\.certificate \?/)
  assert.match(source, /Practice mode: certificates are not being issued yet\./)
  // "valid for one year" may only appear on the branch that has a certificate.
  const [withoutCertificate] = source.split("phase.result.certificate ?").slice(-1)
  const practiceBranch = withoutCertificate.split(":")[1] ?? ""
  assert.ok(!/valid for one year/i.test(practiceBranch), "practice branch claims a real certificate")
})

test("a missing signing secret issues no certificate, so the test is practice only", () => {
  const saved = process.env.HERO_CERT_SECRET
  try {
    delete process.env.HERO_CERT_SECRET
    assert.equal(heroSecret(), null)
    process.env.HERO_CERT_SECRET = "too-short"
    assert.equal(heroSecret(), null, "a weak secret must not be accepted as configured")
    process.env.HERO_CERT_SECRET = SECRET
    assert.equal(heroSecret(), SECRET)
  } finally {
    if (saved === undefined) delete process.env.HERO_CERT_SECRET
    else process.env.HERO_CERT_SECRET = saved
  }
})

test("enrollment being off explains which prerequisite is missing", () => {
  const source = sourceOf("app/hero-signup/page.tsx")
  // The page already knows both facts from /api/heroes; it must use them to say
  // why enrollment is unavailable instead of one generic sentence.
  assert.match(source, /status\.certification/,
    "the page must distinguish a missing certificate signing key from missing account storage")
  assert.match(source, /certificates are not being issued/i,
    "say plainly that no certificate can be issued when the signing key is absent")
})
