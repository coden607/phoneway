"use client"

import type React from "react"

import { useState } from "react"

interface Ripple {
  x: number
  y: number
  id: number
}

export function RippleEffect({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const [ripples, setRipples] = useState<Ripple[]>([])

  const addRipple = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const newRipple = { x, y, id: Date.now() }

    setRipples((prev) => [...prev, newRipple])

    setTimeout(() => {
      setRipples((prev) => prev.filter((r) => r.id !== newRipple.id))
    }, 1000)
  }

  return (
    <div className={`relative overflow-hidden ${className}`} onClick={addRipple}>
      {children}
      {ripples.map((ripple) => (
        <span
          key={ripple.id}
          className="absolute rounded-full bg-primary/30 pointer-events-none"
          style={{
            left: ripple.x,
            top: ripple.y,
            width: 0,
            height: 0,
            animation: "ripple 1s ease-out",
          }}
        />
      ))}
    </div>
  )
}
