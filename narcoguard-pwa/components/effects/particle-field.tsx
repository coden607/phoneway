"use client"

import { useEffect, useRef } from "react"

interface ParticleFieldProps {
  count?: number
  color?: string
  className?: string
}

export function ParticleField({ count = 50, color = "var(--glow-primary)", className = "" }: ParticleFieldProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!containerRef.current) return

    const particles: HTMLDivElement[] = []

    for (let i = 0; i < count; i++) {
      const particle = document.createElement("div")
      particle.className = "particle"
      particle.style.left = `${Math.random() * 100}%`
      particle.style.top = `${Math.random() * 100}%`
      particle.style.animationDelay = `${Math.random() * 4}s`
      particle.style.animationDuration = `${3 + Math.random() * 3}s`
      particle.style.background = color
      containerRef.current.appendChild(particle)
      particles.push(particle)
    }

    return () => {
      particles.forEach((p) => p.remove())
    }
  }, [count, color])

  return <div ref={containerRef} className={`particle-container absolute inset-0 pointer-events-none ${className}`} />
}
