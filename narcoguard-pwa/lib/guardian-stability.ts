import { normalizeMeals, type Meal } from "@/lib/meal-log"

export const GUARDIAN_STORAGE_KEY = "narcoguard_guardian_stability_v2"
export const NEEDS = ["food", "water", "sleep", "hygiene", "laundry", "safePlace", "connection", "treatment"] as const
export type Need = typeof NEEDS[number]
export type NeedStatus = "met" | "needs-help"
export interface CheckIn { date: string; needs: Partial<Record<Need, NeedStatus>>; sleepHours?: number; mood?: "low" | "okay" | "good"; craving?: "none" | "some" | "strong"; isolated?: boolean; meals?: Meal[] }
export interface PlanItem { id: string; date: string; title: string; done: boolean; kind?: "task" | "appointment"; time?: string; location?: string; need?: Need }
export interface GuardianState {
  enabled: boolean; paused: boolean; postalCode: string; supportPhone: string; goals: string[]; entries: CheckIn[]; plan: PlanItem[]
  escalationEnabled: boolean; escalationThreshold: number
}
export interface GuardianStorage { getItem(key: string): string | null; setItem(key: string, value: string): void; removeItem(key: string): void }
export interface PatternInsight { trigger: Need; companion: Need; observed: number; answered: number; percent: number }
export interface EarlyWarning { level: "steady" | "check-in" | "support"; signals: Need[]; sleepSignal: boolean; score: number; reasons: string[] }

export function defaultGuardianState(): GuardianState {
  return { enabled: false, paused: false, postalCode: "", supportPhone: "", goals: [], entries: [], plan: [], escalationEnabled: false, escalationThreshold: 3 }
}
const isDate = (value: unknown): value is string => typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)

export function readGuardianState(storage: GuardianStorage): GuardianState {
  try {
    const raw = storage.getItem(GUARDIAN_STORAGE_KEY) || storage.getItem("narcoguard_guardian_stability_v1")
    const data: unknown = JSON.parse(raw || "null")
    if (!data || typeof data !== "object") return defaultGuardianState()
    const value = data as Record<string, unknown>
    if (value.enabled !== true || !Array.isArray(value.entries) || !Array.isArray(value.plan) || !Array.isArray(value.goals)) return defaultGuardianState()
    const entries: CheckIn[] = value.entries.slice(-365).filter((entry: unknown) => entry && typeof entry === "object" && isDate((entry as CheckIn).date)).map((entry: CheckIn) => {
      const needs: CheckIn["needs"] = {}
      for (const need of NEEDS) if (entry.needs?.[need] === "met" || entry.needs?.[need] === "needs-help") needs[need] = entry.needs[need]
      const meals = normalizeMeals(entry.meals)
      return {
        date: entry.date,
        needs,
        ...(typeof entry.sleepHours === "number" && entry.sleepHours >= 0 && entry.sleepHours <= 24 ? { sleepHours: entry.sleepHours } : {}),
        ...(entry.mood === "low" || entry.mood === "okay" || entry.mood === "good" ? { mood: entry.mood } : {}),
        ...(entry.craving === "none" || entry.craving === "some" || entry.craving === "strong" ? { craving: entry.craving } : {}),
        ...(typeof entry.isolated === "boolean" ? { isolated: entry.isolated } : {}),
        ...(meals.length ? { meals } : {}),
      }
    })
    return {
      enabled: true, paused: value.paused === true,
      postalCode: typeof value.postalCode === "string" ? value.postalCode.slice(0, 10) : "",
      supportPhone: typeof value.supportPhone === "string" ? value.supportPhone.slice(0, 30) : "",
      goals: value.goals.filter((g: unknown) => typeof g === "string").slice(0, 20).map((g: string) => g.slice(0, 160)),
      entries,
      plan: value.plan.filter((i: unknown) => i && typeof i === "object" && isDate((i as PlanItem).date) && typeof (i as PlanItem).title === "string" && typeof (i as PlanItem).id === "string").slice(-100).map((i: PlanItem) => ({ id: i.id.slice(0,80), date:i.date, title:i.title.slice(0,160), done:i.done===true, ...(i.kind === "appointment" || i.kind === "task" ? { kind: i.kind } : {}), ...(typeof i.time === "string" && /^\d{2}:\d{2}$/.test(i.time) ? { time: i.time } : {}), ...(typeof i.location === "string" ? { location: i.location.slice(0,160) } : {}), ...(NEEDS.includes(i.need as Need) ? { need: i.need as Need } : {}) })),
      escalationEnabled: value.escalationEnabled === true,
      escalationThreshold: typeof value.escalationThreshold === "number" && value.escalationThreshold >= 2 && value.escalationThreshold <= 6 ? Math.round(value.escalationThreshold) : 3,
    }
  } catch { return defaultGuardianState() }
}
export function saveGuardianState(storage: GuardianStorage, next: GuardianState): void {
  if (!next.enabled) return
  const previous = readGuardianState(storage)
  if (previous.paused) { storage.setItem(GUARDIAN_STORAGE_KEY, JSON.stringify({ ...previous, paused: next.paused })); return }
  storage.setItem(GUARDIAN_STORAGE_KEY, JSON.stringify(next))
  storage.setItem(GUARDIAN_STORAGE_KEY, JSON.stringify(readGuardianState(storage)))
}
export function clearGuardianState(storage: GuardianStorage): void {
  storage.removeItem(GUARDIAN_STORAGE_KEY); storage.removeItem("narcoguard_guardian_stability_v1")
}

export function patternInsights(entries: CheckIn[], minAnswered = 5): PatternInsight[] {
  const unique = [...new Map(entries.map(e => [e.date, e])).values()]
  const out: PatternInsight[] = []
  for (const trigger of NEEDS) for (const companion of NEEDS) {
    if (trigger === companion) continue
    const answered = unique.filter(e => e.needs[trigger] === "needs-help" && e.needs[companion] !== undefined)
    if (answered.length < minAnswered) continue
    const observed = answered.filter(e => e.needs[companion] === "needs-help").length
    out.push({ trigger, companion, observed, answered: answered.length, percent: Math.round(100 * observed / answered.length) })
  }
  return out.sort((a,b) => b.percent - a.percent || b.answered - a.answered)
}
export function summarizePattern(entries: CheckIn[]): { observed:number; answered:number; percent:number } | null {
  const hit = patternInsights(entries).find(p => p.trigger === "food" && p.companion === "connection")
  return hit ? { observed: hit.observed, answered: hit.answered, percent: hit.percent } : null
}

export function earlyWarning(entry: CheckIn, threshold = 3): EarlyWarning {
  const signals = NEEDS.filter(n => entry.needs[n] === "needs-help")
  const sleepSignal = typeof entry.sleepHours === "number" && entry.sleepHours < 5
  const score = signals.length + (sleepSignal ? 1 : 0)
  const reasons = [...signals.map(n => `${n} marked as needing help`), ...(sleepSignal ? ["less than 5 hours of reported sleep"] : [])]
  return { level: score >= threshold ? "support" : score > 0 ? "check-in" : "steady", signals, sleepSignal, score, reasons }
}
