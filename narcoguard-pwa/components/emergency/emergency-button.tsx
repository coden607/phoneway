"use client"

import { useState } from "react"
import Link from "next/link"
import { AlertTriangle, MessageSquare, Phone, Pill, Users } from "lucide-react"
import { EmergencyModal } from "./emergency-modal"

export function EmergencyButton() {
  const [showModal, setShowModal] = useState(false)
  // Each opening gets a fresh modal (preview and status start over).
  const [modalSession, setModalSession] = useState(0)

  const open = () => {
    setModalSession((session) => session + 1)
    setShowModal(true)
  }

  const tile = "glass neon-border flex flex-col items-center gap-2 p-4 rounded-xl hover:bg-primary/10 transition-all text-center"

  return (
    <>
      <div className="relative">
        <button onClick={open} className="w-full relative group text-left" aria-describedby="emergency-note">
          <div className="absolute inset-0 bg-linear-to-r from-red-600 via-orange-600 to-red-600 rounded-2xl blur-xl opacity-75 group-hover:opacity-100 emergency-pulse" />
          <div className="relative bg-linear-to-br from-red-600 to-red-800 rounded-2xl p-8 emergency-pulse transform transition-all duration-300 group-hover:scale-[1.02] group-active:scale-95">
            <div className="absolute inset-0 rounded-2xl overflow-hidden">
              <div className="absolute inset-0 bg-linear-to-r from-transparent via-white/10 to-transparent animate-pulse" />
            </div>
            <div className="relative flex items-center justify-center gap-6">
              <AlertTriangle className="w-16 h-16 text-white motion-safe:animate-bounce" aria-hidden="true" />
              <div className="text-left">
                <h2 className="text-4xl font-bold text-white glow-text font-orbitron">EMERGENCY OPTIONS</h2>
                <p className="text-white/90 text-lg mt-1">Call 911, overdose steps, text your contacts</p>
              </div>
            </div>
          </div>
        </button>

        <p id="emergency-note" className="mt-3 text-center text-sm text-amber-100/90">
          NarcoGuard does not call 911 for you. Use Call 911 for any emergency.
        </p>

        <div className="grid grid-cols-2 min-[480px]:grid-cols-4 gap-3 mt-4">
          <a href="tel:911" className={tile}>
            <Phone className="w-6 h-6 text-primary" aria-hidden="true" />
            <span className="text-xs">Call 911</span>
          </a>
          <Link href="/contacts#alert" className={tile}>
            <MessageSquare className="w-6 h-6 text-primary" aria-hidden="true" />
            <span className="text-xs">Text My Contacts</span>
          </Link>
          <Link href="/help" className={tile}>
            <Pill className="w-6 h-6 text-primary" aria-hidden="true" />
            <span className="text-xs">Find Naloxone</span>
          </Link>
          <Link href="/hero-signup" className={tile}>
            <Users className="w-6 h-6 text-primary" aria-hidden="true" />
            <span className="text-xs">Hero Network</span>
          </Link>
        </div>
      </div>

      <EmergencyModal key={modalSession} open={showModal} onClose={() => setShowModal(false)} />
    </>
  )
}
