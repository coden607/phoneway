import { createHmac, timingSafeEqual } from "node:crypto"

// Donations go through Stripe Checkout, so NarcoGuard never sees card details. Test mode is the
// default: a live secret key is refused unless DONATIONS_LIVE is "true", which is the explicit
// go-live switch required by AGENTS.md for production payments.

import { MAX_DONATION, MIN_DONATION } from "@/lib/donations-shared"

export { MAX_DONATION, MIN_DONATION, SUGGESTED_DONATIONS } from "@/lib/donations-shared"

export type DonationMode = "test" | "live"

export function donationMode(env: Record<string, string | undefined>): DonationMode | null {
  const key = env.STRIPE_SECRET_KEY
  if (!key) return null
  if (key.startsWith("sk_test_") || key.startsWith("rk_test_")) return "test"
  if ((key.startsWith("sk_live_") || key.startsWith("rk_live_")) && env.DONATIONS_LIVE === "true") return "live"
  return null
}

/** Whole US dollars within limits, or null. */
export function parseDonationAmount(value: unknown): number | null {
  const amount = typeof value === "string" ? Number(value) : value
  if (typeof amount !== "number" || !Number.isInteger(amount) || amount < MIN_DONATION || amount > MAX_DONATION) return null
  return amount
}

export function checkoutSessionParams(amountDollars: number, origin: string): URLSearchParams {
  return new URLSearchParams({
    mode: "payment",
    submit_type: "donate",
    "line_items[0][quantity]": "1",
    "line_items[0][price_data][currency]": "usd",
    "line_items[0][price_data][unit_amount]": String(amountDollars * 100),
    "line_items[0][price_data][product_data][name]": "Donation to NarcoGuard NG development",
    "line_items[0][price_data][product_data][description]": "Supports documented engineering and validation work. Not a purchase of a device or service.",
    "custom_text[submit][message]": "Donations are not tax-deductible. Refunds within 30 days on request; see the donation policy on narcoguard.app/fund.",
    success_url: `${origin}/fund/thanks?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/fund?donation=canceled#donate`,
  })
}

/**
 * Verifies a Stripe webhook signature header ("t=...,v1=...") against the raw body, rejecting
 * events older than the tolerance to prevent replays.
 */
export function verifyStripeSignature(payload: string, header: string | null, secret: string, nowSeconds = Math.floor(Date.now() / 1000), toleranceSeconds = 300): boolean {
  if (!header || !secret) return false
  const parts = header.split(",").map((part) => part.split("=") as [string, string])
  const timestamp = Number(parts.find(([key]) => key === "t")?.[1])
  const signatures = parts.filter(([key]) => key === "v1").map(([, value]) => value)
  if (!Number.isFinite(timestamp) || signatures.length === 0) return false
  if (Math.abs(nowSeconds - timestamp) > toleranceSeconds) return false
  const expected = createHmac("sha256", secret).update(`${timestamp}.${payload}`).digest("hex")
  return signatures.some((signature) => {
    if (signature.length !== expected.length) return false
    return timingSafeEqual(Buffer.from(signature, "hex"), Buffer.from(expected, "hex"))
  })
}
