---
name: verify
description: Measure a known reference weight and record the error in the verification ledger — the only legitimate source of accuracy claims.
---

# verify

Turn "I think it's accurate" into "the ledger measured ±Xg".

1. Calibrate first (`calibrate` skill). Verification against a bad curve measures nothing useful.
2. Choose a reference with a trustworthy mass (nickel 5.000g ±0.008g is best; penny 2.500g; quarter 5.670g).
3. Tare empty, place the reference, and run `SimpleScale.verifyAgainstKnown(referenceGrams)` (or the VERIFY button).
4. Each run appends `{timestamp, referenceWeight, measuredError, deviceModel}` to the ledger (`localStorage: phoneway_v5_ledger`).
5. The public claim = worst |measuredError| of the last 5 records, rounded UP to the next 0.1g. Check it: `ledger.accuracyClaim()`.
6. Empty ledger → claim is "UNVERIFIED". Say so. Do not improvise a number.
7. Trend worsening across verifies? Stop claiming, run `diagnose`, then recalibrate and re-verify.

Rule: any ±Xg text anywhere in product or docs must trace to the ledger. If it doesn't, it's a bug.
