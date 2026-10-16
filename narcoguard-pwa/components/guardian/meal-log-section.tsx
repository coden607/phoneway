"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import type { CheckIn } from "@/lib/guardian-stability"
import { resourcesForNeed } from "@/lib/guardian-resources"
import { addMeal, MAX_MEAL_NOTE_LENGTH, MAX_MEALS_PER_DAY, MEAL_KINDS, MEAL_LABELS, removeMeal, summarizeMeals, type MealKind } from "@/lib/meal-log"

interface MealLogSectionProps {
  today: CheckIn
  entries: CheckIn[]
  paused: boolean
  postalCode: string
  onChange: (entry: CheckIn) => void
}

export function MealLogSection({ today, entries, paused, postalCode, onChange }: MealLogSectionProps) {
  const [kind, setKind] = useState<MealKind>("breakfast")
  const [note, setNote] = useState("")
  const meals = today.meals ?? []
  const full = meals.length >= MAX_MEALS_PER_DAY
  const summary = summarizeMeals(entries, today.date)
  const foodHelp = resourcesForNeed("food", postalCode).slice(0, 2)

  return (
    <section className="border rounded-xl p-5 space-y-4" aria-labelledby="meal-log-heading">
      <h2 id="meal-log-heading" className="text-xl font-semibold">Meals today (optional)</h2>
      <p className="text-sm text-muted-foreground">
        Log what you ate if it helps you plan. There are no calories, weights or targets here. Skipping this is fine: a day with
        nothing logged is not counted as a missed meal.
      </p>
      <form
        className="flex flex-col sm:flex-row gap-2"
        onSubmit={(event) => {
          event.preventDefault()
          onChange(addMeal(today, kind, note, crypto.randomUUID()))
          setNote("")
        }}
      >
        <select aria-label="Meal type" disabled={paused || full} className="bg-background border rounded p-2" value={kind} onChange={(event) => setKind(event.target.value as MealKind)}>
          {MEAL_KINDS.map((option) => <option key={option} value={option}>{MEAL_LABELS[option]}</option>)}
        </select>
        <input
          aria-label="What you had (optional)"
          disabled={paused || full}
          maxLength={MAX_MEAL_NOTE_LENGTH}
          className="bg-background border rounded p-2 flex-1 min-w-0"
          placeholder="What you had (optional)"
          value={note}
          onChange={(event) => setNote(event.target.value)}
        />
        <Button disabled={paused || full} type="submit">Add meal</Button>
      </form>
      {full && <p className="text-sm text-muted-foreground">You have logged {MAX_MEALS_PER_DAY} meals today, the most this log keeps.</p>}
      {meals.length > 0 && (
        <ul className="space-y-2" aria-label="Meals logged today">
          {meals.map((meal) => (
            <li key={meal.id} className="flex items-center justify-between gap-2 border rounded-lg p-3">
              <span><strong>{MEAL_LABELS[meal.kind]}</strong>{meal.note ? `: ${meal.note}` : ""}</span>
              <button
                type="button"
                disabled={paused}
                className="underline text-sm"
                aria-label={`Remove ${MEAL_LABELS[meal.kind]}${meal.note ? `: ${meal.note}` : ""}`}
                onClick={() => onChange(removeMeal(today, meal.id))}
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
      {summary.daysWithCheckIn > 0 && (
        <p className="text-sm text-muted-foreground" data-testid="meal-summary">
          In the last {summary.windowDays} days you checked in on {summary.daysWithCheckIn} {summary.daysWithCheckIn === 1 ? "day" : "days"} and
          logged a meal on {summary.daysWithMealsLogged} of them.
        </p>
      )}
      <div className="space-y-1">
        <p className="text-sm font-medium">Need food? These are free starting points; confirm hours with the provider.</p>
        <ul className="list-disc pl-5 text-sm space-y-1">
          {foodHelp.map((resource) => (
            <li key={resource.url}><a className="inline-flex min-h-6 items-center underline text-primary" href={resource.url} target="_blank" rel="noopener noreferrer">{resource.title}</a></li>
          ))}
        </ul>
      </div>
    </section>
  )
}
