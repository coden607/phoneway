import { clientKey, isSameOrigin, json, readJson } from "@/lib/api-helpers"
import { getAuthContext, isAuthConfigured, userRest } from "@/lib/supabase-auth"
import { isSealedVault } from "@/lib/vault-crypto"

// Encrypted settings backup. The browser seals the data; this route only checks the shape and
// stores ciphertext under row-level security. It never sees the passphrase or the contents.

export const dynamic = "force-dynamic"

const writes = new Map<string, number[]>()
function limited(key: string) {
  const now = Date.now()
  const recent = (writes.get(key) ?? []).filter((at) => now - at < 60_000)
  recent.push(now)
  writes.set(key, recent)
  return recent.length > 10
}

async function context() {
  if (!isAuthConfigured()) return { error: json({ error: "Accounts are not switched on yet.", available: false }, 503) }
  try {
    const auth = await getAuthContext()
    return auth ? { auth } : { error: json({ error: "Sign in to use backup." }, 401) }
  } catch {
    return { error: json({ error: "The account service is unavailable." }, 503) }
  }
}

export async function GET() {
  const { auth, error } = await context()
  if (!auth) return error
  const response = await userRest(auth.accessToken, `user_vaults?select=sealed,version,updated_at&auth_user_id=eq.${encodeURIComponent(auth.user.id)}`)
  if (!response.ok) return json({ error: "Backup is unavailable." }, 503)
  const rows = (await response.json()) as { sealed: unknown; version: number; updated_at: string }[]
  return json({ vault: rows[0] ? { sealed: rows[0].sealed, version: rows[0].version, updatedAt: rows[0].updated_at } : null })
}

export async function PUT(request: Request) {
  if (!isSameOrigin(request)) return json({ error: "Cross-origin request rejected" }, 403)
  if (limited(clientKey(request))) return json({ error: "Too many backups. Try again in a minute." }, 429)
  const { auth, error } = await context()
  if (!auth) return error
  const body = await readJson(request)
  if (!body || !isSealedVault(body.sealed)) return json({ error: "The backup is not a sealed vault." }, 400)
  const response = await userRest(auth.accessToken, "user_vaults?on_conflict=auth_user_id", {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify({ auth_user_id: auth.user.id, sealed: body.sealed, updated_at: new Date().toISOString() }),
  })
  if (!response.ok) return json({ error: "The backup could not be saved." }, 503)
  return json({ saved: true })
}

export async function DELETE(request: Request) {
  if (!isSameOrigin(request)) return json({ error: "Cross-origin request rejected" }, 403)
  const { auth, error } = await context()
  if (!auth) return error
  const response = await userRest(auth.accessToken, `user_vaults?auth_user_id=eq.${encodeURIComponent(auth.user.id)}`, { method: "DELETE", headers: { Prefer: "return=minimal" } })
  if (!response.ok) return json({ error: "The backup could not be deleted." }, 503)
  return json({ deleted: true })
}
