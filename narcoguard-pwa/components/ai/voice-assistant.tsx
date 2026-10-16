"use client"

import { Mic } from "lucide-react"
import { GlowButton } from "@/components/effects/glow-button"

export function VoiceAssistant() {
  return (
    <div className="fixed bottom-6 right-6 z-40">
      <div className="relative">
        <GlowButton disabled size="lg" className="relative w-16 h-16 rounded-full" aria-label="Voice provider unavailable">
          <Mic className="w-6 h-6" />
        </GlowButton>
        <p className="mt-2 text-center text-xs text-muted-foreground">Voice provider unavailable</p>
      </div>
    </div>
  )
}
