# Hero Practical Offers Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let people publish concrete offers such as rides, food, and clothing, describe limits, and let nearby users contact them directly by an offer-specific call or text option.

**Architecture:** Keep offer categories and validation in a pure server-safe library, persist account-owned offers in a dedicated Supabase table with owner-only writes, and expose a small authenticated API. Keep offers independent of overdose certification; an offer is visible only while its owner explicitly activates it.

**Tech Stack:** Next.js App Router, TypeScript, Supabase Postgres/PostgREST, Zod, Node test runner, Playwright.

**Spec:** `docs/superpowers/specs/2026-10-10-hero-community-help-design.md`

## Global Constraints

- No offer implies that a provider or service is verified or guaranteed.
- Overdose response remains separate from practical offers and requires current certification plus an explicit readiness check.
- Keep contact details private unless the Hero explicitly publishes that offer-specific contact method.
- Emergency guidance and directory search remain usable when accounts or Supabase are unavailable.
- Do not write migrations to production without explicit approval.

## Review Focus

- A user cannot edit or delete another account's offer.
- Missing, malformed, excessive, or unsafe offer text/contact values are rejected.
- Practical offers remain available without overdose certification.
- Deactivated, deleted, and expired offers disappear from discovery.
- Published contact links use validated `tel:` or `sms:` destinations and are disclosed as directly reachable.

---

### Task 1: Make Hero certification and enrollment status truthful

**Files:**
- Modify: `app/hero-signup/page.tsx`
- Modify: `components/hero/certification-test.tsx`
- Modify: `components/hero/become-hero.tsx` if still rendered by any route
- Test: `tests/feature-hero-test.test.ts`
- Test: `tests/pwa.spec.ts`

**Interfaces:** Preserve `/api/heroes/test` response fields (`version`, `questions`, `attempt`, `expiresAt`, `certifying`) and existing `HERO_CERTIFICATE_KEY`. Practice mode must remain visibly separate from certificate-issuing mode.

- [ ] **Step 1: Add failing assertions** that practice-mode passes never display a certificate claim, missing `HERO_CERT_SECRET` disables enrollment with a specific explanation, and the UI never calls simulated module clicks completed training.
- [ ] **Step 2: Run the focused tests** with `node --import tsx --test tests/feature-hero-test.test.ts`; confirm the new assertions fail.
- [ ] **Step 3: Implement the truthful states** and replace/remove placeholder training progress behavior without weakening the server-grade test or certificate checks.
- [ ] **Step 4: Run focused tests** and the Hero certification Playwright cases; confirm certifying and practice paths are distinct and enrollment errors are actionable.

### Task 2: Add account-owned practical offer storage and API

**Files:**
- Create: `lib/hero-offers.ts`
- Create: `app/api/heroes/offers/route.ts`
- Create: `supabase/migrations/20261010120000_hero_practical_offers.sql`
- Modify: `scripts/validate-supabase.js`
- Test: `tests/feature-hero-offers.test.ts`

**Interfaces:**
- `OfferCategory = "transportation" | "food" | "clothing" | "other"`.
- `OfferContact = { method: "call" | "text"; value: string } | null`.
- `HeroOffer = { id: string; category: OfferCategory; title: string; description: string; contact: OfferContact; active: boolean; updatedAt: string }`.
- `validateOffer(input: unknown): { success: true; data: NewHeroOffer } | { success: false; error: string }`.
- `GET /api/heroes/offers` returns only the signed-in owner's offers; `POST` creates/updates an owner offer; `DELETE?id=...` deletes only an owner offer. Writes require same-origin and authenticated access.

- [ ] **Step 1: Write failing domain/API tests** for each category, required title, bounded description, valid phone format, absent contact, unauthenticated writes, and cross-account deletion denial.
- [ ] **Step 2: Run the focused test** with `node --import tsx --test tests/feature-hero-offers.test.ts`; confirm expected failures.
- [ ] **Step 3: Implement validation and migration.** Store `auth_user_id`, category, title, description, nullable contact method/value, active flag, timestamps; add owner-only RLS policies and indexes. Do not expose a public table read policy.
- [ ] **Step 4: Implement the authenticated route** using the existing `getAuthContext` and RLS-backed `userRest` pattern; return `Cache-Control: private, no-store` responses and never log contact values.
- [ ] **Step 5: Run focused tests and `node scripts/validate-supabase.js`**; verify migration validation recognizes the new table and policies.

### Task 3: Add offer management and direct contact

**Files:**
- Create: `components/hero/hero-offer-manager.tsx`
- Modify: `app/hero-signup/page.tsx`
- Modify: `components/hero/hero-network-status.tsx`
- Test: `tests/pwa.spec.ts`

**Interfaces:** The manager consumes and writes the `HeroOffer` contract from Task 2. Offer cards show the Hero's stated scope and limits. A published call/text offer renders a direct `tel:`/`sms:` action; no contact method means no contact link.

- [ ] **Step 1: Add failing browser cases** for creating, editing, activating, pausing, deleting an offer and initiating contact through a published channel.
- [ ] **Step 2: Run the focused browser cases** and confirm the offer controls are absent or fail before implementation.
- [ ] **Step 3: Implement the manager** with explicit active state, accessible forms, clear published-contact disclosure, and practical offers independent of overdose certification.
- [ ] **Step 4: Run the focused browser cases** and verify account/API failures preserve emergency links and directory search.

### Task 4: Verify the practical-offers slice

**Files:** No new files.

- [ ] **Step 1: Run** `npm run test:features`, `npm run lint`, `npm run typecheck`, and `npm run validate:supabase`.
- [ ] **Step 2: Inspect** `git diff --check`, migration policies, and the complete diff; confirm no unrelated files changed.
- [ ] **Step 3: Record** any environment prerequisite for applying the migration; production remains disabled until the separate release review.
