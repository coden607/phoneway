export interface EmergencyContact {
  id: string
  name: string
  relationship: string
  phone: string
  notifyMethod: "call" | "text" | "both"
}

export interface NaloxoneLocation {
  id: string
  description: string
  location: string
  instructions?: string
}

export interface UserPreferences {
  name: string
  hasCompletedOnboarding: boolean
  skippedSetup?: boolean
  emergencyContacts: EmergencyContact[]
  naloxoneLocations: NaloxoneLocation[]
  emergencyPreferences: {
    soundAlarm: boolean
    call911: boolean
    notifyContacts: boolean
    shareLocation: boolean
  }
  privacy: {
    incognitoMode: boolean
    shareWithHeroes: boolean
    anonymousMode: boolean
  }
  features: {
    neverUseAlone: boolean
    autoDetection: boolean
    voiceActivation: boolean
  }
  legal: {
    acceptedTerms: boolean
    acceptedPrivacy: boolean
    acceptedHIPAA: boolean
    acknowledgedGoodSamaritan: boolean
    state?: string
  }
  heroStatus?: {
    isHero: boolean
    completedTraining: boolean
    certifications: string[]
  }
}

const DEFAULT_PREFERENCES: UserPreferences = {
  name: "",
  hasCompletedOnboarding: false,
  skippedSetup: false,
  emergencyContacts: [],
  naloxoneLocations: [],
  emergencyPreferences: {
    soundAlarm: true,
    call911: true,
    notifyContacts: true,
    shareLocation: true,
  },
  privacy: {
    incognitoMode: false,
    shareWithHeroes: true,
    anonymousMode: false,
  },
  features: {
    neverUseAlone: true,
    autoDetection: true,
    voiceActivation: true,
  },
  legal: {
    acceptedTerms: false,
    acceptedPrivacy: false,
    acceptedHIPAA: false,
    acknowledgedGoodSamaritan: false,
  },
}

const STORAGE_KEY = "narcoguard_preferences"
const CHANGE_EVENT = "narcoguard:preferences-change"

export function parseUserPreferences(stored: string | null): UserPreferences {
  if (!stored) return DEFAULT_PREFERENCES
  try {
    return { ...DEFAULT_PREFERENCES, ...JSON.parse(stored) }
  } catch {
    return DEFAULT_PREFERENCES
  }
}

/** Raw stored value; a string is a stable snapshot for useSyncExternalStore. */
export function readStoredPreferences(): string {
  try {
    return localStorage.getItem(STORAGE_KEY) ?? ""
  } catch {
    // Storage can be unavailable (private mode, blocked site data); treat as no saved preferences.
    return ""
  }
}

/** Notifies on changes from this tab (save/reset) and other tabs (storage event). */
export function subscribeToPreferences(onChange: () => void) {
  const onStorage = (event: StorageEvent) => {
    if (event.key === null || event.key === STORAGE_KEY) onChange()
  }
  window.addEventListener("storage", onStorage)
  window.addEventListener(CHANGE_EVENT, onChange)
  return () => {
    window.removeEventListener("storage", onStorage)
    window.removeEventListener(CHANGE_EVENT, onChange)
  }
}

export function getUserPreferences(): UserPreferences {
  if (typeof window === "undefined") return DEFAULT_PREFERENCES
  return parseUserPreferences(readStoredPreferences())
}

export function saveUserPreferences(preferences: Partial<UserPreferences>) {
  if (typeof window === "undefined") return

  const current = getUserPreferences()
  const updated = { ...current, ...preferences }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
  window.dispatchEvent(new Event(CHANGE_EVENT))
}

export function resetUserPreferences() {
  if (typeof window === "undefined") return
  localStorage.removeItem(STORAGE_KEY)
  window.dispatchEvent(new Event(CHANGE_EVENT))
}
