import { strict as assert } from "node:assert"
import { test } from "node:test"
import { isStale, parseHeartRateMeasurement, parsePlxMeasurement, readSfloat, STALE_AFTER_MS } from "../lib/ble-vitals"

const view = (...bytes: number[]) => new DataView(Uint8Array.from(bytes).buffer)

test("8-bit heart rate without contact support", () => {
  assert.deepEqual(parseHeartRateMeasurement(view(0x00, 72)), { heartRate: 72, rrIntervalsMs: [] })
})

test("16-bit heart rate with contact detected, energy expended and RR intervals", () => {
  // flags: 16-bit | contact supported+detected | energy | RR
  const reading = parseHeartRateMeasurement(view(0x01 | 0x06 | 0x08 | 0x10, 0x48, 0x00, 0x10, 0x00, 0x00, 0x04, 0x00, 0x02))
  assert.deepEqual(reading, { heartRate: 72, contactDetected: true, rrIntervalsMs: [1000, 500] })
})

test("no skin contact, implausible values and truncated packets are dropped", () => {
  assert.equal(parseHeartRateMeasurement(view(0x04, 72)), undefined)
  assert.equal(parseHeartRateMeasurement(view(0x00, 0)), undefined)
  assert.equal(parseHeartRateMeasurement(view(0x00, 255)), undefined)
  assert.equal(parseHeartRateMeasurement(view(0x01, 72)), undefined)
  assert.equal(parseHeartRateMeasurement(view(0x00)), undefined)
})

test("SFLOAT decoding handles exponents and special values", () => {
  assert.equal(readSfloat(view(0x62, 0x00), 0), 98)
  assert.equal(readSfloat(view(0xd5, 0xf3), 0), 98.1) // mantissa 981, exponent -1
  for (const raw of [0x07ff, 0x0800, 0x07fe, 0x0802, 0x0801]) assert.equal(readSfloat(view(raw & 0xff, raw >> 8), 0), undefined)
})

test("pulse oximeter readings keep SpO2 and plausible pulse, and drop NaN or impossible SpO2", () => {
  assert.deepEqual(parsePlxMeasurement(view(0x00, 0x61, 0x00, 0x48, 0x00)), { spO2: 97, pulseRate: 72 })
  assert.deepEqual(parsePlxMeasurement(view(0x00, 0x61, 0x00, 0xff, 0x07)), { spO2: 97 })
  assert.equal(parsePlxMeasurement(view(0x00, 0xff, 0x07, 0x48, 0x00)), undefined)
  assert.equal(parsePlxMeasurement(view(0x00, 0x65, 0x00, 0x48, 0x00)), undefined) // 101%
  assert.equal(parsePlxMeasurement(view(0x00, 0x61)), undefined)
})

test("readings go stale after the window and missing readings are stale", () => {
  assert.equal(isStale(undefined, 0), true)
  assert.equal(isStale(1000, 1000 + STALE_AFTER_MS), false)
  assert.equal(isStale(1000, 1001 + STALE_AFTER_MS), true)
})
