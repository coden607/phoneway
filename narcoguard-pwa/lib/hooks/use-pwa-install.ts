"use client"

import { useSyncExternalStore } from "react"
import { installMethod, type InstallMethod } from "@/lib/install-platform"

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>
}

declare global {
  interface Window { __ngInstallPrompt?: BeforeInstallPromptEvent | null; __ngInstalled?: boolean }
}

const STANDALONE_QUERY = "(display-mode: standalone)"
const CHANGE = "ng-installprompt"

// The layout's inline script stores Chromium's one-time install prompt on window before React loads.
function subscribe(onChange: () => void) {
  const query = window.matchMedia(STANDALONE_QUERY)
  const captureLate = (event: Event) => {
    event.preventDefault()
    window.__ngInstallPrompt = event as BeforeInstallPromptEvent
    onChange()
  }
  const installed = () => {
    window.__ngInstalled = true
    window.__ngInstallPrompt = null
    onChange()
  }
  query.addEventListener("change", onChange)
  window.addEventListener(CHANGE, onChange)
  window.addEventListener("beforeinstallprompt", captureLate)
  window.addEventListener("appinstalled", installed)
  return () => {
    query.removeEventListener("change", onChange)
    window.removeEventListener(CHANGE, onChange)
    window.removeEventListener("beforeinstallprompt", captureLate)
    window.removeEventListener("appinstalled", installed)
  }
}

// iOS home-screen apps report navigator.standalone rather than the display-mode media query.
const isInstalledNow = () => window.__ngInstalled === true || window.matchMedia(STANDALONE_QUERY).matches || (navigator as Navigator & { standalone?: boolean }).standalone === true

const snapshot = (): InstallMethod | "installed" => {
  if (isInstalledNow()) return "installed"
  return installMethod({ userAgent: navigator.userAgent, maxTouchPoints: navigator.maxTouchPoints ?? 0, canPrompt: Boolean(window.__ngInstallPrompt) })
}

export function usePWAInstall() {
  const state = useSyncExternalStore(subscribe, snapshot, () => "none" as const)
  const isInstalled = state === "installed"
  const method: InstallMethod = isInstalled ? "none" : state
  const isInstallable = method === "prompt"

  /** Shows the browser's own install dialog; resolves true when the person accepts. */
  const installPWA = async () => {
    const prompt = window.__ngInstallPrompt
    if (!prompt) return false
    await prompt.prompt()
    const { outcome } = await prompt.userChoice
    // A prompt can only be used once, whatever the person chose.
    window.__ngInstallPrompt = null
    window.dispatchEvent(new Event(CHANGE))
    return outcome === "accepted"
  }

  return { isInstallable, isInstalled, installPWA, method }
}
