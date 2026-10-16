"use client"

import { useState } from "react"
import dynamic from "next/dynamic"
import Image from "next/image"
import { ParticleField } from "@/components/effects/particle-field"
import { HolographicCard } from "@/components/effects/holographic-card"
import { VitalsMonitor } from "@/components/dashboard/vitals-monitor"
import { EmergencyButton } from "@/components/emergency/emergency-button"
import { HeroNetworkStatus } from "@/components/hero/hero-network-status"
import { AngelAI } from "@/components/ai/angel-ai"
import { NGWatchStatus } from "@/components/watch/ng-watch-status"
import { QuickActions } from "@/components/dashboard/quick-actions"
import { ActivityFeed } from "@/components/dashboard/activity-feed"
import {
  Heart,
  Shield,
  Users,
  Zap,
  Syringe,
  SkipForward,
  AlertTriangle,
  Eye,
  Mail,
  DollarSign,
  ExternalLink,
} from "lucide-react"
import { saveUserPreferences } from "@/lib/user-preferences"
import { useUserPreferences } from "@/lib/hooks/use-user-preferences"
import { Button } from "@/components/ui/button"
import Link from "next/link"

const OnboardingFlow = dynamic(
  () => import("@/components/onboarding/onboarding-flow").then((mod) => ({ default: mod.OnboardingFlow })),
  {
    ssr: false,
    loading: () => (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading NarcoGuard…</p>
        </div>
      </div>
    ),
  },
)

export default function DashboardPage() {
  const goFundMeUrl = process.env.NEXT_PUBLIC_GOFUNDME_URL || "https://gofund.me/9acf270ea"
  const investorUrl = process.env.NEXT_PUBLIC_INVESTOR_CONTACT_URL || "mailto:narcoguard607@gmail.com?subject=NarcoGuard%20investment%20inquiry"
  const preferences = useUserPreferences()
  const showOnboarding = preferences !== null && !preferences.hasCompletedOnboarding
  const skippedSetup = preferences?.skippedSetup ?? false
  const [showSkipWarning, setShowSkipWarning] = useState(false)

  const handleSkipSetup = () => {
    saveUserPreferences({ skippedSetup: true, hasCompletedOnboarding: true })
    setShowSkipWarning(false)
  }

  const handleCompleteSetup = () => {
    saveUserPreferences({ skippedSetup: false, hasCompletedOnboarding: false })
  }

  if (preferences === null) {
    return (
      <div className="app-loading" role="status" aria-live="polite">
        <div className="loading-orbit"><Syringe aria-hidden="true" /></div>
        <div><strong>Preparing your safety dashboard</strong><span>Connecting NarcoGuard services...</span></div>
      </div>
    )
  }

  if (showOnboarding && !showSkipWarning) {
    return (
      <div className="relative">
        {/* In normal flow (not a fixed overlay) so the sticky site header can never cover it. */}
        <div className="flex justify-end px-4 pt-4">
          <Button
            onClick={() => setShowSkipWarning(true)}
            variant="outline"
            className="glass neon-border bg-background/95 hover:bg-background shadow-xl"
          >
            <SkipForward className="w-4 h-4 mr-2" />
            Skip Setup (Demo Mode)
          </Button>
        </div>
        <OnboardingFlow />
      </div>
    )
  }

  if (showSkipWarning) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <ParticleField count={30} />
        <HolographicCard className="max-w-lg p-8 text-center relative z-10" glowIntensity="high">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-yellow-500/20 flex items-center justify-center pulse-glow">
            <AlertTriangle className="w-10 h-10 text-yellow-500" />
          </div>
          <h2 className="text-2xl font-bold mb-4 glow-text">Skip Setup Warning</h2>
          <p className="text-muted-foreground mb-6">
            Skipping setup means emergency contacts, naloxone locations, and preferences won't be configured. The app
            will work in <span className="text-primary font-semibold">Demo Mode</span> with limited functionality.
          </p>
          <p className="text-sm text-yellow-500 mb-6 font-semibold">
            Setup only configures this concept demo; it does not enable emergency dispatch or medical-device functions.
          </p>
          <div className="flex flex-col gap-3">
            <Button
              onClick={() => setShowSkipWarning(false)}
              className="w-full bg-primary hover:bg-primary/90"
              size="lg"
            >
              Go Back to Setup
            </Button>
            <Button onClick={handleSkipSetup} variant="outline" className="w-full bg-transparent">
              Continue to Demo Mode
            </Button>
          </div>
        </HolographicCard>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      <ParticleField count={100} />
      <div className="absolute inset-0 bg-linear-to-br from-primary/5 via-background to-secondary/5 animate-pulse" />

      <div className="relative z-10 container mx-auto px-4 py-6 space-y-6">
        {skippedSetup && (
          <div className="bg-yellow-500/20 border border-yellow-500/50 rounded-lg p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-yellow-500" />
              <div>
                <p className="font-semibold text-yellow-500">Demo Mode Active</p>
                <p className="text-sm text-muted-foreground">Complete setup to personalize the concept demo</p>
              </div>
            </div>
            <Button onClick={handleCompleteSetup} size="sm" className="bg-yellow-500 hover:bg-yellow-600 text-black">
              Complete Setup
            </Button>
          </div>
        )}

        <HolographicCard
          className="p-4 bg-linear-to-r from-green-500/20 to-primary/20 border-green-500/50"
          glowIntensity="medium"
        >
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-green-500/20 pulse-glow">
                <DollarSign className="w-6 h-6 text-green-500" />
              </div>
              <div>
                <p className="font-bold text-green-400">Support NarcoGuard NG Research and Development</p>
                <p className="text-sm text-muted-foreground">Review the fundraiser details before donating</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <a href={goFundMeUrl} target="_blank" rel="noopener noreferrer">
                <Button className="bg-green-500 hover:bg-green-600 text-black font-bold">
                  <DollarSign className="w-4 h-4 mr-2" />
                  Donate Now
                  <ExternalLink className="w-4 h-4 ml-2" />
                </Button>
              </a>
              <a href="mailto:narcoguard607@gmail.com">
                <Button variant="outline" className="border-green-500/50 hover:bg-green-500/20 bg-transparent">
                  <Mail className="w-4 h-4 mr-2" />
                  Contact Us
                </Button>
              </a>
              <a href={investorUrl} target="_blank" rel="noopener noreferrer">
                <Button variant="outline" className="border-primary/50 hover:bg-primary/20 bg-transparent">
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Investors
                </Button>
              </a>
            </div>
          </div>
        </HolographicCard>

        <header className="flex flex-col xl:flex-row xl:items-center justify-between gap-5 dashboard-hero">
          <div className="flex items-center gap-4">
            <div className="relative w-14 h-14 sm:w-16 sm:h-16 shrink-0 float-animation">
              <Image
                src="/images/narcoguard-icon-256.jpeg"
                alt="Narcoguard"
                width={64}
                height={64}
                className="w-full h-full rounded-full pulse-glow"
              />
            </div>
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold glow-text font-orbitron">NARCOGUARD</h1>
              <p className="text-primary text-sm font-semibold flex items-center gap-2">
                <Syringe className="w-4 h-4" />
                Public overdose-response software and wearable concept
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full xl:w-auto">
            <Link href="/fund">
              <Button className="bg-green-500 hover:bg-green-600 text-black font-bold">
                <DollarSign className="w-4 h-4 mr-2" />
                Fund Us
              </Button>
            </Link>
            <Link href="/watch">
              <Button variant="outline" className="glass neon-border bg-transparent">
                <Eye className="w-4 h-4 mr-2" />
                View NarcoGuard NG
              </Button>
            </Link>
            <div className="flex items-center gap-2 glass px-4 py-2 rounded-full neon-border">
              <div className="w-3 h-3 rounded-full bg-green-500 pulse-glow" />
              <span className="text-sm font-medium">{skippedSetup ? "Setup skipped" : "Demo ready"}</span>
            </div>
          </div>
        </header>

        <HolographicCard className="p-6 bg-linear-to-r from-primary/10 to-secondary/10" glowIntensity="high">
          <div className="flex items-center gap-4">
            <div className="p-4 rounded-full bg-primary/20 pulse-glow">
              <Syringe className="w-8 h-8 text-primary" />
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold glow-text font-orbitron">
                NARCOGUARD NG DEVELOPMENT CONCEPT
              </h2>
              <p className="text-muted-foreground mt-1 text-balance">
                This public demo explores candidate sensing, failure-aware alerts, and future naloxone-delivery research.
                The wearable is not a validated medical device, does not currently detect or treat overdose, and must not
                replace 911, naloxone, or professional medical care.
              </p>
            </div>
          </div>
        </HolographicCard>

        <EmergencyButton />

        <div className="rounded-xl border border-primary/30 p-5">
          <h2 className="text-xl font-semibold">Guardian Stability</h2>
          <p className="text-sm text-muted-foreground mb-3">Opt-in check-ins for food, sleep and everyday needs, with a next-day plan and resource starting points.</p>
          <Link href="/help"><Button>Find local help</Button></Link>
          <Link href="/stability"><Button variant="outline">Open my needs planner</Button></Link>
          <Link href="/constitution" className="ml-3 underline text-sm">Read the founding Constitution</Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="space-y-6">
            <VitalsMonitor />
            <NGWatchStatus />
          </div>

          <div className="space-y-6">
            <AngelAI compact />
            <QuickActions />
          </div>

          <div className="space-y-6">
            <HeroNetworkStatus />
            <ActivityFeed />
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <HolographicCard className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-primary/20 pulse-glow">
                <Heart className="w-6 h-6 text-primary heartbeat" />
              </div>
              <div>
                <p className="text-2xl font-bold">—</p>
                <p className="text-sm text-muted-foreground">Sensor unavailable</p>
              </div>
            </div>
          </HolographicCard>

          <HolographicCard className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-green-500/20 pulse-glow">
                <Shield className="w-6 h-6 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">—</p>
                <p className="text-sm text-muted-foreground">Connection status</p>
              </div>
            </div>
          </HolographicCard>

          <HolographicCard className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-secondary/20 pulse-glow">
                <Users className="w-6 h-6 text-secondary" />
              </div>
              <div>
                <p className="text-2xl font-bold">—</p>
                <p className="text-sm text-muted-foreground">Responders unavailable</p>
              </div>
            </div>
          </HolographicCard>

          <HolographicCard className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-purple-500/20 pulse-glow">
                <Zap className="w-6 h-6 text-purple-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">—</p>
                <p className="text-sm text-muted-foreground">Battery unavailable</p>
              </div>
            </div>
          </HolographicCard>
        </div>

        <HolographicCard
          className="p-8 bg-linear-to-br from-green-500/10 via-primary/10 to-secondary/10"
          glowIntensity="high"
        >
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold glow-text mb-2">Support the Mission</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Donations support development of the NarcoGuard NG concept. The wearable is not a validated medical device,
              and donation outcomes and future manufacturing are not guaranteed.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 mb-8">
            <div className="glass p-6 rounded-xl border border-green-500/30">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 rounded-full bg-green-500/20">
                  <DollarSign className="w-8 h-8 text-green-500" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-green-400">Donate via GoFundMe</h3>
                  <p className="text-sm text-muted-foreground">See the fundraiser for current use-of-funds details</p>
                </div>
              </div>
              <p className="text-muted-foreground mb-4">
                Goal: <span className="text-green-400 font-bold">$24,584</span> for 80 watches
              </p>
              <a href="https://gofund.me/9acf270ea" target="_blank" rel="noopener noreferrer" className="block">
                <Button className="w-full bg-green-500 hover:bg-green-600 text-black font-bold text-lg py-6">
                  <DollarSign className="w-5 h-5 mr-2" />
                  Donate Now
                  <ExternalLink className="w-5 h-5 ml-2" />
                </Button>
              </a>
            </div>

            <div className="glass p-6 rounded-xl border border-primary/30">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 rounded-full bg-primary/20">
                  <Mail className="w-8 h-8 text-primary" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-primary">Contact Us Directly</h3>
                  <p className="text-sm text-muted-foreground">Partnerships, grants, inquiries</p>
                </div>
              </div>
              <p className="text-muted-foreground mb-4">
                Email: <span className="text-primary font-bold">narcoguard607@gmail.com</span>
              </p>
              <a href="mailto:narcoguard607@gmail.com" className="block">
                <Button className="w-full bg-primary hover:bg-primary/90 font-bold text-lg py-6">
                  <Mail className="w-5 h-5 mr-2" />
                  Send Email
                </Button>
              </a>
            </div>
          </div>

          <div className="text-center text-sm text-muted-foreground">
            <p>Broome Estates LLC | Stephen Blanford, Founder</p>
            <p className="mt-1">Binghamton, NY | Serving Broome County and Beyond</p>
          </div>
        </HolographicCard>

        <footer className="text-center py-8 text-muted-foreground">
          <p className="text-sm">
            Created by <span className="text-primary font-semibold">Stephen Blanford</span> | Broome Estates LLC
          </p>
          <p className="text-xs mt-2">Inspired by family and friends. Saving lives, one person at a time.</p>
          <p className="text-xs mt-2 text-primary font-semibold">Not just saving lives - transforming them.</p>
          <div className="flex items-center justify-center gap-4 mt-4">
            <a href="mailto:narcoguard607@gmail.com" className="text-primary hover:underline text-sm">
              narcoguard607@gmail.com
            </a>
            <span className="text-muted-foreground">|</span>
            <a
              href="https://gofund.me/9acf270ea"
              target="_blank"
              rel="noopener noreferrer"
              className="text-green-400 hover:underline text-sm"
            >
              Support on GoFundMe
            </a>
          </div>
        </footer>
      </div>

    </div>
  )
}
