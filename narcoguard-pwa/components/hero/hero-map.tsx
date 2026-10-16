"use client"

import { useEffect, useRef, useState } from "react"
import { MapPin, Navigation, Users } from "lucide-react"
import { useLocation } from "@/lib/hooks/use-location"

interface Hero {
  id: number
  name: string
  lat: number
  lng: number
  status: "available" | "responding" | "offline"
}

export function HeroMap() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const { location: userLocation } = useLocation(true)

  const [heroes] = useState<Hero[]>([])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const centerX = canvas.width / 2
    const centerY = canvas.height / 2
    const scale = 200

    // Animation loop
    let frame = 0
    let animationId = 0
    const animate = () => {
      frame++

      // Clear canvas
      ctx.fillStyle = "rgba(10, 15, 30, 0.1)"
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      // Draw grid
      ctx.strokeStyle = "rgba(0, 217, 255, 0.1)"
      ctx.lineWidth = 1
      for (let i = -5; i <= 5; i++) {
        ctx.beginPath()
        ctx.moveTo(centerX + i * 50, 0)
        ctx.lineTo(centerX + i * 50, canvas.height)
        ctx.stroke()

        ctx.beginPath()
        ctx.moveTo(0, centerY + i * 50)
        ctx.lineTo(canvas.width, centerY + i * 50)
        ctx.stroke()
      }

      // Draw range circles
      for (let r = 1; r <= 3; r++) {
        ctx.beginPath()
        ctx.arc(centerX, centerY, r * 100, 0, Math.PI * 2)
        ctx.strokeStyle = `rgba(0, 217, 255, ${0.2 - r * 0.05})`
        ctx.lineWidth = 2
        ctx.stroke()
      }
      if (userLocation) {
        const userPulse = Math.sin(frame * 0.1) * 0.3 + 0.7
        ctx.beginPath()
        ctx.arc(centerX, centerY, 15 * userPulse, 0, Math.PI * 2)
        ctx.fillStyle = "rgba(0, 217, 255, 0.3)"
        ctx.fill()

        ctx.beginPath()
        ctx.arc(centerX, centerY, 8, 0, Math.PI * 2)
        ctx.fillStyle = "#00d9ff"
        ctx.fill()

        ctx.fillStyle = "#ffffff"
        ctx.font = "10px monospace"
        const locationText = `${userLocation.latitude.toFixed(4)}, ${userLocation.longitude.toFixed(4)}`
        ctx.fillText(locationText, centerX - 50, centerY - 25)
      }
      // Draw heroes
      heroes.forEach((hero, index) => {
        const x = centerX + hero.lng * scale
        const y = centerY + hero.lat * scale

        // Pulse effect
        const pulse = Math.sin(frame * 0.1 + index) * 0.2 + 0.8

        // Connection line
        ctx.beginPath()
        ctx.moveTo(centerX, centerY)
        ctx.lineTo(x, y)
        ctx.strokeStyle = hero.status === "responding" ? "rgba(255, 100, 100, 0.3)" : "rgba(100, 255, 100, 0.2)"
        ctx.lineWidth = 2
        ctx.stroke()

        // Hero marker
        ctx.beginPath()
        ctx.arc(x, y, 12 * pulse, 0, Math.PI * 2)
        ctx.fillStyle = hero.status === "responding" ? "rgba(255, 100, 100, 0.3)" : "rgba(100, 255, 100, 0.3)"
        ctx.fill()

        ctx.beginPath()
        ctx.arc(x, y, 6, 0, Math.PI * 2)
        ctx.fillStyle = hero.status === "responding" ? "#ff6464" : "#64ff64"
        ctx.fill()

        // Distance text
        const distance = Math.sqrt(hero.lat ** 2 + hero.lng ** 2).toFixed(1)
        ctx.fillStyle = "#ffffff"
        ctx.font = "12px monospace"
        ctx.fillText(`${distance} mi`, x + 15, y - 10)
      })

      animationId = requestAnimationFrame(animate)
    }

    animate()
    return () => cancelAnimationFrame(animationId)
  }, [heroes, userLocation])

  return (
    <div className="space-y-4">
      <div className="relative glass rounded-lg overflow-hidden neon-border">
        <canvas ref={canvasRef} width={800} height={600} className="w-full h-auto" />

        {/* Legend */}
        <div className="absolute top-4 right-4 glass p-4 rounded-lg space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-primary pulse-glow" />
            <span className="text-xs">{userLocation ? "You" : "Location unavailable"}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500 pulse-glow" />
            <span className="text-xs">Available Hero</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500 pulse-glow" />
            <span className="text-xs">Responding</span>
          </div>
        </div>

        {/* Compass */}
        <div className="absolute bottom-4 left-4 glass p-3 rounded-full">
          <Navigation className="w-6 h-6 text-primary pulse-glow" />
        </div>

        {userLocation && (
          <div className="absolute bottom-4 right-4 glass p-2 rounded-lg text-xs">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500 pulse-glow" />
              <span>±{userLocation.accuracy.toFixed(0)}m</span>
            </div>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="glass p-3 rounded-lg text-center">
          <Users className="w-5 h-5 mx-auto mb-1 text-primary" />
          <p className="text-lg font-bold">{heroes.length ? heroes.filter((h) => h.status === "available").length : "Unavailable"}</p>
          <p className="text-xs text-muted-foreground">Available</p>
        </div>
        <div className="glass p-3 rounded-lg text-center">
          <MapPin className="w-5 h-5 mx-auto mb-1 text-red-500" />
          <p className="text-lg font-bold">{heroes.length ? heroes.filter((h) => h.status === "responding").length : "Unavailable"}</p>
          <p className="text-xs text-muted-foreground">Responding</p>
        </div>
        <div className="glass p-3 rounded-lg text-center">
          <Navigation className="w-5 h-5 mx-auto mb-1 text-secondary" />
          <p className="text-lg font-bold">Unavailable</p>
          <p className="text-xs text-muted-foreground">Nearest</p>
        </div>
      </div>
    </div>
  )
}
