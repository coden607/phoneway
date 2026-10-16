"use client"

import { useState } from "react"
import { HolographicCard } from "@/components/effects/holographic-card"
import { GlowButton } from "@/components/effects/glow-button"
import { Camera, Play, Award, Clock, Target } from "lucide-react"

interface TrainingModule {
  id: string
  title: string
  description: string
  duration: string
  difficulty: "beginner" | "intermediate" | "advanced"
  completed: boolean
}

export function ARTraining() {
  const [modules] = useState<TrainingModule[]>([
    {
      id: "naloxone-basic",
      title: "Naloxone Administration Basics",
      description: "Learn the fundamentals of naloxone administration with AR guidance",
      duration: "10 min",
      difficulty: "beginner",
      completed: false,
    },
    {
      id: "cpr-basics",
      title: "CPR Fundamentals",
      description: "Master chest compressions and rescue breathing techniques",
      duration: "15 min",
      difficulty: "beginner",
      completed: false,
    },
    {
      id: "emergency-response",
      title: "Emergency Response Protocol",
      description: "Complete emergency response from recognition to recovery",
      duration: "20 min",
      difficulty: "intermediate",
      completed: false,
    },
    {
      id: "advanced-scenarios",
      title: "Advanced Scenarios",
      description: "Handle complex situations with multiple casualties",
      duration: "30 min",
      difficulty: "advanced",
      completed: false,
    },
  ])

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "beginner":
        return "text-green-500"
      case "intermediate":
        return "text-yellow-500"
      case "advanced":
        return "text-red-500"
      default:
        return "text-muted-foreground"
    }
  }

  return (
    <div className="space-y-6">
      <HolographicCard className="p-6" glowIntensity="high">
        <div className="flex items-center gap-4 mb-6">
          <div className="relative">
            <div className="w-16 h-16 rounded-full bg-linear-to-br from-primary to-purple-500 flex items-center justify-center pulse-glow">
              <Camera className="w-8 h-8 text-white" />
            </div>
            <div className="absolute -top-1 -right-1">
              <Award className="w-6 h-6 text-secondary pulse-glow" />
            </div>
          </div>
          <div>
            <h2 className="text-2xl font-bold glow-text font-orbitron">AR TRAINING</h2>
            <p className="text-muted-foreground">Interactive augmented reality training modules</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="glass p-4 rounded-lg text-center">
            <Target className="w-6 h-6 mx-auto mb-2 text-primary pulse-glow" />
            <p className="text-2xl font-bold glow-text">0/4</p>
            <p className="text-xs text-muted-foreground">Completed</p>
          </div>
          <div className="glass p-4 rounded-lg text-center">
            <Clock className="w-6 h-6 mx-auto mb-2 text-secondary pulse-glow" />
            <p className="text-2xl font-bold glow-text">75m</p>
            <p className="text-xs text-muted-foreground">Total Time</p>
          </div>
          <div className="glass p-4 rounded-lg text-center">
            <Award className="w-6 h-6 mx-auto mb-2 text-yellow-500 pulse-glow" />
            <p className="text-2xl font-bold glow-text">0</p>
            <p className="text-xs text-muted-foreground">Certificates</p>
          </div>
        </div>
      </HolographicCard>

      {/* Training modules */}
      <div className="space-y-4">
        {modules.map((module) => (
          <HolographicCard key={module.id} className="p-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-lg font-semibold">{module.title}</h3>
                  <span className={`text-xs px-2 py-1 rounded-full glass ${getDifficultyColor(module.difficulty)}`}>
                    {module.difficulty}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground mb-3">{module.description}</p>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    <span>{module.duration}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Camera className="w-3 h-3" />
                    <span>AR Required</span>
                  </div>
                </div>
              </div>
              <GlowButton variant="default">
                <Play className="w-4 h-4 mr-2" />
                Start
              </GlowButton>
            </div>
          </HolographicCard>
        ))}
      </div>
    </div>
  )
}
