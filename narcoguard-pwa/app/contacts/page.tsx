import type { Metadata } from "next"
import { EmergencyContacts } from "@/components/contacts/emergency-contacts"

export const metadata: Metadata = {
  title: "Emergency contacts | NarcoGuard",
  description: "Choose people to text when you ask for help. Each contact agrees first, and nothing is sent without you pressing send.",
  robots: { index: false },
}

export default function ContactsPage() {
  return (
    <main className="max-w-3xl mx-auto p-4 sm:p-8 space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold">Emergency contacts</h1>
        <p className="text-muted-foreground">Pick up to five people who agree to get a text when you ask for help.</p>
      </header>
      <EmergencyContacts />
    </main>
  )
}
