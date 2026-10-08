---
name: calibrate
description: Calibrate a measurement channel (default tilt) with a known reference weight. Run this before trusting any reading, and after any surface/device change.
---

# calibrate

Teach the scale how THIS phone + surface deflect under load.

1. Place the phone face-up on a soft, stable surface (mouse pad or 5+ layers of cloth — never a hard table). Wait 5 minutes after unplugging the charger.
2. Tare with nothing on the phone (baseline = 100 samples, ~2s of stillness).
3. Place a known weight on the phone, then trigger calibration (`SimpleScale.calibrate(knownGrams)` or the CAL button).
4. Confirm `result.success`. Each accepted point improves the curve fit (`multiCal`).
5. Prefer 2+ distinct points (e.g. nickel 5.000g + dollar bill 1.00g) so the fit can be checked for shape.
6. Read `result.r2`: `> 0.95` = good curve. This is FIT SHAPE, not accuracy — never present it as ±Xg.
7. If the calibration signal was invalid, retry on a softer surface with less vibration.

After any surface, case, or location change: recalibrate from step 1. Calibration without verification is half the job — run `verify` next.
