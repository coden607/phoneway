import assert from "node:assert/strict"
import test from "node:test"
import { interpretVitalsResponse } from "../lib/vitals-response"

const vitals = { heartRate: 72, spO2: 98, temperature: 36.8, respiratoryRate: 14, bloodPressureSystolic: 118, bloodPressureDiastolic: 76, timestamp: 1 }

test("explicit provider unavailability is reported as unavailable, not as loading or live data", () => {
  const result = interpretVitalsResponse(false, { available: false, source: "unavailable", message: "No verified wearable sensor connection is configured." })
  assert.deepEqual(result, { status: "unavailable", message: "No verified wearable sensor connection is configured." })
})

test("unavailable without a message falls back to an explicit explanation", () => {
  const result = interpretVitalsResponse(false, { available: false })
  assert.equal(result.status, "unavailable")
  assert.ok(result.status === "unavailable" && result.message.length > 0)
})

test("a failed response without an availability flag is an error", () => {
  assert.equal(interpretVitalsResponse(false, { error: "boom" }).status, "error")
  assert.equal(interpretVitalsResponse(false, null).status, "error")
})

test("incomplete or non-numeric vitals are never treated as live readings", () => {
  assert.equal(interpretVitalsResponse(true, {}).status, "error")
  assert.equal(interpretVitalsResponse(true, { vitals: { ...vitals, spO2: "98" } }).status, "error")
  assert.equal(interpretVitalsResponse(true, { vitals: { ...vitals, heartRate: Number.NaN } }).status, "error")
})

test("complete numeric vitals are live", () => {
  const result = interpretVitalsResponse(true, { vitals, overdoseCheck: null })
  assert.equal(result.status, "live")
  assert.ok(result.status === "live" && result.vitals.heartRate === 72 && result.overdoseCheck === null)
})
