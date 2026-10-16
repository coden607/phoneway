import { isSameOrigin, json, readJson } from "@/lib/api-helpers"
import { type HeroPresenceRow, toHeroPresence, toHeroPresenceRow, validatePresence } from "@/lib/hero-presence"
import { getAuthContext, isAuthConfigured, userRest } from "@/lib/supabase-auth"

// A Hero's own short-lived presence for nearby discovery. Reads and writes go
// through row-level security as the signed-in account, so presence cannot be
// created or read for anyone else.
//
// Coordinates are never logged and never echoed beyond the owner. Presence is
// stored only after an explicit opt-in, is coarsened before storage, expires on
// a server-set clock, and is removed outright by DELETE - withdrawing consent
// clears the location rather than just flipping a flag.

export const dynamic = "force-dynamic"

const SELECT = "select=share_nearby,latitude,longitude,consented_at,expires_at"

const unavailable = () => json({ error: "Nearby sharing is not switched on yet." }, 503)

const notSharing = () => ({
  active: false,
  shareNearby: false,
  latitude: null,
  longitude: null,
  expiresAt: "",
})

async function owner() {
  if (!isAuthConfigured()) return null
  return await getAuthContext().catch(() => null)
}

/** Presence is only meaningful for a Hero with something on offer. */
async function hasActiveOffer(accessToken: string, userId: string): Promise<boolean> {
  const response = await userRest(accessToken,
    `hero_practical_offers?select=id&auth_user_id=eq.${userId}&active=is.true&limit=1`).catch(() => null)
  if (!response?.ok) return false
  const rows = (await response.json()) as { id: string }[]
  return rows.length > 0
}

export async function GET() {
  if (!isAuthConfigured()) return unavailable()
  const auth = await owner()
  if (!auth) return json({ error: "Sign in to see your sharing status." }, 401)

  const response = await userRest(auth.accessToken,
    `hero_presence?${SELECT}&auth_user_id=eq.${auth.user.id}&limit=1`).catch(() => null)
  if (!response?.ok) return json({ error: "Sharing status is unavailable." }, 503)
  const [row] = (await response.json()) as HeroPresenceRow[]
  // Off by default: no row means not sharing, which is a normal state.
  if (!row) return json({ presence: notSharing() })
  return json({ presence: toHeroPresence(row) })
}

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return json({ error: "Cross-origin request rejected" }, 403)
  if (!isAuthConfigured()) return unavailable()
  const auth = await owner()
  if (!auth) return json({ error: "Sign in to share your location." }, 401)

  const presence = validatePresence(await readJson(request))
  if (!presence.success) return json({ error: presence.error }, 400)

  if (!(await hasActiveOffer(auth.accessToken, auth.user.id))) {
    return json({ error: "Activate an offer before sharing your location for it." }, 409)
  }

  // The expiry comes from toHeroPresenceRow, never from the request, so a
  // client cannot renew stale presence by sending a later timestamp.
  const row = {
    ...toHeroPresenceRow(presence.data),
    auth_user_id: auth.user.id,
    updated_at: new Date().toISOString(),
  }
  const response = await userRest(auth.accessToken, `hero_presence?${SELECT}`, {
    method: "POST",
    // One row per account: a refresh replaces presence instead of leaving a trail.
    headers: { Prefer: "return=representation,resolution=merge-duplicates" },
    body: JSON.stringify(row),
  }).catch(() => null)
  if (!response?.ok) return json({ error: "Your location could not be shared." }, 503)
  const [saved] = (await response.json()) as HeroPresenceRow[]
  if (!saved) return json({ error: "Your location could not be shared." }, 503)
  return json({ presence: toHeroPresence(saved) })
}

export async function DELETE(request: Request) {
  if (!isSameOrigin(request)) return json({ error: "Cross-origin request rejected" }, 403)
  if (!isAuthConfigured()) return unavailable()
  const auth = await owner()
  if (!auth) return json({ error: "Sign in to stop sharing." }, 401)

  // Deleting the row removes the coordinates and the consent receipt together.
  const response = await userRest(auth.accessToken,
    `hero_presence?auth_user_id=eq.${auth.user.id}&select=auth_user_id`, {
      method: "DELETE",
      headers: { Prefer: "return=representation" },
    }).catch(() => null)
  if (!response?.ok) return json({ error: "Sharing could not be stopped." }, 503)
  // Already absent is success: stopping something that is off is not an error.
  return json({ presence: notSharing() })
}
