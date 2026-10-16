"use client"

import { useState, useEffect } from "react"
import { usePWAInstall } from "@/lib/hooks/use-pwa-install"
import { InstallGuide } from "@/components/pwa/install-guide"
import { Button } from "@/components/ui/button"
import { X, Download, Check } from "lucide-react"

const DISMISS_KEY = "narcoguard_install_dismissed_at"
const DISMISS_DAYS = 7

function recentlyDismissed() {
  try {
    const at = Number(localStorage.getItem(DISMISS_KEY))
    return Number.isFinite(at) && Date.now() - at < DISMISS_DAYS * 86_400_000
  } catch {
    return false
  }
}

export function InstallPrompt() {
  const { method, installPWA } = usePWAInstall()
  const [showPrompt, setShowPrompt] = useState(false)
  const [guideOpen, setGuideOpen] = useState(false)
  const [installing, setInstalling] = useState(false)
  const offerable = method === "prompt" || method === "ios" || method === "ios-in-app"

  useEffect(() => {
    if (!offerable || recentlyDismissed()) return
    const timer = setTimeout(() => setShowPrompt(true), 2000)
    return () => clearTimeout(timer)
  }, [offerable])

  const dismiss = () => {
    setShowPrompt(false)
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()))
    } catch {
      // Without storage the banner simply returns on the next visit.
    }
  }

  const handleInstall = async () => {
    if (method !== "prompt") {
      setGuideOpen(true)
      return
    }
    setInstalling(true)
    const accepted = await installPWA()
    setInstalling(false)
    if (accepted) setShowPrompt(false)
  }

  return (
    <>
      {showPrompt && offerable && (
        <div className="fixed bottom-4 left-4 right-4 z-50 animate-slide-up" role="region" aria-label="Install NarcoGuard" data-testid="install-banner">
          <div className="relative overflow-hidden rounded-2xl border-2 border-primary/50 bg-linear-to-br from-background/95 via-background/98 to-background/95 p-6 shadow-2xl backdrop-blur-xl">
            <div className="absolute inset-0 bg-linear-to-r from-primary/20 via-accent/20 to-primary/20 animate-pulse-glow" />

            <button
              onClick={dismiss}
              className="absolute right-4 top-4 text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="relative space-y-4">
              <div className="flex items-start gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-linear-to-br from-primary to-accent animate-float">
                  <Download className="h-7 w-7 text-primary-foreground" />
                </div>

                <div className="flex-1">
                  <h3 className="font-orbitron text-lg font-bold text-foreground mb-1">Install NarcoGuard</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {method === "prompt" ? "Add NarcoGuard to your device in one tap." : "Add NarcoGuard to your home screen in a few taps. We'll show you where."}
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={handleInstall}
                  disabled={installing}
                  className="flex-1 h-12 bg-linear-to-r from-primary to-accent hover:opacity-90 text-primary-foreground font-semibold rounded-xl transition-all hover:scale-105"
                >
                  {installing ? (
                    <>
                      <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                      Installing...
                    </>
                  ) : (
                    <>
                      <Download className="mr-2 h-5 w-5" />
                      {method === "prompt" ? "Install App" : "Show me how"}
                    </>
                  )}
                </Button>

                <Button
                  onClick={dismiss}
                  variant="outline"
                  className="h-12 px-6 rounded-xl border-2 hover:bg-muted/50"
                >
                  Later
                </Button>
              </div>

              <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                <Check className="h-3 w-3 text-primary" />
                <span>Home-screen icon</span>
                <span>•</span>
                <Check className="h-3 w-3 text-primary" />
                <span>Opens full screen</span>
                <span>•</span>
                <Check className="h-3 w-3 text-primary" />
                <span>No app store needed</span>
              </div>
            </div>
          </div>
        </div>
      )}
      <InstallGuide method={method} open={guideOpen} onOpenChange={setGuideOpen} />
    </>
  )
}
