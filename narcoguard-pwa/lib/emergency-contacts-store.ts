"use client"

import { useCallback, useSyncExternalStore } from "react"

// Emergency contacts live only on this device (localStorage). Each confirmed contact carries a
// server-signed consent proof; the server never stores contacts. If storage is blocked, contacts
// last only for this visit.

export interface StoredContact {
  id: string
  name: string
  masked: string
  status: "invited" | "confirmed"
  invite?: string
  link?: string
  proof?: string
  addedAt: number
}

export interface ContactsState {
  senderName: string
  contacts: StoredContact[]
}

const KEY = "narcoguard_emergency_contacts_v1"
const EMPTY: ContactsState = { senderName: "", contacts: [] }
const listeners = new Set<() => void>()
let memory: ContactsState | null = null
let cachedRaw: string | null | undefined
let cached: ContactsState = EMPTY

function parse(raw: string | null): ContactsState {
  if (!raw) return EMPTY
  try {
    const value = JSON.parse(raw) as Partial<ContactsState>
    return {
      senderName: typeof value.senderName === "string" ? value.senderName : "",
      contacts: Array.isArray(value.contacts) ? value.contacts.filter((contact) => contact && typeof contact.id === "string" && typeof contact.name === "string") : [],
    }
  } catch {
    return EMPTY
  }
}

function read(): ContactsState {
  if (memory) return memory
  let raw: string | null = null
  try {
    raw = localStorage.getItem(KEY)
  } catch {
    return cached
  }
  if (raw !== cachedRaw) {
    cachedRaw = raw
    cached = parse(raw)
  }
  return cached
}

function write(next: ContactsState) {
  try {
    localStorage.setItem(KEY, JSON.stringify(next))
    memory = null
  } catch {
    memory = next
  }
  listeners.forEach((listener) => listener())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  const onStorage = (event: StorageEvent) => event.key === KEY && listener()
  window.addEventListener("storage", onStorage)
  return () => {
    listeners.delete(listener)
    window.removeEventListener("storage", onStorage)
  }
}

export function useEmergencyContacts() {
  const state = useSyncExternalStore(subscribe, read, () => EMPTY)
  const update = useCallback((change: (current: ContactsState) => ContactsState) => write(change(read())), [])
  return { state, update }
}

export function clearEmergencyContacts() {
  try {
    localStorage.removeItem(KEY)
  } catch {
    // Nothing stored.
  }
  memory = null
  listeners.forEach((listener) => listener())
}
