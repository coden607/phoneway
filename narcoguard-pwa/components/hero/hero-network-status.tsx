"use client"

import { HolographicCard } from "@/components/effects/holographic-card"
import { GlowButton } from "@/components/effects/glow-button"
import { Users, MapPin } from "lucide-react"
import { HeroMap } from "./hero-map"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"

export function HeroNetworkStatus() {
  const heroesOnline = 0
  const nearbyHeroes = 0

  return (
    <HolographicCard className="p-6" glowIntensity="high">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold font-orbitron">HERO NETWORK</h3>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500 pulse-glow" />
            <span className="text-xs text-muted-foreground">Active</span>
          </div>
        </div>

        {/* Hero stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="glass p-4 rounded-lg neon-border">
            <div className="flex items-center gap-2 mb-2">
              <Users className="w-5 h-5 text-primary pulse-glow" />
              <span className="text-xs text-muted-foreground">Online</span>
            </div>
            <p className="text-3xl font-bold glow-text">{heroesOnline}</p>
          </div>

          <div className="glass p-4 rounded-lg neon-border">
            <div className="flex items-center gap-2 mb-2">
              <MapPin className="w-5 h-5 text-secondary pulse-glow" />
              <span className="text-xs text-muted-foreground">Nearby</span>
            </div>
            <p className="text-3xl font-bold glow-text">{nearbyHeroes}</p>
          </div>
        </div>

        {/* Nearby heroes list */}
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">Closest verified responders</p>
          <p className="text-xs text-amber-200">No responder network is connected.</p>

          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">Responder availability will appear here after a verified network connection.</p>
          </div>
        </div>

        {/* View map button */}
        <Dialog>
          <DialogTrigger asChild>
            <GlowButton variant="default" className="w-full">
              <MapPin className="w-4 h-4 mr-2" />
              View Hero Map
            </GlowButton>
          </DialogTrigger>
          <DialogContent className="sm:max-w-4xl glass neon-border">
            <DialogHeader>
              <DialogTitle className="font-orbitron">Hero Network Map</DialogTitle>
            </DialogHeader>
            <HeroMap />
          </DialogContent>
        </Dialog>
      </div>
    </HolographicCard>
  )
}
