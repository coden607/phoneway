"use client"

import type { ReactNode } from "react"
import { Card } from "@/components/ui/card"

interface HolographicCardProps {
  children: ReactNode
  className?: string
  glowIntensity?: "low" | "medium" | "high"
}

export function HolographicCard({ children, className = "", glowIntensity = "medium" }: HolographicCardProps) {
  const glowClasses = {
    low: "vibrant-card--low",
    medium: "vibrant-card--medium",
    high: "vibrant-card--high",
  }

  return (
    <Card className={`vibrant-card relative overflow-hidden ${glowClasses[glowIntensity]} ${className}`}>
      <div className="vibrant-card-shine pointer-events-none" aria-hidden="true" />
      <div className="relative z-10">{children}</div>
    </Card>
  )
}
