"use client"

import Image from "next/image"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { HolographicCard } from "@/components/effects/holographic-card"
import { GlowButton } from "@/components/effects/glow-button"
import { ParticleField } from "@/components/effects/particle-field"
import {
  Heart,
  Shield,
  Users,
  MapPin,
  AlertTriangle,
  Phone,
  Bell,
  Eye,
  FileText,
  Award,
  Sparkles,
  ChevronRight,
  ChevronLeft,
  Check,
  ArrowDown,
  Syringe,
} from "lucide-react"
import {
  getUserPreferences,
  saveUserPreferences,
  type EmergencyContact,
  type NaloxoneLocation,
} from "@/lib/user-preferences"
import { usePWAInstall } from "@/lib/hooks/use-pwa-install"
import { InstallButton } from "@/components/pwa/install-button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { GOOD_SAMARITAN_LAWS, GOOD_SAMARITAN_LAWS_REVIEWED, GOOD_SAMARITAN_SOURCES, goodSamaritanLawFor } from "@/lib/good-samaritan-laws"

const US_STATES = GOOD_SAMARITAN_LAWS.map((law) => law.name)

interface OnboardingFlowProps {
  /** Called after preferences are saved; pages that read the preferences store update on their own. */
  onComplete?: () => void
}

export function OnboardingFlow({ onComplete }: OnboardingFlowProps) {
  const [step, setStep] = useState(0)
  const [name, setName] = useState("")
  const [emergencyContacts, setEmergencyContacts] = useState<EmergencyContact[]>([])
  const [naloxoneLocations, setNaloxoneLocations] = useState<NaloxoneLocation[]>([])
  const [preferences, setPreferences] = useState(getUserPreferences())
  const { isInstallable, isInstalled, installPWA, method } = usePWAInstall()

  const totalSteps = 12

  const nextStep = () => {
    if (step < totalSteps - 1) {
      setStep(step + 1)
    }
  }

  const prevStep = () => {
    if (step > 0) {
      setStep(step - 1)
    }
  }

  const completeOnboarding = () => {
    const finalPreferences = {
      name,
      hasCompletedOnboarding: true,
      emergencyContacts,
      naloxoneLocations,
      emergencyPreferences: preferences.emergencyPreferences,
      privacy: preferences.privacy,
      features: preferences.features,
      legal: preferences.legal,
    }
    saveUserPreferences(finalPreferences)
    onComplete?.()
  }

  const addEmergencyContact = () => {
    setEmergencyContacts([
      ...emergencyContacts,
      { id: Date.now().toString(), name: "", relationship: "", phone: "", notifyMethod: "both" },
    ])
  }

  const updateEmergencyContact = (id: string, field: keyof EmergencyContact, value: string) => {
    setEmergencyContacts(
      emergencyContacts.map((contact) => (contact.id === id ? { ...contact, [field]: value } : contact)),
    )
  }

  const removeEmergencyContact = (id: string) => {
    setEmergencyContacts(emergencyContacts.filter((contact) => contact.id !== id))
  }

  const addNaloxoneLocation = () => {
    setNaloxoneLocations([
      ...naloxoneLocations,
      { id: Date.now().toString(), description: "", location: "", instructions: "" },
    ])
  }

  const updateNaloxoneLocation = (id: string, field: keyof NaloxoneLocation, value: string) => {
    setNaloxoneLocations(naloxoneLocations.map((loc) => (loc.id === id ? { ...loc, [field]: value } : loc)))
  }

  const removeNaloxoneLocation = (id: string) => {
    setNaloxoneLocations(naloxoneLocations.filter((loc) => loc.id !== id))
  }

  const steps = [
    // Step 0: Welcome
    <div key="welcome" className="space-y-6">
      <div className="text-center space-y-4">
        <div className="w-32 h-32 mx-auto float-animation">
          <Image src="/images/narcoguard-icon-256.jpeg" alt="Narcoguard" width={128} height={128} className="w-full h-full rounded-full pulse-glow" />
        </div>
        <h1 className="text-5xl font-bold glow-text font-orbitron">WELCOME TO NARCOGUARD</h1>
        <div className="flex items-center justify-center gap-2 text-xl text-primary">
          <Syringe className="w-6 h-6" />
          <span className="font-semibold">NarcoGuard NG Development Concept</span>
        </div>
        <p className="text-xl text-secondary">A Movement to Save and Transform Lives</p>
        <p className="text-muted-foreground max-w-2xl mx-auto text-balance">
          This public demo explores a future overdose-response wearable concept. It is not a validated medical device,
          does not detect or treat overdose, and does not dispatch emergency help. Call 911 and administer approved
          naloxone according to its instructions during a suspected overdose.
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <HolographicCard className="p-6 text-center">
          <Syringe className="w-12 h-12 mx-auto mb-4 text-primary pulse-glow" />
          <h2 className="font-bold mb-2">Delivery Research</h2>
          <p className="text-sm text-muted-foreground">Proposed naloxone delivery is a research concept, not a current capability</p>
        </HolographicCard>
        <HolographicCard className="p-6 text-center">
          <Users className="w-12 h-12 mx-auto mb-4 text-secondary pulse-glow" />
          <h2 className="font-bold mb-2">Hero Network</h2>
          <p className="text-sm text-muted-foreground">A simulated community-response experience for demonstration</p>
        </HolographicCard>
        <HolographicCard className="p-6 text-center">
          <Heart className="w-12 h-12 mx-auto mb-4 text-pink-500 heartbeat" />
          <h2 className="font-bold mb-2">Transform Lives</h2>
          <p className="text-sm text-muted-foreground">Recovery resources and support</p>
        </HolographicCard>
      </div>
    </div>,

    // Step 1: Meet Angel AI
    <div key="guardian-aingel-intro" className="space-y-6">
      <div className="text-center space-y-4">
        <div className="w-24 h-24 mx-auto relative">
          <div className="absolute inset-0 bg-linear-to-br from-primary to-secondary rounded-full pulse-glow animate-spin-slow" />
          <div className="absolute inset-2 bg-background rounded-full flex items-center justify-center">
            <Sparkles className="w-12 h-12 text-primary" />
          </div>
        </div>
        <h2 className="text-3xl font-bold glow-text">Meet Angel AI</h2>
        <p className="text-muted-foreground max-w-2xl mx-auto text-balance">
          I'm Angel, your lifeline assistant, guardian and resource finder. I can help you find nearby treatment, food,
          shelter and pharmacies, and plan small steps toward your goals. I can't monitor you, detect an overdose, or call anyone. If someone may
          be overdosing, call 911 and give naloxone.
        </p>
      </div>

      <HolographicCard className="p-6 space-y-4">
        <h3 className="text-xl font-bold flex items-center gap-2">
          <Check className="w-5 h-5 text-green-500" />
          What I Can Do For You
        </h3>
        <ul className="space-y-3">
          <li className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-primary mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold">Overdose Detection (research)</p>
              <p className="text-sm text-muted-foreground">A goal for the future wearable. Nothing monitors you or detects overdoses today.</p>
            </div>
          </li>
          <li className="flex items-start gap-3">
            <MapPin className="w-5 h-5 text-secondary mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold">Rescue Coordination (demo)</p>
              <p className="text-sm text-muted-foreground">
                Shows how trained volunteers might be guided to you. In this demo, no one is alerted.
              </p>
            </div>
          </li>
          <li className="flex items-start gap-3">
            <Phone className="w-5 h-5 text-green-500 mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold">Emergency Response</p>
              <p className="text-sm text-muted-foreground">Tap-to-call 911 and CPR/naloxone guidance. NarcoGuard does not call 911 or alert contacts for you.</p>
            </div>
          </li>
          <li className="flex items-start gap-3">
            <Heart className="w-5 h-5 text-pink-500 mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold">Recovery Support</p>
              <p className="text-sm text-muted-foreground">Connect you to resources and track your wellness journey</p>
            </div>
          </li>
        </ul>
      </HolographicCard>
    </div>,

    // Step 2: Your Name
    <div key="name" className="space-y-6">
      <div className="text-center space-y-4">
        <h2 className="text-3xl font-bold glow-text">What should I call you?</h2>
        <p className="text-muted-foreground">Let's personalize your experience</p>
      </div>
      <HolographicCard className="p-8">
        <div className="space-y-4 max-w-md mx-auto">
          <Label htmlFor="name" className="text-lg">
            Your Name
          </Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter your name"
            className="text-lg glass neon-border"
          />
          <p className="text-sm text-muted-foreground">
            Angel uses your first name to greet you. It stays on this device.
          </p>
        </div>
      </HolographicCard>
    </div>,

    // Step 3: Emergency Contacts
    <div key="contacts" className="space-y-6">
      <div className="text-center space-y-4">
        <Phone className="w-16 h-16 mx-auto text-primary pulse-glow" />
        <h2 className="text-3xl font-bold glow-text">Who should we alert?</h2>
        <p className="text-muted-foreground">Add trusted people to contact in an emergency</p>
      </div>
      <div className="space-y-4 max-w-2xl mx-auto">
        {emergencyContacts.map((contact) => (
          <HolographicCard key={contact.id} className="p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Name</Label>
                <Input
                  value={contact.name}
                  onChange={(e) => updateEmergencyContact(contact.id, "name", e.target.value)}
                  placeholder="Contact name"
                  className="glass neon-border"
                />
              </div>
              <div>
                <Label>Relationship</Label>
                <Input
                  value={contact.relationship}
                  onChange={(e) => updateEmergencyContact(contact.id, "relationship", e.target.value)}
                  placeholder="Friend, Family, etc."
                  className="glass neon-border"
                />
              </div>
              <div>
                <Label>Phone Number</Label>
                <Input
                  value={contact.phone}
                  onChange={(e) => updateEmergencyContact(contact.id, "phone", e.target.value)}
                  placeholder="(555) 123-4567"
                  type="tel"
                  className="glass neon-border"
                />
              </div>
              <div>
                <Label>Notify Via</Label>
                <RadioGroup
                  value={contact.notifyMethod}
                  onValueChange={(value) => updateEmergencyContact(contact.id, "notifyMethod", value)}
                  className="flex gap-4 mt-2"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="call" id={`call-${contact.id}`} />
                    <Label htmlFor={`call-${contact.id}`}>Call</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="text" id={`text-${contact.id}`} />
                    <Label htmlFor={`text-${contact.id}`}>Text</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="both" id={`both-${contact.id}`} />
                    <Label htmlFor={`both-${contact.id}`}>Both</Label>
                  </div>
                </RadioGroup>
              </div>
            </div>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => removeEmergencyContact(contact.id)}
              className="w-full"
            >
              Remove Contact
            </Button>
          </HolographicCard>
        ))}
        <Button onClick={addEmergencyContact} variant="outline" className="w-full glass neon-border bg-transparent">
          + Add Emergency Contact
        </Button>
      </div>
    </div>,

    // Step 4: Emergency Preferences
    <div key="emergency-prefs" className="space-y-6">
      <div className="text-center space-y-4">
        <Bell className="w-16 h-16 mx-auto text-primary pulse-glow" />
        <h2 className="text-3xl font-bold glow-text">Emergency Response Preferences</h2>
        <p className="text-muted-foreground">
          Save how you would want the future device to respond. These settings are not active: NarcoGuard does not sound
          alarms, call 911, notify contacts, or share your location today.
        </p>
      </div>
      <HolographicCard className="p-8 max-w-2xl mx-auto space-y-6">
        <div className="flex items-start space-x-3">
          <Checkbox
            id="soundAlarm"
            checked={preferences.emergencyPreferences.soundAlarm}
            onCheckedChange={(checked) =>
              setPreferences({
                ...preferences,
                emergencyPreferences: { ...preferences.emergencyPreferences, soundAlarm: checked as boolean },
              })
            }
          />
          <div className="space-y-1">
            <Label htmlFor="soundAlarm" className="text-base font-semibold cursor-pointer">
              Sound a Loud Alarm (planned)
            </Label>
            <p className="text-sm text-muted-foreground">
              Future device: an alarm to alert people nearby. Not active today.
            </p>
          </div>
        </div>

        <div className="flex items-start space-x-3">
          <Checkbox
            id="call911"
            checked={preferences.emergencyPreferences.call911}
            onCheckedChange={(checked) =>
              setPreferences({
                ...preferences,
                emergencyPreferences: { ...preferences.emergencyPreferences, call911: checked as boolean },
              })
            }
          />
          <div className="space-y-1">
            <Label htmlFor="call911" className="text-base font-semibold cursor-pointer">
              Call 911 for Me (planned)
            </Label>
            <p className="text-sm text-muted-foreground">
              A future goal that needs approval and testing. Not active: call 911 yourself.
            </p>
          </div>
        </div>

        <div className="flex items-start space-x-3">
          <Checkbox
            id="notifyContacts"
            checked={preferences.emergencyPreferences.notifyContacts}
            onCheckedChange={(checked) =>
              setPreferences({
                ...preferences,
                emergencyPreferences: { ...preferences.emergencyPreferences, notifyContacts: checked as boolean },
              })
            }
          />
          <div className="space-y-1">
            <Label htmlFor="notifyContacts" className="text-base font-semibold cursor-pointer">
              Notify My Emergency Contacts (planned)
            </Label>
            <p className="text-sm text-muted-foreground">Not active: NarcoGuard never contacts anyone for you today.</p>
          </div>
        </div>

        <div className="flex items-start space-x-3">
          <Checkbox
            id="shareLocation"
            checked={preferences.emergencyPreferences.shareLocation}
            onCheckedChange={(checked) =>
              setPreferences({
                ...preferences,
                emergencyPreferences: { ...preferences.emergencyPreferences, shareLocation: checked as boolean },
              })
            }
          />
          <div className="space-y-1">
            <Label htmlFor="shareLocation" className="text-base font-semibold cursor-pointer">
              Share My Location with Trained Volunteers (planned)
            </Label>
            <p className="text-sm text-muted-foreground">
              Not active: your location is not shared with anyone.
            </p>
          </div>
        </div>
      </HolographicCard>
    </div>,

    // Step 5: Naloxone Locations
    <div key="naloxone" className="space-y-6">
      <div className="text-center space-y-4">
        <MapPin className="w-16 h-16 mx-auto text-secondary pulse-glow" />
        <h2 className="text-3xl font-bold glow-text">Where's Your Naloxone?</h2>
        <p className="text-muted-foreground">Help heroes find your life-saving medication quickly</p>
      </div>
      <div className="space-y-4 max-w-2xl mx-auto">
        {naloxoneLocations.map((location) => (
          <HolographicCard key={location.id} className="p-6 space-y-4">
            <div className="space-y-4">
              <div>
                <Label>Description</Label>
                <Input
                  value={location.description}
                  onChange={(e) => updateNaloxoneLocation(location.id, "description", e.target.value)}
                  placeholder="e.g., Bedroom nightstand, Kitchen drawer"
                  className="glass neon-border"
                />
              </div>
              <div>
                <Label>Specific Location</Label>
                <Input
                  value={location.location}
                  onChange={(e) => updateNaloxoneLocation(location.id, "location", e.target.value)}
                  placeholder="e.g., Top drawer, left side"
                  className="glass neon-border"
                />
              </div>
              <div>
                <Label>Instructions (Optional)</Label>
                <Input
                  value={location.instructions || ""}
                  onChange={(e) => updateNaloxoneLocation(location.id, "instructions", e.target.value)}
                  placeholder="e.g., Look behind the lamp"
                  className="glass neon-border"
                />
              </div>
            </div>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => removeNaloxoneLocation(location.id)}
              className="w-full"
            >
              Remove Location
            </Button>
          </HolographicCard>
        ))}
        <Button onClick={addNaloxoneLocation} variant="outline" className="w-full glass neon-border bg-transparent">
          + Add Naloxone Location
        </Button>
        <p className="text-sm text-muted-foreground text-center">
          These locations are saved on this device so you can find them quickly.
        </p>
      </div>
    </div>,

    // Step 6: Never Use Alone
    <div key="never-alone" className="space-y-6">
      <div className="text-center space-y-4">
        <Users className="w-16 h-16 mx-auto text-primary pulse-glow" />
        <h2 className="text-3xl font-bold glow-text">Never Use Alone</h2>
        <p className="text-muted-foreground">
          NarcoGuard cannot watch over you. Using with someone else present, with naloxone on hand, can save your life.
        </p>
      </div>
      <HolographicCard className="p-8 max-w-2xl mx-auto space-y-6">
        <div className="space-y-4">
          <div className="flex items-start space-x-3">
            <Checkbox
              id="neverUseAlone"
              checked={preferences.features.neverUseAlone}
              onCheckedChange={(checked) =>
                setPreferences({
                  ...preferences,
                  features: { ...preferences.features, neverUseAlone: checked as boolean },
                })
              }
            />
            <div className="space-y-1">
              <Label htmlFor="neverUseAlone" className="text-base font-semibold cursor-pointer">
                Never Use Alone Monitoring (planned)
              </Label>
              <p className="text-sm text-muted-foreground">
                Not active: NarcoGuard cannot monitor you or send help if you stop responding. Don't use alone; have
                someone with you who has naloxone, and call 911 if someone may be overdosing.
                to check-ins
              </p>
            </div>
          </div>

          <div className="p-4 bg-primary/10 rounded-lg border border-primary/20">
            <h4 className="font-semibold mb-2 flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" />
              How It Could Work (planned, not active)
            </h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>• A future version could send periodic check-ins</li>
              <li>• A missed check-in could ask chosen people to check on you</li>
              <li>• This needs testing, approval and your explicit consent first</li>
              <li>• Today nothing is sent and no one is notified</li>
            </ul>
          </div>

          <div className="flex items-start space-x-3">
            <Checkbox
              id="autoDetection"
              checked={preferences.features.autoDetection}
              onCheckedChange={(checked) =>
                setPreferences({
                  ...preferences,
                  features: { ...preferences.features, autoDetection: checked as boolean },
                })
              }
            />
            <div className="space-y-1">
              <Label htmlFor="autoDetection" className="text-base font-semibold cursor-pointer">
                Automatic Overdose Detection (research)
              </Label>
              <p className="text-sm text-muted-foreground">
                Not active: no device or app monitors your vitals today.
              </p>
            </div>
          </div>

          <div className="flex items-start space-x-3">
            <Checkbox
              id="voiceActivation"
              checked={preferences.features.voiceActivation}
              onCheckedChange={(checked) =>
                setPreferences({
                  ...preferences,
                  features: { ...preferences.features, voiceActivation: checked as boolean },
                })
              }
            />
            <div className="space-y-1">
              <Label htmlFor="voiceActivation" className="text-base font-semibold cursor-pointer">
                Voice Activation (planned)
              </Label>
              <p className="text-sm text-muted-foreground">
                Not active: voice commands do not trigger any response.
              </p>
            </div>
          </div>
        </div>
      </HolographicCard>
    </div>,

    // Step 7: Privacy & HIPAA
    <div key="privacy" className="space-y-6">
      <div className="text-center space-y-4">
        <Eye className="w-16 h-16 mx-auto text-primary pulse-glow" />
        <h2 className="text-3xl font-bold glow-text">Your Privacy Matters</h2>
        <p className="text-muted-foreground">Privacy-focused demo; not HIPAA-certified</p>
      </div>
      <HolographicCard className="p-8 max-w-2xl mx-auto space-y-6">
        <div className="flex items-start space-x-3">
          <Checkbox
            id="incognitoMode"
            checked={preferences.privacy.incognitoMode}
            onCheckedChange={(checked) =>
              setPreferences({
                ...preferences,
                privacy: { ...preferences.privacy, incognitoMode: checked as boolean },
              })
            }
          />
          <div className="space-y-1">
            <Label htmlFor="incognitoMode" className="text-base font-semibold cursor-pointer">
              Incognito Mode
            </Label>
            <p className="text-sm text-muted-foreground">For the planned volunteer network. Nothing about you is shared today.</p>
          </div>
        </div>

        <div className="flex items-start space-x-3">
          <Checkbox
            id="shareWithHeroes"
            checked={preferences.privacy.shareWithHeroes}
            onCheckedChange={(checked) =>
              setPreferences({
                ...preferences,
                privacy: { ...preferences.privacy, shareWithHeroes: checked as boolean },
              })
            }
          />
          <div className="space-y-1">
            <Label htmlFor="shareWithHeroes" className="text-base font-semibold cursor-pointer">
              Share Location with Volunteers in Emergencies (planned)
            </Label>
            <p className="text-sm text-muted-foreground">
              Not active: your location is not shared.
            </p>
          </div>
        </div>

        <div className="p-4 bg-primary/10 rounded-lg border border-primary/20">
          <h4 className="font-semibold mb-2 flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            Where your answers are stored
          </h4>
          <p className="text-sm text-muted-foreground">
            Your answers are saved only in this browser on this device. They are not encrypted, are not sent to
            NarcoGuard, and are not shared with anyone. NarcoGuard is not HIPAA-certified. Clearing this site's browser
            data deletes them.
          </p>
        </div>
      </HolographicCard>
    </div>,

    // Step 8: Become a Hero
    <div key="hero" className="space-y-6">
      <div className="text-center space-y-4">
        <Award className="w-16 h-16 mx-auto text-secondary pulse-glow" />
        <h2 className="text-3xl font-bold glow-text">Become a Hero</h2>
        <p className="text-muted-foreground">Save lives in your community</p>
      </div>
      <HolographicCard className="p-8 max-w-2xl mx-auto space-y-6">
        <div className="space-y-4">
          <h3 className="text-xl font-bold">What is a Hero?</h3>
          <p className="text-muted-foreground">
            Heroes would be trained community members who carry naloxone and choose to respond to nearby overdoses. The
            network is planned, not live: no alerts are sent today.
          </p>
        </div>

        <div className="space-y-4">
          <h4 className="font-semibold">Roles & Responsibilities:</h4>
          <ul className="space-y-3 text-sm">
            <li className="flex items-start gap-3">
              <Check className="w-5 h-5 text-green-500 mt-0.5 shrink-0" />
              <span>Respond to emergency alerts in your area</span>
            </li>
            <li className="flex items-start gap-3">
              <Check className="w-5 h-5 text-green-500 mt-0.5 shrink-0" />
              <span>Administer naloxone following AR-guided instructions</span>
            </li>
            <li className="flex items-start gap-3">
              <Check className="w-5 h-5 text-green-500 mt-0.5 shrink-0" />
              <span>Perform CPR if trained and necessary</span>
            </li>
            <li className="flex items-start gap-3">
              <Check className="w-5 h-5 text-green-500 mt-0.5 shrink-0" />
              <span>Stay with the person until EMS arrives</span>
            </li>
            <li className="flex items-start gap-3">
              <Check className="w-5 h-5 text-green-500 mt-0.5 shrink-0" />
              <span>Protected by Good Samaritan laws</span>
            </li>
          </ul>
        </div>

        <div className="space-y-4">
          <h4 className="font-semibold">Training Available:</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="p-3 bg-primary/10 rounded-lg border border-primary/20">
              <p className="font-semibold text-sm">Naloxone Administration</p>
              <p className="text-xs text-muted-foreground">AR-guided training</p>
            </div>
            <div className="p-3 bg-primary/10 rounded-lg border border-primary/20">
              <p className="font-semibold text-sm">CPR Certification</p>
              <p className="text-xs text-muted-foreground">VR simulation available</p>
            </div>
            <div className="p-3 bg-primary/10 rounded-lg border border-primary/20">
              <p className="font-semibold text-sm">Emergency Response</p>
              <p className="text-xs text-muted-foreground">Crisis management</p>
            </div>
            <div className="p-3 bg-primary/10 rounded-lg border border-primary/20">
              <p className="font-semibold text-sm">Mental Health First Aid</p>
              <p className="text-xs text-muted-foreground">Support techniques</p>
            </div>
          </div>
        </div>

        <p className="text-sm text-muted-foreground text-center">
          You can start hero training anytime from the app. No pressure to decide now!
        </p>
      </HolographicCard>
    </div>,

    // Step 9: Recovery Resources
    <div key="recovery" className="space-y-6">
      <div className="text-center space-y-4">
        <Heart className="w-16 h-16 mx-auto text-pink-500 heartbeat" />
        <h2 className="text-3xl font-bold glow-text">Recovery Resources</h2>
        <p className="text-muted-foreground">Support for your journey</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl mx-auto">
        <HolographicCard className="p-6">
          <h3 className="font-bold mb-3">24/7 Support Lines</h3>
          <ul className="space-y-2 text-sm">
            <li>
              <a href="tel:1-800-662-4357" className="text-primary hover:underline">
                SAMHSA: 1-800-662-4357
              </a>
            </li>
            <li>Crisis Text Line: Text HOME to 741741</li>
            <li>
              <a href="tel:988" className="text-primary hover:underline">
                Suicide Prevention: 988
              </a>
            </li>
          </ul>
        </HolographicCard>
        <HolographicCard className="p-6">
          <h3 className="font-bold mb-3">Treatment Finder</h3>
          <p className="text-sm text-muted-foreground mb-3">
            Find local treatment facilities, support groups, and counseling services
          </p>
          <Button
            variant="outline"
            className="w-full glass neon-border bg-transparent"
            onClick={() => window.open("https://findtreatment.gov/", "_blank")}
          >
            Search Resources
          </Button>
        </HolographicCard>
        <HolographicCard className="p-6">
          <h3 className="font-bold mb-3">Peer Support</h3>
          <p className="text-sm text-muted-foreground mb-3">
            Connect with others in recovery through secure, anonymous chat
          </p>
          <Button
            variant="outline"
            className="w-full glass neon-border bg-transparent"
            onClick={() => window.open("https://www.intherooms.com/", "_blank")}
          >
            Join Community
          </Button>
        </HolographicCard>
        <HolographicCard className="p-6">
          <h3 className="font-bold mb-3">Wellness Tracking</h3>
          <p className="text-sm text-muted-foreground mb-3">Track your progress, set goals, and celebrate milestones</p>
          <Button
            variant="outline"
            className="w-full glass neon-border bg-transparent"
            onClick={() => window.open("https://www.recoveryrecord.com/", "_blank")}
          >
            Start Tracking
          </Button>
        </HolographicCard>
      </div>
    </div>,

    // Step 10: Good Samaritan Laws
    <div key="good-samaritan" className="space-y-6">
      <div className="text-center space-y-4">
        <FileText className="w-16 h-16 mx-auto text-primary pulse-glow" />
        <h2 className="text-3xl font-bold glow-text">Good Samaritan Laws</h2>
        <p className="text-muted-foreground">What the law in your state does and does not cover</p>
      </div>
      <HolographicCard className="p-8 max-w-2xl mx-auto space-y-6">
        <div className="space-y-4">
          <div className="p-4 bg-primary/10 rounded-lg border border-primary/20">
            <h4 className="font-semibold mb-2">What these laws usually cover</h4>
            <p className="text-sm text-muted-foreground">
              Every state and DC has an overdose Good Samaritan law, but protection is limited. Most cover possessing small
              amounts of drugs or paraphernalia found because you called for help. They usually do not cover selling drugs,
              outstanding warrants or unrelated crimes, and some only give a defense in court. Always call 911 in an overdose.
            </p>
          </div>

          <div>
            <Label htmlFor="state" className="text-lg font-semibold">
              Select Your State
            </Label>
            <Select
              value={preferences.legal.state || ""}
              onValueChange={(value) =>
                setPreferences({
                  ...preferences,
                  legal: { ...preferences.legal, state: value },
                })
              }
            >
              <SelectTrigger className="glass neon-border mt-2">
                <SelectValue placeholder="Choose your state..." />
              </SelectTrigger>
              <SelectContent>
                {US_STATES.map((state) => (
                  <SelectItem key={state} value={state}>
                    {state}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {(() => {
            const law = goodSamaritanLawFor(preferences.legal.state)
            if (!law) return null
            return (
              <div className="p-4 bg-primary/10 rounded-lg border border-primary/20 space-y-2" data-testid="state-law">
                <h4 className="font-semibold">{law.name}</h4>
                <p className="text-xs text-muted-foreground">{law.citation}</p>
                <p className="text-sm">{law.summary}</p>
                {law.limits && <p className="text-sm text-muted-foreground"><strong>Limits:</strong> {law.limits}</p>}
              </div>
            )
          })()}

          <p className="text-xs text-muted-foreground">
            General information, not legal advice. Laws change; summaries reviewed {GOOD_SAMARITAN_LAWS_REVIEWED} from{" "}
            {GOOD_SAMARITAN_SOURCES.map((source, i) => (
              <span key={source.url}>
                {i > 0 && " and "}
                <a className="underline" href={source.url} target="_blank" rel="noopener noreferrer">{source.title}</a>
              </span>
            ))}
            . Check the statute or a lawyer for your situation.
          </p>

          <div className="p-4 bg-secondary/10 rounded-lg border border-secondary/20">
            <h4 className="font-semibold mb-2">Advocacy & Change</h4>
            <p className="text-sm text-muted-foreground mb-3">
              Not all states have strong Good Samaritan protections. Join our movement to expand these life-saving laws
              nationwide.
            </p>
            <Button
              variant="outline"
              className="w-full glass neon-border bg-transparent"
              onClick={() => window.open("https://drugpolicy.org/issues/911-good-samaritan-overdose-laws", "_blank")}
            >
              Support Legislation
            </Button>
          </div>
        </div>

        <div className="p-6 bg-green-500/30 rounded-lg border-4 border-green-500 animate-pulse-slow">
          <div className="flex items-start space-x-4">
            <Checkbox
              id="acknowledgedGoodSamaritan"
              checked={preferences.legal.acknowledgedGoodSamaritan}
              onCheckedChange={(checked) => {
                setPreferences({
                  ...preferences,
                  legal: { ...preferences.legal, acknowledgedGoodSamaritan: checked as boolean },
                })
              }}
              className="mt-1 w-8 h-8 border-4"
            />
            <div className="space-y-1 flex-1">
              <Label htmlFor="acknowledgedGoodSamaritan" className="text-2xl font-bold cursor-pointer text-green-400">
                ✓ I understand these protections are limited and vary by state
              </Label>
              <p className="text-base text-green-200 font-semibold">Click the box to continue →</p>
            </div>
          </div>
        </div>
      </HolographicCard>
    </div>,

    // Step 11: Legal Agreements
    <div key="legal" className="space-y-6">
      <div className="text-center space-y-4">
        <FileText className="w-16 h-16 mx-auto text-primary pulse-glow" />
        <h2 className="text-3xl font-bold glow-text">Terms & Agreements</h2>
        <p className="text-muted-foreground">Please review and accept to continue</p>
      </div>
      <HolographicCard className="p-8 max-w-2xl mx-auto space-y-6">
        <div className="p-4 bg-primary/20 rounded-lg border-2 border-primary text-center">
          <ArrowDown className="w-8 h-8 mx-auto mb-2 text-primary animate-bounce" />
          <p className="font-bold text-lg text-primary">Click Each Box Below to Accept</p>
          <p className="text-sm text-muted-foreground mt-1">All three boxes must be checked to continue</p>
        </div>

        <div
          className="p-6 bg-blue-500/30 rounded-lg border-4 border-blue-500 cursor-pointer hover:bg-blue-500/40 transition-colors"
          onClick={() => {
            const newValue = !preferences.legal.acceptedTerms
            setPreferences({
              ...preferences,
              legal: { ...preferences.legal, acceptedTerms: newValue },
            })
          }}
        >
          <div className="flex items-start space-x-4">
            <Checkbox
              id="acceptedTerms"
              checked={preferences.legal.acceptedTerms}
              onCheckedChange={(checked) => {
                setPreferences({
                  ...preferences,
                  legal: { ...preferences.legal, acceptedTerms: checked as boolean },
                })
              }}
              className="mt-1 w-8 h-8 border-4"
            />
            <div className="space-y-1 flex-1">
              <Label htmlFor="acceptedTerms" className="text-2xl font-bold cursor-pointer text-blue-300">
                Terms of Service
              </Label>
              <p className="text-sm text-muted-foreground">
                I agree to the{" "}
                <a
                  href="/terms"
                  target="_blank"
                  className="text-primary underline font-semibold hover:text-primary/80"
                  onClick={(e) => e.stopPropagation()}
                  rel="noreferrer"
                >
                  Terms of Service
                </a>
              </p>
            </div>
            {preferences.legal.acceptedTerms && (
              <Check className="w-10 h-10 text-green-500 shrink-0 animate-pulse" />
            )}
          </div>
        </div>

        <div
          className="p-6 bg-purple-500/30 rounded-lg border-4 border-purple-500 cursor-pointer hover:bg-purple-500/40 transition-colors"
          onClick={() => {
            const newValue = !preferences.legal.acceptedPrivacy
            setPreferences({
              ...preferences,
              legal: { ...preferences.legal, acceptedPrivacy: newValue },
            })
          }}
        >
          <div className="flex items-start space-x-4">
            <Checkbox
              id="acceptedPrivacy"
              checked={preferences.legal.acceptedPrivacy}
              onCheckedChange={(checked) => {
                setPreferences({
                  ...preferences,
                  legal: { ...preferences.legal, acceptedPrivacy: checked as boolean },
                })
              }}
              className="mt-1 w-8 h-8 border-4"
            />
            <div className="space-y-1 flex-1">
              <Label htmlFor="acceptedPrivacy" className="text-2xl font-bold cursor-pointer text-purple-300">
                Privacy Policy
              </Label>
              <p className="text-sm text-muted-foreground">
                I agree to the{" "}
                <a
                  href="/privacy"
                  target="_blank"
                  className="text-primary underline font-semibold hover:text-primary/80"
                  onClick={(e) => e.stopPropagation()}
                  rel="noreferrer"
                >
                  Privacy Policy
                </a>
              </p>
            </div>
            {preferences.legal.acceptedPrivacy && (
              <Check className="w-10 h-10 text-green-500 shrink-0 animate-pulse" />
            )}
          </div>
        </div>

        <div
          className="p-6 bg-cyan-500/30 rounded-lg border-4 border-cyan-500 cursor-pointer hover:bg-cyan-500/40 transition-colors"
          onClick={() => {
            const newValue = !preferences.legal.acceptedHIPAA
            setPreferences({
              ...preferences,
              legal: { ...preferences.legal, acceptedHIPAA: newValue },
            })
          }}
        >
          <div className="flex items-start space-x-4">
            <Checkbox
              id="acceptedHIPAA"
              checked={preferences.legal.acceptedHIPAA}
              onCheckedChange={(checked) => {
                setPreferences({
                  ...preferences,
                  legal: { ...preferences.legal, acceptedHIPAA: checked as boolean },
                })
              }}
              className="mt-1 w-8 h-8 border-4"
            />
            <div className="space-y-1 flex-1">
              <Label htmlFor="acceptedHIPAA" className="text-2xl font-bold cursor-pointer text-cyan-300">
                HIPAA Authorization
              </Label>
              <p className="text-sm text-muted-foreground">
                I authorize sharing my health data with emergency responders when necessary to save my life
              </p>
            </div>
            {preferences.legal.acceptedHIPAA && (
              <Check className="w-10 h-10 text-green-500 shrink-0 animate-pulse" />
            )}
          </div>
        </div>

        <div className="p-4 bg-primary/10 rounded-lg border border-primary/20">
          <h4 className="font-semibold mb-2">Important Notes:</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>• This app does not replace professional medical care</li>
            <li>• Always call 911 in life-threatening emergencies</li>
            <li>• Angel AI is a tool to support, not replace, human judgment</li>
            <li>• You can update these preferences anytime in Settings</li>
          </ul>
        </div>
      </HolographicCard>
    </div>,

    // Step 12: Install PWA & Complete
    <div key="complete" className="space-y-6">
      <div className="text-center space-y-4">
        <div className="w-32 h-32 mx-auto float-animation">
          <Image src="/images/narcoguard-icon-256.jpeg" alt="Narcoguard" width={128} height={128} className="w-full h-full rounded-full pulse-glow" />
        </div>
        <h2 className="text-3xl font-bold glow-text">You're All Set, {name}!</h2>
        <p className="text-muted-foreground">Welcome to the movement</p>
      </div>

      <HolographicCard className="p-8 max-w-2xl mx-auto space-y-6">
        <div className="space-y-4">
          <h3 className="text-xl font-bold text-center">Install Narcoguard</h3>
          <p className="text-muted-foreground text-center">
            Install the app for one-tap access from your home screen. Pages you have opened stay available offline.
          </p>

          {isInstallable ? (
            <GlowButton
              onClick={async () => {
                const success = await installPWA()
                if (success) {
                  setTimeout(completeOnboarding, 1000)
                }
              }}
              className="w-full"
              size="lg"
            >
              Install & Launch Dashboard
            </GlowButton>
          ) : method !== "none" ? (
            <div className="flex justify-center">
              <InstallButton label="Show me how to install" />
            </div>
          ) : isInstalled ? (
            <div className="text-center space-y-2">
              <Check className="w-12 h-12 mx-auto text-green-500" />
              <p className="text-sm text-muted-foreground">NarcoGuard is installed on this device.</p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center">
              This browser can&apos;t install apps. Open narcoguard.app in Chrome, Edge or Safari to install, or bookmark this page.
            </p>
          )}

          <GlowButton
            onClick={() => {
              completeOnboarding()
            }}
            className="w-full bg-green-500 hover:bg-green-600"
            size="lg"
          >
            {isInstallable ? "Skip Install & " : ""}Launch Dashboard
            <ChevronRight className="w-5 h-5 ml-2" />
          </GlowButton>
        </div>

        <div className="space-y-4">
          <h4 className="font-semibold text-center">What Happens Next?</h4>
          <div className="grid grid-cols-1 gap-3">
            <div className="p-4 bg-primary/10 rounded-lg border border-primary/20">
              <h5 className="font-semibold mb-1 flex items-center gap-2">
                <Shield className="w-5 h-5 text-primary" />
                Your setup is saved
              </h5>
              <p className="text-sm text-muted-foreground">NarcoGuard does not monitor you or detect overdoses. If someone may be overdosing, call 911 and give naloxone.</p>
            </div>
            <div className="p-4 bg-secondary/10 rounded-lg border border-secondary/20">
              <h5 className="font-semibold mb-1 flex items-center gap-2">
                <Users className="w-5 h-5 text-secondary" />
                Your contacts are on this device
              </h5>
              <p className="text-sm text-muted-foreground">
                {emergencyContacts.length} emergency {emergencyContacts.length === 1 ? "contact" : "contacts"} saved. NarcoGuard does not contact them automatically.
              </p>
            </div>
            <div className="p-4 bg-pink-500/10 rounded-lg border border-pink-500/20">
              <h5 className="font-semibold mb-1 flex items-center gap-2">
                <Heart className="w-5 h-5 text-pink-500" />
                Resources Available
              </h5>
              <p className="text-sm text-muted-foreground">Ask Angel AI or search for help near you anytime</p>
            </div>
          </div>
        </div>

        <div className="text-center space-y-4">
          <p className="text-balance font-semibold text-primary">
            This is more than technology. This is a movement to save and transform lives.
          </p>
          <p className="text-sm text-muted-foreground">Created with love by Stephen Blanford</p>
        </div>
      </HolographicCard>
    </div>,
  ]

  const isStep2Invalid = step === 2 && !name
  const isStep10Invalid = step === 10 && (!preferences.legal.state || !preferences.legal.acknowledgedGoodSamaritan)
  const isStep11Invalid =
    step === 11 &&
    (!preferences.legal.acceptedTerms || !preferences.legal.acceptedPrivacy || !preferences.legal.acceptedHIPAA)

  const isContinueDisabled = isStep2Invalid || isStep10Invalid || isStep11Invalid


  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      <ParticleField count={50} />

      <div className="absolute inset-0 bg-linear-to-br from-primary/5 via-background to-secondary/5 animate-pulse" />

      <div className="relative z-10 container mx-auto px-4 py-8">
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-2">
            <p className="text-sm text-muted-foreground">
              Step {step + 1} of {totalSteps}
            </p>
            <p className="text-sm text-muted-foreground">{Math.round(((step + 1) / totalSteps) * 100)}% Complete</p>
          </div>
          <div className="h-2 bg-background/50 rounded-full overflow-hidden neon-border">
            <div
              className="h-full bg-linear-to-r from-primary to-secondary transition-all duration-500 pulse-glow"
              style={{ width: `${((step + 1) / totalSteps) * 100}%` }}
            />
          </div>
        </div>

        {/* Step Content */}
        <div className="mb-8">{steps[step]}</div>

        {/* Navigation */}
        <div className="flex justify-between items-center max-w-2xl mx-auto gap-4">
          {step > 0 && (
            <Button onClick={prevStep} variant="outline" className="glass neon-border bg-transparent">
              <ChevronLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          )}

          {step < totalSteps - 1 ? (
            <GlowButton onClick={nextStep} disabled={isContinueDisabled} className="ml-auto">
              Continue
              <ChevronRight className="w-4 h-4 ml-2" />
            </GlowButton>
          ) : null}

          {step === totalSteps - 1 && (
            <div className="ml-auto flex flex-col gap-3 flex-1">
              {isInstallable && (
                <GlowButton
                  onClick={async () => {
                    const success = await installPWA()
                    if (success) {
                      setTimeout(completeOnboarding, 500)
                    }
                  }}
                  className="w-full"
                  size="lg"
                >
                  Install & Launch Dashboard
                </GlowButton>
              )}

              <GlowButton
                onClick={() => {
                  completeOnboarding()
                }}
                className="w-full bg-green-500 hover:bg-green-600"
                size="lg"
              >
                {isInstallable ? "Skip Install & " : ""}Launch Dashboard
                <ChevronRight className="w-5 h-5 ml-2" />
              </GlowButton>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
