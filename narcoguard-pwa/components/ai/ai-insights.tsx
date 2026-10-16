"use client"

import { HolographicCard } from "@/components/effects/holographic-card"
import { Brain } from "lucide-react"

export function AIInsights() {
  const insights = [
    {
      icon: Brain,
      title: "Insights unavailable",
      description: "No verified vitals or AI provider is connected, so no personalized claim is shown.",
      color: "text-muted-foreground",
      bgColor: "bg-muted",
    },
  ]

  return (
    <HolographicCard className="p-6">
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-full bg-primary/20 pulse-glow">
            <Brain className="w-6 h-6 text-primary rotate-3d" />
          </div>
          <div>
            <h3 className="text-lg font-semibold font-orbitron">AI INSIGHTS</h3>
            <p className="text-xs text-muted-foreground">Provider status</p>
          </div>
        </div>

        <div className="space-y-3">
          {insights.map((insight, index) => {
            const Icon = insight.icon
            return (
              <div
                key={index}
                className="p-4 rounded-lg glass neon-border hover:bg-primary/5 transition-all duration-300 group cursor-pointer"
              >
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-full ${insight.bgColor} group-hover:pulse-glow transition-all`}>
                    <Icon className={`w-5 h-5 ${insight.color}`} />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium mb-1">{insight.title}</h4>
                    <p className="text-sm text-muted-foreground">{insight.description}</p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* AI Learning indicator */}
        <div className="p-3 rounded-lg glass text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Brain className="w-4 h-4 text-primary pulse-glow" />
            <span className="text-sm font-medium">AI provider unavailable</span>
          </div>
          <p className="text-xs text-muted-foreground">
            No AI service is connected. This panel does not make medical or recovery claims.
          </p>
        </div>
      </div>
    </HolographicCard>
  )
}
