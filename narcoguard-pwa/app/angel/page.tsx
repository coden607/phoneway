import type { Metadata } from "next"
import { AngelAI } from "@/components/ai/angel-ai"
import { NeedsFinder } from "@/components/resources/needs-finder"

export const metadata: Metadata = {
  title: "Angel AI and nearby help | NarcoGuard",
  description: "Chat with Angel AI about next steps and goals, and search public directories for every kind of help near you, from food and shelter to treatment and job help.",
}

export default function AngelPage() {
  return (
    <main className="max-w-4xl mx-auto p-4 sm:p-8 space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold">Angel AI</h1>
        <p className="text-muted-foreground">
          Your lifeline assistant, guardian and resource finder. Ask Angel for help finding services or planning your next step toward a goal.
          The search below works without the chat.
        </p>
      </header>
      <AngelAI />
      <div className="border rounded-xl p-5">
        <NeedsFinder />
      </div>
    </main>
  )
}
