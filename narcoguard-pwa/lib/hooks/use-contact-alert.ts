"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import type { StoredContact } from "@/lib/emergency-contacts-store"

// Sends the fixed alert (or test) text to confirmed contacts and tracks delivery. Shared by the
// emergency button and the contacts page so both follow the same consent-checked path.

export type Delivery = { name: string; masked: string; state: string; label: string; statusToken?: string }

export async function postJson<T>(url: string, body: unknown): Promise<{ ok: boolean; data: T & { error?: string } }> {
  try {
    const response = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
    return { ok: response.ok, data: (await response.json()) as T & { error?: string } }
  } catch {
    return { ok: false, data: { error: "Could not reach NarcoGuard. Check your connection." } as T & { error?: string } }
  }
}

function currentPosition(): Promise<{ lat: number; lon: number } | undefined> {
  if (!("geolocation" in navigator)) return Promise.resolve(undefined)
  return new Promise((resolve) =>
    navigator.geolocation.getCurrentPosition(
      (position) => resolve({ lat: position.coords.latitude, lon: position.coords.longitude }),
      () => resolve(undefined),
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 60_000 },
    ),
  )
}

export function useContactAlert() {
  const [available, setAvailable] = useState<boolean | null>(null)
  const [sending, setSending] = useState(false)
  const [deliveries, setDeliveries] = useState<Delivery[]>([])
  const [note, setNote] = useState<string>()
  const pollRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch("/api/contacts", { cache: "no-store" })
      .then((response) => response.json())
      .then((body: { available?: boolean }) => { if (!cancelled) setAvailable(Boolean(body.available)) })
      .catch(() => { if (!cancelled) setAvailable(false) })
    return () => {
      cancelled = true
      if (pollRef.current) clearTimeout(pollRef.current)
    }
  }, [])

  const track = useCallback((initial: string[]) => {
    const step = (tokens: string[], attempt: number) => {
      if (tokens.length === 0 || attempt > 30) return
      pollRef.current = setTimeout(async () => {
        const { ok, data } = await postJson<{ statuses?: { token: string; state: string; label: string }[] }>("/api/alerts/status", { tokens })
        if (!ok || !data.statuses) return step(tokens, attempt + 1)
        const statuses = data.statuses
        setDeliveries((current) => current.map((delivery) => {
          const status = statuses.find((entry) => entry.token === delivery.statusToken)
          return status ? { ...delivery, state: status.state, label: status.label } : delivery
        }))
        step(statuses.filter((status) => status.state === "pending" || status.state === "sent").map((status) => status.token), attempt + 1)
      }, 4000)
    }
    step(initial, 0)
  }, [])

  /** Call only after the person has seen the preview and chosen to send. */
  const send = useCallback(async ({ contacts, test = false, includeLocation = false }: { contacts: StoredContact[]; test?: boolean; includeLocation?: boolean }) => {
    setSending(true)
    setNote(undefined)
    const location = !test && includeLocation ? await currentPosition() : undefined
    if (!test && includeLocation && !location) setNote("Your location could not be read, so the alert was sent without it.")
    const { ok, data } = await postJson<{ results?: Delivery[] }>("/api/alerts", { proofs: contacts.map((contact) => contact.proof), test, location })
    setSending(false)
    if (!ok || !data.results) {
      setDeliveries([])
      setNote(data.error ?? "The alert could not be sent. Call 911 if you need help now.")
      return false
    }
    setDeliveries(data.results)
    track(data.results.flatMap((result) => (result.statusToken ? [result.statusToken] : [])))
    return true
  }, [track])

  return { available, sending, deliveries, note, send }
}
