"use client"

import { useMemo, useSyncExternalStore } from "react"
import { parseUserPreferences, readStoredPreferences, subscribeToPreferences, type UserPreferences } from "@/lib/user-preferences"

const serverSnapshot = () => null

/** Saved preferences, or null during server rendering and hydration (storage is browser-only). */
export function useUserPreferences(): UserPreferences | null {
  const stored = useSyncExternalStore(subscribeToPreferences, readStoredPreferences, serverSnapshot)
  return useMemo(() => (stored === null ? null : parseUserPreferences(stored)), [stored])
}
