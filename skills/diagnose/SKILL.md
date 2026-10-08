---
name: diagnose
description: Find and fix measurement-integrity bugs — fusion-units contamination, sensor noise, stale calibration — guided by the ledger.
---

# diagnose

The ledger is your instrument panel. Worsening error, noise spikes, or drifting zero each point somewhere.

1. **Check the ledger first.** `ledger.stats()`: rising `meanAbsError` = systematic drift (temperature, surface creep, stale cal). High variance across verifies = noise or instability.
2. **Fusion-units class (critical, fixed 2026-10-08):** never average quantities with different units into one fusion channel. Tilt angles (degrees) are NOT acceleration deltas (m/s²). Any new sensor feed must be converted to the channel's unit before `comboFusion.mark()`. See the comment block at `js/simpleScale.js::_handleOrient` and `skills/extend-channel`.
3. **Sensor noise:** if σ in PRECISION mode is large, suspect external vibration (fans, traffic) or a hard surface. Move locations; re-tare.
4. **Drifting zero:** re-tare; power-cycle to reset the baseline. Confirm the empty-scale reading holds for 10s.
5. **Thermal:** wait 5 min after charging; phones drift while warming.
6. After any fix: recalibrate, verify ≥3 times, confirm the ledger claim improved before restoring trust.

Never silence a symptom by widening tolerances in code — fix the measurement path.
