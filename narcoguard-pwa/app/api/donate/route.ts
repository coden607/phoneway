import { NextResponse } from "next/server"
import { checkoutSessionParams, donationMode, parseDonationAmount } from "@/lib/donations"

const noStore = { "Cache-Control": "private, no-store" }

export async function GET() {
  const mode = donationMode(process.env)
  return NextResponse.json({ available: mode !== null, mode }, { headers: noStore })
}

export async function POST(request: Request) {
  const mode = donationMode(process.env)
  if (!mode) return NextResponse.json({ available: false, error: "Online donations are not switched on yet." }, { status: 503, headers: noStore })

  const body = (await request.json().catch(() => null)) as { amount?: unknown } | null
  const amount = parseDonationAmount(body?.amount)
  if (amount === null) return NextResponse.json({ error: "Choose a whole-dollar amount from $5 to $10,000." }, { status: 400, headers: noStore })

  const origin = new URL(request.url).origin
  try {
    const response = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`, "Content-Type": "application/x-www-form-urlencoded" },
      body: checkoutSessionParams(amount, origin).toString(),
      signal: AbortSignal.timeout(15_000),
    })
    const session = (await response.json()) as { url?: string; error?: { type?: string } }
    if (!response.ok || !session.url) {
      // Stripe's error type only; never the key, amount details or customer data.
      console.warn(`[donate] checkout session failed: ${response.status} ${session.error?.type ?? ""}`)
      return NextResponse.json({ error: "The donation page could not be opened. Please try again." }, { status: 502, headers: noStore })
    }
    return NextResponse.json({ url: session.url, mode }, { headers: noStore })
  } catch {
    console.warn("[donate] checkout session request failed")
    return NextResponse.json({ error: "The donation page could not be opened. Please try again." }, { status: 502, headers: noStore })
  }
}
