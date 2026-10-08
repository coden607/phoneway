# CLAUDE.md — Phoneway Tilt-Based Scale v5.0

**Comprehensive guide for AI assistants working on the Phoneway codebase.**

---

## Project Overview

**Phoneway** is a smartphone-based tilt scale. **Resolution 0.1g. Accuracy = your
calibration result** — typically ±0.5g, sometimes ±0.2g, and on a good
surface right after multi-point calibration occasionally ±0.1g — measured
per-device by the on-device Verification Ledger (`js/verificationLedger.js`).
Accuracy claims come ONLY from the ledger; never invent one.

- **Version**: 5.0 Foundation Rebase
- **Display Resolution**: 0.1g
- **Measured Accuracy**: whatever the verification ledger records on this device (typically ±0.5g)
- **Maximum Weight**: ~100-200g (phone-dependent)
- **Minimum Weight**: ~0.1g (surface-dependent)
- **Technology**: Vanilla JavaScript ES modules, PWA, no build step

---

## Quick Start Commands

```bash
# Serve locally (required — file:// won't work for ES modules or sensors)
npx serve .          # or: python3 -m http.server 8080
npx live-server .    # auto-reload variant

# Open on Android Chrome for full sensor access
# Desktop Chrome supports DeviceMotion in some configurations
```

---

## Architecture

### Signal Chain (Data Flow)

```
DeviceMotionEvent (accelerometer + gravity, m/s²)
  └── SimpleScale
        ├── BaselineRecorder (empty-scale average, stillness-gated)
        ├── tilt-delta = |gravity-axis deflection under load| − baseline
        ├── MultiPointCalibration curve (tilt-delta → grams)
        ├── MedianFilter → MovingAverageFilter → AdaptiveKalmanFilter → ExpSmooth
        ├── BackgroundSensorFusion (passive motion validators — modulate
        │   confidence ONLY; never invent grams)
        └── verifyAgainstKnown() → VerificationLedger (localStorage)
                  └── accuracyClaim() = worst |error| of last 5 verifies,
                      rounded UP to 0.1g → the only ±Xg text in the app
```

FUSION-UNITS RULE: only quantities in the SAME unit may share a fusion
channel. Orientation tilt is degrees — it must never be `mark()`-ed into an
acceleration (m/s²) channel. See js/simpleScale.js `_handleOrient` and
skills/diagnose.

### Module Responsibilities

| File | Responsibility |
|------|---------------|
| `js/app.js` | `PhonewayApp` class — boots everything, state machine, calibration wizard, UI event binding. Imports the UI modules below. |
| `js/simpleScale.js` | `SimpleScale` — the live measurement path: baseline, tilt-delta→grams, calibration curve, verification. Owns the `VerificationLedger`. |
| `js/verificationLedger.js` | The honesty engine — localStorage ledger; the ONLY source of ±Xg claims. |
| `js/scaleMath.js` | Math primitives: `MultiPointCalibration`, `SensorStabilityChecker`, `TemperatureCompensator`, `GRAVITY`. |
| `js/kalman.js` | Filters: `AdaptiveKalmanFilter`, `MedianFilter`, `ExpSmooth`, `FFT`, `WindowFn` |
| `js/backgroundFusion.js` | `BackgroundSensorFusion` — passive motion validators (modulate confidence only). |
| `js/sensorCombinations.js` | `GyroGate`, `FrequencyConsensus`, `PassiveResonance`, `TiltCorrector` |
| `js/audio.js` | `AudioAnalyzer` — mic → Blackman-Harris windowed FFT → resonant frequency → mass (cross-check path) |
| `js/cameraSensor.js` | `CameraSensor` — optical-flow → FFT → resonant freq (cross-check path) |
| `js/deviceCompat.js` | Cross-device iOS/Android permission & capability handling |
| `js/display.js` | `SevenSegmentDisplay`, `StabilityBar`, `LED`, `AccuracyDisplay` |
| `js/referenceWeights.js` | `REF_WEIGHTS` database, `ReferenceWeightVerifier` |
| `js/telemetry.js` | Anonymous capability reporting |
| `js/liveUi.js` | Dynamic UI bits (toast, panels) |
| `js/version.js` | `VERSION` — single source of truth for the app version string. |
| `js/versionCheck.js` | Classic script: version check / auto-update (must run before modules). |
| `js/errorTrap.js` | Classic script: pre-module error trap → telemetry (must run before modules). |
| `js/helpTooltips.js` | Long-press button help tooltips + user guide wiring (module). |
| `js/swRegister.js` | Service-worker registration (module). |
| `js/pwaInstall.js` | One-click desktop/mobile PWA install flow (module). |
| `data/error-logger.js` | `globalErrorLogger` — error tracking & analysis |
| `config/continuity.toml` | Foundation config: identity, channels, orchestration, policy flags |
| `css/style.css` | Gold/black head-shop aesthetic, neon green 7-seg display |
| `sw.js` | Cache-first service worker |

Removed in the v5 rebase (`docs/legacy/DEAD-CODE-2026-10-08.md`): sensors.js,
vibrationHammer.js, genericSensors.js, precisionEngine.js, ultraPrecision.js,
mlCalibration.js, advancedFusion.js, environmentalSensors.js, quantumFusion.js,
thermalCompensation.js, advancedVerification.js, adaptiveFilter.js,
predictiveCalibration.js, learningEngine.js — unimported, nothing referenced them.

---

## Physics Background

### Accelerometer Method
Phone on soft surface = spring-mass system. Added mass compresses surface → phone tilts → horizontal acceleration change `ΔA`.

```
weight = ΔA × sensitivity  [where sensitivity = g/(m·s⁻²)]
```

### Resonance Methods (Audio + Hammer + Camera)
Both use the same physics formula:
```
m_added = m_phone × ((f_empty/f_loaded)² − 1)
```

| Method | Search Range | Resolution |
|--------|-------------|------------|
| Vibration motor (built-in) | 1–28 Hz | ~0.1 Hz/bin |
| AudioAnalyzer | 20–1200 Hz | ~2.7 Hz/bin |
| CameraSensor | 0.5–20 Hz | ~0.117 Hz/bin |

### Surface Quality
Measured by calibration sensitivity:

| Sensitivity | Rating | Description |
|-------------|--------|-------------|
| <30 | poor | Hard surface — poor deflection |
| <100 | ok | Decent surface |
| <300 | good | Good soft surface |
| ≥300 | excellent | Very soft surface — max accuracy |

---

## Sensor Fusion Weights

The v5 rebase deleted the multi-sensor weighted ensemble (nothing imported
it, and its Neural Network / Particle Filter rows were unverifiable).
The live chain weights the accelerometer path at 1.0; `BackgroundSensorFusion`
validators only modulate displayed CONFIDENCE — they never add or invent grams.

---

## State Machine

```
IDLE → CALIBRATING → READY ↔ MEASURING ↔ STABLE
```

Additional states:
- `ZEROING` — tare in progress
- `OFF` — power button pressed
- `ULTRA` — ultra-precision measurement mode

**Stability detection**: Rolling buffer of `STABLE_WIN=30` fused readings; declared stable when variance < `STABLE_THR=0.1` g.

---

## Calibration Flow

3-step wizard in `_runFullCalibration()`:

1. **Zero baseline** — 200 accelerometer samples → `BaselineRecorder` → `MotionSensor.setBaseline()`
   - Plus vibration hammer calibration (6 strikes)
   - Plus audio baseline recording
   - Plus camera baseline

2. **First weight** — 4-second average of `deltaA`; `MotionSensor.addCalPoint(grams, deltaA)`

3. **Second weight** (optional) — prompts for complementary coin; least-squares fit

**Sensitivity** stored to `localStorage` key `phoneway_v2`.

`phoneMass` defaults to 170g when not calibrated.

Append `?cal` to URL to force calibration flow on load.

---

## Accuracy Formula

```
accuracy = conf×0.40 + stability×0.35 + calScore×0.15 + surfaceScore×0.10
```

### Accuracy Grades

| Grade | Meaning | Color | Description |
|-------|---------|-------|-------------|
| DEMONSTRATED | worst verify ≤0.1g | #00ff66 | 0.1g verified on THIS device + surface |
| ±0.2g | worst verify ≤0.2g | #39ff14 | Excellent — 3+ cal points, excellent surface |
| ±0.5g | worst verify ≤0.5g | #e8c84a | Typical measured accuracy |
| >±0.5g | worst verify >0.5g | #ff8c00 | Softer surface / more cal points, re-verify |
| UNVERIFIED | no verifies yet | #666666 | Run VERIFY before trusting a number |

---

## Key Patterns & Conventions

### Sensor Callbacks
All sensors use these callbacks set by `app.js`:
```javascript
sensor.onWeight = (grams, confidence) => { /* ... */ }
sensor.onRaw = (ax, ay, az) => { /* ... */ }
```

Never call display code directly from sensor modules.

### Sensor Mode Cycling
Cycles through `MODES = ['ULTRA', 'FUSION', 'ACCEL', 'AUDIO', 'HAMMER', 'TOUCH', 'GYRO', 'CAM', 'ENSEMBLE']`.

`FUSION` uses all sources; others isolate single source for diagnostics.

### GyroGate Multiplier
Largest single accuracy win:
```
multiplier = exp(-6 × gyroMagnitude)
gyroMag = 0.00 → multiplier = 1.00 (perfectly still)
gyroMag = 0.10 → multiplier = 0.55
gyroMag = 0.20 → multiplier = 0.30
gyroMag = 0.50 → multiplier = 0.05
```

### Multi-Sensor Consensus Bonus
If 3+ sensors agree within 20%, accuracy gets +5% bonus.

---

## localStorage Keys

| Key | Purpose |
|-----|---------|
| `phoneway_v2` | Calibration settings |
| `phoneway_savedRef` | User-locked reference weight |
| `phoneway_verifyHistory` | Last 10 verify sessions |
| `phoneway_nn_model` | Neural network weights |
| `phoneway_ensemble_corrections` | Linear corrections & sensor biases |
| `phoneway_errorLog` | Error history (1000 entries max) |
| `phoneway_learningModel` | ML model state |

---

## Development Notes

### No Build Step
Pure vanilla JS (ES modules) served as static files.

### ES Modules
`index.html` loads `js/app.js` as `type="module"`. No bundler.

### Service Worker
Cache-first strategy in `sw.js`. **Must increment `CACHE` constant when JS/CSS/HTML files change.**

### Permissions Required
- `devicemotion` (iOS needs explicit request)
- `microphone` (for audio analysis)
- `accelerometer`/`gyroscope`/`magnetometer` (Generic Sensor API)

`vercel.json` sets the `Permissions-Policy` header.

---

## Deployment

### GitHub Actions Auto-Deploy
Configured in `.github/workflows/deploy.yml`

Triggers on push to `main` branch. Requires 3 secrets:
- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID`

### Vercel CLI Setup
```bash
npm i -g vercel
vercel login
vercel link
cat .vercel/project.json  # Get ORG_ID and PROJECT_ID
```

---

## Removed ML / Fusion Subsystems (v5 rebase)

The neural-network corrector (`js/mlCalibration.js`), particle-filter
fusion engine (`js/advancedFusion.js`), and crowd-sourced learning engine
(`js/learningEngine.js`) were deleted in the v5 foundation rebase: nothing
imported them, and accuracy claims built on unverifiable models violated
the evidence-only policy. What they did and why they were removed:
`docs/legacy/DEAD-CODE-2026-10-08.md`. The live signal chain (above) is
deliberately simple: tilt-delta → calibration curve → median/Kalman →
Verification Ledger.

`data/error-logger.js` (`globalErrorLogger`) still exists and still does
local error-pattern tracking; its cloud aggregation and auto-generated
calibration recommendations were part of the removed learning engine.

## File Structure

```
phoneway/
├── index.html              # Main PWA entry (all JS now external)
├── manifest.json           # PWA manifest
├── sw.js                   # Service worker
├── vercel.json             # Deployment config
├── config/
│   └── continuity.toml     # Foundation config (identity, channels, policy)
├── skills/                 # Agent-facing contracts (calibrate/verify/diagnose/extend-channel)
├── test/                   # vitest: scaleMath + verificationLedger
├── scripts/
│   ├── serve.mjs           # Local static server
│   └── check-static.mjs    # CI integrity gate
├── docs/
│   └── legacy/DEAD-CODE-2026-10-08.md  # What the rebase removed and why
├── css/
│   ├── style.css           # Main styles (imports premium)
│   └── premium-style.css   # Laboratory scale aesthetic
├── js/
│   ├── app.js              # Main application class
│   ├── simpleScale.js      # Live tilt→grams measurement path
│   ├── verificationLedger.js # Honesty engine (only source of ±Xg claims)
│   ├── scaleMath.js        # Calibration math primitives
│   ├── kalman.js           # Filter algorithms
│   ├── backgroundFusion.js # Passive motion validators
│   ├── sensorCombinations.js # Cross-sensor algorithms
│   ├── audio.js            # Audio resonance (cross-check)
│   ├── cameraSensor.js     # Optical flow (cross-check)
│   ├── deviceCompat.js     # iOS/Android capability handling
│   ├── display.js          # 7-segment rendering
│   ├── referenceWeights.js # Known-weight database
│   ├── telemetry.js        # Anonymous capability reporting
│   ├── liveUi.js           # Toasts & dynamic panels
│   ├── version.js          # VERSION (single source)
│   ├── versionCheck.js     # Classic script: update check
│   ├── errorTrap.js        # Classic script: pre-module error trap
│   ├── helpTooltips.js     # Button help + guide wiring
│   ├── swRegister.js       # Service-worker registration
│   └── pwaInstall.js       # PWA install flow
└── data/
    └── error-logger.js     # Error tracking
```

---

## Testing Accuracy

### Recommended Calibration Procedure
1. Use **US Nickel (5.00g)** as primary reference
2. Add **US Dollar Bill (1.00g)** as second point for 2-point calibration
3. Place phone on **soft surface** (mouse pad, notebook)
4. Wait for **thermal equilibrium** (5 min after charging)
5. Complete **3+ verifies** with the VERIFY button — the ledger turns them into your measured ±Xg claim

### Verification Objects
| Object | Weight | Tolerance |
|--------|--------|-----------|
| US Nickel | 5.000g | ±0.008g |
| US Dollar Bill | 1.00g | ±0.03g |
| US Dime | 2.268g | ±0.010g |
| US Penny | 2.500g | ±0.013g |
| US Quarter | 5.670g | ±0.013g |

---

## Troubleshooting

### No Sensor Readings
- Check Permissions-Policy headers in `vercel.json`
- iOS: Must tap to grant DeviceMotion permission
- Android: Check Generic Sensor API availability

### Poor Accuracy
- Recalibrate on softer surface
- Wait for thermal equilibrium
- Ensure phone is perfectly still
- Complete more verified measurements for ML training

### Calibration Drift
- Check `errorLogger` recommendations
- Recalibrate if >7 days old
- Avoid measuring while charging

---

**Last Updated**: 2026-10-08
**Accuracy policy**: claims are evidence-based only — see `js/verificationLedger.js`
**Status**: Foundation v5.0 — honest scale + continuity-os core

## Shared agent skills

Read and follow `AGENTS.md` before planning, editing, testing or committing. Use the complete canonical https://github.com/coden607/skills library under its shared-skills policy.
