"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import {
  clearGuardianState, defaultGuardianState, earlyWarning, NEEDS, patternInsights, saveGuardianState,
  type GuardianState, type Need, type NeedStatus,
} from "@/lib/guardian-stability"
import { normalizePostalCode, resourcesForNeed } from "@/lib/guardian-resources"
import { analyzePreventionPatterns, suggestedNeeds } from "@/lib/prevention-engine"
import { CalmingAudio } from "@/components/calming-audio"
import { MealLogSection } from "@/components/guardian/meal-log-section"
import { notifyGuardianChange, useGuardianState, useLocalDate } from "@/lib/hooks/use-guardian-state"

const names: Record<Need, string> = {
  food: "Food", water: "Water", sleep: "Sleep", hygiene: "Shower / hygiene",
  laundry: "Laundry", safePlace: "Safe place", connection: "Connection", treatment: "Treatment support",
}
const localDate = (dayOffset = 0) => {
  const date = new Date()
  date.setDate(date.getDate() + dayOffset)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
}

export default function StabilityPage() {
  const state = useGuardianState()
  const [goal, setGoal] = useState("")
  const [planTitle, setPlanTitle] = useState("")
  const [planDate, setPlanDate] = useState("")
  const [planTime, setPlanTime] = useState("")
  const [planLocation, setPlanLocation] = useState("")
  const [planNeed, setPlanNeed] = useState<Need | "">("")
  const now = useLocalDate()

  const update = (next: GuardianState) => {
    saveGuardianState(window.localStorage, next)
    notifyGuardianChange()
  }
  if (!state || !now) return <main className="p-6" role="status">Loading your planner…</main>

  const today = state.entries.find((item) => item.date === now) ?? { date: now, needs: {} }
  const patterns = patternInsights(state.entries).slice(0, 5)
  const warning = earlyWarning(today, state.escalationThreshold)
  const prevention = analyzePreventionPatterns(state.entries, today)
  const suggested = suggestedNeeds(prevention)
  const needsHelp = NEEDS.filter((need) => today.needs[need] === "needs-help")
  const telephone = state.supportPhone.replace(/[^\d+]/g, "")

  const updateCheckIn = (need: Need, status: NeedStatus | undefined) => {
    const needs = { ...today.needs }
    if (status) needs[need] = status
    else delete needs[need]
    update({ ...state, entries: [...state.entries.filter((item) => item.date !== now), { ...today, needs }] })
  }

  return <main className="max-w-4xl mx-auto p-4 sm:p-8 space-y-8">
    <nav><Link href="/" className="underline text-primary">← NarcoGuard dashboard</Link></nav>
    <header className="space-y-2">
      <h1 className="text-3xl font-bold">Guardian Stability</h1>
      <p className="text-muted-foreground">A private, optional place to plan around what matters to you. You choose what to record and which next step to take.</p>
    </header>
    {!state.enabled ? <section className="border rounded-xl p-6 space-y-4">
      <h2 className="text-xl font-semibold">Start on your terms</h2>
      <p>Your check-ins, sleep, goals and plans stay in this browser. Anyone with access to this browser may see them. Clearing browser data will erase them. This tool does not detect emergencies or guarantee that a service is available.</p>
      <Button onClick={() => update({ ...defaultGuardianState(), enabled: true })}>Enable my private planner</Button>
    </section> : <>
      <section className="border rounded-xl p-5 flex flex-wrap gap-3 items-center justify-between">
        <p className="font-medium">{state.paused ? "Tracking paused. Your existing entries remain here." : "Tracking on. Entries are saved only when you choose to record them."}</p>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => update({ ...state, paused: !state.paused })}>{state.paused ? "Resume" : "Pause"}</Button>
          <Button variant="destructive" onClick={() => { if (window.confirm("Erase all Guardian check-ins, goals, plans and support contact from this browser?")) { clearGuardianState(window.localStorage); notifyGuardianChange() } }}>Erase all Guardian data</Button>
        </div>
      </section>
      <section className="border rounded-xl p-5 space-y-4">
        <h2 className="text-xl font-semibold">Today’s check-in</h2>
        <p className="text-sm text-muted-foreground">Unanswered means unknown. “Need help” opens resource paths below.</p>
        <div className="grid sm:grid-cols-2 gap-3">{NEEDS.map((need) => <label key={need} className="flex items-center justify-between gap-2 border rounded-lg p-3">
          <span>{names[need]}</span>
          <select disabled={state.paused} aria-label={`${names[need]} status`} className="bg-background border rounded p-1 max-w-[50%]" value={today.needs[need] ?? ""} onChange={(event) => updateCheckIn(need, event.target.value as NeedStatus || undefined)}>
            <option value="">Unknown</option><option value="met">Met</option><option value="needs-help">Need help</option>
          </select>
        </label>)}</div>
        <div className="grid sm:grid-cols-3 gap-3">
          <label className="flex flex-col gap-1">Mood (optional)<select disabled={state.paused} className="block bg-background border rounded p-2 w-full" value={today.mood ?? ""} onChange={(event) => update({ ...state, entries: [...state.entries.filter((item) => item.date !== now), { ...today, mood: (event.target.value || undefined) as typeof today.mood }] })}><option value="">Unknown</option><option value="good">Good</option><option value="okay">Okay</option><option value="low">Low</option></select></label>
          <label className="flex flex-col gap-1">Craving (optional)<select disabled={state.paused} className="block bg-background border rounded p-2 w-full" value={today.craving ?? ""} onChange={(event) => update({ ...state, entries: [...state.entries.filter((item) => item.date !== now), { ...today, craving: (event.target.value || undefined) as typeof today.craving }] })}><option value="">Unknown</option><option value="none">None</option><option value="some">Some</option><option value="strong">Strong</option></select></label>
          <label className="flex flex-col gap-1">Connection (optional)<select disabled={state.paused} className="block bg-background border rounded p-2 w-full" value={today.isolated === undefined ? "" : today.isolated ? "isolated" : "connected"} onChange={(event) => update({ ...state, entries: [...state.entries.filter((item) => item.date !== now), { ...today, isolated: event.target.value === "" ? undefined : event.target.value === "isolated" }] })}><option value="">Unknown</option><option value="connected">Feeling connected</option><option value="isolated">Feeling isolated</option></select></label>
        </div>
        <label className="flex flex-col gap-1">Hours slept last night (optional, your estimate)
          <input disabled={state.paused} type="number" min="0" max="24" step="0.5" className="block bg-background border rounded p-2 w-28" value={today.sleepHours ?? ""} onChange={(event) => {
            const value = event.target.value
            update({ ...state, entries: [...state.entries.filter((item) => item.date !== now), { ...today, sleepHours: value === "" ? undefined : Number(value) }] })
          }} />
        </label>
      </section>
      <MealLogSection
        today={today}
        entries={state.entries}
        paused={state.paused}
        postalCode={state.postalCode}
        onChange={(entry) => update({ ...state, entries: [...state.entries.filter((item) => item.date !== now), entry] })}
      />
      <section className="border rounded-xl p-5 space-y-4">
        <h2 className="text-xl font-semibold">Your goals and tomorrow’s plan</h2>
        <form className="flex gap-2" onSubmit={(event) => { event.preventDefault(); if (goal.trim()) { update({ ...state, goals: [...state.goals, goal.trim().slice(0, 160)] }); setGoal("") } }}>
          <input aria-label="New goal" disabled={state.paused} maxLength={160} className="bg-background border rounded p-2 flex-1 min-w-0" placeholder="A goal you choose" value={goal} onChange={(event) => setGoal(event.target.value)} />
          <Button disabled={state.paused} type="submit">Add goal</Button>
        </form>

        <ul className="space-y-2">{state.goals.map((item, index) => <li key={`${index}-${item}`} className="flex justify-between gap-2">{item}<button disabled={state.paused} className="underline" onClick={() => update({ ...state, goals: state.goals.filter((_, i) => i !== index) })}>Remove</button></li>)}</ul>
        <p className="text-sm text-muted-foreground">Plan a task or an appointment. NarcoGuard does not book, confirm, or change appointments; verify details with the provider.</p>
        <form className="grid gap-2 sm:grid-cols-2" onSubmit={(event) => { event.preventDefault(); if (planTitle.trim()) { update({ ...state, plan: [...state.plan, { id: crypto.randomUUID(), date: planDate || localDate(1), title: planTitle.trim().slice(0, 160), done: false, kind: planTime ? "appointment" : "task", ...(planTime ? { time: planTime } : {}), ...(planLocation.trim() ? { location: planLocation.trim().slice(0, 160) } : {}), ...(planNeed ? { need: planNeed } : {}) }] }); setPlanTitle(""); setPlanDate(""); setPlanTime(""); setPlanLocation(""); setPlanNeed("") } }}>
          <input aria-label="Task or appointment" disabled={state.paused} maxLength={160} className="bg-background border rounded p-2 sm:col-span-2" placeholder="Task or appointment name" value={planTitle} onChange={(event) => setPlanTitle(event.target.value)} />
          <label className="text-sm">Date<input aria-label="Plan date" disabled={state.paused} type="date" min={now} className="block bg-background border rounded p-2 w-full" value={planDate || localDate(1)} onChange={(event) => setPlanDate(event.target.value)} /></label>
          <label className="text-sm">Time (optional; adding one makes it an appointment)<input aria-label="Plan time" disabled={state.paused} type="time" className="block bg-background border rounded p-2 w-full" value={planTime} onChange={(event) => setPlanTime(event.target.value)} /></label>
          <label className="text-sm">Location or call details (optional)<input aria-label="Plan location" disabled={state.paused} maxLength={160} className="block bg-background border rounded p-2 w-full" value={planLocation} onChange={(event) => setPlanLocation(event.target.value)} /></label>
          <label className="text-sm">Need this supports (optional)<select aria-label="Plan need" disabled={state.paused} className="block bg-background border rounded p-2 w-full" value={planNeed} onChange={(event) => setPlanNeed(event.target.value as Need | "")}><option value="">Choose a need</option>{NEEDS.map((need) => <option key={need} value={need}>{names[need]}</option>)}</select></label>
          <Button disabled={state.paused} type="submit" className="sm:col-span-2">Add to plan</Button>
        </form>
        {today.needs.food === "needs-help" && <p className="text-sm">Planning ahead could help: consider finding a pantry or meal for tomorrow. Check availability before you go.</p>}
        <ul className="space-y-2">{state.plan.filter((item) => item.date >= now).map((item) => <li key={item.id} className="flex flex-wrap items-center gap-3">
          <input aria-label={`Mark ${item.title} complete`} disabled={state.paused} type="checkbox" checked={item.done} onChange={() => update({ ...state, plan: state.plan.map((candidate) => candidate.id === item.id ? { ...candidate, done: !candidate.done } : candidate) })} />
          <span className={item.done ? "line-through" : ""}>{item.date}{item.kind === "appointment" ? ` · appointment${item.time ? ` at ${item.time}` : ""}` : ""}: {item.title}{item.location ? ` · ${item.location}` : ""}{item.need ? ` · support: ${names[item.need]}` : ""}</span>
          <button disabled={state.paused} className="underline ml-auto" onClick={() => update({ ...state, plan: state.plan.filter((candidate) => candidate.id !== item.id) })}>Remove</button>
        </li>)}</ul>
      </section>
      <section className="border rounded-xl p-5 space-y-4" aria-live="polite">
        <h2 className="text-xl font-semibold">Pre-warning & next action</h2>
        {prevention.level === "steady" ? <p>No change that needs attention is visible in the information you chose to record today. Unknown answers stay unknown.</p> : <>
          <p className="font-medium">{prevention.level === "support" ? "Several things you recorded today may deserve support." : "One or more things you recorded today may deserve attention."}</p>
          <ul className="list-disc pl-5 space-y-2">{prevention.signals.map((signal) => <li key={signal.id}><strong>{signal.label}.</strong> {signal.detail}</li>)}</ul>
          <p className="text-sm text-muted-foreground">This compares your voluntary entries with your own recent records. It is not a relapse probability, diagnosis, or proof that one event causes another.</p>
          {suggested.length > 0 && <p>Choose a small next step below for {suggested.map((need) => names[need]).join(", ")}. You remain in control of what happens next.</p>}
        </>}
        <CalmingAudio />
      </section>
      <section className="border rounded-xl p-5 space-y-4">
        <h2 className="text-xl font-semibold">Find a next step</h2>
        <label className="block">Your ZIP code (optional; enter it on the service directory)
          <input disabled={state.paused} inputMode="numeric" maxLength={10} className="block bg-background border rounded p-2" value={state.postalCode} onChange={(event) => update({ ...state, postalCode: event.target.value })} placeholder="ZIP code" />
        </label>
        {state.postalCode && !normalizePostalCode(state.postalCode) && <p className="text-sm">Enter a five-digit US ZIP code, or leave it blank.</p>}
        {needsHelp.length === 0 && <p className="text-muted-foreground">Mark a need above to see relevant starting points.</p>}
        {needsHelp.map((need) => <div key={need} className="space-y-2"><h3 className="font-semibold">{names[need]}</h3>{resourcesForNeed(need, normalizePostalCode(state.postalCode)).map((link) => <p key={link.url}><a href={link.url} target="_blank" rel="noopener noreferrer" className="underline text-primary">{link.title} ↗</a><span className="block text-sm text-muted-foreground">{link.description}</span></p>)}</div>)}
      </section>
      <section className="border rounded-xl p-5 space-y-3">
        <h2 className="text-xl font-semibold">Your patterns and support</h2>
        <p>Current pre-warning: {warning.level}. Based only on the signals you chose to enter today ({warning.score}); this is non-diagnostic and not a probability.</p>
        {patterns.length > 0 ? <ul>{patterns.map((item) => <li key={`${item.trigger}-${item.companion}`}>{names[item.trigger]} + {names[item.companion]}: {item.observed}/{item.answered} answered check-ins ({item.percent}%). This describes your entries; it does not prove cause.</li>)}</ul> : <p>Not enough answered check-ins for a personal pattern yet.</p>}
        <label className="flex items-center gap-2">
          <input disabled={state.paused} type="checkbox" checked={state.escalationEnabled} onChange={(event) => update({ ...state, escalationEnabled: event.target.checked })} />
          Offer my chosen support option when my threshold is reached
        </label>
        <label className="block text-sm">Support threshold
          <select disabled={state.paused || !state.escalationEnabled} className="ml-2 bg-background border rounded p-1" value={state.escalationThreshold} onChange={(event) => update({ ...state, escalationThreshold: Number(event.target.value) })}>
            {[2, 3, 4, 5, 6].map((value) => <option key={value} value={value}>{value} signals</option>)}
          </select>
        </label>
        {state.escalationEnabled && warning.level === "support" && <p className="text-sm">Your chosen threshold is reached. You decide whether to use the support option below; NarcoGuard does not contact anyone automatically.</p>}
        <label className="block">Someone you choose to call (optional)
          <input disabled={state.paused} type="tel" maxLength={30} className="block bg-background border rounded p-2" value={state.supportPhone} onChange={(event) => update({ ...state, supportPhone: event.target.value })} placeholder="Phone number" />
        </label>
        {telephone.length >= 7 && <div className="flex flex-wrap gap-4"><a href={`tel:${telephone}`} className="underline text-primary">Call my support person</a><a href={`sms:${telephone}?body=${encodeURIComponent("Could you check in with me when you can? I would like some support.")}`} className="underline text-primary">Draft a check-in text</a></div>}
        <p className="text-sm text-muted-foreground">NarcoGuard never sends this message automatically. The text link only opens your phone's composer so you can review and choose whether to send it. No relapse risk score or emergency detection is provided here.</p>
      </section>
    </>}
  </main>
}
