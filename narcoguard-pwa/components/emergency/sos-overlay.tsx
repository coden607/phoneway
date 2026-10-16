"use client"

import { useEffect, useState } from "react"
import { AlertTriangle, MapPin, Heart } from "lucide-react"
import { ParticleField } from "@/components/effects/particle-field"

interface SOSOverlayProps {
  active: boolean
  naloxoneLocation?: string
  vitals?: {
    heartRate: number
    spO2: number
  }
}

export function SOSOverlay({ active, naloxoneLocation = "Front pocket", vitals }: SOSOverlayProps) {
  const [pulseCount, setPulseCount] = useState(0)

  useEffect(() => {
    if (!active) return

    const interval = setInterval(() => {
      setPulseCount((prev) => prev + 1)
    }, 1000)

    return () => clearInterval(interval)
  }, [active])

  if (!active) return null

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-xs">
      <ParticleField count={100} color="var(--glow-emergency)" />

      {/* Pulsing border */}
      <div className="absolute inset-0 border-8 border-destructive emergency-pulse" />

      <div className="relative h-full flex flex-col items-center justify-center p-8 text-center">
        {/* Main alert */}
        <div className="space-y-8">
          <div className="relative">
            <AlertTriangle className="w-32 h-32 mx-auto text-destructive animate-bounce" />
            <div className="absolute inset-0 blur-3xl bg-destructive/50 animate-pulse" />
          </div>

          <div>
            <h1 className="text-6xl font-bold text-destructive glow-text mb-4 font-orbitron">
              EMERGENCY
            </h1>
            <p className="text-3xl text-white">Medical Assistance Needed</p>
          </div>

          {/* Critical info cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto">
            <div className="glass neon-border p-6 rounded-xl emergency-pulse">
              <MapPin className="w-8 h-8 mx-auto mb-3 text-destructive" />
              <h3 className="text-xl font-bold mb-2">Naloxone Location</h3>
              <p className="text-2xl text-primary glow-text">{naloxoneLocation}</p>
            </div>

            {vitals && (
              <div className="glass neon-border p-6 rounded-xl emergency-pulse">
                <Heart className="w-8 h-8 mx-auto mb-3 text-destructive heartbeat" />
                <h3 className="text-xl font-bold mb-2">Vital Signs</h3>
                <div className="space-y-1">
                  <p className="text-lg">
                    HR: <span className="text-primary glow-text">{vitals.heartRate} BPM</span>
                  </p>
                  <p className="text-lg">
                    SpO2: <span className="text-primary glow-text">{vitals.spO2}%</span>
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Status indicators */}
          <div className="flex items-center justify-center gap-8 text-lg">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-green-500 pulse-glow" />
              <span>Heroes En Route</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-green-500 pulse-glow" />
              <span>Location Shared</span>
            </div>
          </div>

          {/* Pulse counter */}
          <div className="text-muted-foreground">Emergency active for {pulseCount} seconds</div>
        </div>
      </div>
    </div>
  )
}
