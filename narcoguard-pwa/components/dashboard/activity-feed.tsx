"use client"

import { HolographicCard } from "@/components/effects/holographic-card"
import { CheckCircle, AlertCircle, Info, TrendingUp } from "lucide-react"

const activities = [
  {
    icon: CheckCircle,
    text: "Daily check-in completed",
    time: "2 min ago",
    color: "text-green-500",
  },
  {
    icon: Info,
    text: "Guardian AI tip: Stay hydrated",
    time: "1 hour ago",
    color: "text-blue-500",
  },
  {
    icon: TrendingUp,
    text: "7-day streak maintained",
    time: "3 hours ago",
    color: "text-purple-500",
  },
  {
    icon: AlertCircle,
    text: "Naloxone expires in 30 days",
    time: "1 day ago",
    color: "text-yellow-500",
  },
]

export function ActivityFeed() {
  return (
    <HolographicCard className="p-6">
      <h3 className="text-lg font-semibold mb-4 font-orbitron">ACTIVITY FEED</h3>

      <div className="space-y-4">
        {activities.map((activity, index) => (
          <div
            key={index}
            className="flex items-start gap-3 p-3 rounded-lg glass hover:bg-primary/5 transition-all duration-300 cursor-pointer group"
          >
            <div className={`p-2 rounded-full bg-muted/20 group-hover:pulse-glow transition-all ${activity.color}`}>
              <activity.icon className="w-4 h-4" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium">{activity.text}</p>
              <p className="text-xs text-muted-foreground">{activity.time}</p>
            </div>
          </div>
        ))}
      </div>
    </HolographicCard>
  )
}
