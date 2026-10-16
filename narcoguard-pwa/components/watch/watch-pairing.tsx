"use client"

import { useEffect, useState, useSyncExternalStore } from "react"
import Link from "next/link"
import { Bluetooth } from "lucide-react"
import { Button } from "@/components/ui/button"
import { postJson } from "@/lib/hooks/use-contact-alert"
import { type PairStep, connectWatch, hasWebBluetooth, pairAndUnlock } from "@/lib/watch-ble"

const STEP_LABELS: Record<PairStep, string> = {
  reading: "Reading the watch…",
  registering: "Registering the watch to your account…",
  unlocking: "Unlocking for you…",
  done: "Done.",
}

const noSubscription = () => () => undefined

// Real pairing over Web Bluetooth with the NG owner-lock service. No NG watch has shipped yet, so
// the chooser will not find one today; nothing here pretends a watch is connected.
export function WatchPairing() {
  const supported = useSyncExternalStore(noSubscription, hasWebBluetooth, () => false)
  const [available, setAvailable] = useState<boolean | null>(null)
  const [busy, setBusy] = useState(false)
  const [step, setStep] = useState<PairStep>()
  const [message, setMessage] = useState<string>()

  useEffect(() => {
    let cancelled = false
    fetch("/api/watch", { cache: "no-store" })
      .then((response) => response.json())
      .then((body: { available?: boolean }) => { if (!cancelled) setAvailable(Boolean(body.available)) })
      .catch(() => { if (!cancelled) setAvailable(false) })
    return () => { cancelled = true }
  }, [])

  const pair = async () => {
    setBusy(true)
    setMessage(undefined)
    setStep(undefined)
    let link: Awaited<ReturnType<typeof connectWatch>> | undefined
    try {
      link = await connectWatch()
      const result = await pairAndUnlock(link, { post: postJson }, setStep)
      setMessage(result.ok
        ? `${result.watch.serial} is ${result.registered ? "registered to you and " : ""}unlocked.`
        : `${result.error}${result.watch ? ` (${result.watch.serial})` : ""} The watch's SOS and overdose steps still work.`)
    } catch (error) {
      const name = error instanceof Error ? error.name : ""
      setMessage(name === "NotFoundError" ? "No NarcoGuard watch was chosen." : error instanceof Error ? error.message : "Pairing failed.")
    } finally {
      link?.disconnect()
      setBusy(false)
    }
  }

  return (
    <section className="rounded-xl border p-4 space-y-3" aria-labelledby="pair-heading" data-testid="watch-pairing">
      <h3 id="pair-heading" className="flex items-center gap-2 font-semibold"><Bluetooth className="h-4 w-4" aria-hidden="true" />Pair and unlock your watch</h3>
      <p className="text-sm text-muted-foreground">
        Connects over Bluetooth, registers a new watch to your account, then sends it a 5-minute unlock proof. No NG watch has shipped yet,
        so the device chooser will not find one today.
      </p>
      {!supported ? (
        <p className="text-sm" role="status">This browser cannot use Bluetooth. Use Chrome or Edge on Android, Windows, macOS or ChromeOS.</p>
      ) : available === false ? (
        <p className="text-sm" role="status">Watch registration is not switched on yet. <Link href="/account" className="underline text-primary">Your account</Link> will hold the registration once it is.</p>
      ) : (
        <Button type="button" onClick={pair} disabled={busy || available === null}>{busy ? "Pairing…" : "Find my watch"}</Button>
      )}
      {busy && step && <p className="text-sm" role="status">{STEP_LABELS[step]}</p>}
      {message && <p className="text-sm" role="status">{message}</p>}
    </section>
  )
}
