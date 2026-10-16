"use client"

import { useState } from "react"
import Link from "next/link"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { AlertTriangle, MapPin, MessageSquare, Phone, Pill, Share2 } from "lucide-react"
import { alertMessage } from "@/lib/contact-alerts-shared"
import { useEmergencyContacts } from "@/lib/emergency-contacts-store"
import { useContactAlert } from "@/lib/hooks/use-contact-alert"

interface EmergencyModalProps {
  open: boolean
  onClose: () => void
}

// Real actions only: the phone dialer, the person's own consented contacts, the share sheet and
// the resource finder. Nothing here claims that help was dispatched.

const OVERDOSE_STEPS = [
  "Call 911. Say the person is not breathing or won't wake up.",
  "Give naloxone (Narcan): one spray in one nostril.",
  "If you are trained, give rescue breaths: one every 5 seconds.",
  "No response after 2–3 minutes? Give a second dose in the other nostril.",
  "If they are breathing, roll them onto their side (recovery position).",
  "Stay with them. Naloxone can wear off before the opioid does.",
]

async function shareLocation(): Promise<string> {
  if (!("geolocation" in navigator)) return "Location is not available in this browser."
  const position = await new Promise<GeolocationPosition | null>((resolve) =>
    navigator.geolocation.getCurrentPosition(resolve, () => resolve(null), { enableHighAccuracy: true, timeout: 10_000, maximumAge: 30_000 }),
  )
  if (!position) return "Location permission was not given."
  const link = `https://maps.google.com/?q=${position.coords.latitude.toFixed(5)},${position.coords.longitude.toFixed(5)}`
  const text = `I need help. My location: ${link}`
  try {
    if (typeof navigator.share === "function") {
      await navigator.share({ title: "My location", text })
      return "Location shared."
    }
    await navigator.clipboard.writeText(text)
    return "Location link copied. Paste it into a message."
  } catch {
    return "Sharing was cancelled."
  }
}

export function EmergencyModal({ open, onClose }: EmergencyModalProps) {
  const { state } = useEmergencyContacts()
  const { available, sending, deliveries, note, send } = useContactAlert()
  const [stage, setStage] = useState<"idle" | "preview">("idle")
  const [includeLocation, setIncludeLocation] = useState(true)
  const [shareNote, setShareNote] = useState<string>()
  const confirmed = state.contacts.filter((contact) => contact.status === "confirmed" && contact.proof)
  const senderName = state.senderName.trim() || confirmed[0]?.name || "Your name"

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) { setStage("idle"); onClose() } }}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto" data-testid="emergency-modal">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <AlertTriangle className="h-6 w-6 text-destructive" aria-hidden="true" />Get help now
          </DialogTitle>
          <DialogDescription>Call 911 first. The other buttons reach people you chose; NarcoGuard does not contact 911 for you.</DialogDescription>
        </DialogHeader>

        <Button asChild size="lg" className="w-full bg-none bg-red-600 py-6 text-lg text-white hover:bg-red-700">
          <a href="tel:911"><Phone className="mr-2 h-5 w-5" aria-hidden="true" />Call 911</a>
        </Button>

        <section aria-labelledby="overdose-steps" className="rounded-lg border border-red-500/40 bg-red-500/10 p-3">
          <h3 id="overdose-steps" className="font-semibold">If someone may be overdosing</h3>
          <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm">
            {OVERDOSE_STEPS.map((step) => <li key={step}>{step}</li>)}
          </ol>
          <p className="mt-2 text-xs text-muted-foreground">General guidance, not medical advice. Follow the 911 dispatcher&apos;s instructions.</p>
        </section>

        <section aria-labelledby="contacts-alert" className="space-y-2 rounded-lg border p-3">
          <h3 id="contacts-alert" className="flex items-center gap-2 font-semibold"><MessageSquare className="h-4 w-4" aria-hidden="true" />Text my emergency contacts</h3>
          {confirmed.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No confirmed contacts on this device. <Link href="/contacts" className="underline text-primary">Set them up</Link> for next time.
            </p>
          ) : available === false ? (
            <p className="text-sm text-muted-foreground">Texting is not switched on yet, so no text can be sent. Call 911 or call your contacts directly.</p>
          ) : stage === "idle" ? (
            <Button type="button" className="w-full" disabled={sending || available === null} onClick={() => setStage("preview")}>
              Text {confirmed.map((contact) => contact.name).join(", ")}
            </Button>
          ) : (
            <div className="space-y-2">
              <blockquote className="rounded border-l-4 border-primary bg-background/60 p-2 text-sm" data-testid="emergency-alert-preview">
                {alertMessage({ senderName, locationUrl: includeLocation ? "https://maps.google.com/?q=…" : undefined })}
              </blockquote>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={includeLocation} onChange={(event) => setIncludeLocation(event.target.checked)} />
                Include my current location
              </label>
              <div className="flex gap-2">
                <Button type="button" className="flex-1 bg-none bg-red-600 text-white hover:bg-red-700" disabled={sending} onClick={async () => { if (await send({ contacts: confirmed, includeLocation })) setStage("idle") }}>
                  {sending ? "Sending…" : "Send now"}
                </Button>
                <Button type="button" variant="outline" onClick={() => setStage("idle")}>Cancel</Button>
              </div>
            </div>
          )}
          {note && <p className="text-sm" role="status">{note}</p>}
          {deliveries.length > 0 && (
            <ul className="space-y-1 text-sm" aria-live="polite" data-testid="emergency-deliveries">
              {deliveries.map((delivery) => <li key={delivery.masked}><span className="font-medium">{delivery.name}</span>: {delivery.label}</li>)}
            </ul>
          )}
        </section>

        <div className="grid gap-2 sm:grid-cols-2">
          <Button type="button" variant="outline" onClick={async () => setShareNote(await shareLocation())}><Share2 className="mr-2 h-4 w-4" aria-hidden="true" />Share my location</Button>
          <Button asChild variant="outline"><Link href="/help"><Pill className="mr-2 h-4 w-4" aria-hidden="true" />Find naloxone and help</Link></Button>
        </div>
        {shareNote && <p className="text-sm" role="status"><MapPin className="mr-1 inline h-4 w-4" aria-hidden="true" />{shareNote}</p>}
      </DialogContent>
    </Dialog>
  )
}
