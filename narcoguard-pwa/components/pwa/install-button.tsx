"use client"

import { useState } from "react"
import { Download } from "lucide-react"
import { InstallGuide } from "@/components/pwa/install-guide"
import { usePWAInstall } from "@/lib/hooks/use-pwa-install"
import { cn } from "@/lib/utils"

/**
 * Installs in one tap where the browser allows it (Chrome, Edge, Android) and opens Add to Home
 * Screen steps everywhere else. Renders nothing once installed or where install is impossible.
 */
export function InstallButton({ className, label = "Install" }: { className?: string; label?: string }) {
  const { method, installPWA } = usePWAInstall()
  const [guideOpen, setGuideOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  if (method === "none") return null

  const install = async () => {
    if (method !== "prompt") {
      setGuideOpen(true)
      return
    }
    setBusy(true)
    try {
      await installPWA()
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <button type="button" className={cn("install-button", className)} onClick={install} disabled={busy} data-install-method={method}>
        <Download aria-hidden="true" />{busy ? "Installing…" : label}
      </button>
      <InstallGuide method={method} open={guideOpen} onOpenChange={setGuideOpen} />
    </>
  )
}
