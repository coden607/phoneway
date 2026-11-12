# PIV — Maximum Practical Accuracy

## Goal

Drive PhoneWeigh toward the best repeatable physical measurement the phone/surface combination can actually support, while refusing to convert display resolution or synthetic-test precision into unsupported accuracy claims.

## Plan

### P — Plan

1. Build a reproducible calibration ladder.
   - Preferred 5-point set: certified 1 g, 2 g, 5 g, 10 g, 20 g weights.
   - Household fallback: use *nominal* references only and carry larger uncertainty. Favor a spread such as ~1 g, 2.5 g, 5 g, 10 g, 20+ g rather than clustered masses.
   - US coins may be convenient nominal references, but wear/manufacturing tolerance means they are not substitutes for individually certified weights.
   - A dollar bill is approximately 1 g, but moisture/wear makes it a weak precision reference.
   - Do not advertise a paperclip or other household item as a 0.1 g standard. Common paperclips are not standardized to 0.1 g.

2. Make calibration evidence-aware.
   - Store nominal mass, tolerance/uncertainty, provenance, timestamp, device/surface context, and repeated captures per reference.
   - Fit with uncertainty-aware weighting.
   - Require broad coverage across the intended weighing range.
   - Validate each point by leave-one-out residuals before accepting a nonlinear fit.
   - Enforce monotonic mass-vs-deflection behavior and flag extrapolation.

3. Improve the estimator without double-counting correlated signals.
   - Independent/partly-independent channels: gravity-vector deflection, calibrated 1-D projection, vertical acceleration, gyro stillness, passive resonance, and any validated camera/audio channel.
   - Multiple mathematical transforms of the same accelerometer are *not* independent sensors. Treat them as an estimator bank and account for covariance/disagreement rather than blindly averaging.
   - Learn fusion weights only from held-out real-device traces/verification, with a fallback robust median/weighted consensus.

4. Treat filtering as an empirical model-selection problem.
   - Kalman is not universally best for this workload.
   - Benchmark: median/Hampel spike rejection, EMA/low-pass, adaptive Kalman, median-of-means, trimmed mean, Savitzky-Golay (only where it does not ring across load steps), and robust M-estimators.
   - Preserve real placement/removal steps; reject isolated spikes.
   - Use Allan deviation / time-scale analysis to choose the best averaging window per device/surface instead of fixing one globally.

### I — Implement

Ordered PR slices:

1. Reference provenance + uncertainty schema.
2. Certified 5-point calibration preset (1/2/5/10/20 g).
3. Household fallback preset with conservative uncertainty labels.
4. Reference-combination builder for coin stacks.
5. Repeated-capture-per-point calibration (median-of-means).
6. Weighted least-squares calibration using reference uncertainty.
7. Leave-one-out calibration validation.
8. Monotonic calibration constraint.
9. Calibrated-range/extrapolation guard.
10. Step-preserving Hampel/robust outlier filter.
11. Filter-bank benchmark harness on recorded traces.
12. Allan-deviation averaging-window selector.
13. Covariance-aware estimator fusion.
14. Sensor disagreement gate.
15. Vertical-acceleration channel qualification.
16. Passive-resonance channel qualification.
17. Orientation-change invalidation.
18. Surface-fingerprint change invalidation.
19. Blind repeated-placement verification protocol.
20. Device-of-record release evidence bundle.

### V — Validate

Every PR:
- static integrity/check
- unit tests
- synthetic accuracy tests
- browser E2E/Lighthouse where browser-facing
- offline/PWA smoke where service-worker paths change
- exact-head CI green before merge

Measurement PRs additionally require:
- holdout trace replay not used to tune the implementation
- step placement/removal cases
- noisy/creeping surface cases
- sensor-gap cases
- multiple load magnitudes
- no regression in zero return after weight removal

Final physical acceptance:
- at least 5 distinct reference masses spanning the intended range
- repeated remove/replace cycles at each mass
- held-out verification masses not used to fit calibration
- recorded worst-case absolute error, MAE, RMSE, bias, repeatability, drift, and uncertainty calibration
- publish only the observed device/surface result; never infer universal ±0.1 g

## Decision rules

- Prefer certified calibration weights over household objects whenever practical.
- Five well-spaced, trustworthy points beat five convenient but uncertain objects.
- More sensor estimates help only when they add independent information or demonstrably reduce held-out error.
- Never average disagreement away. Large disagreement is a reason to withhold a reading.
- Select filters by held-out physical error and settling behavior, not by algorithm reputation.
