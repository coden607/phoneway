import { strict as assert } from "node:assert"
import { test } from "node:test"
import { resourcesForNeed, normalizePostalCode } from "../lib/guardian-resources"

test("food paths include official New York SNAP and live directory entry", () => {
  const links = resourcesForNeed("food", "13905")
  assert.ok(links.some((link) => link.url === "https://mybenefits.ny.gov/"))
  assert.ok(links.some((link) => link.url.startsWith("https://www.211.org/")))
})

test("hygiene and laundry use directory without fabricated hours", () => {
  assert.ok(resourcesForNeed("hygiene", "13905").some((link) => link.title.includes("211")))
  assert.ok(resourcesForNeed("laundry", "13905").every((link) => !link.title.includes("Open now")))
})

test("postal code is limited to US ZIP digits", () => {
  assert.equal(normalizePostalCode("13905"), "13905")
  assert.equal(normalizePostalCode("13905<script>"), "")
  assert.equal(normalizePostalCode(" 13905-1234 "), "13905-1234")
})
