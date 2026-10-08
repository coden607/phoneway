---
name: extend-channel
description: Add a new measurement channel/plugin (vibration, camera, audio...) — the extensibility contract for the foundation layer.
---

# extend-channel

Add a measurement path without forking the core. A channel is a module that produces weight estimates; the foundation handles calibration evidence and claims.

1. **Declare it** in `config/continuity.toml` under `[[channels]]`: `id`, `kind`, `status = "placeholder"` → `"live"` when done.
2. **Create `js/channels/<id>.js`** as a vanilla ES module. Export:
   - `start(sensorAccess)` — begin sampling.
   - `estimate()` → `{ grams, confidence, unitsNote }` or `null` when unusable.
   - `stop()` — release sensors.
3. **UNITS CONTRACT (hard rule):** every channel reports weight in grams, derived from SI-traceable physics. Raw sensor values must be converted inside the channel before they touch fusion. Never `mark()` a fusion channel with mixed units (see `diagnose` — the orientation-degrees bug).
4. **Calibration:** reuse `SimpleScale.calibrate` where possible; otherwise accept a known-weight mapping and store channel-specific coefficients under `localStorage: phoneway_v5_cal_<id>`.
5. **Evidence:** verification results go to the SAME `phoneway_v5_ledger` — one ledger, one claim, whatever the channel mix.
6. **Wire-in:** register the channel in `js/app.js` alongside `backgroundFusion` validators; validators may only modulate confidence, never invent grams.
7. **Ship gates:** `npm test` green, `node scripts/check-static.mjs` green, claims still ledger-only. Update `sw.js` ASSETS if you added files.
