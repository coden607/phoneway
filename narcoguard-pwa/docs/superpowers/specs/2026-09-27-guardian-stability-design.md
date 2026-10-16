# Guardian stability, needs and planning — design

**Status:** Approved for implementation by the founder's September 27 request to implement, commit and push. **Scope:** first usable opt-in release plus documented integration boundaries.

## Purpose

Help a person meet needs they choose to track, plan the next day, find credible local services, notice patterns in their own entries, and take a chosen supportive action. The person defines independence and goals. No service guarantees a need is met or prevents relapse.

## First release

- A separate Guardian Stability dashboard linked from the main PWA, available in demo mode without an account. Explicitly opt in before writing any needs or goals. Show a prominent pause and erase control.
- User-entered daily status for food, water, sleep, hygiene, laundry, safe place, connection and treatment. Unanswered means unknown. Sleep is self-reported, not inferred from an absent entry or a wearable.
- User-controlled next-day plan and goals, with simple completed state. The app offers food planning when the user marks food as needing attention; it does not invent urgency.
- Resource paths keyed to the chosen need and optional postal code, opening a current 211 directory search or a direct official benefits/treatment application. Label external sites, ask the user to verify hours/eligibility, and never claim a place is open or someone qualifies for SNAP.
- Show descriptive within-person pattern counts only when there are at least five answered instances of the specified antecedent: e.g. "3 of 10 days marked breakfast missed also marked connection needed." No causal inference or relapse prediction. Present smaller samples as insufficient history. Do not derive a percent from missing values.
- A user-specified support person's telephone number can yield a tap-to-call action. Do not send or disclose personal data to a third party automatically in this release.

## Later integrations and evidence gates

Live resource cards with hours and eligibility require an authorized 211 API partnership and verification/staleness handling. Automatic loved-one alerts require authenticated identities, revocable per-recipient and per-trigger consent, message previews, delivery audit, and abuse review. Background geofences require separate permission and an explicit per-place user rule. Wearable sleep signals require device validation. Predictive relapse probabilities require prospective validation, calibration, clinical and lived-experience review, monitoring for bias, and an abstain state when data is insufficient. None of these claims or functions ship in the initial release.

## Data and safeguards

All first-release entries remain in local browser storage under a separate key, with no account synchronization. Explain that losing the browser data erases the history, that another person with browser access may see it, and that the app must not be treated as an emergency responder. The feature is off until enabled and can be paused; clearing all Guardian data is separate from emergency preferences. Avoid logging personal entries, contacts and location. Existing emergency behavior is untouched.

## Acceptance

Check-ins, sleep, planning, pausing, erasing, valid resource links and descriptive summaries work in demo mode on mobile. Existing emergency paths remain unchanged. Unit tests cover missing entries, limited sample sizes, day boundaries, pause and deletion. Full `npm run verify` passes before any review push. Do not deploy production without the repo's required immediate confirmation.
