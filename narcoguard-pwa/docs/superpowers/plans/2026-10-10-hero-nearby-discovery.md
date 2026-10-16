# Hero Nearby Discovery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show fresh practical offers near a person only after they explicitly choose to share location for that search, with an accessible in-app approximate map and list.

**Architecture:** Store only short-lived Hero presence with a consent receipt and coarse coordinates. The browser obtains requester location only after an in-page opt-in; the server matches category and distance and returns rounded positions. The map uses a local coordinate plot with no external tile provider, while the list remains the accessible primary view.

**Tech Stack:** Next.js App Router, TypeScript, Supabase Postgres/PostgREST, browser Geolocation API, SVG, Node test runner, Playwright.

**Spec:** `docs/superpowers/specs/2026-10-10-hero-community-help-design.md`

## Global Constraints

- Location sharing is off by default, purpose-limited to the chosen nearby search, and revocable.
- Never place location in analytics, URLs, routine logs, or cached responses.
- Return approximate positions and distances only; never expose exact coordinates through public discovery.
- Directory search and emergency guidance remain available when location is denied or the network fails.
- No fabricated Hero availability, stale presence, or guaranteed service claims.

## Review Focus

- Permission denial and unsupported geolocation leave the page usable.
- Malformed/out-of-range coordinates and unsupported categories are rejected.
- Expired, paused, or category-mismatched offers never appear.
- Returned locations are coarse enough to avoid pinpointing a person.
- Map and list show the same offers and work with keyboard and assistive technology.

---

### Task 1: Add expiring, consented Hero presence

**Files:**
- Create: `supabase/migrations/20261011120000_hero_presence.sql`
- Create: `lib/hero-presence.ts`
- Create: `app/api/heroes/presence/route.ts`
- Modify: `scripts/validate-supabase.js`
- Test: `tests/feature-hero-presence.test.ts`

**Interfaces:**
- `HeroPresence = { active: boolean; shareNearby: boolean; latitude: number | null; longitude: number | null; expiresAt: string }`.
- `POST /api/heroes/presence` requires signed-in owner, explicit `shareNearby: true`, valid coordinates, and an active offer; it stores a short-lived, rounded location and consent timestamp.
- `DELETE /api/heroes/presence` immediately removes the caller's presence and location.

- [ ] **Step 1: Write failing tests** for opt-in required, coordinate bounds, rounding, expiry, and immediate revocation.
- [ ] **Step 2: Run** `node --import tsx --test tests/feature-hero-presence.test.ts`; confirm failures.
- [ ] **Step 3: Implement** a dedicated presence table with owner-only writes/selects, server-enforced expiry, and no public raw-coordinate policy; expose consent-gated routes.
- [ ] **Step 4: Run the focused tests** and Supabase validator; confirm stale presence cannot be renewed using client-supplied expiry.

### Task 2: Add category and distance matching

**Files:**
- Create: `app/api/heroes/offers/nearby/route.ts`
- Create: `lib/hero-nearby.ts`
- Test: `tests/feature-hero-nearby.test.ts`

**Interfaces:** `findNearbyOffers(input: { category: OfferCategory; latitude: number; longitude: number; radiusMiles: number }, now?: number): Promise<NearbyOffer[]>`; each `NearbyOffer` contains offer fields, offer-specific published contact option, coarse latitude/longitude, distance band, and freshness timestamp. Requester coordinates are processed without persistence.

- [ ] **Step 1: Write failing tests** for category matching, radius filtering, stale presence, privacy rounding, and empty/unavailable results.
- [ ] **Step 2: Run** `node --import tsx --test tests/feature-hero-nearby.test.ts`; confirm expected failures.
- [ ] **Step 3: Implement** bounded query validation, no-store responses, server-side filtering, coarse returned positions, and rate limits without logging request coordinates.
- [ ] **Step 4: Run focused tests** and verify malformed requests return a safe 400 response.

### Task 3: Add explicit requester consent and map/list UI

**Files:**
- Create: `components/hero/nearby-offers.tsx`
- Modify: `components/hero/hero-map.tsx`
- Modify: `components/hero/hero-network-status.tsx`
- Modify: `app/hero-signup/page.tsx` or the existing help entry point selected during implementation
- Test: `tests/pwa.spec.ts`

**Interfaces:** Category selection uses the Task 2 API. The first action explains location purpose and precision; only a user click invokes geolocation. Denial or cancellation displays manual category browsing/directory fallback without saving coordinates. The map plots returned coarse points locally and shares no coordinates with a map vendor.

- [ ] **Step 1: Add failing browser cases** for no location request before opt-in, denial fallback, category-filtered results, matching map/list cards, direct contact action, and no-results state.
- [ ] **Step 2: Run the focused Playwright cases** and confirm they fail before implementation.
- [ ] **Step 3: Implement** consent-first location lookup, a keyboard-accessible list, a local approximate SVG map, distance/freshness labels, and offer-specific contact links.
- [ ] **Step 4: Run the focused browser cases** and verify the map never presents approximate locations as exact.

### Task 4: Verify nearby discovery

**Files:** No new files.

- [ ] **Step 1: Run** `npm run test:features`, `npm run lint`, `npm run typecheck`, and `npm run validate:supabase`.
- [ ] **Step 2: Inspect** cache headers, analytics usage, RLS policies, consent copy, and the complete diff.
- [ ] **Step 3: Confirm** resource directory fallback and emergency guidance still work with geolocation denied and the database offline.
