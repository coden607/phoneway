import { strict as assert } from "node:assert"
import { readFileSync } from "node:fs"
import { test } from "node:test"
import { OFFER_CATEGORIES, contactHref, validateOffer } from "../lib/hero-offers"

const base = { category: "food" as const, title: "Hot meals Sunday", description: "Two trays, noon to 2pm." }
const ok = (input: unknown) => {
  const result = validateOffer(input)
  assert.equal(result.success, true, result.success ? "" : result.error)
  return result.success ? result.data : null!
}
const bad = (input: unknown, match: RegExp) => {
  const result = validateOffer(input)
  assert.equal(result.success, false, "expected a rejection")
  if (!result.success) assert.match(result.error, match)
}

test("every category is accepted and nothing else is", () => {
  assert.deepEqual([...OFFER_CATEGORIES], ["transportation", "food", "clothing", "other"])
  for (const category of OFFER_CATEGORIES) assert.equal(ok({ ...base, category }).category, category)
  bad({ ...base, category: "medical" }, /category/i)
  bad({ ...base, category: undefined }, /category/i)
})

test("a title is required, trimmed, and bounded", () => {
  assert.equal(ok({ ...base, title: "  Rides to clinic  " }).title, "Rides to clinic")
  bad({ ...base, title: "" }, /title/i)
  bad({ ...base, title: "   " }, /title/i)
  bad({ ...base, title: "x".repeat(81) }, /title/i)
  bad({ ...base, title: 12 }, /title/i)
})

test("a description is optional but bounded", () => {
  assert.equal(ok({ ...base, description: "" }).description, "")
  assert.equal(ok({ category: "other", title: "Coats" }).description, "")
  bad({ ...base, description: "x".repeat(401) }, /description/i)
  bad({ ...base, description: 5 }, /description/i)
})

test("contact is absent or a validated call/text number", () => {
  assert.equal(ok(base).contact, null)
  assert.equal(ok({ ...base, contact: null }).contact, null)
  assert.deepEqual(ok({ ...base, contact: { method: "text", value: "(607) 555-0123" } }).contact,
    { method: "text", value: "+16075550123" })
  assert.deepEqual(ok({ ...base, contact: { method: "call", value: "+16075550123" } }).contact,
    { method: "call", value: "+16075550123" })
  bad({ ...base, contact: { method: "email", value: "+16075550123" } }, /contact method/i)
  bad({ ...base, contact: { method: "text", value: "call me" } }, /phone/i)
  bad({ ...base, contact: { method: "text", value: "555" } }, /phone/i)
  bad({ ...base, contact: { method: "text" } }, /phone/i)
})

test("a new offer is inactive until its owner activates it", () => {
  assert.equal(ok(base).active, false)
  assert.equal(ok({ ...base, active: true }).active, true)
  bad({ ...base, active: "yes" }, /active/i)
})

test("malformed input is rejected without throwing", () => {
  for (const input of [null, undefined, 1, "offer", [], true]) bad(input, /offer/i)
})

test("contact links are only ever tel: or sms: with a validated number", () => {
  assert.equal(contactHref({ method: "call", value: "+16075550123" }), "tel:+16075550123")
  assert.equal(contactHref({ method: "text", value: "+16075550123" }), "sms:+16075550123")
  assert.equal(contactHref(null), null)
  // A value that never passed validation must not be turned into a link.
  assert.equal(contactHref({ method: "call", value: "javascript:alert(1)" } as never), null)
})

// --- storage and route invariants ------------------------------------------
// Cross-account denial is enforced in SQL, so it is asserted against the
// migration; the route is asserted to scope every read and write to the owner.

const migration = () =>
  readFileSync(new URL("../supabase/migrations/20261010120000_hero_practical_offers.sql", import.meta.url), "utf8")
const route = () => readFileSync(new URL("../app/api/heroes/offers/route.ts", import.meta.url), "utf8")

test("the table is owner-only, with no public read policy", () => {
  const sql = migration()
  assert.match(sql, /create table if not exists public\.hero_practical_offers/)
  assert.match(sql, /alter table public\.hero_practical_offers enable row level security/)
  for (const action of ["select", "insert", "update", "delete"]) {
    assert.match(sql, new RegExp(`for ${action} to authenticated`),
      `missing an owner-only ${action} policy`)
  }
  assert.ok(!/to anon|to public/.test(sql), "the table must not be readable by anon or public")
  assert.match(sql, /auth_user_id = \(select auth\.uid\(\)\)/)
  assert.match(sql, /references auth\.users\(id\) on delete cascade/)
})

test("the route rejects cross-origin and unauthenticated writes and scopes to the owner", () => {
  const source = route()
  assert.match(source, /isSameOrigin\(request\)/)
  assert.match(source, /getAuthContext\(\)/)
  assert.match(source, /userRest\(auth\.accessToken/)
  assert.match(source, /auth_user_id=eq\./, "reads and deletes must be scoped to the owner")
  assert.ok(!/console\.(log|error|warn)/.test(source), "contact values must never be logged")
})
