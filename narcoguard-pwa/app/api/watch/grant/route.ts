import { isSameOrigin, json, readJson } from "@/lib/api-helpers"
import { getAuthContext, userRest } from "@/lib/supabase-auth"
import { isValidSerial, issueGrant, verifyRecord } from "@/lib/watch-ownership"
import { type RegistrationRow, registryKeys, watchRegistryAvailable } from "@/lib/watch-registry"

// Issues a 5-minute unlock proof for the watch's challenge, only to the account that owns it.
// Ownership is read under row-level security, so another account cannot even see the binding.

export const dynamic = "force-dynamic"

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return json({ error: "Cross-origin request rejected" }, 403)
  if (!(await watchRegistryAvailable())) return json({ error: "Watch unlock is not switched on yet." }, 503)
  const auth = await getAuthContext().catch(() => null)
  if (!auth) return json({ error: "Sign in as the watch's owner to unlock it." }, 401)
  const body = await readJson(request)
  if (!body || !isValidSerial(body.serial) || typeof body.nonce !== "string" || !/^[A-Za-z0-9_-]{16,64}$/.test(body.nonce)) return json({ error: "Invalid request" }, 400)

  const response = await userRest(auth.accessToken, `watch_registrations?select=serial,auth_user_id,owner_tag,generation,binding_token&serial=eq.${encodeURIComponent(body.serial)}`)
  if (!response.ok) return json({ error: "Unlock is unavailable." }, 503)
  const [row] = (await response.json()) as RegistrationRow[]
  if (!row) return json({ error: "This watch is not registered to your account." }, 403)

  const keys = (await registryKeys())!
  const binding = await verifyRecord(row.binding_token, keys.publicKey, "binding")
  if (!binding || binding.serial !== body.serial) return json({ error: "The owner record could not be verified." }, 500)
  const grant = await issueGrant({ registryPrivateKey: keys.privateKey, binding, accountId: auth.user.id, nonce: body.nonce })
  if (!grant) return json({ error: "This watch is not registered to your account." }, 403)
  return json({ grant, bindingToken: row.binding_token })
}
