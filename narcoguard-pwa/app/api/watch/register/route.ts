import { clientKey, isSameOrigin, json, readJson } from "@/lib/api-helpers"
import { getAuthContext, serviceRest } from "@/lib/supabase-auth"
import { checkRegistrationChallenge, issueBinding, issueRegistrationChallenge, verifyDeviceResponse } from "@/lib/watch-ownership"
import { type RegistrationRow, registryKeys, watchRegistryAvailable } from "@/lib/watch-registry"

// Registers a genuine watch to the signed-in account. Step 1 returns a signed challenge; step 2
// takes the watch's secure-element signature over it. A watch already registered to someone else
// is refused: only NarcoGuard support can release it, and never for a sale or trade.

export const dynamic = "force-dynamic"

const attempts = new Map<string, number[]>()
function limited(key: string) {
  const now = Date.now()
  const recent = (attempts.get(key) ?? []).filter((at) => now - at < 10 * 60_000)
  recent.push(now)
  attempts.set(key, recent)
  return recent.length > 20
}

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return json({ error: "Cross-origin request rejected" }, 403)
  if (!(await watchRegistryAvailable())) return json({ error: "Watch registration is not switched on yet." }, 503)
  if (limited(clientKey(request))) return json({ error: "Too many attempts. Try again in a few minutes." }, 429)
  const auth = await getAuthContext().catch(() => null)
  if (!auth) return json({ error: "Sign in to register your watch." }, 401)
  const keys = (await registryKeys())!
  const body = await readJson(request)
  if (!body) return json({ error: "Invalid request" }, 400)

  if (body.step === "challenge") {
    const token = await issueRegistrationChallenge(keys.privateKey)
    const challenge = await checkRegistrationChallenge(token, keys.publicKey)
    return json({ challengeToken: token, nonce: challenge!.nonce })
  }

  const challenge = await checkRegistrationChallenge(body.challengeToken, keys.publicKey)
  if (!challenge) return json({ error: "The registration challenge expired. Start again." }, 400)
  if (typeof body.certificate !== "string" || typeof body.signature !== "string" || body.signature.length > 200) return json({ error: "The watch did not send its proof." }, 400)
  const serial = await verifyDeviceResponse({ registryKey: keys.publicKey, certificateToken: body.certificate, challenge: challenge.nonce, signature: body.signature })
  if (!serial) return json({ error: "This is not a genuine NarcoGuard watch, or its proof is invalid." }, 400)

  const existing = await serviceRest(`watch_registrations?select=serial,auth_user_id,owner_tag,generation,binding_token&serial=eq.${encodeURIComponent(serial)}`)
  if (!existing.ok) return json({ error: "Registration is unavailable." }, 503)
  const [row] = (await existing.json()) as RegistrationRow[]
  if (row) {
    if (row.auth_user_id === auth.user.id) return json({ serial, bindingToken: row.binding_token, alreadyYours: true })
    return json({ error: "This watch is registered to its owner. It cannot be registered again after a sale or trade. If it was given to you by the NarcoGuard program, contact support." }, 409)
  }

  const issued = await issueBinding({ registryPrivateKey: keys.privateKey, serial, accountId: auth.user.id })
  if (!issued) return json({ error: "Registration failed." }, 500)
  const insert = await serviceRest("watch_registrations", {
    method: "POST",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({ serial, auth_user_id: auth.user.id, owner_tag: issued.binding.owner, generation: issued.binding.generation, binding_token: issued.token }),
  })
  // A unique-key conflict means someone registered it a moment earlier.
  if (insert.status === 409) return json({ error: "This watch was just registered by someone else." }, 409)
  if (!insert.ok) return json({ error: "Registration is unavailable." }, 503)
  return json({ serial, bindingToken: issued.token })
}
