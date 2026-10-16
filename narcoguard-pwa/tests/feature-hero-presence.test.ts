import { strict as assert } from "node:assert"
import { test } from "node:test"
import {
  COORD_DECIMALS,
  PRESENCE_TTL_MINUTES,
  isPresenceExpired,
  presenceExpiresAt,
  roundCoarse,
  toHeroPresence,
  toHeroPresenceRow,
  validatePresence,
} from "../lib/hero-presence"

const base = { shareNearby: true, latitude: 42.098765, longitude: -75.912345 }

const ok = (input: unknown) => {
  const result = validatePresence(input)
  assert.equal(result.success, true, result.success ? "" : result.error)
  return result.success ? result.data : null!
}
const bad = (input: unknown, match: RegExp) => {
  const result = validatePresence(input)
  assert.equal(result.success, false, "expected a rejection")
  if (!result.success) assert.match(result.error, match)
}

test("sharing location requires an explicit opt-in, never a default", () => {
  assert.equal(ok(base).shareNearby, true)
  // Off by default: absent, false, or a truthy non-boolean are all refusals.
  bad({ latitude: base.latitude, longitude: base.longitude }, /opt in|share/i)
  bad({ ...base, shareNearby: false }, /opt in|share/i)
  bad({ ...base, shareNearby: "yes" }, /opt in|share/i)
  bad({ ...base, shareNearby: 1 }, /opt in|share/i)
})

test("coordinates must be real, finite, and in range", () => {
  bad({ ...base, latitude: 90.1 }, /latitude/i)
  bad({ ...base, latitude: -90.1 }, /latitude/i)
  bad({ ...base, longitude: 180.1 }, /longitude/i)
  bad({ ...base, longitude: -180.1 }, /longitude/i)
  bad({ ...base, latitude: Number.NaN }, /latitude/i)
  bad({ ...base, longitude: Number.POSITIVE_INFINITY }, /longitude/i)
  bad({ ...base, latitude: "42.1" }, /latitude/i)
  bad({ ...base, latitude: null }, /latitude/i)
  // The extremes themselves are valid.
  assert.equal(ok({ ...base, latitude: 90, longitude: 180 }).latitude, 90)
  assert.equal(ok({ ...base, latitude: -90, longitude: -180 }).longitude, -180)
})

test("a stored location is rounded coarse so it cannot pinpoint a person", () => {
  const presence = ok(base)
  assert.equal(COORD_DECIMALS, 2)
  assert.equal(presence.latitude, 42.1)
  assert.equal(presence.longitude, -75.91)
  // Rounding is applied before storage, not at render time.
  assert.equal(roundCoarse(42.098765), 42.1)
  assert.equal(roundCoarse(0), 0)
  // Negative coordinates coarsen too. An exact .xx5 tie is not asserted: the
  // input is not representable in binary floating point (-75.915 * 100 is
  // -7591.500000000001), and either neighbouring cell is equally coarse.
  assert.equal(Math.abs(roundCoarse(-75.912345)), 75.91)
  for (const value of [-75.912345, 42.098765, -0.004, 179.999]) {
    const rounded = roundCoarse(value)
    const decimals = (String(rounded).split(".")[1] ?? "").length
    assert.ok(decimals <= COORD_DECIMALS, `${rounded} kept more than ${COORD_DECIMALS} decimals`)
    assert.ok(Math.abs(rounded - value) <= 0.005 + Number.EPSILON, "rounding moved the point too far")
  }
  // Two people within the same ~1km cell become indistinguishable.
  assert.equal(roundCoarse(42.1001), roundCoarse(42.1049))
})

test("expiry is computed by the server and a client value is ignored", () => {
  const now = Date.parse("2026-10-15T20:00:00.000Z")
  assert.equal(presenceExpiresAt(now), "2026-10-15T20:15:00.000Z")
  assert.equal(PRESENCE_TTL_MINUTES, 15)

  // A client cannot extend its own presence by supplying an expiry.
  const forged = ok({ ...base, expiresAt: "2099-01-01T00:00:00.000Z" }) as Record<string, unknown>
  assert.equal("expiresAt" in forged, false)
  const row = toHeroPresenceRow(ok({ ...base, expiresAt: "2099-01-01T00:00:00.000Z" }), now)
  assert.equal(row.expires_at, "2026-10-15T20:15:00.000Z")
})

test("presence goes stale on its own and stale rows never read as active", () => {
  const now = Date.parse("2026-10-15T20:00:00.000Z")
  assert.equal(isPresenceExpired("2026-10-15T20:14:59.000Z", now), false)
  assert.equal(isPresenceExpired("2026-10-15T20:00:00.000Z", now), true)
  assert.equal(isPresenceExpired("2026-10-15T19:45:00.000Z", now), true)
  // An unparseable or missing expiry is treated as expired, never as live.
  assert.equal(isPresenceExpired("", now), true)
  assert.equal(isPresenceExpired("not a date", now), true)

  const stale = toHeroPresence({
    share_nearby: true,
    latitude: 42.1,
    longitude: -75.91,
    expires_at: "2026-10-15T19:45:00.000Z",
    consented_at: "2026-10-15T19:30:00.000Z",
  }, now)
  assert.equal(stale.active, false, "an expired row must not present as active")
  // A stale row must not keep publishing a location.
  assert.equal(stale.latitude, null)
  assert.equal(stale.longitude, null)

  const live = toHeroPresence({
    share_nearby: true,
    latitude: 42.1,
    longitude: -75.91,
    expires_at: "2026-10-15T20:10:00.000Z",
    consented_at: "2026-10-15T19:55:00.000Z",
  }, now)
  assert.equal(live.active, true)
  assert.equal(live.latitude, 42.1)
})

test("revoking consent clears the location, not just the flag", () => {
  const now = Date.parse("2026-10-15T20:00:00.000Z")
  const revoked = toHeroPresence({
    share_nearby: false,
    latitude: 42.1,
    longitude: -75.91,
    expires_at: "2026-10-15T20:10:00.000Z",
    consented_at: "2026-10-15T19:55:00.000Z",
  }, now)
  assert.equal(revoked.active, false)
  assert.equal(revoked.shareNearby, false)
  assert.equal(revoked.latitude, null, "withdrawn consent must not leave coordinates readable")
  assert.equal(revoked.longitude, null)
})

test("a stored row carries a consent receipt alongside the coarse location", () => {
  const now = Date.parse("2026-10-15T20:00:00.000Z")
  const row = toHeroPresenceRow(ok(base), now)
  assert.equal(row.share_nearby, true)
  assert.equal(row.latitude, 42.1)
  assert.equal(row.longitude, -75.91)
  assert.equal(row.consented_at, "2026-10-15T20:00:00.000Z")
  assert.equal(row.expires_at, "2026-10-15T20:15:00.000Z")
  // Full-precision input is never persisted.
  assert.equal(JSON.stringify(row).includes("42.098765"), false)
})
