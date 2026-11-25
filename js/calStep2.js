'use strict';

/**
 * calStep2.js — pure decision helper for the guided-calibration step-2
 * action button (round 2).
 *
 * The walkthrough button must NEVER stay disabled forever in step 2: every
 * stall state gets a visible, tappable way forward within 10 s of waiting.
 * The readiness gate (80 samples, 2.5 s steady hold, snr >= 6 for a clean
 * lock) is unchanged — this helper only decides what the button says and
 * whether it is tappable, from the live readiness snapshot.
 *
 * Kinds:
 *  - 'ready'       — signal is settled and strong; lock the weight.
 *  - 'no-sensor'   — no motion samples at all after the timeout; exit.
 *  - 'lock-anyway' — signal exists and is usable-ish (snr >= 1.5) after the
 *                    timeout; lock with an UNVERIFIED warning.
 *  - 'too-weak'    — samples exist but snr < 1.5 after the timeout: a 5 g
 *                    nickel on a hard surface barely deflects the phone, so
 *                    the signal is lost in accelerometer noise. The button
 *                    opens the options (guidance + LOCK ANYWAY / EXIT)
 *                    instead of sitting disabled at "80/80" forever.
 *  - 'settling'    — still inside the timeout window; disabled, but the
 *                    label names the live readiness reason (readiness
 *                    .reasons[0]) and keeps the sample counter visible, so
 *                    the user can see WHY it is stuck.
 */
export const CAL_STEP2_FORCE_AFTER_MS = 10000;

export function calStep2ButtonState(readiness, elapsedMs, calWeightG, forceAfterMs = CAL_STEP2_FORCE_AFTER_MS) {
  const sampleCount = readiness.sampleCount || 0;
  const snr = readiness.snr || 0;
  if (readiness.ready) {
    return { enabled: true, kind: 'ready', label: `READY · LOCK ${calWeightG}g` };
  }
  if (sampleCount === 0 && elapsedMs >= forceAfterMs) {
    return { enabled: true, kind: 'no-sensor', label: 'NO SENSOR DATA — TAP TO EXIT' };
  }
  if (elapsedMs >= forceAfterMs && snr >= 1.5) {
    return { enabled: true, kind: 'lock-anyway', label: `LOCK ANYWAY (${calWeightG}g · UNVERIFIED)` };
  }
  if (elapsedMs >= forceAfterMs && sampleCount > 0) {
    return { enabled: true, kind: 'too-weak', label: 'SIGNAL TOO WEAK — TAP FOR OPTIONS' };
  }
  const reason = (readiness.reasons && readiness.reasons[0]) || 'hold still';
  return { enabled: false, kind: 'settling', label: `${reason.toUpperCase()} · ${sampleCount}/80` };
}
