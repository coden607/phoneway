import { isSameOrigin, json, readJson } from "@/lib/api-helpers"
import { type HeroOfferRow, toHeroOffer, toHeroOfferRow, validateOffer } from "@/lib/hero-offers"
import { getAuthContext, isAuthConfigured, userRest } from "@/lib/supabase-auth"

// A Hero's own practical offers. Every read and write goes through row-level
// security as the signed-in account, so one account cannot see or change
// another's offers even if an id is guessed. Contact values are never logged.

export const dynamic = "force-dynamic"

const SELECT = "select=id,category,title,description,contact_method,contact_value,active,updated_at"

const unavailable = () => json({ error: "Offers are not switched on yet." }, 503)

async function owner() {
  if (!isAuthConfigured()) return null
  return await getAuthContext().catch(() => null)
}

export async function GET() {
  if (!isAuthConfigured()) return unavailable()
  const auth = await owner()
  if (!auth) return json({ error: "Sign in to see your offers." }, 401)
  const response = await userRest(auth.accessToken,
    `hero_practical_offers?${SELECT}&auth_user_id=eq.${auth.user.id}&order=updated_at.desc`).catch(() => null)
  if (!response?.ok) return json({ error: "Offers are unavailable." }, 503)
  const rows = (await response.json()) as HeroOfferRow[]
  return json({ offers: rows.map(toHeroOffer) })
}

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return json({ error: "Cross-origin request rejected" }, 403)
  if (!isAuthConfigured()) return unavailable()
  const auth = await owner()
  if (!auth) return json({ error: "Sign in to publish an offer." }, 401)

  const body = await readJson(request)
  const offer = validateOffer(body)
  if (!offer.success) return json({ error: offer.error }, 400)

  const id = typeof body?.id === "string" ? body.id : null
  if (id && !/^[0-9a-f-]{36}$/i.test(id)) return json({ error: "Invalid offer id" }, 400)

  const row = { ...toHeroOfferRow(offer.data), auth_user_id: auth.user.id, updated_at: new Date().toISOString() }
  // An update is scoped to the owner as well as the id, so a guessed id from
  // another account matches nothing rather than being written.
  const path = id
    ? `hero_practical_offers?id=eq.${id}&auth_user_id=eq.${auth.user.id}&${SELECT}`
    : `hero_practical_offers?${SELECT}`
  const response = await userRest(auth.accessToken, path, {
    method: id ? "PATCH" : "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify(row),
  }).catch(() => null)
  if (!response?.ok) return json({ error: "The offer could not be saved." }, 503)
  const [saved] = (await response.json()) as HeroOfferRow[]
  if (!saved) return json({ error: "This offer is not on your account." }, 403)
  return json({ offer: toHeroOffer(saved) })
}

export async function DELETE(request: Request) {
  if (!isSameOrigin(request)) return json({ error: "Cross-origin request rejected" }, 403)
  if (!isAuthConfigured()) return unavailable()
  const auth = await owner()
  if (!auth) return json({ error: "Sign in to remove an offer." }, 401)

  const id = new URL(request.url).searchParams.get("id") ?? ""
  if (!/^[0-9a-f-]{36}$/i.test(id)) return json({ error: "Invalid offer id" }, 400)

  const response = await userRest(auth.accessToken,
    `hero_practical_offers?id=eq.${id}&auth_user_id=eq.${auth.user.id}&select=id`, {
      method: "DELETE",
      headers: { Prefer: "return=representation" },
    }).catch(() => null)
  if (!response?.ok) return json({ error: "The offer could not be removed." }, 503)
  const removed = (await response.json()) as { id: string }[]
  if (!removed.length) return json({ error: "This offer is not on your account." }, 403)
  return json({ removed: removed[0].id })
}
