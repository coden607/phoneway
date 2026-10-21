# PhoneWeigh — Next 20 Accuracy Upgrades

These are the next measurement-integrity upgrades after the current 15-part evidence/sensor gate. They are ordered to improve repeatability and falsifiability before adding more UI. None is allowed to create an unsupported accuracy claim.

| # | Upgrade | Acceptance gate |
|---:|---|---|
| 1 | Session sensor-trace recorder | Bounded, opt-in trace captures timestamps + motion channels without PII |
| 2 | Deterministic trace replay engine | Same trace produces same measurement outputs in CI |
| 3 | Real-device fixture corpus | Versioned anonymized traces for firm/soft/noisy surfaces |
| 4 | Step-response detector | Distinguishes a placed/removed load from isolated sensor spikes |
| 5 | Adaptive settle-duration estimator | Requires longer settling when creep/noise is elevated |
| 6 | Allan-deviation stability analysis | Quantifies useful averaging interval instead of assuming it |
| 7 | Heteroscedastic calibration fit | Calibration weights noisier at some loads receive lower influence |
| 8 | Leave-one-out calibration validation | A bad calibration point is detected before trusting the curve |
| 9 | Monotonic calibration constraint | Increasing deflection cannot predict decreasing mass |
| 10 | Extrapolation trust boundary | Readings outside calibrated mass range are visibly unverified |
| 11 | Minimum detectable load estimator | Derived from measured noise; never presented as accuracy |
| 12 | Saturation/overload detector | Rejects sensor/fit regions where response is no longer trustworthy |
| 13 | Orientation-change invalidation | Material orientation change requires fresh tare/qualification |
| 14 | Surface-change invalidation | Noise/creep fingerprint change invalidates stale calibration trust |
| 15 | Reference-set provenance | Store reference name, nominal mass, tolerance, and source metadata |
| 16 | Blind verification mode | Hide expected mass during capture to reduce operator bias |
| 17 | Repeated-placement verification protocol | Require remove/replace cycles, not repeated reads without repositioning |
| 18 | Cross-mass residual dashboard | Show signed residuals across calibration/verification range |
| 19 | Confidence calibration audit | Compare predicted uncertainty against observed held-out error |
| 20 | Device-of-record release gate | Numeric accuracy claims require a reproducible physical protocol and evidence bundle |

## Merge gates

- Core math: deterministic unit tests plus existing accuracy tests.
- Browser/sensor behavior: Browser E2E and Lighthouse.
- PWA changes: offline smoke and service-worker asset/version coherence.
- Accuracy wording: verification-ledger/static-claim guard.
- Physical performance: never infer from synthetic tests; device-of-record evidence is mandatory.


PIV execution companion: `docs/PIV-MAX-ACCURACY.md`.
