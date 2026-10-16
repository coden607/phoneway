---
description: Validate NarcoGuard comprehensively and repair confirmed regressions
---

# NarcoGuard validation and self-healing workflow

This command adapts Cole Medin's Ultimate Validation Command and self-healing E2E workflow to NarcoGuard's safety-critical Next.js PWA. It complements—not replaces—the deterministic `npm run verify` gate.

Sources:

- https://github.com/coleam00/context-engineering-intro/blob/main/validation/ultimate_validate_command.md
- https://github.com/coleam00/ai-coding-summit-workshop-2/blob/main/.claude/skills/e2e-test/SKILL.md

## Safety boundaries

- Preserve unrelated work in a dirty worktree.
- Never read or print secret-bearing environment files. Use `.env.example` only to discover variable names.
- Do not send alerts, marketing messages, emails, payments, database mutations, or production deployments.
- Use test data and local services. Do not claim hardware, medical, emergency, or offline behavior was validated unless the corresponding check actually ran.
- Fix only confirmed defects. Re-run the smallest failing check, then the complete gate.

## 1. Establish scope and evidence

1. Read `AGENTS.md`, `README.md`, `package.json`, `.env.example`, `playwright.config.ts`, `tests/`, relevant routes under `app/`, and the current Git diff.
2. Inventory user-facing routes, API routes, interactive controls, privileged data flows, and external integrations.
3. Translate the requested change and affected flows into explicit acceptance criteria.
4. Record which checks are possible on the current platform:
   - Android/Termux: production build plus HTTP-level PWA smoke validation.
   - Linux, macOS, or Windows: full Playwright browser validation.

## 2. Deterministic health gate

Run:

```bash
npm ci
npm run verify
```

The gate must complete with zero lint warnings and zero errors. Never disable lint, type checking, build validation, or tests to obtain a pass.

## 3. Static review

Inspect the affected code for:

- incorrect emergency states, ambiguous failure states, and unsafe medical certainty;
- accessibility semantics, keyboard behavior, focus, contrast, reduced motion, and touch targets;
- exposure or logging of authentication, health, location, contact, or payment data;
- client-side privileged operations, missing API validation, and unhandled network failures;
- stale state, race conditions, hydration differences, timers without cleanup, and offline inconsistencies;
- responsive overflow at 375×812, 768×1024, and 1440×900.

Document every finding with a file and line. Separate confirmed defects from suggestions.

## 4. User-journey validation

On a desktop-supported platform, use Playwright and test at minimum:

1. First visit → onboarding → dashboard.
2. Skip-onboarding warning and safe return path.
3. Dashboard loading, vitals uncertainty, emergency control, and failure feedback without triggering real external actions.
4. Fund page navigation, campaign copy, native-share fallback, and external-link safety.
5. Hero signup validation and success/failure states using test-only endpoints.
6. NG2 concept page navigation and explicit unvalidated-device disclosures.
7. Manifest installation, service-worker activation, and offline fallback.
8. Privacy and terms navigation.

For each journey:

- capture the starting state and expected result;
- exercise keyboard and pointer interaction;
- inspect browser console and uncaught errors;
- verify resulting local/API state without querying production;
- save screenshots and traces under `output/playwright/`;
- if a defect is found, reproduce it, fix its root cause, and rerun that journey.

On Android/Termux, run `npm run test:pwa`. Report that it validates the production HTML, manifest, icons, service-worker source, and offline asset, but does not emulate browser service-worker activation or offline navigation.

## 5. API and data-flow validation

Exercise local/test instances of every affected API route with valid, invalid, missing, and oversized input. Confirm:

- status codes and response shapes are explicit;
- no sensitive values appear in logs or responses;
- authorization and input validation occur server-side;
- failures do not imply emergency help was dispatched when it was not;
- retries cannot create duplicate alerts or records.

Do not access production Supabase or external emergency systems.

## 6. Close the loop

1. Run `git diff --check`.
2. Run `npm run verify` again.
3. Review `git status` and the final diff for accidental artifacts or unrelated edits.
4. Report:
   - acceptance criteria tested;
   - commands and outcomes;
   - defects fixed and evidence of retest;
   - warnings or checks that remain blocked, with the exact platform reason;
   - limitations of Android smoke testing versus desktop browser testing.

Do not declare complete while a relevant deterministic check is failing.
