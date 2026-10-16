"use client"

import { FormEvent, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"

export default function AuthPage() {
  const router = useRouter()
  const [mode, setMode] = useState<"login" | "signup">("login")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [displayName, setDisplayName] = useState("")
  const [message, setMessage] = useState("")
  const [busy, setBusy] = useState(false)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    setMessage("")
    try {
      const response = await fetch("/api/auth", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: mode, email, password, displayName: mode === "signup" ? displayName : undefined }) })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error ?? "Unable to authenticate")
      // Re-render server components so they see the new session cookie, then show the account.
      router.replace("/account")
      router.refresh()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to authenticate")
    } finally {
      setBusy(false)
    }
  }

  return <main className="min-h-screen px-6 py-16 text-white"><div className="mx-auto max-w-md rounded-2xl border border-white/15 bg-black/30 p-8 shadow-2xl backdrop-blur-sm"><Link href="/" className="text-sm text-cyan-300 hover:text-cyan-200">← Back to NarcoGuard</Link><h1 className="mt-8 text-3xl font-bold">{mode === "login" ? "Sign in" : "Create your account"}</h1><p className="mt-2 text-sm text-white/70">Account access is protected by Supabase Auth. NarcoGuard is not a substitute for 911 or professional medical care.</p><form onSubmit={submit} className="mt-8 space-y-4">{mode === "signup" && <label className="block text-sm">Display name<input required value={displayName} onChange={(event) => setDisplayName(event.target.value)} className="mt-1 w-full rounded-lg bg-white/10 p-3" maxLength={80} /></label>}<label className="block text-sm">Email<input required type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} className="mt-1 w-full rounded-lg bg-white/10 p-3" maxLength={254} /></label><label className="block text-sm">Password<input required type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} value={password} onChange={(event) => setPassword(event.target.value)} className="mt-1 w-full rounded-lg bg-white/10 p-3" minLength={8} maxLength={128} /></label><button disabled={busy} className="w-full rounded-lg bg-cyan-500 p-3 font-semibold text-slate-950 disabled:opacity-50">{busy ? "Working…" : mode === "login" ? "Sign in" : "Create account"}</button></form>{message && <p role="alert" className="mt-4 text-sm text-amber-200">{message}</p>}<button type="button" onClick={() => { setMode(mode === "login" ? "signup" : "login"); setMessage("") }} className="mt-6 text-sm text-cyan-300 underline">{mode === "login" ? "Create an account" : "I already have an account"}</button></div></main>
}
