// Short-lived Hero presence for nearby discovery.
//
// Presence exists only while a Hero has explicitly opted in for this purpose,
// and it carries a consent receipt plus a server-set expiry. Three rules shape
// everything here:
//
//  1. Location sharing is off by default and revocable. `shareNearby` must be
//     literally true; nothing truthy stands in for consent.
//  2. Only a coarse location is ever stored. Coordinates are rounded before
//     they reach the database, so full precision is never persisted and two
//     people in the same ~1km cell are indistinguishable.
//  3. Expiry belongs to the server. A client cannot extend its own presence,
//     and a row whose expiry has passed reads as inactive with no coordinates
//     rather than as a stale pin on a map.

export const PRESENCE_TTL_MINUTES = 15

/** 2 decimals is roughly 1.1 km of latitude - a neighbourhood, not an address. */
export const COORD_DECIMALS = 2

export type HeroPresence = {
  active: boolean
  shareNearby: boolean
  latitude: number | null
  longitude: number | null
  expiresAt: string
}

/** What a client may ask for. Deliberately has no expiry field. */
export type NewHeroPresence = {
  shareNearby: true
  latitude: number
  longitude: number
}

type Validated<T> = { success: true; data: T } | { success: false; error: string }

/** Rounds a coordinate to the stored precision. */
export function roundCoarse(value: number): number {
  const factor = 10 ** COORD_DECIMALS
  return Math.round(value * factor) / factor
}

/** The expiry the server will store for presence created at `now`. */
export function presenceExpiresAt(now: number = Date.now()): string {
  return new Date(now + PRESENCE_TTL_MINUTES * 60_000).toISOString()
}

/**
 * Whether presence has lapsed. An unparseable or empty expiry counts as
 * expired, so a malformed row can never read as live.
 */
export function isPresenceExpired(expiresAt: string, now: number = Date.now()): boolean {
  const parsed = Date.parse(expiresAt)
  return !Number.isFinite(parsed) || parsed <= now
}

function validCoordinate(value: unknown, limit: number): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null
  if (value < -limit || value > limit) return null
  return value
}

export function validatePresence(input: unknown): Validated<NewHeroPresence> {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    return { success: false, error: "Presence must be an object." }
  }
  const { shareNearby, latitude, longitude } = input as Record<string, unknown>

  // Consent is a literal true. A string or number is a bug or an attempt, not
  // a decision someone made.
  if (shareNearby !== true) {
    return { success: false, error: "You have to opt in to share your location for this search." }
  }

  const lat = validCoordinate(latitude, 90)
  if (lat === null) return { success: false, error: "A latitude between -90 and 90 is required." }
  const lon = validCoordinate(longitude, 180)
  if (lon === null) return { success: false, error: "A longitude between -180 and 180 is required." }

  return {
    success: true,
    // Rounded here so no caller can accidentally persist full precision, and
    // any client-supplied expiry is dropped rather than trusted.
    data: { shareNearby: true, latitude: roundCoarse(lat), longitude: roundCoarse(lon) },
  }
}

export type HeroPresenceRow = {
  share_nearby: boolean
  latitude: number | null
  longitude: number | null
  expires_at: string
  consented_at: string
}

export function toHeroPresenceRow(presence: NewHeroPresence, now: number = Date.now()) {
  return {
    share_nearby: true,
    latitude: roundCoarse(presence.latitude),
    longitude: roundCoarse(presence.longitude),
    // The receipt records when consent was given; the expiry is server-set.
    consented_at: new Date(now).toISOString(),
    expires_at: presenceExpiresAt(now),
  }
}

export function toHeroPresence(row: HeroPresenceRow, now: number = Date.now()): HeroPresence {
  const live = row.share_nearby === true && !isPresenceExpired(row.expires_at, now)
  return {
    active: live,
    shareNearby: row.share_nearby === true,
    // Withdrawn or lapsed consent stops publishing the location, so a cached
    // row cannot keep a person on the map after they opted out.
    latitude: live ? row.latitude : null,
    longitude: live ? row.longitude : null,
    expiresAt: row.expires_at,
  }
}
