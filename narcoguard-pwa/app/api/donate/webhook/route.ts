import { NextResponse } from "next/server"
import { verifyStripeSignature } from "@/lib/donations"

// Stripe calls this after a donation. Nothing is fulfilled or stored yet; the handler verifies the
// signature and records only the amount and mode, never the donor's name, email or card details.
export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET
  if (!secret) return NextResponse.json({ error: "Webhook not configured." }, { status: 503 })
  const payload = await request.text()
  if (!verifyStripeSignature(payload, request.headers.get("stripe-signature"), secret)) {
    return NextResponse.json({ error: "Invalid signature." }, { status: 400 })
  }
  const event = JSON.parse(payload) as { type?: string; livemode?: boolean; data?: { object?: { amount_total?: number; currency?: string; payment_status?: string } } }
  if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
    const session = event.data?.object
    console.info(`[donate] ${event.type} ${session?.payment_status ?? ""} ${session?.amount_total ?? 0} ${session?.currency ?? ""} live=${Boolean(event.livemode)}`)
  }
  return NextResponse.json({ received: true })
}
