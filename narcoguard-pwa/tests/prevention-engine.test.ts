import { strict as assert } from "node:assert"
import { test } from "node:test"
import { analyzePreventionPatterns } from "../lib/prevention-engine"
import type { CheckIn } from "../lib/guardian-stability"

test("pre-warning uses personal sleep baseline without producing relapse probability", () => {
  const history: CheckIn[] = Array.from({ length: 6 }, (_, index) => ({
    date: `2026-09-${String(index + 1).padStart(2, "0")}`,
    needs: { food: "met", connection: "met" },
    sleepHours: 8,
  }))
  const today: CheckIn = { date: "2026-09-30", needs: { food: "needs-help", connection: "needs-help" }, sleepHours: 5 }
  const summary = analyzePreventionPatterns([...history, today], today)
  assert.equal(summary.baselineSleep, 8)
  assert.equal(summary.level, "support")
  assert.ok(summary.signals.some((signal) => signal.id === "sleep-change"))
  assert.ok(summary.signals.every((signal) => !signal.detail.toLowerCase().includes("relapse")))
})

test("unknown answers do not become negative signals", () => {
  const today: CheckIn = { date: "2026-09-30", needs: {} }
  assert.deepEqual(analyzePreventionPatterns([], today), { level: "steady", signals: [], baselineSleep: undefined })
})


test("voluntary precursor signals are explainable and user-entered", () => {
  const today: CheckIn = { date: "2026-10-01", needs: {}, mood: "low", craving: "strong", isolated: true }
  const summary = analyzePreventionPatterns([], today)
  assert.equal(summary.level, "support")
  assert.ok(summary.signals.some((signal) => signal.id === "mood-low"))
  assert.ok(summary.signals.some((signal) => signal.id === "craving-strong"))
  assert.ok(summary.signals.some((signal) => signal.id === "isolation"))
})
