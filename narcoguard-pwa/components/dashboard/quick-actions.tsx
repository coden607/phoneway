"use client"

import { HolographicCard } from "@/components/effects/holographic-card"
import { GlowButton } from "@/components/effects/glow-button"
import { Phone, MapPin, Users, BookOpen, Contact, Settings } from "lucide-react"
import { useRouter } from "next/navigation"

export function QuickActions() {
  const router = useRouter()

  const callSupport = () => {
    window.location.href = "tel:1-800-662-4357" // SAMHSA National Helpline - verified correct
  }

  const findResources = () => {
    router.push("/help")
  }

  const openHeroNetwork = () => {
    // Navigate to hero signup
    router.push("/hero-signup")
  }

  const openTraining = () => {
    router.push("/ar")
  }

  const openContacts = () => {
    router.push("/contacts")
  }

  const openSettings = () => {
    // Clear onboarding to restart setup
    if (confirm("Reset app and go through setup again?")) {
      localStorage.removeItem("narcoguard_preferences")
      window.location.reload()
    }
  }

  return (
    <HolographicCard className="p-6">
      <h3 className="text-lg font-semibold mb-4 font-orbitron">QUICK ACTIONS</h3>

      <div className="grid grid-cols-2 gap-3">
        <GlowButton variant="default" className="flex flex-col items-center gap-2 h-auto py-4" onClick={callSupport}>
          <Phone className="w-6 h-6" />
          <span className="text-xs">Call Support</span>
        </GlowButton>

        <GlowButton variant="default" className="flex flex-col items-center gap-2 h-auto py-4" onClick={findResources}>
          <MapPin className="w-6 h-6" />
          <span className="text-xs">Find Resources</span>
        </GlowButton>

        <GlowButton
          variant="default"
          className="flex flex-col items-center gap-2 h-auto py-4"
          onClick={openHeroNetwork}
        >
          <Users className="w-6 h-6" />
          <span className="text-xs">Hero Network</span>
        </GlowButton>

        <GlowButton variant="default" className="flex flex-col items-center gap-2 h-auto py-4" onClick={openTraining}>
          <BookOpen className="w-6 h-6" />
          <span className="text-xs">Training</span>
        </GlowButton>

        <GlowButton variant="default" className="flex flex-col items-center gap-2 h-auto py-4" onClick={openContacts}>
          <Contact className="w-6 h-6" />
          <span className="text-xs">Emergency Contacts</span>
        </GlowButton>

        <GlowButton variant="default" className="flex flex-col items-center gap-2 h-auto py-4" onClick={openSettings}>
          <Settings className="w-6 h-6" />
          <span className="text-xs">Settings</span>
        </GlowButton>
      </div>
    </HolographicCard>
  )
}
