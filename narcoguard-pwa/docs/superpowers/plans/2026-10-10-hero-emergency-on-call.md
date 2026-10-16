# Hero Emergency On-Call Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a currently certified Hero explicitly enter overdose-response mode, affirm naloxone readiness, receive privacy-minimal emergency alerts while the PWA is backgrounded, and accept or decline a nearby request.

**Architecture:** Use Web Push for opted-in on-call Heroes, short-lived subscriptions and presence, and a server-owned request state machine. Push payloads contain only an opaque request identifier; the authenticated app fetches details and accepts the request. Requests remain user initiated, expire quickly, and never dispatch responders or contact 911 automatically.

**Tech Stack:** Next.js App Router, TypeScript, Supabase Postgres/PostgREST, Service Worker Push API, VAPID Web Push, Node test runner, Playwright.

**Spec:** `docs/superpowers/specs/2026-10-10-hero-community-help-design.md`

## Global Constraints

- Overdose Hero mode requires a current enrolled certificate, explicit naloxone-readiness affirmation, active presence, and an operational push subscription.
- A browser push alert is a best-effort notification, not guaranteed delivery; the UI must state this limitation and must not imply guaranteed coverage.
- Push payloads contain no precise location, health details, or requester identity.
- The requester explicitly chooses whether to share location; 911 guidance stays primary and independent.
- A Hero is not shown as responding until they authenticate and accept.
- Never send alerts to Heroes who have not actively enabled this mode; never contact emergency services automatically.

## Review Focus

- Expired/wrong-version certificates and missing readiness block activation and acceptance.
- Denied notification permission, unsupported push, expired subscriptions, or failed delivery remove the Hero from on-call eligibility and show a clear state.
- Request cancellation, timeout, duplicate acceptance, and concurrent Hero acceptance have deterministic outcomes.
- Push payload inspection reveals no requester-sensitive content.
- Database, push, or auth failures do not interrupt emergency instructions or 911 access.

---

### Task 1: Add push subscription lifecycle

**Files:**
- Modify: `public/sw.js`
- Modify: `package.json`
- Modify: `package-lock.json`
- Create: `lib/hero-push.ts`
- Create: `app/api/heroes/push/route.ts`
- Create: `supabase/migrations/20261012120000_hero_push_subscriptions.sql`
- Modify: `.env.example`
- Modify: `scripts/validate-env.js`
- Modify: `scripts/validate-supabase.js`
- Test: `tests/feature-hero-push.test.ts`

**Interfaces:**
- Required variables: `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`.
- Add the maintained `web-push` package as a production dependency and keep the lockfile synchronized.
- `POST /api/heroes/push` registers the authenticated user's browser subscription; `DELETE` revokes it.
- Push subscription endpoints and keys are private and readable only by the owner/server. Server sender uses an audited Web Push library and removes subscriptions rejected as expired.

- [ ] **Step 1: Write failing tests** for valid subscription shape, malformed keys/endpoints, owner isolation, revoke behavior, and VAPID configuration absent/present.
- [ ] **Step 2: Run** `node --import tsx --test tests/feature-hero-push.test.ts`; confirm expected failures.
- [ ] **Step 3: Implement** service-worker `push` and `notificationclick` handlers with generic copy and opaque request ID only; implement subscription routes and server sender.
- [ ] **Step 4: Run focused tests** and environment/Supabase validators; ensure no secret values enter client bundles or logs.

### Task 2: Add explicit on-call readiness and expiry

**Files:**
- Modify: `app/api/heroes/route.ts`
- Create: `app/api/heroes/on-call/route.ts`
- Create: `lib/hero-on-call.ts`
- Create: `supabase/migrations/20261013120000_hero_on_call.sql`
- Modify: `components/hero/hero-offer-manager.tsx`
- Test: `tests/feature-hero-on-call.test.ts`

**Interfaces:** `POST /api/heroes/on-call` accepts `{ active: true, latitude, longitude, consent: true, naloxoneReady: true }`; the server verifies current enrollment/certificate, valid push subscription, and coordinate bounds. `DELETE` immediately exits mode. On-call presence expires after 15 minutes without refresh; client refreshes every 5 minutes only while mode is visibly enabled.

- [ ] **Step 1: Write failing tests** for each activation prerequisite, auto-expiry, refresh, immediate opt-out, and service failure.
- [ ] **Step 2: Run** `node --import tsx --test tests/feature-hero-on-call.test.ts`; confirm expected failures.
- [ ] **Step 3: Implement** server-enforced eligibility and state transitions; show a persistent on-call indicator, readiness affirmation, notification status, and one-action off control.
- [ ] **Step 4: Run focused tests**; verify client requests cannot set certification, subscription, or expiry state directly.

### Task 3: Add user-initiated overdose request and acceptance

**Files:**
- Create: `app/api/heroes/emergency-requests/route.ts`
- Create: `app/api/heroes/emergency-requests/[id]/route.ts`
- Create: `lib/hero-emergency-requests.ts`
- Create: `supabase/migrations/20261014120000_hero_emergency_requests.sql`
- Create: `components/emergency/hero-response-request.tsx`
- Modify: `components/emergency/sos-overlay.tsx`
- Modify: `components/hero/hero-offer-manager.tsx`
- Test: `tests/feature-hero-emergency-request.test.ts`
- Test: `tests/pwa.spec.ts`

**Interfaces:**
- Request creation works without account enrollment and requires an explicit user action plus separate location-sharing consent. The server issues a cryptographically random, request-scoped capability token; only its hash is stored. The token permits status lookup/cancellation for that request and expires with it. The request expires after 10 minutes unless cancelled sooner.
- Push sends only `{ requestId }` to eligible Heroes. Authenticated `GET` provides request details only to the requester and eligible on-call Heroes.
- Requester status/cancellation requires the capability token; Hero detail and `POST /api/heroes/emergency-requests/[id]` require authentication. The action body is `{ action: "accept" | "decline" }`; acceptance is atomic and only one Hero can win. Both sides see accepted state only after the transaction succeeds.

- [ ] **Step 1: Write failing tests** for consent, no-location request path, eligibility filtering, opaque notification payload, timeout/cancel, duplicate acceptance, and unauthorized reads.
- [ ] **Step 2: Run** `node --import tsx --test tests/feature-hero-emergency-request.test.ts`; confirm expected failures.
- [ ] **Step 3: Implement** the no-account request flow and status/cancel UI, authenticated Hero inbox and acceptance UI, request state machine, atomic acceptance, rate limits, capability-token access, and best-effort push delivery with failure reporting.
- [ ] **Step 4: Add browser cases** for explicit request/location consent, Hero accept/decline, timeout/cancel, and 911 guidance remaining visible; run the focused cases.
- [ ] **Step 5: Prove** a failed push leaves request state honest and 911 path immediately available; inspect that push payload contains only the opaque request identifier.

### Task 4: Verify on-call safety and rollout readiness

**Files:** No new files.

- [ ] **Step 1: Run** the focused Hero tests, `npm run lint`, `npm run typecheck`, `npm run validate:env`, `npm run validate:supabase`, and the full browser suite on a runner with Chromium.
- [ ] **Step 2: Inspect** service-worker payloads, subscription storage/RLS, expiry behavior, request state transitions, and emergency UI copy.
- [ ] **Step 3: Document** VAPID setup and dev/preview isolation without recording secret values; keep production enablement off until privacy, security, operational, and deployment reviews are complete.
