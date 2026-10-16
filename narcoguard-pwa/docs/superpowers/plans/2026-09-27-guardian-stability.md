# Guardian Stability Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship an opt-in basic-needs planner with truthful personal history and links to live service directories.

**Architecture:** Pure decision and storage functions in `lib/guardian-stability.ts` feed a client-side dashboard at `/stability`. Only explicit user actions write local data; external services open in new tabs. The main dashboard links to the new page.

**Tech Stack:** Next.js 15, React 18, TypeScript, browser localStorage, Node test runner, existing UI components.

**Spec:** `docs/superpowers/specs/2026-09-27-guardian-stability-design.md`

## Global Constraints

- No predictive percentages, location tracking, automated contact alert or claims of verified local hours.
- Explicit opt in; pause and erase; no raw entries sent to server.
- Keep existing emergency flow intact and run `npm run verify` before push.

## Review Focus

- Missing check-in must not mean a need was unmet: test absent day and unknown status.
- Empty/malformed local data must recover safely: test parser.
- Paused state must not create new entries: test storage transition.
- Erase must remove entries, goals and contacts: test reset.
- Sparse samples must not display a percentage: test below five answered antecedents.

---

### Task 1: Consent, data model and honest summaries

**Files:** Create `lib/guardian-stability.ts`; test `tests/guardian-stability.test.ts`.

**Interfaces:** `readGuardianState(storage)` returns a validated default or stored state; `saveGuardianState(storage, state)` saves only if opted in; `summarizePattern(entries)` returns counts or insufficient-history; `clearGuardianState(storage)` erases the separate key.

- [ ] Write tests for defaults, malformed data, opt-in, paused write, erase, and pattern denominators.
- [ ] Run `node --import tsx --test tests/guardian-stability.test.ts` and observe failure.
- [ ] Implement the model and functions with bounded input size and no automatic network calls.
- [ ] Run the test and verify pass.

### Task 2: Dashboard, resources and next-day plan

**Files:** Create `app/stability/page.tsx`, `lib/guardian-resources.ts`; modify `app/page.tsx`; test `tests/guardian-resources.test.ts`.

**Interfaces:** Resource links selected by need and optional postal code; client page uses Task 1 state, saves only explicit edits, and offers pause/erase.

- [ ] Write a failing test for category links and safe postal-code handling.
- [ ] Run the focused test and observe failure.
- [ ] Implement resource links, forms and main-dashboard entry point.
- [ ] Run focused tests, lint and typecheck; fix errors.

### Task 3: Constitution draft and verification

**Files:** Create `docs/governance/CONSTITUTION.md`; existing approved governance design remains unchanged.

**Interfaces:** Founding draft only, prominently marked not ratified; no runtime governance powers.

- [ ] Draft concise principles from the approved September 18 governance design.
- [ ] Review no contradictory claims or unintended legal commitments.
- [ ] Run `npm run verify`, inspect result and fix code failures.
- [ ] Review `git diff --check`, status, exact commit and push a review branch.
