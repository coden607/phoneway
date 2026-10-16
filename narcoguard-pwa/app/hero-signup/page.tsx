"use client"

import { useEffect, useState, useSyncExternalStore } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { HolographicCard } from "@/components/effects/holographic-card"
import { GlowButton } from "@/components/effects/glow-button"
import { Award, BookOpen, Heart, Shield } from "lucide-react"
import { Button } from "@/components/ui/button"
import { CertificationTest, HERO_CERTIFICATE_KEY } from "@/components/hero/certification-test"
import { HeroOfferManager } from "@/components/hero/hero-offer-manager"

type Status = { enrollment: boolean; certification: boolean; nearbyRequests: boolean }

const noSubscription = () => () => undefined
const storedCertificate = () => {
  try {
    return localStorage.getItem(HERO_CERTIFICATE_KEY)
  } catch {
    return null
  }
}

export default function HeroSignup() {
  const router = useRouter()
  const saved = useSyncExternalStore(noSubscription, storedCertificate, () => null)
  const [fresh, setFresh] = useState<string | null>(null)
  const certificate = fresh ?? saved
  const [status, setStatus] = useState<Status | null>(null)
  const [note, setNote] = useState<string>()
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let cancelled = false
    fetch("/api/heroes", { cache: "no-store" })
      .then((response) => response.json())
      .then((body: Status) => { if (!cancelled) setStatus(body) })
      .catch(() => { if (!cancelled) setStatus({ enrollment: false, certification: false, nearbyRequests: false }) })
    return () => { cancelled = true }
  }, [])

  const enroll = async () => {
    setBusy(true)
    setNote(undefined)
    try {
      const response = await fetch("/api/heroes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ certificate }) })
      const body = (await response.json()) as { enrolled?: boolean; error?: string }
      if (response.status === 401) setNote("Sign in first, then come back to enroll.")
      else setNote(body.enrolled ? "You are enrolled in the Hero Network." : (body.error ?? "Enrollment failed."))
    } catch {
      setNote("Could not reach NarcoGuard. Check your connection.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="min-h-screen bg-background px-4 py-8 sm:p-6">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="text-center space-y-4">
          <Shield className="w-20 h-20 mx-auto text-primary pulse-glow" aria-hidden="true" />
          <h1 className="text-4xl font-bold glow-text">Become a Hero</h1>
          <p className="text-lg text-muted-foreground">Volunteers who know what to do in an overdose. Every Hero passes the test below with a perfect score.</p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          <HolographicCard className="p-6 text-center">
            <Heart className="w-12 h-12 mx-auto mb-4 text-red-500" aria-hidden="true" />
            <h2 className="font-bold mb-2">1. Learn the steps</h2>
            <p className="text-sm text-muted-foreground">Recognize an overdose, give naloxone, support breathing, stay safe.</p>
          </HolographicCard>
          <HolographicCard className="p-6 text-center">
            <Award className="w-12 h-12 mx-auto mb-4 text-yellow-500" aria-hidden="true" />
            <h2 className="font-bold mb-2">2. Pass at 100%</h2>
            <p className="text-sm text-muted-foreground">A random 12-question test in lockdown mode. Every answer must be right.</p>
          </HolographicCard>
          <HolographicCard className="p-6 text-center">
            <Shield className="w-12 h-12 mx-auto mb-4 text-blue-500" aria-hidden="true" />
            <h2 className="font-bold mb-2">3. Enroll</h2>
            <p className="text-sm text-muted-foreground">Link your certificate to your account. Valid for one year.</p>
          </HolographicCard>
        </div>

        <HolographicCard className="p-6 sm:p-8">
          <CertificationTest onCertified={setFresh} />
        </HolographicCard>

        <HolographicCard className="p-6 sm:p-8">
          <section className="space-y-3" data-testid="hero-enroll">
            <h2 className="text-xl font-bold">Enroll as a Hero</h2>
            {/* Say which prerequisite is missing. Without the signing key nothing can be
                certified at all, so a "pass the test first" prompt would be misleading. */}
            {status && !status.certification ? (
              <p className="text-sm text-muted-foreground">Certificates are not being issued on this deployment: the certificate signing key is not configured. The test still runs and is graded, but a pass cannot certify you and cannot enroll you.</p>
            ) : !certificate ? (
              <p className="text-sm text-muted-foreground">Pass the test first. Enrollment needs a certificate from a perfect score.</p>
            ) : status && !status.enrollment ? (
              <p className="text-sm text-muted-foreground">You have a certificate on this device, but account enrollment is not configured on this deployment, so it cannot be linked to an account yet.</p>
            ) : (
              <Button type="button" onClick={enroll} disabled={busy || !status}>{busy ? "Enrolling…" : "Enroll with my certificate"}</Button>
            )}
            {note && <p className="text-sm" role="status">{note} {note.startsWith("Sign in") && <Link href="/auth" className="underline text-primary">Sign in</Link>}</p>}
            <p className="text-sm text-muted-foreground">
              Nearby help requests are not live. Before they can be, they need a separate safety and privacy review, your explicit opt-in, and a way to pause or leave at any time.
              Heroes never replace 911.
            </p>
          </section>
        </HolographicCard>

        {/* Practical offers need no certification, so they sit outside the test flow. */}
        <HolographicCard className="p-6 sm:p-8">
          <HeroOfferManager />
        </HolographicCard>

        <HolographicCard className="p-6">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <BookOpen className="w-6 h-6" aria-hidden="true" />
            Study before the test
          </h2>
          <ul className="list-disc pl-6 space-y-2 text-sm text-muted-foreground">
            <li>Signs of an opioid overdose and how to check breathing</li>
            <li>Giving nasal naloxone, and when to give a second dose</li>
            <li>Rescue breaths, CPR and the recovery position</li>
            <li>Your safety, the person&apos;s privacy, and what happens after naloxone</li>
          </ul>
          <p className="mt-3 text-sm text-muted-foreground">Hands-on CPR and naloxone classes from a local health department or the Red Cross are strongly recommended.</p>
          <GlowButton onClick={() => router.push("/ar")} variant="outline" className="w-full mt-4">
            Preview Training Modules
          </GlowButton>
        </HolographicCard>
      </div>
    </div>
  )
}
