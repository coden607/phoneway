export default function PrivacyPolicy() {
  return (
    <main className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto space-y-8">
        <h1 className="text-4xl font-bold text-center">NarcoGuard Privacy</h1>
        <p className="text-sm text-muted-foreground text-center">Updated October 5, 2026</p>

        <div className="space-y-6 text-sm text-muted-foreground">
          <section className="space-y-3">
            <h2 className="text-2xl font-semibold text-foreground">Guardian Stability planner</h2>
            <p>
              The optional planner can store your needs check-ins, estimated sleep hours, goals, plans, ZIP code,
              and a support phone number in this browser. It is off until you enable it. Your entries are not
              uploaded to a NarcoGuard account or synced between devices by this planner.
            </p>
            <p>
              Anyone who can use this browser may be able to read your entries. They are not encrypted by the
              planner. Clearing your browser data can erase them. You can pause new entries or erase the planner
              data from its page; erasing the planner does not erase data held by external sites you visit.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-2xl font-semibold text-foreground">Website analytics and outside services</h2>
            <p>
              This website includes Vercel Analytics for site-usage measurements. The planner does not send your
              check-in answers, goals, sleep entries, support phone number, or ZIP code as custom analytics events.
              Visiting the planner page may still count as a website page visit. Do not enter personal information
              into a shared browser if that would put you at risk.
            </p>
            <p>
              Resource links can open third-party websites or phone services. Those services have their own privacy
              practices. Check a service&apos;s details and availability before relying on it.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-2xl font-semibold text-foreground">Angel AI, nearby search and Bluetooth readings</h2>
            <p>
              Angel AI is off until you agree to start a chat. Your messages, and a ZIP code if you enter one, are sent
              to Groq, an AI provider, to write replies, either directly or through Vercel AI Gateway. Groq states that it does not use API inputs or outputs for
              training. NarcoGuard does not save the conversation; it is cleared when you leave the page.
            </p>
            <p>
              &quot;Find help near me&quot; uses your location only when you tap &quot;Use my location&quot;, or the ZIP code you
              type. Our server rounds coordinates to about one kilometer and sends them to SAMHSA&apos;s FindTreatment.gov
              or OpenStreetMap services to get listings. We do not store or log the location.
            </p>
            <p>
              Bluetooth heart-rate and blood-oxygen readings are shown only on your screen while connected. They are not
              uploaded, saved or used to detect overdoses.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-2xl font-semibold text-foreground">Donations</h2>
            <p>
              Card donations are processed by Stripe on its checkout page. NarcoGuard does not receive your card details;
              Stripe shares the amount and status of the payment so we can confirm it. GoFundMe donations are handled by
              GoFundMe under its own privacy policy.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-2xl font-semibold text-foreground">Emergency contact texts</h2>
            <p>
              Contacts you add are saved only on your device. To create an invite, NarcoGuard signs the contact&apos;s name, number and
              your name into the invite link; it does not keep a copy. Your contact confirms their number with a code that Twilio
              texts them, and only then can you text them. When you press send, NarcoGuard passes the number and the fixed message
              (plus a map link, only if you choose to include your location) to Twilio, which delivers it and keeps delivery records
              under its own privacy policy. NarcoGuard logs only how many texts were accepted, never names, numbers, locations or
              message text. Contacts can reply STOP to stop all NarcoGuard texts.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-2xl font-semibold text-foreground">Accounts, backup, watch registration and Hero certificates</h2>
            <p>
              An account is optional and never needed for emergency help. Encrypted backup seals your contacts and settings on your
              device with a passphrase NarcoGuard never receives; we store only the encrypted result and cannot read it. Your Guardian
              planner is never included. You can delete the backup at any time.
            </p>
            <p>
              Registering a NarcoGuard watch stores its serial number with your account and a salted hash of your account id, so the watch
              can unlock only for you. It does not use or store your location. Hero certification stores only that you passed, the test
              version and the dates; your answers are graded and discarded, never stored or logged.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-2xl font-semibold text-foreground">Emergency and health limitations</h2>
            <p>
              The public app is a software and wearable research concept, not an emergency dispatch service or a
              validated medical device. The Guardian planner does not monitor your location or vitals, calculate
              relapse odds, contact loved ones, summon responders, or contact 911 for you. Its support-person link
              only opens your phone dialer when you choose to tap it. Call 911 yourself for an immediate emergency.
            </p>
            <p>
              No formal HIPAA compliance claim is made for the current planner, and its browser-local entries are
              not encrypted at rest by the planner. Any future health-data service or contact alerts would need separate consent,
              security, and legal review before launch.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-2xl font-semibold text-foreground">Questions</h2>
            <p>For privacy questions, contact <a className="underline" href="mailto:narcoguard607@gmail.com">narcoguard607@gmail.com</a>.</p>
          </section>
        </div>
      </div>
    </main>
  )
}
