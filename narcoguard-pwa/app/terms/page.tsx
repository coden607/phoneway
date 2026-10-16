export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto space-y-8">
        <h1 className="text-4xl font-bold text-center">NarcoGuard Terms of Service</h1>
        <p className="text-sm text-muted-foreground text-center">Last Updated: October 5, 2026</p>

        <div className="space-y-6 text-sm">
          <section>
            <h2 className="text-2xl font-semibold mb-3">1. Acceptance of Terms</h2>
            <p className="text-muted-foreground">
              By accessing or using NarcoGuard ("the App"), you agree to be bound by these Terms of Service. If you do
              not agree to these terms, please do not use the App.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3">2. Medical Disclaimer</h2>
            <p className="text-muted-foreground mb-3">
              NarcoGuard is a harm reduction tool and does NOT replace professional medical care. The App:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>Does not provide medical advice, diagnosis, or treatment</li>
              <li>Cannot guarantee overdose prevention or detection</li>
              <li>Should not be relied upon as a substitute for emergency medical services</li>
              <li>Requires users to call 911 in all medical emergencies</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3">3. NG Watch Concept</h2>
            <p className="text-muted-foreground mb-3">The NarcoGuard NG watch is a design concept. Today:</p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>No NG watch has been built, tested or approved, and none is for sale</li>
              <li>Nothing in the App detects overdoses or administers naloxone</li>
              <li>Any future device that injects medication would need clinical testing and FDA approval before use</li>
              <li>Always follow Never Use Alone practices and call 911 in an emergency</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3">4. User Responsibilities</h2>
            <p className="text-muted-foreground mb-3">Users agree to:</p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>Provide accurate emergency contact information</li>
              <li>Keep the App updated with current naloxone locations</li>
              <li>Decide for yourself whether to share your location; the App works without it</li>
              <li>Not use the App for illegal activities</li>
              <li>Complete proper training before administering naloxone to others</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3">5. Hero Network</h2>
            <p className="text-muted-foreground mb-3">
              Heroes who respond to emergencies through the App agree to act within Good Samaritan law protections and
              follow proper naloxone administration protocols.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3">6. Data Collection & Privacy</h2>
            <p className="text-muted-foreground">
              Most App data stays in your browser. Location is used only when you choose a nearby search, chats with
              Angel AI are sent to an AI provider only after you agree, and Bluetooth readings stay on your screen. See
              the Privacy Policy for details.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3">6a. Donations</h2>
            <p className="text-muted-foreground">
              Donations support development of the NarcoGuard NG concept and do not buy a device, service or early access.
              Card donations are processed by Stripe. Donations are not tax-deductible. Refunds are available on request
              within 30 days by emailing narcoguard607@gmail.com.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3">6b. Emergency Contact Texts</h2>
            <p className="text-muted-foreground">
              You may text only people who have agreed through the invite and code process, and only to ask for help. Texts can be
              delayed, filtered by carriers or not delivered, and contacts may not see or act on them. Texting contacts does not
              notify 911 or any emergency service; call 911 in an emergency. Message and data rates may apply to you and your contacts.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3">7. Limitation of Liability</h2>
            <p className="text-muted-foreground">
              Broome Estates LLC and NarcoGuard creators are not liable for any injuries, damages, or deaths resulting
              from App use or malfunction. This is a harm reduction tool provided "as-is" without warranties.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3">8. Contact</h2>
            <p className="text-muted-foreground">For questions about these Terms, contact: support@narcoguard.app</p>
          </section>
        </div>
      </div>
    </div>
  )
}
