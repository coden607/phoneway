import type { Metadata } from "next"
import { ConsentFlow } from "@/components/contacts/consent-flow"

export const metadata: Metadata = {
  title: "Emergency contact invite | NarcoGuard",
  description: "Read what being someone's NarcoGuard emergency contact means, then agree or decline.",
  robots: { index: false },
  referrer: "no-referrer",
}

export default function ConsentPage() {
  return (
    <main className="max-w-2xl mx-auto p-4 sm:p-8">
      <ConsentFlow />
    </main>
  )
}
