# Constitution Anti-Capture Revision Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Strengthen NarcoGuard's founding Constitution with concrete, fair checks on authority while keeping its unratified and nonbinding status unmistakable.

**Architecture:** Keep `docs/governance/CONSTITUTION.md` as the sole public source. Add sectioned rules for protected rights, due process, divided offices, conflicts, transparency, emergencies, and amendments; make the public page describe their proposed status. Extend the constitutional page test to guard key protections and status language.

**Tech Stack:** Markdown, Next.js 15 App Router, React 18, Node test runner, tsx.

**Spec:** `docs/superpowers/specs/2026-09-18-community-governance-design.md`

## Global Constraints

- Keep status `FOUNDING DRAFT — NOT YET RATIFIED` until a legitimate, separately designed ratification process occurs.
- Do not claim the document alone makes legal rights or independent institutions enforceable or operational.
- No Constitution change may create, suspend, or weaken emergency behavior.
- Preserve privacy in public accountability records and all public feedback channels.
- Never condition ordinary food, shelter, hygiene, treatment, or emergency help on tracking, votes, or disclosure.

## Review Focus

- Executive, majority, or donor capture: prevent unilateral appointments, removals, combined offices, and purchased influence.
- Conflicts: require recusal and independent replacements while protecting personal data.
- Individual adverse decisions: provide notice, evidence access, reasons, human appeal, and non-retaliation.
- Emergency powers: restrict scope and duration; prohibit rights suspension; require audit and independent review.
- Amendment capture: require separate affected-person approval and independent rights review; protect the rights floor from ordinary-majority repeal.

---

### Task 1: Pin constitutional protections with tests

**Files:** Modify `tests/constitution-page.test.tsx`.

- [x] Assert the canonical draft and public page state the non-waivable rights floor, due process and independent appeal, limits on office-holding and conflicts, bounded/expiring emergency authority, and elevated amendment safeguards.
- [x] Run `npm run test:constitution` and confirm the new assertions fail against the original draft.

### Task 2: Revise the canonical founding draft and public framing

**Files:** Modify `docs/governance/CONSTITUTION.md`, `app/constitution/page.tsx`, and `AGENTS.md`.

- [x] Add explicit rights, appeals, appointment/removal, term, recusal, publication/audit, emergency, and amendment procedures while labeling institutions as proposed until adopted and resourced.
- [x] Update the page version/date and state plainly that safeguards are proposed commitments, not currently enforceable governance or runtime controls.
- [x] Document engineering rules that keep any future implementation person-led, privacy-preserving, reviewable, and isolated from emergency paths.
- [x] Run `npm run test:constitution` and ensure the new assertions pass.

### Task 3: Verify and release

**Files:** Review all changed files and release workflow.

- [ ] Run `npm run verify`, inspect all diffs, and address every failure without weakening checks. Local browser tests are blocked because the Playwright Chromium download endpoint returns a zero-byte archive; rely on the GitHub CI browser runner for PWA and Lighthouse results.
- [ ] Commit and merge/push the approved changes to `main` after all hosted checks pass.
- [ ] Verify the deployed `/constitution`, `/stability`, and core PWA routes against the merged commit.
