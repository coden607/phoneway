# Hero and Community Help Network — Design Specification

**Status:** Draft for user review  
**Draft date:** 2026-10-10  
**Target:** NarcoGuard PWA  
**Scope:** Voluntary, person-to-person emergency response and practical help offers

## Purpose

Let people request nearby help and let enrolled Heroes publish the kinds of help they are currently willing to offer. People control whether their location is shared. Overdose response is a distinct, explicitly activated Hero mode that requires a current Hero certification, the responder's confirmation that naloxone is physically available and ready, and an active emergency notification channel so they can receive requests while the app is in the background.

This is a coordination tool, not an emergency dispatch service, treatment provider, identity guarantee, or promise that help will arrive. Emergency guidance remains available without an account, location permission, request, or Hero response.

## Agreed product model

- A Hero may offer one or more practical categories such as transportation, food, clothing, or other concrete support. For each offer, the Hero can state what they are willing to share, relevant limits, and how they can be contacted. A request is shown as nearby only to people who choose to share location for that request and to matching Heroes who are actively offering the category.
- A person requesting help chooses whether to share their location with Heroes. Location is off by default, used only for the chosen request or nearby view, and revocable. The product must explain the precision and recipients before sharing.
- Heroes choose their own offer categories and may turn each offer off. Offers must state their scope and relevant limitations so a person can decide whether to connect.
- Overdose response is a separate mode. A Hero must have a current certification, explicitly turn the mode on, affirm they have naloxone with them and ready, enable emergency notifications, and be able to turn the mode off immediately. The app may show them as on call only while the push subscription and short-lived presence are active. A stale certification, disabled or failed notification channel, withdrawn readiness, or expired presence removes them from overdose matching.
- Displaying an offer does not mean it is verified, accepted, dispatched, or guaranteed. The interface must distinguish available offers, connection requests, accepted help, and completed/cancelled requests.
- Neither a request nor a Hero offer may claim that emergency services were contacted. The person-facing emergency flow continues to say to call 911; the app does not delay that instruction while looking for a Hero.

## Existing system and gap

`/hero-signup` has a server-graded, perfect-score certification test and signed one-year certificate flow. Certificate issuance requires `HERO_CERT_SECRET`; enrollment additionally requires Supabase Auth and the service-role key. `hero_certifications` stores certification and enrollment state. The current Hero map requests geolocation without an explicit in-page sharing choice, displays no real Heroes, and includes placeholder map behavior. `/api/heroes` explicitly reports `nearbyRequests: false`.

The legacy `heroes`, `emergencies`, `emergency_responses`, and `locations` tables are not a sufficient consent-aware offer and request model. Their broad access policies and legacy data assumptions must not be reused as a live public nearby feed. The new network needs purpose-limited records and access rules.

## User flows

### Offer help

1. A person signs in and enrolls after passing the current certification test if they want the Hero credential. Practical offers remain independently selectable; an overdose certification must not imply that the person is on call.
2. They select the categories they can offer, provide concise details, set an approximate service area, review how their presence and location will appear, and publish.
3. They explicitly activate each offer or Hero mode. Overdose mode includes a current certification check, naloxone-readiness affirmation, and a working notification permission/subscription. Emergency requests produce a privacy-minimal push alert while the app is backgrounded; the Hero opens the app to review and accept. Presence expires automatically unless refreshed and disappears immediately when disabled.
4. They can pause, edit, or remove offers at any time. The UI clearly shows active state and what requesters can see.

### Request help

1. A person selects a need category and enters only the details necessary to describe the request.
2. The app offers location sharing as a separate opt-in choice, explains who can see it and for how long, and offers a location-free directory search path.
3. The nearby view shows matching active offers with approximate distance/area, what the Hero says they can share, any stated limits, and freshness. It does not expose exact coordinates or a requester's identity before they choose to connect.
4. Each offer has a clear, low-friction contact action. The requester can tap to start a private in-app message or use a contact method the Hero explicitly chose to publish for that offer. A private connection request can be accepted or declined; only after acceptance do both parties see the minimum contact/location details they separately consented to share. Either person may end the connection or block/report misuse.
5. If there is no matching offer or nobody accepts, the app says so plainly and offers relevant public directories or other next steps. It never fabricates availability.

### Overdose emergency

1. Emergency instructions and 911 remain the primary path and are immediately available.
2. If the person chooses the Hero option, the app explains that Heroes are volunteers and cannot replace emergency services. It asks separately whether to share the requester's location with eligible, currently active overdose Heroes.
3. Only current, opted-in Heroes with a working emergency notification subscription who affirmed naloxone readiness are eligible. The app alerts those Heroes without putting the requester's precise location or sensitive details in the notification. A Hero must open the app and accept before the UI says anyone is responding. The requester sees the actual state and any failure or timeout.
4. The app provides clear cancellation and privacy controls. It does not infer an overdose from wearable readings, automatically contact people, or dispatch a Hero without the person's action.

## Data and privacy boundaries

Use a dedicated model for offers, presence, requests, connection/acceptance state, and consent receipts. Store offer categories and descriptions separately from short-lived presence. Keep location out of analytics, URLs, routine logs, and public records. Use coarse coordinates or distance bands for discovery; reveal precise location only after explicit, request-specific consent by the person who owns that location. Do not retain route histories.

Presence and emergency requests need explicit expiry, deletion, and audit rules. RLS must ensure that users can manage only their own offers and requests, and that nearby discovery returns only the minimum fields needed for matching. Server-side authorization must enforce category matching, current certification, active readiness, working notification subscription, expiry, and consent; clients cannot grant themselves responder eligibility. Contact is easy to initiate, but private phone numbers, exact locations, and other personal details stay hidden until the relevant person explicitly chooses to share them. A Hero may separately publish an offer-specific contact channel, with a clear explanation that requesters can use it directly. Provide block/report controls and a private relay option where supported.

The app must work without location permission, account creation, or Hero participation for ordinary resource discovery and emergency guidance. Shared-device privacy, misuse reporting/blocking, abuse handling, and retention periods need review before production use.

## Certification and readiness

The existing 100% test remains a knowledge check, not proof of identity, hands-on competence, professional qualification, or reliable response. Its version and expiry are checked server-side. Before overdose mode can be activated, the user must have an enrolled, unexpired certificate and affirm naloxone is on hand and ready. The product should identify the affirmation as self-reported, prompt users to turn off the mode when readiness changes, and expire active presence. Do not present a self-attestation as independently verified equipment.

Practical offers do not require overdose certification unless the offer itself involves overdose response. Any training-course completion UI must reflect actual completed learning and must not present simulated button clicks as completed training; the existing `BecomeHero` placeholder must not be treated as a credential.

## Reliability and safety behavior

- Emergency help and 911 directions remain usable if the network, database, location provider, authentication, or Hero service is unavailable.
- Requests and presence have server-enforced expiry. Stale Heroes never appear available.
- Overdose on-call status is unavailable unless notification permission and the current push subscription are valid. Push payloads contain no precise location or sensitive request details; a Hero must authenticate in the app to review and accept.
- Every transition is explicit: draft, active, connection requested, accepted, declined, expired, cancelled, or completed. No silent dispatch or contact.
- Rate limits and abuse controls protect request and connection endpoints without blocking access to emergency guidance.
- Provide accessible, keyboard-operable forms, reduced-motion support, clear permission-denied states, and non-map list alternatives.
- Show uncertainty plainly: approximate distance, last refreshed time, self-reported offer details, and no guarantee of availability or arrival.

## Rollout sequence

1. **Certification readiness:** verify certificate issuance, expiry/version checks, signed-in enrollment, truthful training copy, and explicit practice-versus-certifying states. Keep nearby matching disabled.
2. **Practical offers:** implement account-owned category offers, active/pause controls, non-location directory discovery, and consented connection flow in a development environment.
3. **Nearby matching:** add expiring presence, location permission and consent, coarse discovery, and map/list matching after privacy and security review.
4. **Overdose response mode:** add readiness affirmation, certification enforcement, push subscription and private emergency alerts, request acceptance state, expiry/timeouts, abuse handling, and focused safety review. Alerts go only to Heroes who explicitly activated overdose mode; they do not dispatch a Hero or contact emergency services automatically.
5. **Release decision:** complete legal, privacy, security, accessibility, and operational review; verify controlled deployment and incident/abuse response procedures before enabling for public use.

Each stage must be independently useful and must not claim later stages are live. Production activation, database migration against production, or outbound communications require the repository's existing approval gates.

## Acceptance criteria

- A user can complete the server-graded test; only a valid perfect score yields a signed certificate, and stale or wrong-version certificates are rejected.
- Enrollment state is shown accurately and fails clearly when auth or required server configuration is absent.
- Heroes can create, edit, activate, pause, and delete distinct practical offers; overdose response requires a separate active certification and naloxone-readiness affirmation.
- A Hero is shown as on call only with current certification, naloxone-readiness affirmation, active presence, and an operational push subscription; turning off Hero mode removes them from eligibility immediately.
- A Hero can state exactly what an offer includes, its limits, and an offer-specific contact option; requesters can start contact directly from the offer without navigating a separate enrollment flow.
- A requester can browse directories without sharing location, then separately opt in to location for a specific nearby request and revoke it.
- Discovery returns only fresh, category-matched offers with coarse location; exact location/contact is withheld until the relevant person consents and a connection is accepted.
- No response, expired presence, declined connection, unavailable backend, or denied location permission is represented honestly and leaves emergency guidance available.
- Tests cover authorization boundaries, consent/revocation, expiry, category matching, certification version/expiry, stale presence, error states, and emergency-path isolation before any release.
