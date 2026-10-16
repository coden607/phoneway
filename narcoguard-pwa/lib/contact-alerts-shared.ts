// Pieces of the emergency-contact alert feature that both the browser and the server use.
// Signing and verification live in lib/contact-alerts.ts (server only).

export const MAX_CONTACTS = 5
export const NAME_MAX = 40

export type InvitePayload = { k: "invite"; v: 1; p: string; n: string; s: string; iat: number }

/** Reads an invite's public fields for display; never trust it without verifyToken on the server. */
export function peekInvite(token: string): Pick<InvitePayload, "n" | "s" | "iat"> | null {
  try {
    const binary = atob(token.split(".")[0].replace(/-/g, "+").replace(/_/g, "/"))
    const payload = JSON.parse(new TextDecoder().decode(Uint8Array.from(binary, (char) => char.charCodeAt(0)))) as InvitePayload
    return payload.k === "invite" ? { n: payload.n, s: payload.s, iat: payload.iat } : null
  } catch {
    return null
  }
}

export function alertMessage({ senderName, locationUrl, test }: { senderName: string; locationUrl?: string; test?: boolean }) {
  if (test) return `NarcoGuard test: ${senderName} is testing their emergency contact alert. No action needed. Reply STOP to stop these texts.`
  const where = locationUrl ? ` Location they shared: ${locationUrl}` : ""
  return `NarcoGuard alert: ${senderName} pressed their help button and asked you to check on them now.${where} If you can't reach them or they may be in danger, call 911. Reply STOP to stop these texts.`
}

/** Twilio delivery states mapped to plain language; 21610 means the contact replied STOP. */
export function deliveryLabel(status: string | undefined, errorCode?: number | null) {
  if (errorCode === 21610) return { state: "opted-out" as const, label: "Opted out (replied STOP)" }
  switch (status) {
    case "delivered":
      return { state: "delivered" as const, label: "Delivered" }
    case "sent":
      return { state: "sent" as const, label: "Sent to carrier" }
    case "failed":
    case "undelivered":
    case "canceled":
      return { state: "failed" as const, label: "Not delivered" }
    default:
      return { state: "pending" as const, label: "Sending…" }
  }
}

/** Text the person sends from their own phone with the invite link. */
export function inviteShareText(senderName: string, link: string) {
  return `${senderName} would like you as an emergency contact in the NarcoGuard app. Open this link to read what that means and to agree or decline: ${link}`
}
