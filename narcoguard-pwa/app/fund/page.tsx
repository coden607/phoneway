"use client"

import { useState } from "react"
import { MotionConfig, motion } from "framer-motion"
import { Heart, Mail, Share2, Copy, Check, Watch, Shield, Zap, Phone, MapPin, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"
import Image from "next/image"
import { DonateForm } from "@/components/fund/donate-form"

export default function FundPage() {
  const [copied, setCopied] = useState(false)

  const GOFUNDME_URL = "https://gofund.me/9acf270ea"
  const CONTACT_EMAIL = "narcoguard607@gmail.com"

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(GOFUNDME_URL)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    }
  }

  const shareNative = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Support responsible NarcoGuard NG prototype development",
          text: "Help fund transparent engineering and validation of the NarcoGuard NG wearable concept in Broome County, NY.",
          url: GOFUNDME_URL,
        })
      } catch {
        // A dismissed native share sheet requires no user-facing error.
      }
    } else {
      copyLink()
    }
  }

  const donationTiers = [
    { amount: 10, description: "Early research", impact: "Supports documentation and component evaluation" },
    { amount: 25, description: "Sensor evaluation", impact: "Supports benchtop testing of candidate sensors" },
    { amount: 50, description: "Prototype materials", impact: "Contributes to non-clinical prototype fabrication" },
    { amount: 100, description: "Engineering support", impact: "Helps fund design review and test fixtures" },
    { amount: 307, description: "Prototype milestone", impact: "Supports one estimated hardware build allocation", highlight: true },
    { amount: 500, description: "Validation support", impact: "Contributes to documented testing and expert review" },
  ]

  const stats = [
    { value: "80", label: "Long-term prototype goal" },
    { value: "$325", label: "Component estimate (BOM)" },
    { value: "Public", label: "Development status" },
    { value: "Concept", label: "Not a medical device" },
  ]

  return (
    // Honour the OS "reduce motion" setting for every animation on this page.
    <MotionConfig reducedMotion="user">
    <div className="min-h-screen bg-background">
      {/* Hero Section with Generated Images */}
      <section className="relative py-12 px-4 overflow-hidden">
        <div className="absolute inset-0 bg-linear-to-b from-primary/20 to-background" />
        <div className="relative z-10 max-w-6xl mx-auto">
          {/* Campaign Hero Image */}
          <div className="rounded-2xl overflow-hidden mb-8 border border-primary/30">
            <Image
              src="/images/gofundme-hero.jpg"
              alt="NarcoGuard wearable concept and community-support campaign"
              width={1200}
              height={600}
              priority
              className="w-full h-64 md:h-96 object-cover"
            />
          </div>

          <div className="text-center">
            <motion.div
              className="inline-flex items-center gap-2 bg-red-500/20 text-red-400 px-4 py-2 rounded-full mb-6"
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ repeat: Number.POSITIVE_INFINITY, duration: 2 }}
            >
              <Heart className="h-4 w-4" />
              <span className="text-sm font-medium">Overdose prevention deserves careful, evidence-led innovation</span>
            </motion.div>

            <h1 className="text-4xl md:text-6xl font-bold mb-6 text-balance">
              Help Build the <span className="text-primary">NarcoGuard NG</span> Concept Responsibly
            </h1>

            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto text-balance">
              Support transparent prototype engineering, community review, and a credible validation path in Broome
              County, NY.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild size="lg" className="bg-green-500 hover:bg-green-600 text-white text-lg px-8 py-6">
                <a href={GOFUNDME_URL} target="_blank" rel="noopener noreferrer">
                  <Heart className="mr-2 h-5 w-5" />
                  Donate Now
                </a>
              </Button>
              <Button size="lg" variant="outline" className="text-lg px-8 py-6 bg-transparent" onClick={shareNative}>
                <Share2 className="mr-2 h-5 w-5" />
                Share Campaign
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Bar */}
      <section className="py-8 bg-card border-y border-border">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, i) => (
              <motion.div
                key={stat.label}
                className="text-center"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
              >
                <div className="text-3xl md:text-4xl font-bold text-primary">{stat.value}</div>
                <div className="text-sm text-muted-foreground">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* The Story */}
      <section className="py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}>
            <h2 className="text-3xl font-bold mb-8 text-center">Our Story</h2>

            {/* Image Gallery */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
              <div className="rounded-xl overflow-hidden border border-primary/20">
                <Image
                  src="/images/watch-on-wrist-lifestyle.jpg"
                  alt="Illustration of the proposed NarcoGuard NG wearable concept"
                  width={800}
                  height={448}
                  className="w-full h-56 object-cover"
                />
                <div className="p-3 bg-card">
                  <p className="text-sm text-muted-foreground">A visualization of the proposed NarcoGuard NG concept</p>
                </div>
              </div>
              <div className="rounded-xl overflow-hidden border border-primary/20">
                <Image
                  src="/images/broome-county-community.jpg"
                  alt="Binghamton, NY - the community NarcoGuard serves"
                  width={800}
                  height={448}
                  className="w-full h-56 object-cover"
                />
                <div className="p-3 bg-card">
                  <p className="text-sm text-muted-foreground">Binghamton, NY - our community, our mission</p>
                </div>
              </div>
            </div>

            <Card className="bg-card/50 border-primary/20">
              <CardContent className="p-8">
                <div className="prose prose-invert max-w-none">
                  <p className="text-lg leading-relaxed mb-6">
                    <strong>My name is Stephen Blanford, and I'm a recovering addict from Binghamton, NY.</strong>
                  </p>

                  <p className="mb-6">
                    I've lost too many friends to opioid overdose. Most of them died alone - with no one there to
                    administer naloxone in time. By the time 911 arrived, it was too late.
                  </p>

                  <p className="mb-6">
                    <strong>So I started NarcoGuard.</strong> It is an early wearable and response-system concept that
                    explores whether sensing, alerts, and future delivery mechanisms could help people reach timely
                    support. Those capabilities require substantial engineering, clinical, and regulatory validation.
                  </p>

                  <p className="mb-6">
                    I am raising funds for responsible prototype development, documented testing, and expert and
                    community review, with a long-term goal of evaluating up to <strong>80 prototype units</strong>.
                  </p>

                  <p className="text-primary font-semibold">
                    Contributions support the development campaign described on the linked fundraiser. NarcoGuard NG is
                    not a validated medical device and must not be relied on for emergency detection or treatment.
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </section>

      {/* Donation Tiers */}
      <section className="py-16 px-4 bg-card/30">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold mb-4 text-center">Your Impact</h2>
          <p className="text-muted-foreground text-center mb-12">Each contribution supports the next documented development step</p>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {donationTiers.map((tier, i) => (
              <motion.div
                key={tier.amount}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
              >
                <Card className={`h-full ${tier.highlight ? "border-green-500 bg-green-500/10" : ""}`}>
                  <CardContent className="p-6">
                    <div className={`text-3xl font-bold mb-2 ${tier.highlight ? "text-green-400" : "text-primary"}`}>
                      ${tier.amount}
                    </div>
                    <div className="font-semibold mb-2">{tier.description}</div>
                    <div className="text-sm text-muted-foreground">{tier.impact}</div>
                    {tier.highlight && (
                      <div className="mt-4 text-green-400 font-semibold text-sm">Featured prototype milestone</div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          <div className="mt-12 space-y-8" id="donate">
            <DonateForm fallbackUrl={GOFUNDME_URL} />
            <div className="max-w-2xl mx-auto rounded-xl border p-5 text-sm text-muted-foreground space-y-2" id="donation-policy">
              <h3 className="text-base font-semibold text-foreground">Donation policy</h3>
              <p>Donations fund engineering, component evaluation and validation work on the NarcoGuard NG concept. A donation does not buy a device, a service or early access.</p>
              <p>Donations are not tax-deductible. If you donated by mistake, email <a className="underline" href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> within 30 days for a refund.</p>
              <p>Card payments are processed by Stripe and GoFundMe donations by GoFundMe; each has its own privacy policy. NarcoGuard does not receive your card details.</p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold mb-4 text-center">How the Concept Is Intended to Work</h2>
          <p className="text-muted-foreground text-center mb-8">
            A proposed workflow—not validated performance or medical guidance
          </p>

          {/* NG Watch Showcase */}
          <div className="grid md:grid-cols-2 gap-6 mb-12">
            <div className="rounded-xl overflow-hidden border border-primary/20">
              <Image
                src="/images/ng-watch-hero.jpg"
                alt="Rendering of the proposed NarcoGuard NG wearable"
                width={800}
                height={512}
                className="w-full h-64 object-cover"
              />
            </div>
            <div className="rounded-xl overflow-hidden border border-primary/20">
              <Image
                src="/images/ng-exploded-view.jpg"
                alt="Earlier concept render of the NG watch. It shows components, including a filled naloxone cartridge, that are not in the current design."
                width={800}
                height={512}
                className="w-full h-64 object-cover"
              />
            </div>
          </div>

          {/* Donors must not read a render as evidence of working hardware. */}
          <p className="mb-12 -mt-6 text-sm text-muted-foreground" role="note">
            Illustrative renders only. No NG hardware has been built, and the images predate the 2026-10-05 design review,
            so they still show parts that were removed, including a filled naloxone cartridge. Medication delivery is a
            future research module subject to clinical and FDA review.
          </p>

          <div className="grid md:grid-cols-4 gap-8">
            {[
              { icon: Watch, title: "Candidate Sensing", desc: "Research candidate signals and sensor limitations" },
              { icon: Zap, title: "Detection Research", desc: "Evaluate whether patterns can be identified reliably" },
              { icon: Shield, title: "Delivery Concept", desc: "Explore feasibility only after clinical and safety review" },
              { icon: Phone, title: "Proposed Alerts", desc: "Design explicit, failure-aware emergency communication flows" },
            ].map((step, i) => (
              <motion.div
                key={step.title}
                className="text-center"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
              >
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/20 flex items-center justify-center">
                  <step.icon className="h-8 w-8 text-primary" />
                </div>
                <h3 className="font-semibold mb-2">{step.title}</h3>
                <p className="text-sm text-muted-foreground">{step.desc}</p>
              </motion.div>
            ))}
          </div>

          <div className="mt-12 text-center">
            <Link href="/">
              <Button variant="outline" size="lg">
                Try the App Free
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section className="py-16 px-4 bg-card/30">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold mb-8 text-center">Get In Touch</h2>

          <div className="grid md:grid-cols-2 gap-8">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="h-5 w-5 text-primary" />
                  Email Us
                </CardTitle>
              </CardHeader>
              <CardContent>
                <a href={`mailto:${CONTACT_EMAIL}`} className="text-primary hover:underline text-lg">
                  {CONTACT_EMAIL}
                </a>
                <p className="text-sm text-muted-foreground mt-2">
                  Questions about the campaign, partnerships, or press inquiries
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-primary" />
                  Location
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-lg">Binghamton, NY</p>
                <p className="text-muted-foreground">Broome County</p>
                <p className="text-sm text-muted-foreground mt-2">Broome Estates LLC</p>
              </CardContent>
            </Card>
          </div>

          <div className="mt-8 text-center">
            <Card className="inline-block">
              <CardContent className="p-6">
                <p className="text-muted-foreground mb-4">Share the campaign link:</p>
                <div className="flex items-center gap-2">
                  <code className="bg-background px-4 py-2 rounded text-primary">{GOFUNDME_URL}</code>
                  <Button variant="outline" size="icon" onClick={copyLink} aria-label={copied ? "Campaign link copied" : "Copy campaign link"}>
                    {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
          >
            <h2 className="text-4xl font-bold mb-6">Together, We Can End Preventable Overdose Deaths</h2>
            <p className="text-xl text-muted-foreground mb-8">
              One transparent development path, shaped with the community.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild size="lg" className="bg-green-500 hover:bg-green-600 text-white text-xl px-12 py-8">
                <a href={GOFUNDME_URL} target="_blank" rel="noopener noreferrer">
                  <Heart className="mr-2 h-6 w-6" />
                  Donate Now
                </a>
              </Button>
              <Button size="lg" variant="outline" className="text-xl px-12 py-8 bg-transparent" onClick={shareNative}>
                <Share2 className="mr-2 h-6 w-6" />
                Share the Project
              </Button>
            </div>

            <p className="mt-8 text-muted-foreground">Can't donate? Sharing can help us find qualified reviewers and community partners.</p>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 border-t border-border">
        <div className="max-w-4xl mx-auto text-center text-sm text-muted-foreground">
          <p className="mb-2">
            <strong>NarcoGuard</strong> by Broome Estates LLC | Stephen Blanford | Binghamton, NY
          </p>
          <p>
            <a href={`mailto:${CONTACT_EMAIL}`} className="text-primary hover:underline">
              {CONTACT_EMAIL}
            </a>
            {" | "}
            <a href={GOFUNDME_URL} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
              GoFundMe
            </a>
            {" | "}
            <Link href="/" className="text-primary hover:underline">
              Try the App
            </Link>
          </p>
        </div>
      </footer>
    </div>
    </MotionConfig>
  )
}
