"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { CONTACT_METHODS, type ContactMethod, DESCRIPTION_MAX, type HeroOffer, OFFER_CATEGORIES, type OfferCategory, TITLE_MAX, contactHref } from "@/lib/hero-offers"

// A Hero's own practical offers: rides, food, clothing, anything concrete.
// These are deliberately separate from overdose certification - offering a ride
// is not a claim to be a trained responder - and an offer stays paused until
// its owner activates it. A contact number is shown only when its owner
// published one for that offer, and the disclosure says so plainly.

type Draft = { id: string | null; category: OfferCategory; title: string; description: string; method: ContactMethod | "none"; value: string }

const emptyDraft: Draft = { id: null, category: "transportation", title: "", description: "", method: "none", value: "" }

type LoadState = "loading" | "ready" | "signin" | "unavailable"

/** Reads the owner's offers. Kept outside the component so the effect below
 *  only ever updates state after awaiting, never synchronously. */
async function fetchOffers(): Promise<{ state: LoadState; offers: HeroOffer[] }> {
  const response = await fetch("/api/heroes/offers").catch(() => null)
  if (!response) return { state: "unavailable", offers: [] }
  if (response.status === 401) return { state: "signin", offers: [] }
  if (!response.ok) return { state: "unavailable", offers: [] }
  const body = (await response.json().catch(() => null)) as { offers?: HeroOffer[] } | null
  return { state: "ready", offers: body?.offers ?? [] }
}

export function HeroOfferManager() {
  const [offers, setOffers] = useState<HeroOffer[] | null>(null)
  const [state, setState] = useState<LoadState>("loading")
  const [draft, setDraft] = useState<Draft>(emptyDraft)
  const [note, setNote] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  // Bumped after every write so the list reloads from the server.
  const [reloads, setReloads] = useState(0)
  const load = () => setReloads((count) => count + 1)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const result = await fetchOffers()
      if (cancelled) return
      setOffers(result.offers)
      setState(result.state)
    })()
    return () => { cancelled = true }
  }, [reloads])

  const save = async (event: React.FormEvent) => {
    event.preventDefault()
    setBusy(true)
    setNote(null)
    const contact = draft.method === "none" ? null : { method: draft.method, value: draft.value }
    const response = await fetch("/api/heroes/offers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: draft.id, category: draft.category, title: draft.title, description: draft.description, contact, active: false }),
    }).catch(() => null)
    const body = (await response?.json().catch(() => null)) as { offer?: HeroOffer; error?: string } | null
    setBusy(false)
    if (!response?.ok) return setNote(body?.error ?? "The offer could not be saved.")
    setDraft(emptyDraft)
    setNote(draft.id ? "Offer updated. It stays paused until you activate it." : "Offer saved. It stays paused until you activate it.")
    load()
  }

  const setActive = async (offer: HeroOffer, active: boolean) => {
    setBusy(true)
    const response = await fetch("/api/heroes/offers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...offer, active }),
    }).catch(() => null)
    setBusy(false)
    if (!response?.ok) return setNote("That change could not be saved.")
    load()
  }

  const remove = async (offer: HeroOffer) => {
    setBusy(true)
    const response = await fetch(`/api/heroes/offers?id=${encodeURIComponent(offer.id)}`, { method: "DELETE" }).catch(() => null)
    setBusy(false)
    if (!response?.ok) return setNote("That offer could not be removed.")
    setNote("Offer removed.")
    load()
  }

  return (
    <section className="space-y-4" aria-labelledby="hero-offers-heading" data-testid="hero-offers">
      <h2 id="hero-offers-heading" className="text-xl font-bold">Practical offers</h2>
      <p className="text-sm text-muted-foreground">
        Concrete help you can give: a ride, a meal, warm clothes. These do not need certification and do not mean anyone is
        verified or guaranteed. Each offer stays paused until you turn it on, and you can pause or delete it at any time.
      </p>

      {state === "signin" ? (
        <p className="text-sm text-muted-foreground" role="status">Sign in to publish practical offers.</p>
      ) : state === "unavailable" ? (
        <p className="text-sm text-muted-foreground" role="status">Practical offers are not switched on yet. Emergency guidance and the resource directory still work.</p>
      ) : (
        <>
          <form className="space-y-3" onSubmit={save} data-testid="hero-offer-form">
            <div className="space-y-1">
              <Label htmlFor="offer-category">Category</Label>
              <select
                id="offer-category"
                className="w-full rounded-md border bg-background p-2 text-sm"
                value={draft.category}
                onChange={(event) => setDraft({ ...draft, category: event.target.value as OfferCategory })}
              >
                {OFFER_CATEGORIES.map((category) => <option key={category} value={category}>{category}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="offer-title">What are you offering?</Label>
              <Input id="offer-title" maxLength={TITLE_MAX} required value={draft.title}
                onChange={(event) => setDraft({ ...draft, title: event.target.value })} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="offer-description">Scope and limits</Label>
              <Textarea id="offer-description" maxLength={DESCRIPTION_MAX} value={draft.description}
                placeholder="When you are available, how far you can travel, anything you cannot do."
                onChange={(event) => setDraft({ ...draft, description: event.target.value })} />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="offer-contact-method">Contact for this offer</Label>
                <select
                  id="offer-contact-method"
                  className="w-full rounded-md border bg-background p-2 text-sm"
                  value={draft.method}
                  onChange={(event) => setDraft({ ...draft, method: event.target.value as Draft["method"] })}
                >
                  <option value="none">No contact method</option>
                  {CONTACT_METHODS.map((method) => <option key={method} value={method}>{method}</option>)}
                </select>
              </div>
              {draft.method !== "none" && (
                <div className="space-y-1">
                  <Label htmlFor="offer-contact-value">Number to publish</Label>
                  <Input id="offer-contact-value" inputMode="tel" value={draft.value}
                    onChange={(event) => setDraft({ ...draft, value: event.target.value })} />
                </div>
              )}
            </div>
            {draft.method !== "none" && (
              <p className="text-sm text-muted-foreground">
                This number is published with this offer. Anyone who can see the offer can {draft.method} it directly.
              </p>
            )}
            <div className="flex gap-2">
              <Button type="submit" disabled={busy || !draft.title.trim()}>{draft.id ? "Save changes" : "Save offer"}</Button>
              {draft.id && <Button type="button" variant="outline" onClick={() => setDraft(emptyDraft)}>Cancel</Button>}
            </div>
          </form>

          {note && <p className="text-sm" role="status">{note}</p>}

          {state === "loading" ? (
            <p className="text-sm text-muted-foreground">Loading your offers…</p>
          ) : !offers?.length ? (
            <p className="text-sm text-muted-foreground">You have no offers yet.</p>
          ) : (
            <ul className="space-y-3">
              {offers.map((offer) => {
                const href = contactHref(offer.contact)
                return (
                  <li key={offer.id} className="rounded-lg border p-3 space-y-2" data-testid="hero-offer-card">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-medium">{offer.title}</p>
                        <p className="text-xs text-muted-foreground">{offer.category}</p>
                      </div>
                      <span className="text-xs font-semibold">{offer.active ? "Active" : "Paused"}</span>
                    </div>
                    {offer.description && <p className="text-sm text-muted-foreground">{offer.description}</p>}
                    {href ? (
                      <a className="text-sm underline text-primary" href={href}>
                        {offer.contact?.method === "call" ? "Call" : "Text"} {offer.contact?.value}
                      </a>
                    ) : (
                      <p className="text-xs text-muted-foreground">No contact method published.</p>
                    )}
                    <div className="flex flex-wrap gap-2">
                      <Button type="button" size="sm" variant="outline" disabled={busy}
                        onClick={() => setActive(offer, !offer.active)}>{offer.active ? "Pause" : "Activate"}</Button>
                      <Button type="button" size="sm" variant="outline" disabled={busy}
                        onClick={() => setDraft({ id: offer.id, category: offer.category, title: offer.title, description: offer.description, method: offer.contact?.method ?? "none", value: offer.contact?.value ?? "" })}>Edit</Button>
                      <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => remove(offer)}>Delete</Button>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </>
      )}
    </section>
  )
}
