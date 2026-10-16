import type { Metadata } from "next"
import { NeedsFinder } from "@/components/resources/needs-finder"

export const metadata: Metadata = {
  title: "Find help near me | NarcoGuard",
  description: "One search for food, shelter, water, toilets, showers, clinics, emergency rooms, pharmacies, treatment, community centers, libraries and job help near you, from public directories.",
}

export default function HelpPage() {
  return (
    <main className="max-w-4xl mx-auto p-4 sm:p-8 space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold">Find help</h1>
        <p className="text-muted-foreground">
          Listings are grouped from basic needs up to growth and goals. The grouping is only a guide: everyone decides what matters first, and help is never conditional on anything else.
        </p>
      </header>
      <div className="border rounded-xl p-5">
        <NeedsFinder />
      </div>
    </main>
  )
}
