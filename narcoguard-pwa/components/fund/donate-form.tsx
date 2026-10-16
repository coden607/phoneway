"use client"

import { useEffect, useState } from "react"
import { Heart } from "lucide-react"
import { Button } from "@/components/ui/button"
import { MAX_DONATION, MIN_DONATION, SUGGESTED_DONATIONS } from "@/lib/donations-shared"

export function DonateForm({ fallbackUrl }: { fallbackUrl: string }) {
  const [status, setStatus] = useState<{ available: boolean; mode: "test" | "live" | null } | null>(null)
  const [amount, setAmount] = useState<number>(25)
  const [custom, setCustom] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string>()

  useEffect(() => {
    let cancelled = false
    fetch("/api/donate", { cache: "no-store" })
      .then((response) => response.json())
      .then((body: { available?: boolean; mode?: "test" | "live" | null }) => { if (!cancelled) setStatus({ available: Boolean(body.available), mode: body.mode ?? null }) })
      .catch(() => { if (!cancelled) setStatus({ available: false, mode: null }) })
    return () => { cancelled = true }
  }, [])

  const chosen = custom ? Number(custom) : amount
  const valid = Number.isInteger(chosen) && chosen >= MIN_DONATION && chosen <= MAX_DONATION

  const donate = async () => {
    if (!valid) return
    setBusy(true)
    setError(undefined)
    try {
      const response = await fetch("/api/donate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ amount: chosen }) })
      const body = (await response.json()) as { url?: string; error?: string }
      if (body.url) { window.location.assign(body.url); return }
      setError(body.error ?? "The donation page could not be opened.")
    } catch {
      setError("The donation page could not be opened. Check your connection.")
    }
    setBusy(false)
  }

  if (status && !status.available) {
    return (
      <div className="text-center space-y-3" data-testid="donate-fallback">
        <p className="text-sm text-muted-foreground">Online card donations are not switched on yet. You can donate through GoFundMe.</p>
        <Button asChild size="lg" className="bg-green-500 hover:bg-green-600 text-white">
          <a href={fallbackUrl} target="_blank" rel="noopener noreferrer"><Heart className="mr-2 h-5 w-5" aria-hidden="true" />Donate on GoFundMe</a>
        </Button>
      </div>
    )
  }

  return (
    <div className="max-w-xl mx-auto space-y-4" data-testid="donate-form">
      {status?.mode === "test" && (
        <p className="rounded-lg border border-yellow-500/50 bg-yellow-500/10 p-3 text-sm" role="note">
          Test mode: no real money is charged. Use Stripe test card 4242 4242 4242 4242.
        </p>
      )}
      <div className="flex flex-wrap justify-center gap-2" role="group" aria-label="Donation amount">
        {SUGGESTED_DONATIONS.map((value) => (
          <Button key={value} type="button" variant={!custom && amount === value ? "default" : "outline"} aria-pressed={!custom && amount === value} onClick={() => { setAmount(value); setCustom("") }}>
            ${value}
          </Button>
        ))}
      </div>
      <label className="flex items-center justify-center gap-2 text-sm">
        Other amount ($)
        <input inputMode="numeric" className="w-28 rounded border bg-background p-2" value={custom} maxLength={5} onChange={(event) => setCustom(event.target.value.replace(/\D/g, ""))} placeholder={`${MIN_DONATION}–${MAX_DONATION}`} />
      </label>
      {!valid && custom && <p className="text-center text-sm" role="status">Enter a whole-dollar amount from ${MIN_DONATION} to ${MAX_DONATION.toLocaleString()}.</p>}
      <div className="text-center">
        <Button size="lg" className="bg-green-500 hover:bg-green-600 text-white text-lg px-12" disabled={!status || busy || !valid} onClick={donate}>
          <Heart className="mr-2 h-5 w-5" aria-hidden="true" />
          {busy ? "Opening secure checkout…" : valid ? `Donate $${chosen}` : "Donate"}
        </Button>
      </div>
      {error && <p className="text-center text-sm" role="alert">{error}</p>}
      <p className="text-center text-xs text-muted-foreground">
        Payments are processed by Stripe; NarcoGuard never sees your card details. Prefer GoFundMe?{" "}
        <a className="underline" href={fallbackUrl} target="_blank" rel="noopener noreferrer">Donate there instead</a>.
      </p>
    </div>
  )
}
