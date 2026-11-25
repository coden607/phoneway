import { describe, it, expect } from 'vitest';
import { calStep2ButtonState, CAL_STEP2_FORCE_AFTER_MS } from '../js/calStep2.js';

// Regression test for the round-2 stall: Steve's iPhone SE 3 in Brave hung
// at "80/80" forever in guided calibration step 2. Samples were full but
// snr < 1.5 (a 5 g nickel on a hard surface barely deflects the phone), and
// the round-1 watchdog only offered an escape for no-sensor (0 samples) or
// snr >= 1.5 — so no branch fired and the button stayed disabled forever.
// The button must NEVER stay disabled forever in step 2: after the force
// timeout every stall state is enabled with a way forward.
const base = (over = {}) => ({
  ready: false,
  sampleCount: 80,
  snr: 0.8,
  stdDev: 0.01,
  stableMs: 0,
  reasons: ['reference load is too weak'],
  ...over,
});

describe('calStep2ButtonState', () => {
  it('enables the too-weak options button after the timeout with 80/80 samples and snr < 1.5', () => {
    const state = calStep2ButtonState(base(), CAL_STEP2_FORCE_AFTER_MS, 5);
    expect(state.kind).toBe('too-weak');
    expect(state.enabled).toBe(true);
    expect(state.label).toMatch(/TOO WEAK/);
  });

  it('never leaves the button disabled once the force timeout has passed', () => {
    const cases = [
      base({ sampleCount: 0, snr: 0, reasons: ['collecting sensor samples'] }),
      base({ sampleCount: 80, snr: 0.8 }),
      base({ sampleCount: 80, snr: 1.5, reasons: ['reading still bouncing'] }),
      base({ sampleCount: 80, snr: 8, reasons: ['reading still bouncing'] }),
      base({ ready: true, snr: 8, stableMs: 3000, reasons: [] }),
    ];
    for (const readiness of cases) {
      const state = calStep2ButtonState(readiness, CAL_STEP2_FORCE_AFTER_MS, 5);
      expect(state.enabled).toBe(true);
    }
  });

  it('keeps the button disabled before the timeout', () => {
    const state = calStep2ButtonState(base(), CAL_STEP2_FORCE_AFTER_MS - 1, 5);
    expect(state.enabled).toBe(false);
    expect(state.kind).toBe('settling');
  });

  it('shows the live readiness reason while settling and keeps the sample counter visible', () => {
    const state = calStep2ButtonState(base({ sampleCount: 42 }), 3000, 5);
    expect(state.enabled).toBe(false);
    expect(state.label).toBe('REFERENCE LOAD IS TOO WEAK · 42/80');
  });

  it('prefers ready, no-sensor and lock-anyway in their own states', () => {
    expect(calStep2ButtonState(base({ ready: true, snr: 8, stableMs: 3000, reasons: [] }), 0, 5).kind).toBe('ready');
    expect(calStep2ButtonState(base({ ready: true, snr: 8, stableMs: 3000, reasons: [] }), 0, 5).label).toBe('READY · LOCK 5g');
    expect(calStep2ButtonState(base({ sampleCount: 0, snr: 0 }), CAL_STEP2_FORCE_AFTER_MS, 5).kind).toBe('no-sensor');
    expect(calStep2ButtonState(base({ snr: 2.0, reasons: ['reading still bouncing'] }), CAL_STEP2_FORCE_AFTER_MS, 5).kind).toBe('lock-anyway');
    expect(calStep2ButtonState(base({ snr: 2.0, reasons: ['reading still bouncing'] }), CAL_STEP2_FORCE_AFTER_MS, 5).label).toBe('LOCK ANYWAY (5g · UNVERIFIED)');
  });
});
