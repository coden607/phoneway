"use client"

import { HolographicCard } from "@/components/effects/holographic-card"
import { GlowButton } from "@/components/effects/glow-button"
import { Watch, Battery, Bluetooth, Settings, Syringe } from "lucide-react"
import { Progress } from "@/components/ui/progress"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { WatchDetails } from "./watch-details"

export function NGWatchStatus() {
  const battery: number | null = null
  const isConnected = false


  const getBatteryColor = () => {
    if (battery === null) return "text-muted-foreground"
    if (battery > 60) return "text-green-500"
    if (battery > 30) return "text-yellow-500"
    return "text-red-500"
  }

  return (
    <HolographicCard className="p-6" glowIntensity="high">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-12 h-12 rounded-lg bg-linear-to-br from-primary to-purple-500 flex items-center justify-center pulse-glow">
                <Watch className="w-6 h-6 text-white" />
              </div>
              {isConnected && (
                <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-green-500 flex items-center justify-center pulse-glow">
                  <Bluetooth className="w-2 h-2 text-white" />
                </div>
              )}
            </div>
            <div>
              <h3 className="text-lg font-semibold font-orbitron flex items-center gap-2">
                NARCOGUARD NG
                <span className="text-xs px-2 py-0.5 rounded-full bg-primary/20 text-primary">CONCEPT ONLY</span>
              </h3>
              {/* */}
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${isConnected ? "bg-green-500" : "bg-red-500"} pulse-glow`} />
                <span className="text-xs text-muted-foreground">{isConnected ? "Connected" : "Disconnected"}</span>
              </div>
            </div>
          </div>

          <Dialog>
            <DialogTrigger asChild>
              <button type="button" aria-label="Show NarcoGuard NG details" className="p-2 rounded-full glass hover:bg-primary/10 transition-all">
                <Settings aria-hidden="true" className="w-5 h-5 text-muted-foreground hover:text-primary" />
              </button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-2xl glass neon-border">
              <DialogHeader>
                <DialogTitle className="font-orbitron">NarcoGuard NG Details</DialogTitle>
              </DialogHeader>
              <WatchDetails />
            </DialogContent>
          </Dialog>
        </div>

        {/* Battery Status */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Battery className={`w-5 h-5 ${getBatteryColor()} ${battery !== null && battery < 30 ? "animate-pulse" : ""}`} />
              <span className="text-sm text-muted-foreground">Battery</span>
            </div>
            <span className={`text-2xl font-bold glow-text ${getBatteryColor()}`}>{battery === null ? "Unavailable" : Math.round(battery) + "%"}</span>
          </div>
          <Progress value={battery} aria-label="Watch battery level" className="h-3 pulse-glow" />

        </div>

        {/* Naloxone Status */}
        <div className="p-4 rounded-lg glass neon-border">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Syringe className="w-5 h-5 text-muted-foreground" />
              <span className="text-sm font-medium">Auto-Injector</span>
            </div>
            <span className="text-xs px-2 py-1 rounded-full bg-muted text-muted-foreground">
              UNAVAILABLE
            </span>
          </div>
          <p className="text-xs text-muted-foreground">No verified injector hardware is connected</p>
          {/* */}
        </div>

        {/* Quick stats grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="glass p-3 rounded-lg text-center">
            <div className="text-2xl font-bold glow-text">—</div>
            <div className="text-xs text-muted-foreground">Heart Rate</div>
          </div>
          <div className="glass p-3 rounded-lg text-center">
            <div className="text-2xl font-bold glow-text">—</div>
            <div className="text-xs text-muted-foreground">SpO2</div>
          </div>
        </div>

        {/* Sync button */}
        <GlowButton variant="default" className="w-full" disabled>
          <Bluetooth className="w-4 h-4 mr-2" />
          Verified watch unavailable
        </GlowButton>
      </div>
    </HolographicCard>
  )
}
