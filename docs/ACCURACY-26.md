# PhoneWeigh Accuracy Enhancement Pack — 26 controls

This batch is intentionally conservative: it improves repeatability and calibration evidence without claiming that a phone is a laboratory balance. A 0.1 g display step is not a guaranteed 0.1 g accuracy.

## Implemented / enforced in the measurement path

1. Minimum 80 settled samples before calibration capture.
2. Continuous 2.5 s stable-hold requirement.
3. No timer-only calibration auto-lock.
4. No 1.2 s manual bypass of an unstable calibration.
5. Calibration load SNR gate (>= 6).
6. Motion-quality gate during calibration.
7. Stability-window gate during calibration.
8. Calibration readiness reasons shown to the user.
9. Guided 3-point calibration supported.
10. Guided 4-point calibration supported.
11. Distinct calibration masses retained rather than replacing the whole curve.
12. Calibration points persisted in localStorage.
13. Calibration points restored across browser sessions.
14. Four-point calibration automatically enables the quadratic fit already supported by MultiPointCalibration.
15. Calibration diagnostics expose point count, fit, range and last readiness state.
16. Heavier/different next reference weight is requested after each point until four points are stored.
17. Quick Cal uses the same conservative workflow instead of a fixed-delay shortcut.
18. 90-sample live stability window to reduce false stability.
19. Tighter calibrated stability threshold.
20. Longer stable confirmation before the STABLE state.
21. Lower-alpha weight EMA for sensor-noise rejection.
22. More conservative adaptive Kalman tuning.
23. Separate display EMA so visual smoothing does not falsify the raw stability test.
24. 0.05 g display hysteresis to suppress digit chatter.
25. Per-sample display slew limit to suppress implausible transient jumps.
26. Existing sensor-gap, drift/creep, verification-ledger and measured-uncertainty gates remain authoritative and are not bypassed by the smoother display.

## Acceptance

- A calibration point cannot be captured merely because a fixed timer elapsed.
- Three and four distinct known masses can coexist in the stored calibration curve.
- Reloading the browser retains calibration points, while the live zero baseline is still re-tared.
- Display smoothing never marks an unstable raw signal as stable.
- Public accuracy remains bounded by real verification evidence.
