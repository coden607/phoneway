import { NEEDS, type CheckIn, type Need } from "./guardian-stability"

export type PatternSignal = {
  id: string
  label: string
  detail: string
  need?: Need
}

export type PreventionSummary = {
  level: "steady" | "check-in" | "support"
  signals: PatternSignal[]
  baselineSleep?: number
}

const round1 = (value: number) => Math.round(value * 10) / 10

export function analyzePreventionPatterns(entries: CheckIn[], today: CheckIn): PreventionSummary {
  const history = entries
    .filter((entry) => entry.date !== today.date)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-28)

  const signals: PatternSignal[] = []
  for (const need of NEEDS) {
    if (today.needs[need] === "needs-help") {
      const recent = history.slice(-7).filter((entry) => entry.needs[need] === "needs-help").length
      signals.push({
        id: `need-${need}`,
        need,
        label: `${need} needs attention`,
        detail: recent > 0
          ? `You also marked this need on ${recent} of your previous 7 recorded days.`
          : "You marked this as needing help today.",
      })
    }
  }

  const sleepValues = history.map((entry) => entry.sleepHours).filter((value): value is number => typeof value === "number")
  const baselineSleep = sleepValues.length >= 5
    ? round1(sleepValues.reduce((sum, value) => sum + value, 0) / sleepValues.length)
    : undefined

  if (baselineSleep !== undefined && today.sleepHours !== undefined && today.sleepHours <= baselineSleep - 2) {
    signals.push({
      id: "sleep-change",
      need: "sleep",
      label: "Sleep changed from your recent baseline",
      detail: `You entered ${today.sleepHours} hours today; your recent recorded average is ${baselineSleep} hours.`,
    })
  }

  if (today.mood === "low") signals.push({ id: "mood-low", label: "Mood check-in", detail: "You marked your mood as low today. Consider a support person, a chosen goal, or another small stabilizing step." })
  if (today.craving === "strong") signals.push({ id: "craving-strong", label: "Strong craving", detail: "You marked a strong craving today. Consider using a support or treatment resource you trust." })
  if (today.isolated === true) signals.push({ id: "isolation", need: "connection", label: "Feeling isolated", detail: "You chose to record feeling isolated today. A connection step may be useful if you want one." })

    const level = signals.length >= 3 ? "support" : signals.length > 0 ? "check-in" : "steady"
  return { level, signals, baselineSleep }
}

export function suggestedNeeds(summary: PreventionSummary): Need[] {
  return [...new Set(summary.signals.flatMap((signal) => signal.need ? [signal.need] : []))]
}
