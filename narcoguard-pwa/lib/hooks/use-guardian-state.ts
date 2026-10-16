"use client"

import { useMemo, useSyncExternalStore } from "react"
import { GUARDIAN_STORAGE_KEY, readGuardianState, type GuardianState } from "@/lib/guardian-stability"

const LEGACY_KEY = "narcoguard_guardian_stability_v1"
const CHANGE_EVENT = "narcoguard:guardian-change"
const SEPARATOR = "\u0000"

function readSnapshot(): string {
  try {
    return [localStorage.getItem(GUARDIAN_STORAGE_KEY) ?? "", localStorage.getItem(LEGACY_KEY) ?? ""].join(SEPARATOR)
  } catch {
    // Storage unavailable (private mode, blocked site data): the planner starts empty.
    return SEPARATOR
  }
}

function subscribe(onChange: () => void) {
  const onStorage = (event: StorageEvent) => {
    if (event.key === null || event.key === GUARDIAN_STORAGE_KEY || event.key === LEGACY_KEY) onChange()
  }
  window.addEventListener("storage", onStorage)
  window.addEventListener(CHANGE_EVENT, onChange)
  return () => {
    window.removeEventListener("storage", onStorage)
    window.removeEventListener(CHANGE_EVENT, onChange)
  }
}

/** Call after writing Guardian data to localStorage so subscribed views re-read it. */
export function notifyGuardianChange() {
  window.dispatchEvent(new Event(CHANGE_EVENT))
}

/** Browser-only Guardian planner state; null during server rendering and hydration. */
export function useGuardianState(): GuardianState | null {
  const snapshot = useSyncExternalStore(subscribe, readSnapshot, () => null)
  return useMemo(() => {
    if (snapshot === null) return null
    const [current, legacy] = snapshot.split(SEPARATOR)
    const values: Record<string, string> = { [GUARDIAN_STORAGE_KEY]: current, [LEGACY_KEY]: legacy }
    return readGuardianState({ getItem: (key) => values[key] || null, setItem: () => undefined, removeItem: () => undefined })
  }, [snapshot])
}

const noSubscription = () => () => undefined
const localDate = () => {
  const date = new Date()
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
}

/** Today's date in the person's own time zone (YYYY-MM-DD); null during server rendering. */
export function useLocalDate(): string | null {
  return useSyncExternalStore(noSubscription, localDate, () => null)
}
