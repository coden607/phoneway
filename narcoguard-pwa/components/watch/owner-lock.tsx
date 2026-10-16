import { Lock, ShieldCheck, Unlock } from "lucide-react"
import { WatchPairing } from "@/components/watch/watch-pairing"
import { CONNECTED_FUNCTIONS, SAFETY_FUNCTIONS, TRANSFER_REASONS, allowedFunctions } from "@/lib/watch-ownership"

const LABELS: Record<string, string> = {
  "sos-button": "SOS button",
  "emergency-call": "Emergency calling (where the network allows)",
  "overdose-steps-on-screen": "Overdose and naloxone steps on screen",
  "local-alarm": "Loud local alarm",
  "vitals-monitoring": "Vitals monitoring",
  "contact-alerts": "Texts to emergency contacts",
  "hero-alerts": "Hero Network requests",
  "cellular-data": "Cellular data",
  "app-sync": "App pairing and sync",
  "owner-setup": "First-time owner registration",
}

const REASON_LABELS: Record<(typeof TRANSFER_REASONS)[number], string> = {
  "warranty-replacement": "Warranty replacement for the same owner",
  "recovered-after-theft": "Returned to its owner after theft or loss",
  "owner-deceased-estate": "The owner has died (handled with the family or estate)",
  "returned-to-program": "Given back to the NarcoGuard program",
}

function FlowDiagram() {
  const steps = [
    { title: "Handover", body: "Watch registered to the owner; record sealed in its secure element" },
    { title: "Owner signs in", body: "Paired phone asks NarcoGuard for an unlock proof" },
    { title: "Watch checks", body: "Signature, owner, fresh challenge, expiry" },
    { title: "Unlocked", body: "All features on for the owner" },
  ]
  return (
    <svg viewBox="0 0 760 210" role="img" aria-labelledby="lock-flow-title" className="w-full h-auto text-foreground">
      <title id="lock-flow-title">Owner lock flow: handover, owner signs in, watch checks the proof, then unlocks; any failure leaves safety functions only.</title>
      <defs>
        <marker id="lock-arrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">
          <path d="M0 0 L8 4 L0 8 Z" fill="currentColor" />
        </marker>
      </defs>
      {steps.map((step, index) => {
        const x = 10 + index * 190
        return (
          <g key={step.title}>
            <rect x={x} y={10} width={160} height={92} rx={12} fill="none" stroke="currentColor" strokeOpacity={0.5} />
            <text x={x + 14} y={36} fontSize={15} fontWeight={700} fill="currentColor">{index + 1}. {step.title}</text>
            {step.body.match(/.{1,24}(\s|$)/g)?.map((line, i) => (
              <text key={i} x={x + 14} y={58 + i * 16} fontSize={12} fill="currentColor" fillOpacity={0.75}>{line.trim()}</text>
            ))}
            {index < steps.length - 1 && <line x1={x + 162} y1={56} x2={x + 188} y2={56} stroke="currentColor" strokeWidth={1.5} markerEnd="url(#lock-arrow)" />}
          </g>
        )
      })}
      <line x1={470} y1={104} x2={470} y2={140} stroke="#ef4444" strokeWidth={1.5} markerEnd="url(#lock-arrow)" />
      <text x={482} y={126} fontSize={12} fill="#ef4444">any check fails</text>
      <rect x={300} y={144} width={450} height={56} rx={12} fill="#ef4444" fillOpacity={0.12} stroke="#ef4444" />
      <text x={316} y={168} fontSize={14} fontWeight={700} fill="currentColor">Locked: safety still works for whoever holds it</text>
      <text x={316} y={188} fontSize={12} fill="currentColor" fillOpacity={0.75}>SOS, emergency calling, overdose steps, alarm. Nothing else.</text>
    </svg>
  )
}

export function OwnerLock() {
  const states = [
    { name: "Unregistered", icon: Unlock, functions: allowedFunctions("unbound"), note: "Fresh from the factory, before handover." },
    { name: "Owner signed in", icon: ShieldCheck, functions: allowedFunctions("active"), note: "The registered owner's phone proved who they are within the last few minutes." },
    { name: "Locked", icon: Lock, functions: allowedFunctions("locked"), note: "Sold, traded, stolen, or paired to anyone else. Factory reset does not clear the lock." },
  ]
  return (
    <div className="space-y-6" data-testid="owner-lock">
      <div className="space-y-2">
        <h2 className="text-xl font-bold">Owner lock: the watch only fully works for the person it was given to</h2>
        <p className="text-sm text-muted-foreground">
          Each NG watch is registered to one owner at handover. A sold or traded watch cannot be registered again, so it is
          useless to a buyer except for the life-safety basics, which stay on for anyone because blocking help in an overdose
          could cost a life. The registry service and Bluetooth pairing below are built; watch firmware and hardware still have to be built and tested.
        </p>
      </div>

      <div className="rounded-xl border p-4"><FlowDiagram /></div>

      <div className="grid gap-4 md:grid-cols-3">
        {states.map(({ name, icon: Icon, functions, note }) => (
          <div key={name} className="rounded-xl border p-4 space-y-2">
            <h3 className="flex items-center gap-2 font-semibold"><Icon className="h-4 w-4" aria-hidden="true" />{name}</h3>
            <p className="text-xs text-muted-foreground">{note}</p>
            <ul className="text-sm space-y-1">
              {[...SAFETY_FUNCTIONS, ...CONNECTED_FUNCTIONS, "owner-setup" as const].map((fn) => {
                const on = functions.includes(fn)
                return (
                  <li key={fn} className={on ? "" : "text-muted-foreground line-through"}>
                    <span className="sr-only">{on ? "Works: " : "Off: "}</span>{LABELS[fn]}
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2 text-sm">
        <section className="rounded-xl border p-4 space-y-2">
          <h3 className="font-semibold">How it resists resale</h3>
          <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
            <li>A device key is created inside the ST54K secure element and never leaves it, so a watch cannot be cloned.</li>
            <li>The owner record is signed by NarcoGuard and stored in the secure element; a factory reset or new firmware cannot erase it.</li>
            <li>Every unlock needs a fresh proof that NarcoGuard only issues to the signed-in owner, answering a random challenge from the watch, valid for 5 minutes.</li>
            <li>Each owner record has a generation number that only goes up, so an old record cannot be replayed.</li>
            <li>The case back is laser-marked with the serial and &ldquo;Registered to its owner · Not for resale&rdquo;, so buyers are warned before they pay.</li>
          </ul>
        </section>
        <section className="rounded-xl border p-4 space-y-2">
          <h3 className="font-semibold">The only ways it changes hands</h3>
          <p className="text-muted-foreground">NarcoGuard support can release the lock, after checking identity, only for:</p>
          <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
            {TRANSFER_REASONS.map((reason) => <li key={reason}>{REASON_LABELS[reason]}</li>)}
          </ul>
          <p className="text-muted-foreground">A sale or trade is never a reason. Each release is logged and the next owner record gets a higher generation.</p>
        </section>
      </div>

      <WatchPairing />

      <section className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm space-y-2">
        <h3 className="font-semibold">Limits, stated plainly</h3>
        <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
          <li>The owner owns the watch. The lock makes a resold watch useless for monitoring; it does not make selling it illegal.</li>
          <li>The lock needs no location tracking. NarcoGuard stores a salted hash of the owner&apos;s account, not their name, and cannot switch off the safety functions remotely.</li>
          <li>Physical attacks on the secure element, carrier eSIM policies and emergency calling without an active plan need testing; rules differ by carrier and country.</li>
        </ul>
      </section>
    </div>
  )
}
