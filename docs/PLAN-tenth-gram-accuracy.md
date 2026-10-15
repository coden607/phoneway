# Implementation plan — Tenth-of-a-gram accuracy

**PRD:** [PRD-tenth-gram-accuracy.md](PRD-tenth-gram-accuracy.md)
**Repo:** PhoneWeigh v5.3.0 · **Written:** 2026-10-15

**Tech:** vanilla ES modules, zero dependencies, no build step. Tests are
**vitest** (`npm test`); static integrity is `npm run check`; accuracy harness is
`npm run test:accuracy` (`scripts/test-scale-accuracy.mjs`).

**Standing constraints**
- The ledger is the oracle. `roundUpTenth` keeps its under-promising behaviour;
  no task may relax it to make a claim easier to display.
- No new dependency, no build step, no external hardware.
- Every task ends green on `npm test` **and** `npm run check`.
- A claim may only be written to a doc after a ledger measurement supports it.

---

## Phase 0 — Feasibility gate (blocks everything else)

### Task 0.1 — Noise-and-sensitivity budget

**Files:** create `scripts/noise-budget.mjs`; create
`test/noiseBudget.test.js`; modify `docs/PRD-tenth-gram-accuracy.md` (record
results).

**Interface:** `computeBudget({ samples, sensitivityPerGram, settlingMs })`
returns `{ noiseStdDev, sensitivityPerGram, minResolvableGrams, verdict }`
where `minResolvableGrams = (3 * noiseStdDev) / sensitivityPerGram` (3σ, so the
figure is a detection limit rather than a best case).

- [ ] Write failing tests: a known synthetic signal with injected Gaussian
      noise must yield the analytically expected `minResolvableGrams`; a
      zero-sensitivity input must refuse rather than divide by zero.
- [ ] Implement the budget calculation over recorded sample arrays.
- [ ] Capture real samples from the target device at rest and under known
      loads; feed them through the script.
- [ ] **Decision gate:** record `minResolvableGrams` in the PRD. If > 0.1 g,
      switch the PRD's primary metric to the honest-figure fallback and skip
      Phase 2's sub-0.1 g tuning — do not proceed as if 0.1 g were available.

## Phase 1 — Make the baseline true

### Task 1.1 — Stop the docs overclaiming

**Files:** modify `ACCURACY_FEATURES.md`; modify `README.md` if its range
contradicts Phase 0.

- [ ] Delete the "Multi-Sensor Fusion (15+ Sensors)" table, "Particle Filter
      Fusion", and "Neural Network Corrector" sections — that code was removed
      in the v5 rebase and `grep -ril neural js/` returns nothing.
- [ ] Replace with what actually computes a reading: `DirectionalProjection`,
      `MultiPointCalibration`, `TemperatureCompensator`, the smoothing filters,
      and the ledger.
- [ ] Add the Phase 0 measured numbers as the accuracy statement.
- [ ] Verify: `npm run check`, and grep the repo for every surviving "±" claim
      to confirm each traces to a measurement.

### Task 1.2 — Green baseline

**Files:** modify or delete `test/scale_engine.test.js`.

- [ ] `test/scale_engine.test.js` contains no suite, so `npm test` reports a
      failing file beside 58 passing tests. Either cover `js/scale_engine.js`
      properly or remove the empty file.
- [ ] Verify: `npm test` fully green, count recorded in the commit message.

### Task 1.3 — Guard the claim discipline in CI

**Files:** modify `scripts/check-static.mjs`; create `test/claimGuard.test.js`.

- [ ] Add a check that fails when a tracked doc states a "±Xg" accuracy that is
      not present in a ledger-measurement record, and when a doc names a module
      or algorithm absent from `js/`.
- [ ] Prove the guard: reintroduce a "neural network" line in a scratch copy and
      confirm non-zero exit; remove it and confirm zero. Same pattern as the
      NarcoGuard `validate-claims` guard.

## Phase 2 — Reduce error at its real sources

*Shape driven by Phase 0; each task independently verifiable against the ledger.*

### Task 2.1 — Settling and repeatability gate

**Files:** modify `js/scaleMath.js`, `js/simpleScale.js`; create
`test/settlingGate.test.js`.

**Interface:** `isSettled({ stdDev, window, threshold })` → boolean; the reading
path refuses to commit a measurement until the moving-window `stdDev` is below
threshold, surfacing "still settling" instead of a confident wrong number.

- [ ] Failing tests: a noisy window must not settle; a quiet window must; a
      window that never settles must time out and report rather than hang.
- [ ] Implement using the existing `MovingAverage.stdDev`.
- [ ] Verify: focused tests, then a ledger verification run to confirm the gate
      reduces worst |error| rather than merely slowing the UI.

### Task 2.2 — Outlier rejection before estimation

**Files:** modify `js/scaleMath.js`; create `test/outlierRejection.test.js`.

- [ ] Failing tests: a single large spike must not move the estimate beyond a
      bound; a genuine step change must still be tracked (not rejected as an
      outlier); all-identical input must be unchanged.
- [ ] Implement median/MAD rejection ahead of the Kalman update.

### Task 2.3 — Require multi-point calibration for a sub-0.2 g claim

**Files:** modify `js/scaleMath.js` (`MultiPointCalibration`),
`js/verificationLedger.js` (claim eligibility), `js/liveUi.js`; create
`test/calibrationGate.test.js`.

- [ ] Failing tests: with 1 calibration point the app must not display better
      than its coarse band regardless of measured error (a single point cannot
      evidence curve accuracy); with ≥3 points the quadratic fit is used and a
      finer claim becomes eligible.
- [ ] Implement the eligibility rule in the ledger, not the UI, so it cannot be
      bypassed by a display change.

### Task 2.4 — Verify thermal compensation instead of assuming it

**Files:** modify `js/scaleMath.js` (`TemperatureCompensator`); create
`test/thermalDrift.test.js`.

- [ ] Failing tests: a synthetic drift ramp must be substantially removed; a
      drift-free signal must pass through unchanged (no compensation invented
      where there is no drift).
- [ ] Verify against a real warm-up run: measurements over the first minutes of
      use, logged, before and after.

## Phase 3 — Prove it

### Task 3.1 — Verification protocol

**Files:** create `docs/VERIFICATION-PROTOCOL.md`; modify
`scripts/test-scale-accuracy.mjs`.

- [ ] Document the fixed procedure: named device, named surface, reference
      weights used, settling time, number of repeats, re-calibration from
      scratch between runs.
- [ ] Extend the harness to replay recorded sessions so a claim is reproducible
      off-device.

### Task 3.2 — Run it and publish only what it produces

**Files:** modify `README.md`, `ACCURACY_FEATURES.md`,
`docs/PRD-tenth-gram-accuracy.md`.

- [ ] Execute the protocol across the declared load range until the
      5-verification window is full.
- [ ] Record worst |error|; the displayed claim is whatever `roundUpTenth`
      returns from it.
- [ ] **If worst |error| ≤ 0.09 g:** ±0.1 g is earned — state it with the device,
      surface and date.
- [ ] **If not:** publish the measured figure, state plainly that 0.1 g is the
      display step and not the accuracy, and record the limiting factor from
      Phase 0.
- [ ] Verify: `npm test`, `npm run check`, `npm run test:accuracy` all green;
      the claim guard from Task 1.3 passes against the new docs.

### Task 3.3 — Drive it in a real browser (required gate, requested 2026-10-15)

Unit tests passing is not proof the app works. Before any claim ships, the PWA
must be exercised in a real browser end to end.

**Files:** create `test/e2e/browser-verify.mjs` (driven from outside the repo so
PhoneWeigh keeps its zero-dependency, no-build-step promise — Chromium is
already present at `/root/.cache/ms-playwright/chromium-1243`).

- [ ] Serve the app with `npm run serve` and load it in headless Chromium.
- [ ] **Inject synthetic `devicemotion` / `deviceorientation` events** with known
      deflection values, so the whole chain runs for real in the page:
      projection → outlier rejection → settling gate → calibration curve →
      display → ledger write.
- [ ] Assert: a known injected deflection produces the expected grams on screen;
      the settling gate visibly refuses a reading while noisy; a single
      calibration point cannot display a sub-0.2 g claim; the ledger persists
      and the displayed ±Xg equals `roundUpTenth(worst of last 5)`.
- [ ] Assert the honest-failure paths: sensor permission denied, no sensors
      present, and `localStorage` unavailable each leave the app usable and
      claiming nothing.
- [ ] Capture screenshots of calibrate / verify / result for the record.

**Boundary — what a browser cannot prove.** Headless Chromium has no
accelerometer and no mass. This task proves the *software* is correct given
known input. It cannot prove the device resolves 0.1 g of real weight; that
needs the target phone and reference weights, and is Task 3.2. Neither task
substitutes for the other, and the ±0.1 g claim requires 3.2.

---

## Review focus

- No claim exists that a ledger measurement does not support.
- The oracle (`roundUpTenth`, claim window) is unchanged.
- A reading is refused rather than guessed when the gates are not satisfied.
- Zero new dependencies; no build step introduced.
- Device and surface named wherever a figure is stated.

## Blocked on (from the PRD's open questions)

1. **Target device of record** — a figure without a named device is meaningless.
2. **Available reference weights** — Phase 3 cannot run without known masses.
3. **Load range that matters** — sets where the curve must be accurate.

Phase 0 Task 0.1's synthetic tests and Phase 1 can proceed before these are
answered; Phase 0's real-device capture and all of Phase 3 cannot.
