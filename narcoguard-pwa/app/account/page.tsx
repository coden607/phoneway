import type { Metadata } from "next"
import { AccountPanel } from "@/components/account/account-panel"

export const metadata: Metadata = {
  title: "Account and backup | NarcoGuard",
  description: "Optional account: encrypted backup of contacts and settings, watch registration and Hero certificate. Never needed for emergency help.",
  robots: { index: false },
}

export default function AccountPage() {
  return (
    <main className="max-w-3xl mx-auto p-4 sm:p-8 space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold">Account and backup</h1>
        <p className="text-muted-foreground">Optional. Call 911, overdose steps, contacts and the resource finder all work without signing in.</p>
      </header>
      <AccountPanel />
    </main>
  )
}
