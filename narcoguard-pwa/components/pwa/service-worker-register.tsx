"use client"

import { useEffect } from "react"

export function ServiceWorkerRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return

    navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch((error) => {
      // Registration is best-effort; the online application remains usable.
      console.warn("NarcoGuard service worker registration failed", error)
    })
  }, [])

  return null
}
