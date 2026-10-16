"use client"

import { useState, useSyncExternalStore } from "react"
import { Button } from "@/components/ui/button"
import { alertMessage, peekInvite } from "@/lib/contact-alerts-shared"

type Step = "intro" | "code" | "done" | "declined"

const subscribeHash = (onChange: () => void) => {
  window.addEventListener("hashchange", onChange)
  return () => window.removeEventListener("hashchange", onChange)
}
const readHash = () => window.location.hash.slice(1)

/** Page a contact opens from an invite. The token stays in the URL fragment, so it is not sent in requests for the page. */
export function ConsentFlow() {
  const token = useSyncExternalStore(subscribeHash, readHash, () => "")
  const invite = token ? peekInvite(token) : null
  const [step, setStep] = useState<Step>("intro")
  const [masked, setMasked] = useState("")
  const [code, setCode] = useState("")
  const [pairing, setPairing] = useState("")
  const [error, setError] = useState<string>()
  const [busy, setBusy] = useState(false)

  const call = async (body: Record<string, unknown>) => {
    setBusy(true)
    setError(undefined)
    try {
      const response = await fetch("/api/contacts/verify", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token, ...body }) })
      const data = (await response.json()) as { masked?: string; pairingCode?: string; error?: string }
      if (!response.ok) setError(data.error ?? "Something went wrong. Try again.")
      return response.ok ? data : null
    } catch {
      setError("Could not reach NarcoGuard. Check your connection.")
      return null
    } finally {
      setBusy(false)
    }
  }

  if (!token) return <p className="text-muted-foreground" data-testid="consent-flow">Loading invite…</p>
  if (!invite) return <p data-testid="consent-flow" role="alert">This invite link is incomplete or damaged. Ask the person who sent it for a new one.</p>

  const sender = invite.s
  return (
    <div className="space-y-6" data-testid="consent-flow">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold">Be {sender}&apos;s emergency contact?</h1>
        <p className="text-muted-foreground">
          {sender} added you, {invite.n}, as an emergency contact in the NarcoGuard app. If you agree, {sender} can send you a text when they press their help button.
        </p>
      </header>

      <section className="space-y-2 rounded-xl border p-4">
        <h2 className="font-semibold">What you would receive</h2>
        <blockquote className="rounded-lg border-l-4 border-primary bg-background/60 p-3 text-sm">{alertMessage({ senderName: sender })}</blockquote>
        <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
          <li>Texts are sent only when {sender} chooses to send one; nothing is sent automatically or tracked.</li>
          <li>A text may include a map link if {sender} chooses to share their location at that moment.</li>
          <li>Reply STOP to any NarcoGuard text to stop all of them. You can also simply ignore this invite.</li>
          <li>You are not an emergency service. If someone may be in danger, call 911.</li>
        </ul>
      </section>

      {step === "intro" && (
        <div className="space-y-3">
          <p className="text-sm">To agree, confirm this is your phone. We&apos;ll text a code to the number {sender} entered.</p>
          <div className="flex flex-wrap gap-2">
            <Button type="button" disabled={busy} onClick={async () => { const data = await call({}); if (data) { setMasked(data.masked ?? ""); setStep("code") } }}>
              {busy ? "Sending…" : "I agree, text me a code"}
            </Button>
            <Button type="button" variant="outline" onClick={() => setStep("declined")}>No thanks</Button>
          </div>
        </div>
      )}

      {step === "code" && (
        <form
          className="space-y-3"
          onSubmit={async (event) => {
            event.preventDefault()
            const data = await call({ code })
            if (data?.pairingCode) {
              setPairing(data.pairingCode)
              setStep("done")
            }
          }}
        >
          <p className="text-sm">We texted a code to {masked}.</p>
          <label className="block text-sm">
            <span className="block">Code from the text</span>
            <input className="w-40 rounded border bg-background p-2 font-mono tracking-widest" inputMode="numeric" autoComplete="one-time-code" maxLength={10} value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))} />
          </label>
          <Button type="submit" disabled={busy || code.length < 4}>{busy ? "Checking…" : "Confirm"}</Button>
        </form>
      )}

      {step === "done" && (
        <section className="space-y-2 rounded-xl border border-green-500/50 bg-green-500/10 p-4" aria-live="polite">
          <h2 className="font-semibold">Last step: give {sender} this code</h2>
          <p className="font-mono text-4xl tracking-widest" data-testid="pairing-code">{pairing}</p>
          <p className="text-sm text-muted-foreground">Tell {sender} or text it to them. Once they enter it, you&apos;re their emergency contact. Reply STOP to any NarcoGuard text to opt out later.</p>
        </section>
      )}

      {step === "declined" && (
        <p className="rounded-xl border p-4" role="status">Okay. Nothing was saved and you won&apos;t receive alerts. You can close this page.</p>
      )}

      {error && <p className="text-sm" role="alert">{error}</p>}
    </div>
  )
}
