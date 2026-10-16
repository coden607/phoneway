"use client"

import { useState } from "react"
import { CheckCircle2, Copy, MessageSquare, Phone, Send, Share2, Trash2, UserPlus } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { MAX_CONTACTS, alertMessage, inviteShareText } from "@/lib/contact-alerts-shared"
import { clearEmergencyContacts, useEmergencyContacts, type StoredContact } from "@/lib/emergency-contacts-store"
import { postJson, useContactAlert } from "@/lib/hooks/use-contact-alert"

const inputClass = "w-full rounded border bg-background p-2"

function InviteActions({ contact, senderName }: { contact: StoredContact; senderName: string }) {
  const [copied, setCopied] = useState(false)
  if (!contact.link) return null
  const text = inviteShareText(senderName, contact.link)
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
    } catch {
      setCopied(false)
    }
  }
  const share = async () => {
    if (!("share" in navigator)) return copy()
    try {
      await navigator.share({ title: "NarcoGuard emergency contact invite", text })
    } catch {
      // Cancelled; the other buttons still work.
    }
  }
  return (
    <div className="flex flex-wrap gap-2">
      <Button type="button" size="sm" variant="outline" onClick={share}><Share2 className="mr-1 h-4 w-4" aria-hidden="true" />Share invite</Button>
      <Button asChild size="sm" variant="outline">
        <a href={`sms:?&body=${encodeURIComponent(text)}`}><MessageSquare className="mr-1 h-4 w-4" aria-hidden="true" />Text it from my phone</a>
      </Button>
      <Button type="button" size="sm" variant="outline" onClick={copy}><Copy className="mr-1 h-4 w-4" aria-hidden="true" />{copied ? "Copied" : "Copy invite"}</Button>
    </div>
  )
}

function PairForm({ contact, onPaired }: { contact: StoredContact; onPaired: (proof: string) => void }) {
  const [code, setCode] = useState("")
  const [error, setError] = useState<string>()
  const [busy, setBusy] = useState(false)
  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    setBusy(true)
    setError(undefined)
    const { ok, data } = await postJson<{ proof?: string }>("/api/contacts/pair", { token: contact.invite, code })
    setBusy(false)
    if (ok && data.proof) onPaired(data.proof)
    else setError(data.error ?? "That code could not be checked.")
  }
  return (
    <form onSubmit={submit} className="flex flex-wrap items-end gap-2">
      <label className="text-sm">
        <span className="block">Code {contact.name} gives you</span>
        <input className={`${inputClass} w-40 font-mono tracking-widest`} inputMode="numeric" autoComplete="off" maxLength={9} placeholder="1234 5678" value={code} onChange={(event) => setCode(event.target.value.replace(/[^\d ]/g, ""))} aria-label={`8-digit code from ${contact.name}`} />
      </label>
      <Button type="submit" size="sm" disabled={busy || code.replace(/\D/g, "").length !== 8}>{busy ? "Checking…" : "Confirm contact"}</Button>
      {error && <p className="w-full text-sm" role="alert">{error}</p>}
    </form>
  )
}

function invitedContact(name: string, masked: string, invite: string, link: string): StoredContact {
  return { id: crypto.randomUUID(), name: name.trim(), masked, status: "invited", invite, link, addedAt: Date.now() }
}

export function EmergencyContacts() {
  const { state, update } = useEmergencyContacts()
  const { available, sending, deliveries, note: sendNote, send: sendAlert } = useContactAlert()
  const [form, setForm] = useState({ name: "", phone: "" })
  const [formError, setFormError] = useState<string>()
  const [adding, setAdding] = useState(false)
  const [includeLocation, setIncludeLocation] = useState(false)
  const [confirm, setConfirm] = useState<null | { test: boolean; contacts: StoredContact[] }>(null)

  const confirmed = state.contacts.filter((contact) => contact.status === "confirmed" && contact.proof)
  const senderName = state.senderName.trim()

  const addContact = async (event: React.FormEvent) => {
    event.preventDefault()
    setFormError(undefined)
    if (!senderName) return setFormError("Add your name first, so your contact knows who is asking.")
    if (state.contacts.length >= MAX_CONTACTS) return setFormError(`You can add up to ${MAX_CONTACTS} contacts.`)
    setAdding(true)
    const { ok, data } = await postJson<{ token?: string; link?: string; masked?: string }>("/api/contacts/invite", { contactName: form.name, phone: form.phone, senderName })
    setAdding(false)
    if (!ok || !data.token || !data.link || !data.masked) return setFormError(data.error ?? "The invite could not be created.")
    const contact = invitedContact(form.name, data.masked, data.token, data.link)
    update((current) => ({ ...current, contacts: [...current.contacts, contact] }))
    setForm({ name: "", phone: "" })
  }

  const markPaired = (id: string, proof: string) =>
    update((current) => ({ ...current, contacts: current.contacts.map((contact) => (contact.id === id ? { ...contact, status: "confirmed", proof, invite: undefined, link: undefined } : contact)) }))

  const remove = (id: string) => update((current) => ({ ...current, contacts: current.contacts.filter((contact) => contact.id !== id) }))

  const send = async () => {
    if (!confirm) return
    const { test, contacts } = confirm
    setConfirm(null)
    await sendAlert({ contacts, test, includeLocation })
  }

  const preview = alertMessage({ senderName: senderName || "Your name", locationUrl: includeLocation ? "https://maps.google.com/?q=…" : undefined })

  return (
    <div className="space-y-8" data-testid="emergency-contacts">
      <div className="rounded-xl border border-red-500/50 bg-red-500/10 p-4">
        <p className="font-semibold">In an emergency, call 911 first.</p>
        <p className="text-sm text-muted-foreground">Texts to your contacts can be delayed or missed. They are not an emergency service.</p>
        <Button asChild className="mt-3 bg-none bg-red-600 hover:bg-red-700 text-white"><a href="tel:911"><Phone className="mr-2 h-4 w-4" aria-hidden="true" />Call 911</a></Button>
      </div>

      {available === false && (
        <p className="rounded-lg border border-amber-500/50 bg-amber-500/10 p-3 text-sm" role="status" data-testid="alerts-unavailable">
          Text alerts are not switched on yet. Contacts you already confirmed stay on this device, but no texts can be sent until NarcoGuard&apos;s texting service is connected.
        </p>
      )}

      <section id="alert" className="space-y-3 rounded-xl border p-5" aria-labelledby="alert-heading">
        <h2 id="alert-heading" className="text-xl font-semibold">Text my emergency contacts</h2>
        {confirmed.length === 0 ? (
          <p className="text-sm text-muted-foreground">No confirmed contacts yet. Add one below; they have to agree before they can receive alerts.</p>
        ) : (
          <>
            <p className="text-sm">This exact text goes to {confirmed.map((contact) => contact.name).join(", ")}:</p>
            <blockquote className="rounded-lg border-l-4 border-primary bg-background/60 p-3 text-sm" data-testid="alert-preview">{preview}</blockquote>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={includeLocation} onChange={(event) => setIncludeLocation(event.target.checked)} />
              Include my current location as a map link (only in this text, not saved)
            </label>
            <div className="flex flex-wrap gap-2">
              <Button type="button" className="bg-none bg-red-600 hover:bg-red-700 text-white" disabled={!available || sending} onClick={() => setConfirm({ test: false, contacts: confirmed })}>
                <Send className="mr-2 h-4 w-4" aria-hidden="true" />{sending ? "Sending…" : `Send alert to ${confirmed.length} contact${confirmed.length === 1 ? "" : "s"}`}
              </Button>
            </div>
          </>
        )}
        {sendNote && <p className="text-sm" role="status">{sendNote}</p>}
        {deliveries.length > 0 && (
          <ul className="space-y-1 text-sm" aria-live="polite" data-testid="deliveries">
            {deliveries.map((delivery) => (
              <li key={delivery.masked}><span className="font-medium">{delivery.name}</span> {delivery.masked}: {delivery.label}</li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-4 rounded-xl border p-5" aria-labelledby="contacts-heading">
        <h2 id="contacts-heading" className="text-xl font-semibold">Your emergency contacts</h2>
        <label className="block text-sm">
          <span className="block font-medium">Your name, as your contacts know you</span>
          <input className={`${inputClass} max-w-sm`} maxLength={40} value={state.senderName} onChange={(event) => update((current) => ({ ...current, senderName: event.target.value }))} placeholder="First name" />
          <span className="block text-xs text-muted-foreground">Each contact sees the name you used when you invited them.</span>
        </label>

        {state.contacts.length > 0 && (
          <ul className="space-y-3">
            {state.contacts.map((contact) => (
              <li key={contact.id} className="space-y-3 rounded-lg border p-3" data-testid="contact">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p>
                    <span className="font-semibold">{contact.name}</span> <span className="text-muted-foreground">{contact.masked}</span>{" "}
                    {contact.status === "confirmed" ? (
                      <span className="inline-flex items-center gap-1 text-sm text-green-400"><CheckCircle2 className="h-4 w-4" aria-hidden="true" />Agreed to alerts</span>
                    ) : (
                      <span className="text-sm text-amber-300">Waiting for them to agree</span>
                    )}
                  </p>
                  <div className="flex gap-2">
                    {contact.status === "confirmed" && (
                      <Button type="button" size="sm" variant="outline" disabled={!available || sending} onClick={() => setConfirm({ test: true, contacts: [contact] })}>Send test text</Button>
                    )}
                    <Button type="button" size="sm" variant="outline" onClick={() => remove(contact.id)} aria-label={`Remove ${contact.name}`}><Trash2 className="h-4 w-4" aria-hidden="true" /></Button>
                  </div>
                </div>
                {contact.status === "invited" && (
                  <div className="space-y-3 text-sm">
                    <p className="text-muted-foreground">1. Send {contact.name} the invite from your own phone. 2. They open it, confirm their number and see an 8-digit code. 3. Enter that code here.</p>
                    <InviteActions contact={contact} senderName={senderName || "Someone"} />
                    <PairForm contact={contact} onPaired={(proof) => markPaired(contact.id, proof)} />
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}

        {state.contacts.length < MAX_CONTACTS && (
          <form onSubmit={addContact} className="grid gap-3 rounded-lg border border-dashed p-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
            <label className="text-sm">
              <span className="block">Contact&apos;s name</span>
              <input className={inputClass} maxLength={40} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required />
            </label>
            <label className="text-sm">
              <span className="block">Their US mobile number</span>
              <input className={inputClass} type="tel" inputMode="tel" autoComplete="off" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} placeholder="(607) 555-0123" required />
            </label>
            <Button type="submit" disabled={adding || available === false}><UserPlus className="mr-2 h-4 w-4" aria-hidden="true" />{adding ? "Creating…" : "Create invite"}</Button>
            {formError && <p className="text-sm sm:col-span-3" role="alert">{formError}</p>}
          </form>
        )}
      </section>

      <section className="space-y-2 text-sm text-muted-foreground" aria-labelledby="privacy-heading">
        <h2 id="privacy-heading" className="text-base font-semibold text-foreground">How this works and your privacy</h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>Nothing is ever sent automatically. A text goes out only when you press send after seeing it.</li>
          <li>A contact receives alerts only after they open your invite, confirm their number with a code, and agree. They can reply STOP at any time.</li>
          <li>Contacts are saved only on this device, not on NarcoGuard servers. Anyone using this device can see them; clearing site data or the button below removes them.</li>
          <li>Texts are sent through Twilio. Your location is included only if you tick the box, only in that text, and is not stored.</li>
        </ul>
        {state.contacts.length > 0 && (
          <Button type="button" variant="outline" size="sm" onClick={() => { if (window.confirm("Remove all emergency contacts from this device?")) clearEmergencyContacts() }}>Remove all contacts from this device</Button>
        )}
      </section>

      <AlertDialog open={confirm !== null} onOpenChange={(open) => !open && setConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirm?.test ? "Send a test text?" : "Send your alert now?"}</AlertDialogTitle>
            <AlertDialogDescription>
              {confirm?.test
                ? `${confirm.contacts[0]?.name} will get a text saying this is only a test.`
                : `${confirm?.contacts.map((contact) => contact.name).join(", ")} will get the text shown above${includeLocation ? ", with your current location" : ""}.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={send}>{confirm?.test ? "Send test" : "Send alert"}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
