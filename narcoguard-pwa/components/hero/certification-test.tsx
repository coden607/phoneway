"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Lock, ShieldAlert, ShieldCheck } from "lucide-react"
import { Button } from "@/components/ui/button"

type Question = { id: string; topic: string; prompt: string; options: { id: string; text: string }[] }
type Attempt = { questions: Question[]; attempt: string | null; expiresAt: number | null; certifying: boolean }
type Result = { passed: boolean; correct: number; total: number; missed: { id: string; topic: string; prompt: string; why: string }[]; certificate: string | null; recorded: boolean; error?: string }

export const HERO_CERTIFICATE_KEY = "narcoguard_hero_certificate_v1"

type Phase = { name: "intro" } | { name: "loading" } | { name: "running"; data: Attempt; index: number } | { name: "grading" } | { name: "voided"; reason: string } | { name: "result"; result: Result } | { name: "error"; message: string }

// A website cannot stop other apps from opening. Lockdown mode does what a page can: full screen,
// and the attempt is voided the moment the page is hidden, loses focus or leaves full screen. For a
// proctored test, the device itself must be locked to this app (Guided Access or screen pinning).

export function CertificationTest({ onCertified }: { onCertified?: (certificate: string) => void }) {
  const [phase, setPhase] = useState<Phase>({ name: "intro" })
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [remaining, setRemaining] = useState<number>()
  const running = phase.name === "running"
  const fullscreenRef = useRef(false)

  const exitFullscreen = () => {
    fullscreenRef.current = false
    if (document.fullscreenElement) document.exitFullscreen().catch(() => undefined)
  }

  const voidAttempt = useCallback((reason: string) => {
    exitFullscreen()
    setAnswers({})
    setPhase({ name: "voided", reason })
  }, [])

  // Lockdown: any sign of leaving the test voids it.
  useEffect(() => {
    if (!running) return
    const onHidden = () => { if (document.visibilityState === "hidden") voidAttempt("The test was hidden (another app, tab or the home screen was opened).") }
    const onBlur = () => voidAttempt("The test window lost focus.")
    const onFullscreen = () => { if (fullscreenRef.current && !document.fullscreenElement) voidAttempt("Full screen was exited.") }
    const block = (event: Event) => event.preventDefault()
    document.addEventListener("visibilitychange", onHidden)
    window.addEventListener("blur", onBlur)
    window.addEventListener("pagehide", onBlur)
    document.addEventListener("fullscreenchange", onFullscreen)
    for (const type of ["copy", "cut", "paste", "contextmenu"]) document.addEventListener(type, block)
    return () => {
      document.removeEventListener("visibilitychange", onHidden)
      window.removeEventListener("blur", onBlur)
      window.removeEventListener("pagehide", onBlur)
      document.removeEventListener("fullscreenchange", onFullscreen)
      for (const type of ["copy", "cut", "paste", "contextmenu"]) document.removeEventListener(type, block)
    }
  }, [running, voidAttempt])

  const expiresAt = phase.name === "running" ? phase.data.expiresAt : null
  useEffect(() => {
    if (!expiresAt) return
    const tick = () => {
      const left = expiresAt - Date.now()
      if (left <= 0) voidAttempt("Time ran out.")
      else setRemaining(Math.ceil(left / 1000))
    }
    tick()
    const timer = setInterval(tick, 1000)
    return () => clearInterval(timer)
  }, [expiresAt, voidAttempt])

  const start = async () => {
    setAnswers({})
    setRemaining(undefined)
    setPhase({ name: "loading" })
    try {
      await document.documentElement.requestFullscreen?.()
      fullscreenRef.current = Boolean(document.fullscreenElement)
    } catch {
      fullscreenRef.current = false // iPhone Safari has no full screen API; Guided Access covers it.
    }
    try {
      const response = await fetch("/api/heroes/test", { cache: "no-store" })
      const data = (await response.json()) as Attempt & { error?: string }
      if (!response.ok) throw new Error(data.error ?? "The test could not start.")
      setPhase({ name: "running", data, index: 0 })
    } catch (error) {
      exitFullscreen()
      setPhase({ name: "error", message: error instanceof Error ? error.message : "The test could not start." })
    }
  }

  const submit = async (data: Attempt) => {
    setPhase({ name: "grading" })
    exitFullscreen()
    try {
      const response = await fetch("/api/heroes/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attempt: data.attempt, questionIds: data.questions.map((question) => question.id), answers }),
      })
      const result = (await response.json()) as Result
      if (!response.ok) throw new Error(result.error ?? "The test could not be graded.")
      if (result.passed && result.certificate) {
        try { localStorage.setItem(HERO_CERTIFICATE_KEY, result.certificate) } catch { /* kept for this visit only */ }
        onCertified?.(result.certificate)
      }
      setPhase({ name: "result", result })
    } catch (error) {
      setPhase({ name: "error", message: error instanceof Error ? error.message : "The test could not be graded." })
    } finally {
      setAnswers({})
    }
  }

  if (phase.name === "running") {
    const { data, index } = phase
    const question = data.questions[index]
    const last = index === data.questions.length - 1
    const chosen = answers[question.id]
    return (
      <section className="fixed inset-0 z-[100] overflow-y-auto bg-background p-4 sm:p-8 select-none" aria-labelledby="test-question" data-testid="hero-test-running">
        <div className="mx-auto max-w-2xl space-y-6">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span className="flex items-center gap-2"><Lock className="h-4 w-4" aria-hidden="true" />Lockdown: leaving this screen voids the attempt</span>
            <span>Question {index + 1} of {data.questions.length}{remaining !== undefined && ` · ${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, "0")} left`}</span>
          </div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">{question.topic}</p>
          <h2 id="test-question" className="text-xl font-bold">{question.prompt}</h2>
          <fieldset className="space-y-2">
            <legend className="sr-only">Choose one answer</legend>
            {question.options.map((option) => (
              <label key={option.id} className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 ${chosen === option.id ? "border-primary bg-primary/10" : ""}`}>
                <input type="radio" name={question.id} value={option.id} checked={chosen === option.id} onChange={() => setAnswers((current) => ({ ...current, [question.id]: option.id }))} className="mt-1" />
                <span>{option.text}</span>
              </label>
            ))}
          </fieldset>
          <div className="flex justify-between gap-2">
            <Button type="button" variant="outline" disabled={index === 0} onClick={() => setPhase({ ...phase, index: index - 1 })}>Back</Button>
            {last ? (
              <Button type="button" disabled={data.questions.some((q) => !answers[q.id])} onClick={() => submit(data)}>Submit for grading</Button>
            ) : (
              <Button type="button" disabled={!chosen} onClick={() => setPhase({ ...phase, index: index + 1 })}>Next</Button>
            )}
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="space-y-4" aria-labelledby="hero-test-heading" data-testid="hero-test">
      <h2 id="hero-test-heading" className="flex items-center gap-2 text-xl font-bold"><ShieldCheck className="h-5 w-5" aria-hidden="true" />Hero certification test</h2>

      {phase.name === "result" ? (
        <div className="space-y-3" data-testid="hero-test-result">
          {phase.result.passed ? (
            <p className="rounded-lg border border-green-500/40 bg-green-500/10 p-3 font-semibold" role="status">
              Passed: {phase.result.correct} of {phase.result.total} correct.{" "}
              {phase.result.certificate ? "Your certificate is valid for one year." : "Practice mode: certificates are not being issued yet."}
            </p>
          ) : (
            <>
              <p className="rounded-lg border border-red-500/40 bg-red-500/10 p-3 font-semibold" role="status">
                Not passed: {phase.result.correct} of {phase.result.total} correct. Every answer must be correct. Review these, then take a new test.
              </p>
              <ul className="space-y-2 text-sm">
                {phase.result.missed.map((item) => (
                  <li key={item.id} className="rounded-lg border p-3"><p className="font-medium">{item.prompt}</p><p className="mt-1 text-muted-foreground">{item.why}</p></li>
                ))}
              </ul>
            </>
          )}
        </div>
      ) : phase.name === "voided" ? (
        <p className="flex items-start gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3" role="alert" data-testid="hero-test-voided">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />Attempt voided. {phase.reason} Your answers were discarded; a new test has different questions.
        </p>
      ) : phase.name === "error" ? (
        <p className="text-sm" role="alert">{phase.message}</p>
      ) : (
        <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
          <li>12 questions drawn at random from a larger bank on recognizing an overdose, naloxone, breathing support, safety and privacy.</li>
          <li>You must get every question right (100%). Grading happens on NarcoGuard&apos;s server.</li>
          <li>20 minutes. The test opens full screen and is voided if you switch apps or tabs, leave full screen, or the window loses focus.</li>
        </ul>
      )}

      <details className="rounded-lg border p-3 text-sm">
        <summary className="cursor-pointer font-medium">Proctors: lock the device to this test</summary>
        <div className="mt-2 space-y-2 text-muted-foreground">
          <p>A web page cannot block other apps. To make sure no other app can be used, lock the device before starting:</p>
          <p><span className="font-medium text-foreground">iPhone or iPad (Guided Access):</span> Settings → Accessibility → Guided Access → turn on and set a passcode. Open this page, triple-click the side (or Home) button, then tap Start. Only you can end it with the passcode.</p>
          <p><span className="font-medium text-foreground">Android (app pinning):</span> Settings → Security → App pinning (or Screen pinning) → on, with &ldquo;Ask for PIN before unpinning&rdquo;. Open Recents, tap the browser&apos;s icon, then Pin.</p>
          <p>Keep the test taker in view; lockdown and pinning do not stop another device being used.</p>
        </div>
      </details>

      <Button type="button" onClick={start} disabled={phase.name === "loading" || phase.name === "grading"}>
        {phase.name === "loading" ? "Starting…" : phase.name === "grading" ? "Grading…" : phase.name === "intro" ? "Start the test in lockdown mode" : "Take a new test"}
      </Button>
    </section>
  )
}
