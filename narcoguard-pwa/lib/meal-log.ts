import type { CheckIn } from "@/lib/guardian-stability"

// A voluntary record of what someone ate. Deliberately no calories, portions, weight or targets:
// counting can harm people at risk of disordered eating, and the planner's job is meeting needs.
export const MEAL_KINDS = ["breakfast", "lunch", "dinner", "snack", "other"] as const
export type MealKind = typeof MEAL_KINDS[number]
export interface Meal { id: string; kind: MealKind; note?: string }

export const MAX_MEALS_PER_DAY = 10
export const MAX_MEAL_NOTE_LENGTH = 120

export const MEAL_LABELS: Record<MealKind, string> = {
  breakfast: "Breakfast", lunch: "Lunch", dinner: "Dinner", snack: "Snack", other: "Something else",
}

/** Keeps only well-formed meals, trimming notes and capping counts; unknown input yields no meals. */
export function normalizeMeals(value: unknown): Meal[] {
  if (!Array.isArray(value)) return []
  return value
    .filter((meal): meal is Meal => !!meal && typeof meal === "object" && typeof (meal as Meal).id === "string" && MEAL_KINDS.includes((meal as Meal).kind))
    .slice(0, MAX_MEALS_PER_DAY)
    .map((meal) => {
      const note = typeof meal.note === "string" ? meal.note.trim().slice(0, MAX_MEAL_NOTE_LENGTH) : ""
      return { id: meal.id.slice(0, 80), kind: meal.kind, ...(note ? { note } : {}) }
    })
}

/** Returns the check-in with one more meal, or unchanged when today's list is already full. */
export function addMeal(entry: CheckIn, kind: MealKind, note: string, id: string): CheckIn {
  const meals = entry.meals ?? []
  if (meals.length >= MAX_MEALS_PER_DAY) return entry
  return { ...entry, meals: normalizeMeals([...meals, { id, kind, note }]) }
}

export function removeMeal(entry: CheckIn, id: string): CheckIn {
  const next: CheckIn = { ...entry, meals: (entry.meals ?? []).filter((meal) => meal.id !== id) }
  if (!next.meals?.length) delete next.meals
  return next
}

export interface MealSummary { windowDays: number; daysWithCheckIn: number; daysWithMealsLogged: number }

/**
 * Descriptive count for the last `windowDays` days ending on `today` (YYYY-MM-DD): how many days had
 * any check-in and how many of those had at least one meal logged. A day without a logged meal is
 * not treated as a missed meal; people often skip logging.
 */
export function summarizeMeals(entries: CheckIn[], today: string, windowDays = 7): MealSummary {
  const end = new Date(`${today}T00:00:00`)
  const start = new Date(end)
  start.setDate(end.getDate() - (windowDays - 1))
  const inWindow = new Map<string, CheckIn>()
  for (const entry of entries) {
    const day = new Date(`${entry.date}T00:00:00`)
    if (day >= start && day <= end) inWindow.set(entry.date, entry)
  }
  const days = [...inWindow.values()]
  return {
    windowDays,
    daysWithCheckIn: days.length,
    daysWithMealsLogged: days.filter((entry) => (entry.meals?.length ?? 0) > 0).length,
  }
}
