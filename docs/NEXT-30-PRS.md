# PhoneWeigh — Next 30 PRs

Ordered by ContinuityOS: measurement integrity first, then browser reliability, then UX and release hardening. No PR may invent an accuracy figure.

| # | PR / feature | Acceptance gate |
|---:|---|---|
| 1 | Complete-window verification readiness | No numeric ±Xg before 5 verifies |
| 2 | Ledger bias/MAE/RMSE diagnostics | Deterministic unit tests |
| 3 | Exportable verification snapshot | Bounded JSON, no mutation |
| 4 | Accuracy-claim static guard | CI rejects unsupported ± claims |
| 5 | Calibration evidence gate | Fine claim requires sufficient calibration points |
| 6 | MAD outlier rejection | Spike rejected; real step preserved |
| 7 | Settling timeout state | Never hangs; noisy surface stays unready |
| 8 | Real-time noise budget card | Detection limit shown without calling it accuracy |
| 9 | Sensor stream dropout recovery | Fresh samples required after gap |
| 10 | Browser capability preflight | iOS/Android/desktop capability matrix |
| 11 | iOS motion-permission onboarding | User gesture path tested |
| 12 | Sensor sample-rate monitor | Warn when effective Hz is too low |
| 13 | Calibration age/staleness policy | Surface/device change invalidates trust |
| 14 | Calibration-point coverage score | Load range gaps visible |
| 15 | Reference-weight uncertainty model | Reference tolerance carried into verification |
| 16 | Verification diversity rule | Encourage multiple reference masses |
| 17 | Thermal drift qualification | Compensation only enabled when measured useful |
| 18 | Placement repeatability workflow | Repeat placements quantified |
| 19 | Surface qualification workflow | Reject surfaces with excessive creep/noise |
| 20 | Device profile fingerprint | Ledger tied to device/browser context |
| 21 | Session trace recorder | Replayable sensor sessions for debugging |
| 22 | Recorded-session replay harness | CI regression against real traces |
| 23 | Full synthetic browser measurement E2E | Motion → calibration → display → ledger |
| 24 | Permission-denied E2E | App remains usable and unverified |
| 25 | localStorage-failure E2E | In-memory fallback; no false persistence claim |
| 26 | Offline/PWA measurement smoke | Core workflow works after install/offline |
| 27 | Mobile zoom/accessibility hardening | 200% zoom, VoiceOver labels, touch targets |
| 28 | Verification history UI | Show evidence behind current claim |
| 29 | Release evidence bundle | CI artifacts: tests, Lighthouse, screenshots, trace |
| 30 | Device-of-record verification protocol | Publish only measured device/surface results |

## Execution rule

Each PR must be independently reviewable and green on the applicable gates. Core measurement changes require focused unit tests plus `npm run ci`; browser-facing changes also require the browser E2E job. Production deploy and merge remain separate approval boundaries.
