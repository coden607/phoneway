"use client"

import { useState, useEffect } from "react"
import type { LucideIcon } from "lucide-react"
import { HolographicCard } from "@/components/effects/holographic-card"
import { GlowButton } from "@/components/effects/glow-button"
import { Camera, Hand, Heart, Syringe, CheckCircle, ArrowRight } from "lucide-react"
import { ParticleField } from "@/components/effects/particle-field"

interface ARStep {
  id: number
  title: string
  description: string
  icon: LucideIcon
  duration: number
}

const naloxoneSteps: ARStep[] = [
    {
      id: 1,
      title: "Check Responsiveness",
      description: "Tap shoulders firmly and shout their name. Check for breathing.",
      icon: Hand,
      duration: 5,
    },
    {
      id: 2,
      title: "Call for Help",
      description: "Call 911 or activate emergency response. Get naloxone ready.",
      icon: Camera,
      duration: 3,
    },
    {
      id: 3,
      title: "Prepare Naloxone",
      description: "Remove naloxone from packaging. Hold firmly in dominant hand.",
      icon: Syringe,
      duration: 5,
    },
    {
      id: 4,
      title: "Administer Naloxone",
      description: "Place tip in nostril. Press plunger firmly. Alternate nostril for second dose.",
      icon: Syringe,
      duration: 10,
    },
    {
      id: 5,
      title: "Monitor & Support",
      description: "Place in recovery position. Monitor breathing. Be ready for second dose.",
      icon: Heart,
      duration: 120,
    },
]

const cprSteps: ARStep[] = [
    {
      id: 1,
      title: "Position Hands",
      description: "Place heel of hand on center of chest. Interlock fingers.",
      icon: Hand,
      duration: 5,
    },
    {
      id: 2,
      title: "Begin Compressions",
      description: "Push hard and fast. 2 inches deep. 100-120 per minute.",
      icon: Heart,
      duration: 30,
    },
    {
      id: 3,
      title: "Continue CPR",
      description: "Keep going until help arrives or person responds.",
      icon: Heart,
      duration: 120,
    },
]

const noSteps: ARStep[] = []

export function ARGuidance() {
  const [isActive, setIsActive] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)
  const [mode, setMode] = useState<"naloxone" | "cpr" | null>(null)

  const steps = mode === "naloxone" ? naloxoneSteps : mode === "cpr" ? cprSteps : noSteps

  useEffect(() => {
    if (!isActive || currentStep >= steps.length) return

    const timer = setTimeout(() => {
      if (currentStep < steps.length - 1) {
        setCurrentStep(currentStep + 1)
      }
    }, steps[currentStep].duration * 1000)

    return () => clearTimeout(timer)
  }, [isActive, currentStep, steps])

  const startGuidance = (selectedMode: "naloxone" | "cpr") => {
    setMode(selectedMode)
    setIsActive(true)
    setCurrentStep(0)
  }

  const stopGuidance = () => {
    setIsActive(false)
    setMode(null)
    setCurrentStep(0)
  }

  if (!isActive) {
    return (
      <div className="space-y-4">
        <HolographicCard className="p-8 text-center" glowIntensity="high">
          <div className="space-y-6">
            <div className="relative inline-block">
              <Camera className="w-24 h-24 text-primary pulse-glow float-animation" />
              <div className="absolute inset-0 blur-2xl bg-primary/50 animate-pulse" />
            </div>
            <div>
              <h2 className="text-2xl font-bold glow-text font-orbitron">AR GUIDANCE</h2>
              <p className="text-muted-foreground mt-2">
                Step-by-step augmented reality instructions for emergency response
              </p>
            </div>
          </div>
        </HolographicCard>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <HolographicCard className="p-6 cursor-pointer hover:scale-105 transition-transform">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-full bg-primary/20 pulse-glow">
                  <Syringe className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-xl font-bold font-orbitron">NALOXONE</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                Learn proper naloxone administration with AR overlay guidance
              </p>
              <GlowButton onClick={() => startGuidance("naloxone")} className="w-full">
                Start Naloxone Guide
              </GlowButton>
            </div>
          </HolographicCard>

          <HolographicCard className="p-6 cursor-pointer hover:scale-105 transition-transform">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-full bg-red-500/20 pulse-glow">
                  <Heart className="w-8 h-8 text-red-500 heartbeat" />
                </div>
                <h3 className="text-xl font-bold font-orbitron">CPR</h3>
              </div>
              <p className="text-sm text-muted-foreground">Follow AR-guided CPR instructions with real-time feedback</p>
              <GlowButton onClick={() => startGuidance("cpr")} className="w-full" variant="emergency">
                Start CPR Guide
              </GlowButton>
            </div>
          </HolographicCard>
        </div>
      </div>
    )
  }

  const currentStepData = steps[currentStep]
  const StepIcon = currentStepData.icon
  const progress = ((currentStep + 1) / steps.length) * 100

  return (
    <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-xs">
      <ParticleField count={50} color="var(--glow-primary)" />

      <div className="relative h-full flex flex-col p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Camera className="w-8 h-8 text-primary pulse-glow" />
            <div>
              <h2 className="text-2xl font-bold glow-text font-orbitron">
                AR GUIDANCE ACTIVE
              </h2>
              <p className="text-sm text-muted-foreground">
                {mode === "naloxone" ? "Naloxone Administration" : "CPR Instructions"}
              </p>
            </div>
          </div>
          <GlowButton onClick={stopGuidance} variant="emergency">
            Exit AR Mode
          </GlowButton>
        </div>

        {/* Progress bar */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">
              Step {currentStep + 1} of {steps.length}
            </span>
            <span className="text-sm text-primary font-bold">{Math.round(progress)}%</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-linear-to-r from-primary to-secondary pulse-glow transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* AR Camera View Simulation */}
        <div className="flex-1 relative rounded-2xl overflow-hidden glass neon-border mb-6">
          {/* Simulated camera feed */}
          <div className="absolute inset-0 bg-linear-to-br from-muted/20 to-background/40">
            {/* Scan lines effect */}
            <div className="absolute inset-0 opacity-20">
              {Array.from({ length: 20 }).map((_, i) => (
                <div
                  key={i}
                  className="h-px bg-primary"
                  style={{
                    position: "absolute",
                    top: `${i * 5}%`,
                    left: 0,
                    right: 0,
                    animation: "scan-line 2s linear infinite",
                    animationDelay: `${i * 0.1}s`,
                  }}
                />
              ))}
            </div>

            {/* AR Overlay */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center space-y-6 max-w-2xl p-8">
                {/* Step icon */}
                <div className="relative inline-block">
                  <div className="w-32 h-32 rounded-full bg-primary/20 flex items-center justify-center pulse-glow">
                    <StepIcon className="w-16 h-16 text-primary" />
                  </div>
                  <div className="absolute inset-0 blur-3xl bg-primary/50 animate-pulse" />
                </div>

                {/* Step info */}
                <div className="glass neon-border p-8 rounded-2xl">
                  <h3 className="text-4xl font-bold glow-text mb-4 font-orbitron">
                    {currentStepData.title}
                  </h3>
                  <p className="text-xl text-foreground leading-relaxed">{currentStepData.description}</p>
                </div>

                {/* Timer */}
                <div className="flex items-center justify-center gap-4">
                  <div className="glass px-6 py-3 rounded-full neon-border">
                    <span className="text-2xl font-bold glow-text">{currentStepData.duration}s</span>
                  </div>
                </div>

                {/* Navigation */}
                {currentStep < steps.length - 1 && (
                  <GlowButton onClick={() => setCurrentStep(currentStep + 1)} size="lg" className="mt-6">
                    Next Step
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </GlowButton>
                )}

                {currentStep === steps.length - 1 && (
                  <GlowButton onClick={stopGuidance} variant="success" size="lg" className="mt-6">
                    <CheckCircle className="w-5 h-5 mr-2" />
                    Complete Guidance
                  </GlowButton>
                )}
              </div>
            </div>

            {/* Corner markers */}
            <div className="absolute top-4 left-4 w-12 h-12 border-l-4 border-t-4 border-primary pulse-glow" />
            <div className="absolute top-4 right-4 w-12 h-12 border-r-4 border-t-4 border-primary pulse-glow" />
            <div className="absolute bottom-4 left-4 w-12 h-12 border-l-4 border-b-4 border-primary pulse-glow" />
            <div className="absolute bottom-4 right-4 w-12 h-12 border-r-4 border-b-4 border-primary pulse-glow" />
          </div>
        </div>

        {/* Step indicators */}
        <div className="flex justify-center gap-2">
          {steps.map((step, index) => (
            <div
              key={step.id}
              className={`h-2 rounded-full transition-all duration-300 ${
                index === currentStep
                  ? "w-12 bg-primary pulse-glow"
                  : index < currentStep
                    ? "w-8 bg-green-500"
                    : "w-8 bg-muted"
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
