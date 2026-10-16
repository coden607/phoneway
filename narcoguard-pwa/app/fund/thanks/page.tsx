import type { Metadata } from "next"
import Link from "next/link"

export const metadata: Metadata = { title: "Thank you | NarcoGuard", robots: { index: false } }

export default function DonationThanksPage() {
  return (
    <main className="max-w-2xl mx-auto p-6 sm:p-10 space-y-4 text-center">
      <h1 className="text-3xl font-bold">Thank you for your donation</h1>
      <p className="text-muted-foreground">
        Stripe emails your receipt. Your gift supports documented engineering and validation work on the NarcoGuard NG concept.
      </p>
      <p className="text-sm text-muted-foreground">
        Need a refund within 30 days or have a question? Email <a className="underline" href="mailto:narcoguard607@gmail.com">narcoguard607@gmail.com</a>.
      </p>
      <Link className="underline text-primary" href="/fund">Back to the support page</Link>
    </main>
  )
}
