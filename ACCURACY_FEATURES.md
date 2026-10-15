# PhoneWeigh — what actually produces a reading

> **0.1 g is the display step, not a guaranteed accuracy.** The only source of
> an accuracy claim is the on-device Verification Ledger
> (`js/verificationLedger.js`): the claim is the worst |error| of your last 5
> verifications, rounded **up** to the next 0.1 g. Exact tenths round up, so a
> displayed **±0.1 g requires all five errors to be under 0.1 g**.
> See [docs/PRD-tenth-gram-accuracy.md](docs/PRD-tenth-gram-accuracy.md).

This file used to advertise a 15-sensor fusion stack, a 500-particle filter and
an on-device neural-network corrector. The v5 rebase deleted that code
(`docs/legacy/DEAD-CODE-2026-10-08.md`). Everything below exists in `js/` today.

## Measurement chain

| Stage | Module | What it does |
|---|---|---|
| Direction | `scaleMath.js` `DirectionalProjection` | Projects accelerometer deflection onto the calibrated load axis. |
| Motion gate | `sensorCombinations.js` `GyroGate` | Scales accelerometer confidence by `exp(-6 × gyro magnitude)` while the phone moves. |
| Tilt | `sensorCombinations.js` `TiltCorrector` | Compensates gravity-vector tilt in the deflection. |
| Surface compression | `sensorCombinations.js` `VerticalAccel` | Z-axis signal from the surface compressing under load. |
| Resonance | `sensorCombinations.js` `PassiveResonance`, `FrequencyConsensus`; `channels/vibration-resonance.js` | Ambient-vibration FFT and cross-sensor resonance agreement. |
| Filtering | `kalman.js` | Adaptive (Sage-Husa) Kalman, a **300-particle** particle filter, complementary filter, median spike rejection, moving average, exponential smoothing, 2D Kalman, FFT. |
| Calibration | `scaleMath.js` `MultiPointCalibration` | Linear fit at 2 points, quadratic at 3 or more. |
| Thermal | `scaleMath.js` `TemperatureCompensator` | Learns and removes slow drift. |
| Claim | `verificationLedger.js` | The only thing allowed to state an accuracy. |

## What the evidence supports today

- Display resolution: **0.1 g**.
- Verified accuracy: **whatever your ledger says**. Earlier docs quoted
  ±0.1–0.5 g depending on device and surface; none of that is a promise.
- One calibration point cannot evidence curve accuracy. Use three or more
  reference masses before trusting a fine claim.

## Reference masses

US coins are usable for repeatability and linearity, but Mint tolerances
(dime ±0.091 g, penny ±0.100 g, nickel ±0.194 g, quarter ±0.227 g, dollar
±0.300 g) are as large as the accuracy being tested. Weigh your own coins once
on a 0.01 g scale, or use a calibration weight set, before claiming absolute
accuracy. See §10 of the PRD.

## Do not claim

- A neural-network corrector: none exists in `js/`.
- A 500-particle filter: the implementation uses 300.
- A barometer input: none exists.
- Camera, battery or magnetometer as accuracy sources: code for them exists
  (`cameraSensor.js`, `deviceCompat.js`, `telemetry.js`) but no ledger
  measurement shows they improve accuracy.

If any of these is added or proven, update this file in the same change.
