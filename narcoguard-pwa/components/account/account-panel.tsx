"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { type ContactsState, useEmergencyContacts } from "@/lib/emergency-contacts-store"
import { getUserPreferences, saveUserPreferences, type UserPreferences } from "@/lib/user-preferences"
import { MIN_PASSPHRASE_LENGTH, openVault, sealVault, type SealedVault } from "@/lib/vault-crypto"

type Account = { available: boolean; authenticated: boolean; user: { email?: string } | null }
type Backup = { v: 1; savedAt: string; contacts: ContactsState; preferences: UserPreferences }

// The account is optional: every safety feature works without one. Backup carries emergency
// contacts and settings only, sealed on this device; the Guardian planner is never included.

async function request<T>(url: string, init?: RequestInit): Promise<{ ok: boolean; status: number; data: T & { error?: string } }> {
  try {
    const response = await fetch(url, { cache: "no-store", ...init, headers: { "Content-Type": "application/json", ...init?.headers } })
    return { ok: response.ok, status: response.status, data: (await response.json()) as T & { error?: string } }
  } catch {
    return { ok: false, status: 0, data: { error: "Could not reach NarcoGuard. Check your connection." } as T & { error?: string } }
  }
}

export function AccountPanel() {
  const router = useRouter()
  const { state: contacts, update } = useEmergencyContacts()
  const [account, setAccount] = useState<Account | null>(null)
  const [passphrase, setPassphrase] = useState("")
  const [confirm, setConfirm] = useState("")
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState<string>()
  const [lastBackup, setLastBackup] = useState<string | null>()

  useEffect(() => {
    let cancelled = false
    request<Account>("/api/auth").then(({ ok, data }) => {
      if (cancelled) return
      setAccount(ok ? data : { available: data.available ?? true, authenticated: false, user: null })
      if (ok && data.authenticated) {
        request<{ vault: { updatedAt: string } | null }>("/api/account/vault").then(({ ok: found, data: vault }) => {
          if (!cancelled) setLastBackup(found ? (vault.vault?.updatedAt ?? null) : undefined)
        })
      }
    })
    return () => { cancelled = true }
  }, [])

  const run = async (task: () => Promise<string>) => {
    setBusy(true)
    setNote(undefined)
    try {
      setNote(await task())
    } finally {
      setBusy(false)
    }
  }

  const backUp = () => run(async () => {
    if (passphrase !== confirm) return "The passphrases do not match."
    const backup: Backup = { v: 1, savedAt: new Date().toISOString(), contacts, preferences: getUserPreferences() }
    let sealed: SealedVault
    try {
      sealed = await sealVault(backup, passphrase)
    } catch (error) {
      return error instanceof Error ? error.message : "Could not encrypt the backup."
    }
    const { ok, data } = await request<{ saved?: boolean }>("/api/account/vault", { method: "PUT", body: JSON.stringify({ sealed }) })
    if (!ok) return data.error ?? "The backup could not be saved."
    setLastBackup(backup.savedAt)
    return "Backed up. Only your passphrase can open it, so keep it somewhere safe."
  })

  const restore = () => run(async () => {
    const { ok, data } = await request<{ vault: { sealed: SealedVault } | null }>("/api/account/vault")
    if (!ok) return data.error ?? "The backup could not be loaded."
    if (!data.vault) return "There is no backup on this account yet."
    const backup = await openVault<Backup>(data.vault.sealed, passphrase)
    if (!backup || backup.v !== 1) return "That passphrase does not open this backup."
    update(() => backup.contacts)
    saveUserPreferences(backup.preferences)
    return `Restored ${backup.contacts.contacts.length} contact(s) and your settings from ${new Date(backup.savedAt).toLocaleString()}.`
  })

  const remove = () => run(async () => {
    if (!window.confirm("Delete the backup stored on your account? Contacts on this device stay.")) return "Nothing was deleted."
    const { ok, data } = await request<{ deleted?: boolean }>("/api/account/vault", { method: "DELETE" })
    if (!ok) return data.error ?? "The backup could not be deleted."
    setLastBackup(null)
    return "Backup deleted from your account."
  })

  const signOut = () => run(async () => {
    await request("/api/auth", { method: "POST", body: JSON.stringify({ action: "logout" }) })
    setAccount((current) => (current ? { ...current, authenticated: false, user: null } : current))
    router.refresh()
    return "Signed out. Your contacts and settings stay on this device."
  })

  if (!account) return <p className="text-sm text-muted-foreground" role="status">Checking your account…</p>

  if (!account.available) {
    return (
      <section className="rounded-xl border p-4 space-y-2" data-testid="account-unavailable">
        <h2 className="font-semibold">Accounts are not switched on yet</h2>
        <p className="text-sm text-muted-foreground">Everything works on this device without an account, including Call 911, overdose steps, contacts and the resource finder.</p>
      </section>
    )
  }

  if (!account.authenticated) {
    return (
      <section className="rounded-xl border p-4 space-y-3" data-testid="account-signed-out">
        <h2 className="font-semibold">You are not signed in</h2>
        <p className="text-sm text-muted-foreground">An account lets you back up contacts and settings, register your watch, and hold a Hero certificate. It is never needed for emergency help.</p>
        <Button asChild><Link href="/auth">Sign in or create an account</Link></Button>
      </section>
    )
  }

  return (
    <div className="space-y-6" data-testid="account-signed-in">
      <section className="rounded-xl border p-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold">Signed in</h2>
          <p className="text-sm text-muted-foreground">{account.user?.email}</p>
        </div>
        <Button type="button" variant="outline" onClick={signOut} disabled={busy}>Sign out</Button>
      </section>

      <section className="rounded-xl border p-4 space-y-3" aria-labelledby="backup-heading">
        <h2 id="backup-heading" className="font-semibold">Encrypted backup</h2>
        <p className="text-sm text-muted-foreground">
          Backs up your emergency contacts ({contacts.contacts.length}) and settings, encrypted on this device with a passphrase NarcoGuard never receives.
          Lose the passphrase and the backup cannot be opened by anyone. Your Guardian planner is not included.
        </p>
        <p className="text-sm" data-testid="backup-status">
          {lastBackup === undefined ? "Backup status unknown." : lastBackup ? `Last backup: ${new Date(lastBackup).toLocaleString()}` : "No backup yet."}
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor="vault-passphrase">Passphrase</Label>
            <Input id="vault-passphrase" type="password" autoComplete="new-password" minLength={MIN_PASSPHRASE_LENGTH} value={passphrase} onChange={(event) => setPassphrase(event.target.value)} className="mt-1" />
          </div>
          <div>
            <Label htmlFor="vault-confirm">Repeat passphrase (for a new backup)</Label>
            <Input id="vault-confirm" type="password" autoComplete="new-password" value={confirm} onChange={(event) => setConfirm(event.target.value)} className="mt-1" />
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" onClick={backUp} disabled={busy || passphrase.length < MIN_PASSPHRASE_LENGTH}>{busy ? "Working…" : "Back up now"}</Button>
          <Button type="button" variant="outline" onClick={restore} disabled={busy || !passphrase}>Restore to this device</Button>
          <Button type="button" variant="ghost" onClick={remove} disabled={busy || !lastBackup}>Delete backup</Button>
        </div>
      </section>
      {note && <p className="text-sm" role="status">{note}</p>}
    </div>
  )
}
