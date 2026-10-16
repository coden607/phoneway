import { strict as assert } from "node:assert"
import { test } from "node:test"
import { GOOD_SAMARITAN_LAWS, goodSamaritanLawFor } from "../lib/good-samaritan-laws"

const JURISDICTIONS = [
  "Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado", "Connecticut", "Delaware", "District of Columbia",
  "Florida", "Georgia", "Hawaii", "Idaho", "Illinois", "Indiana", "Iowa", "Kansas", "Kentucky", "Louisiana", "Maine",
  "Maryland", "Massachusetts", "Michigan", "Minnesota", "Mississippi", "Missouri", "Montana", "Nebraska", "Nevada",
  "New Hampshire", "New Jersey", "New Mexico", "New York", "North Carolina", "North Dakota", "Ohio", "Oklahoma", "Oregon",
  "Pennsylvania", "Rhode Island", "South Carolina", "South Dakota", "Tennessee", "Texas", "Utah", "Vermont", "Virginia",
  "Washington", "West Virginia", "Wisconsin", "Wyoming",
]

test("every state and DC has exactly one entry, in alphabetical order", () => {
  assert.deepEqual(GOOD_SAMARITAN_LAWS.map((law) => law.name), JURISDICTIONS)
})

test("every entry cites a statute and explains scope without promising blanket protection", () => {
  for (const law of GOOD_SAMARITAN_LAWS) {
    assert.ok(law.citation.length > 5, `${law.name} citation`)
    assert.match(law.summary, /possess|using|use of|controlled-substance offense/, `${law.name} names the covered offense`)
    assert.doesNotMatch(`${law.summary} ${law.limits ?? ""}`, /fully protected|you are protected|any crime|all charges|guarantee/i, law.name)
  }
})

test("states that only give a court defense are not described as immunity", () => {
  for (const name of ["Texas", "Utah"]) {
    const law = goodSamaritanLawFor(name)
    assert.ok(law)
    assert.match(law.summary, /defense in court, not immunity/)
  }
})

test("New York cites the overdose statute, not the general emergency-aid law", () => {
  assert.equal(goodSamaritanLawFor("New York")?.citation, "N.Y. Penal Law § 220.78")
})

test("unknown or empty selections return nothing", () => {
  assert.equal(goodSamaritanLawFor(undefined), undefined)
  assert.equal(goodSamaritanLawFor("Narnia"), undefined)
})
