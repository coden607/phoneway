import { isAuthConfigured } from "@/lib/supabase-auth"
import { registryKeysFromJwk } from "@/lib/watch-ownership"

// Server side of the owner lock. Needs accounts, the service role (to write bindings that clients
// cannot forge or overwrite) and the registry private key. Without all three, registration is off.

let cached: { source: string; keys: Awaited<ReturnType<typeof registryKeysFromJwk>> } | undefined

export async function registryKeys() {
  const source = process.env.WATCH_REGISTRY_PRIVATE_JWK ?? ""
  if (cached?.source !== source) cached = { source, keys: await registryKeysFromJwk(source) }
  return cached.keys
}

export async function watchRegistryAvailable() {
  return isAuthConfigured() && Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY) && Boolean(await registryKeys())
}

export type RegistrationRow = { serial: string; auth_user_id: string; owner_tag: string; generation: number; binding_token: string }
