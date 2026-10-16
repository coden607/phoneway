import { strict as assert } from "node:assert"
import { test } from "node:test"
import { defaultGuardianState, readGuardianState, saveGuardianState, type CheckIn } from "../lib/guardian-stability"
import { addMeal, MAX_MEAL_NOTE_LENGTH, MAX_MEALS_PER_DAY, normalizeMeals, removeMeal, summarizeMeals } from "../lib/meal-log"

function storage() { const values = new Map<string, string>(); return { getItem: (k: string) => values.get(k) ?? null, setItem: (k: string, v: string) => { values.set(k, v) }, removeItem: (k: string) => { values.delete(k) } } }

test("meal log keeps only well-formed meals and never stores calories or other extra fields", () => {
  const meals = normalizeMeals([
    { id: "a", kind: "lunch", note: "  soup at the center  ", calories: 900, weight: 80 },
    { id: "b", kind: "feast" },
    { kind: "dinner" },
    "breakfast",
    null,
    { id: "c", kind: "snack", note: "x".repeat(500) },
  ])
  assert.deepEqual(meals.map((meal) => meal.id), ["a", "c"])
  assert.deepEqual(meals[0], { id: "a", kind: "lunch", note: "soup at the center" })
  assert.equal(meals[1].note?.length, MAX_MEAL_NOTE_LENGTH)
  assert.deepEqual(normalizeMeals("not a list"), [])
})

test("adding stops at the daily cap and removing the last meal leaves no empty list", () => {
  let entry: CheckIn = { date: "2026-10-04", needs: {} }
  for (let i = 0; i < MAX_MEALS_PER_DAY + 3; i++) entry = addMeal(entry, "snack", "", `m${i}`)
  assert.equal(entry.meals?.length, MAX_MEALS_PER_DAY)

  let single: CheckIn = addMeal({ date: "2026-10-04", needs: {} }, "breakfast", "", "only")
  single = removeMeal(single, "only")
  assert.equal("meals" in single, false)
})

test("logging a meal does not change the person's own food-need answer", () => {
  const entry = addMeal({ date: "2026-10-04", needs: { food: "needs-help" } }, "dinner", "", "d1")
  assert.equal(entry.needs.food, "needs-help")
})

test("meals persist through save and read, and unknown answers stay unknown", () => {
  const store = storage()
  const entry = addMeal({ date: "2026-10-04", needs: {} }, "breakfast", "toast", "b1")
  saveGuardianState(store, { ...defaultGuardianState(), enabled: true, entries: [entry, { date: "2026-10-03", needs: {} }] })
  const read = readGuardianState(store)
  assert.deepEqual(read.entries.find((e) => e.date === "2026-10-04")?.meals, [{ id: "b1", kind: "breakfast", note: "toast" }])
  assert.equal("meals" in (read.entries.find((e) => e.date === "2026-10-03") ?? {}), false)
  assert.equal(read.entries.find((e) => e.date === "2026-10-04")?.needs.food, undefined)
})

test("summary counts days with a logged meal against days with any check-in, inside the window only", () => {
  const entries: CheckIn[] = [
    addMeal({ date: "2026-10-04", needs: {} }, "lunch", "", "1"),
    { date: "2026-10-03", needs: {} },
    addMeal({ date: "2026-09-28", needs: {} }, "dinner", "", "2"),
    addMeal({ date: "2026-09-27", needs: {} }, "dinner", "", "3"),
  ]
  assert.deepEqual(summarizeMeals(entries, "2026-10-04"), { windowDays: 7, daysWithCheckIn: 3, daysWithMealsLogged: 2 })
  assert.deepEqual(summarizeMeals([], "2026-10-04"), { windowDays: 7, daysWithCheckIn: 0, daysWithMealsLogged: 0 })
})
