# PRD — Tenth-of-a-gram accuracy

**Status:** draft for approval · **Owner:** coden607 · **Written:** 2026-10-15
**Repo:** `/root/Projects/phoneway` (PhoneWeigh v5.3.0)

---

## 1. Problem

PhoneWeigh displays weight at **0.1 g resolution** but its *verified accuracy* is
worse than its resolution. The README states "typically ±0.1 g to ±0.3 g"; the
in-app honesty note in `ACCURACY_FEATURES.md` says "±0.2–0.5 g depending on
device, surface, and calibration".

So the number on screen moves in 0.1 g steps while the app's own ledger may be
claiming ±0.3 g. For anything where a tenth of a gram decides the outcome, the
display implies a precision the device has not demonstrated.

**The ask:** make a tenth of a gram the *verified* accuracy, not just the
display step — or establish, with measurement, what this hardware can actually
hold and make the product tell that truth.

## 2. Why now / evidence

Grounded in the code as it stands today, not in the docs:

- `js/verificationLedger.js` is the single source of accuracy claims:
  `claim = roundUpTenth(worst |measuredError| of last 5 verifications)`.
- `roundUpTenth()` deliberately under-promises: exact tenths jump a band, so a
  measured 0.4 g error claims ±0.5 g.
- **Therefore ±0.1 g can only ever be displayed if the worst error across five
  consecutive verifications is strictly below 0.1 g** — i.e. ≤ 0.09 g. That is
  not a marketing target; it is what the existing code requires.
- The measurement chain that must deliver it already exists in
  `js/scaleMath.js`: `DirectionalProjection` (noise floor `0.0022`),
  `MultiPointCalibration` (linear at 2 points, quadratic at 3+),
  `TemperatureCompensator`, and `SimpleKalman` / `EMA` / `MovingAverage`.

Two integrity problems found while surveying, which must not ride along
unfixed into an accuracy claim:

- **`ACCURACY_FEATURES.md` is stale and overclaims.** It still advertises
  "Multi-Sensor Fusion (15+ Sensors)", a "Particle Filter Fusion — 500
  particles" and an on-device "Neural Network Corrector (12→24→16→1)". Those
  were deleted in the v5 foundation rebase (~6,700 lines, see
  `docs/legacy/DEAD-CODE-2026-10-08.md`). `grep -ril neural js/` and
  `grep -ril MLP js/` both return nothing. The file carries a truthful v5
  honesty note grafted above v3 claims that contradict it.
- **`test/scale_engine.test.js` contains no test suite**, so `npm test`
  reports a failing file alongside 58 passing tests. An accuracy programme
  cannot run against a red baseline.

## 3. Hypothesis (falsifiable)

> Tilt-based deflection sensing on a modern phone, on a controlled compliant
> surface, has enough signal-to-noise to resolve 0.1 g over a bounded load
> range; the current ±0.2–0.5 g comes from correctable error sources
> (insufficient settling, thermal drift, surface variation, single-point
> calibration, outlier admission) rather than from the sensor floor.

**This is a hypothesis, not a plan commitment.** It is tested by Phase 0 below.
If the noise budget says 0.1 g is unreachable on the target device, the correct
outcome of this PRD is a *stated achievable figure* plus a product that refuses
to imply better — not a shipped ±0.1 g claim.

## 4. Users

| User | Need |
|---|---|
| coden607 (primary) | A phone that weighs to a tenth of a gram, trustworthy enough to act on. |
| Anyone with no scale to hand | A reading they can calibrate and then trust within a stated band. |
| Future agents on this repo | A claim discipline that cannot be bypassed by editing a doc. |

## 5. Scope

**Phase 0 — feasibility gate (must complete before any accuracy work).**
Measure, on the target device, the deflection sensitivity (sensor units per
gram) and the noise floor over a realistic settling window. Compute the
theoretical minimum resolvable mass. Record it. This decides whether ±0.1 g is
physically available and sets the honest target if it is not.

**Phase 1 — make the baseline true.** Correct `ACCURACY_FEATURES.md` to
describe only code that exists; populate or delete `test/scale_engine.test.js`
so `npm test` is green; add the Phase 0 numbers to the docs as measured facts.

**Phase 2 — reduce error at its real sources.** Driven by Phase 0 findings,
expected to include: a repeatability/settling gate that refuses a reading until
variance is below a threshold, outlier rejection before the estimate, required
multi-point calibration (≥3 points for the quadratic fit) before any sub-0.2 g
claim, and thermal-drift compensation verified against the ledger rather than
assumed.

**Phase 3 — prove it.** A verification protocol with reference weights across
the load range, repeated enough times to fill the 5-verification claim window,
with results recorded in the ledger. The claim the app shows is whatever that
produces.

## 6. Success metrics

1. **Primary:** worst |error| ≤ 0.09 g across 5 consecutive verifications on the
   target device, so the ledger legitimately displays ±0.1 g. If Phase 0 proves
   this unreachable, the metric becomes: the ledger displays the measured figure
   and no document or UI string claims better.
2. Stated accuracy holds across a declared load range (range set in Phase 0, not
   assumed) and is reproducible after a re-calibration from scratch.
3. `npm test` green, `npm run check` green, and no doc describing code that does
   not exist.
4. Every accuracy figure in the repo traces to a ledger measurement.

## 7. Non-goals

- No external hardware. A BLE/USB load cell would reach 0.01 g trivially and
  would make this a different product; the point is the phone.
- No resurrection of the deleted fusion/neural code, and no new sensor channel
  in this effort (`skills/extend-channel/SKILL.md` covers that separately).
- No weakening of `roundUpTenth`'s under-promising behaviour to make ±0.1 g
  easier to display. Changing the oracle to pass the test is the one forbidden
  move.

## 8. Open questions

1. ~~Which device is the target of record?~~ **ANSWERED 2026-10-15: iPhone 14.** **No 0.01 g scale is available**, so coin masses cannot be characterised; absolute ±0.1 g stays unverifiable until a ~$10 class F2/M2 calibration weight set is bought. Original question: Accuracy is device- and
   surface-specific, so the figure is meaningless without naming it.
2. ~~What reference weights are available?~~ **ANSWERED 2026-10-15: US coins —
   dime, penny, nickel, quarter, dollar.** This is a good ladder but it carries
   a hard limit that constrains the whole PRD (see §10).
3. What load range matters — sub-gram up to tens of grams, or higher? This sets
   where the calibration curve must be accurate.

## 9. Risks

- **Physics may say no.** Mitigated by Phase 0 running first and by the metric
  having a defined honest fallback.
- **Surface compliance dominates.** The same phone on glass vs foam behaves
  differently; the protocol must fix the surface or report per-surface.
- **Overfitting to one weight.** A curve tuned on a single reference will look
  excellent and generalise badly, which is why ≥3 calibration points gate the
  sub-0.2 g claim.


## 10. Reference-weight limit (decided 2026-10-15)

Available references are US coins. Nominal masses and **US Mint tolerances**:

| Coin | Nominal | Mint tolerance |
|---|---|---|
| Dime | 2.268 g | ±0.091 g |
| Penny (1982 onward, zinc) | 2.500 g | ±0.100 g |
| Nickel | 5.000 g | ±0.194 g |
| Quarter | 5.670 g | ±0.227 g |
| Dollar coin (Sacagawea/Presidential) | 8.100 g | ±0.300 g |

**The references are less certain than the target.** A nickel's true mass is
unknown by ±0.194 g, roughly twice the 0.09 g the ledger needs. Additional
hazards at this precision: a **pre-1982 penny is 3.11 g** (copper) not 2.500 g,
and 1982 exists in both alloys; circulated coins lose mass to wear and gain it
from dirt.

**Consequence for the success metric.** With nominal coin masses alone, Phase 3
can legitimately verify:

- **repeatability / precision** — the same coin re-measured must land within
  0.1 g every time (this is a real and useful 0.1 g claim), and
- **linearity** — the dime → penny → nickel → quarter → dollar ladder, plus
  stacked combinations, must track the calibration curve across the range.

It **cannot** verify **absolute accuracy** to ±0.1 g, because an error of that
size is indistinguishable from the reference's own uncertainty. Any ±0.1 g
*absolute* claim therefore requires one of:

1. **One-time characterisation of the specific coins** on a 0.01 g scale
   (jeweler's or postal). Those individual coins then become known references
   and absolute verification is unblocked. Preferred: free or near-free.
2. **A class F2/M2 calibration weight set** (e.g. 5 g ±0.001 g, ~$10).

Until one of those exists, the honest output of Phase 3 is: a verified
repeatability figure, a verified linearity result, and an explicit statement
that absolute accuracy is bounded below by coin tolerance — not a ±0.1 g
absolute accuracy claim.

**Load range (implied by the references):** ~2.3 g to 8.1 g for single coins,
extending to roughly 50 g stacked. The calibration curve must be accurate
across that band; nothing is claimed outside it.
