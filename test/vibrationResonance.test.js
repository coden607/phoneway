import { describe, it, expect } from 'vitest';
import {
  resonanceMassGrams,
  findResonantPeakHz,
  excitationPlan,
  estimateFromRing,
  calibratePhoneMass,
  VibrationResonanceChannel,
  CALIBRATION_STORAGE_KEY,
  SETTLE_MS,
  SAMPLE_WINDOW_MS,
} from '../js/channels/vibration-resonance.js';

/* ── helpers ─────────────────────────────────────────────── */

/** Pure-sine accel-magnitude ring sampled at 60 Hz. */
function makeRing(freqHz, n = 512, amp = 1, base = 9.81) {
  const ring = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    ring[i] = base + amp * Math.sin((2 * Math.PI * freqHz * i) / 60);
  }
  return ring;
}

/** One-sided power spectrum magnitudes of a real signal ring. */
function spectrumOf(ring, sampleRateHz = 60) {
  const n = ring.length;
  const re = new Float64Array(n);
  const im = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    const w = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (n - 1)));
    re[i] = ring[i] * w;
  }
  // local radix-2 FFT (same routine the channel uses)
  return fftMagnitudes(re, im, n, sampleRateHz);
}

function fftMagnitudes(re, im, n, sampleRateHz) {
  // iterative bit-reversal FFT (copy of kalman.js fft, kept inline to avoid import cycle in tests)
  let j = 0;
  for (let i = 1; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      [re[i], re[j]] = [re[j], re[i]];
      [im[i], im[j]] = [im[j], im[i]];
    }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = (-2 * Math.PI) / len;
    const wRe = Math.cos(ang);
    const wIm = Math.sin(ang);
    for (let i = 0; i < n; i += len) {
      let cRe = 1, cIm = 0;
      const half = len >> 1;
      for (let k = 0; k < half; k++) {
        const uRe = re[i + k], uIm = im[i + k];
        const vRe = re[i + k + half] * cRe - im[i + k + half] * cIm;
        const vIm = re[i + k + half] * cIm + im[i + k + half] * cRe;
        re[i + k] = uRe + vRe;
        im[i + k] = uIm + vIm;
        re[i + k + half] = uRe - vRe;
        im[i + k + half] = uIm - vIm;
        const nRe = cRe * wRe - cIm * wIm;
        cIm = cRe * wIm + cIm * wRe;
        cRe = nRe;
      }
    }
  }
  const half = n / 2;
  const mags = new Float64Array(half);
  for (let i = 0; i < half; i++) mags[i] = Math.hypot(re[i], im[i]) / half;
  return { mags, binHz: sampleRateHz / n };
}

function mockStorage() {
  const map = new Map();
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, String(v)),
    removeItem: (k) => map.delete(k),
    _map: map,
  };
}

/* ── resonanceMassGrams ──────────────────────────────────── */

describe('resonanceMassGrams', () => {
  it('known physics: 25 Hz → 20 Hz shift on 170 g phone ≈ 95.6 g added', () => {
    // f_loaded = f_empty·√(m/(m+x)) ⇒ x = m·((f_e/f_l)²−1)
    expect(resonanceMassGrams(25, 20, 170)).toBeCloseTo(95.625, 3);
  });

  it('no shift → zero added mass', () => {
    expect(resonanceMassGrams(25, 25, 170)).toBe(0);
  });

  it('upward shift (lighter) → zero, never negative', () => {
    expect(resonanceMassGrams(25, 30, 170)).toBe(0);
  });

  it('rejects non-finite and non-positive inputs', () => {
    expect(resonanceMassGrams(NaN, 20, 170)).toBe(0);
    expect(resonanceMassGrams(25, NaN, 170)).toBe(0);
    expect(resonanceMassGrams(25, 20, NaN)).toBe(0);
    expect(resonanceMassGrams(0, 20, 170)).toBe(0);
    expect(resonanceMassGrams(25, 0, 170)).toBe(0);
    expect(resonanceMassGrams(25, 20, 0)).toBe(0);
    expect(resonanceMassGrams(-5, 20, 170)).toBe(0);
  });
});

/* ── findResonantPeakHz ──────────────────────────────────── */

describe('findResonantPeakHz', () => {
  it('recovers a 20 Hz sinusoid from a 512-sample @ 60 Hz ring', () => {
    const { mags } = spectrumOf(makeRing(20));
    const peak = findResonantPeakHz(mags, 60);
    expect(peak).not.toBeNull();
    expect(peak.freqHz).toBeGreaterThan(19);
    expect(peak.freqHz).toBeLessThan(21);
    expect(peak.snrDb).toBeGreaterThan(10);
  });

  it('flat spectrum (no resonance) → null', () => {
    const mags = new Float64Array(256).fill(1);
    expect(findResonantPeakHz(mags, 60)).toBeNull();
  });

  it('out-of-band peaks are ignored', () => {
    // synthetic spectrum: floor 1.0 everywhere, spike below F_MIN_HZ
    const mags = new Float64Array(256).fill(1.0);
    mags[10] = 500; // 10 bins × 0.234 Hz ≈ 2.3 Hz — below the 5 Hz search band
    expect(findResonantPeakHz(mags, 120)).toBeNull();
    // same spike inside the band IS found
    mags[100] = 500; // ≈ 23.4 Hz — inside band; now dominant
    const peak = findResonantPeakHz(mags, 120);
    expect(peak).not.toBeNull();
    expect(peak.freqHz).toBeGreaterThan(20);
    expect(peak.freqHz).toBeLessThan(27);
  });

  it('rejects garbage inputs', () => {
    expect(findResonantPeakHz([], 60)).toBeNull();
    expect(findResonantPeakHz(new Float64Array(64), NaN)).toBeNull();
    expect(findResonantPeakHz(new Float64Array(64), 0)).toBeNull();
  });
});

/* ── calibratePhoneMass ──────────────────────────────────── */

describe('calibratePhoneMass', () => {
  it('recovers phone mass from a known reference weight', () => {
    // true phone 170 g, add 50 g: f_l = f_e·√(170/220)
    const fE = 25;
    const fL = fE * Math.sqrt(170 / 220);
    expect(calibratePhoneMass(fE, fL, 50)).toBeCloseTo(170, 0);
  });

  it('tiny shift → null (untrustworthy)', () => {
    expect(calibratePhoneMass(25, 24.99, 50)).toBeNull();
  });

  it('nonsense masses rejected', () => {
    expect(calibratePhoneMass(25, 20, 0)).toBeNull();
    expect(calibratePhoneMass(25, 10, 1)).toBeNull(); // would imply >1000 g phone
  });
});

/* ── estimateFromRing ────────────────────────────────────── */

describe('estimateFromRing', () => {
  it('full pipeline: shifted peak → mass estimate with confidence', () => {
    // baseline 25 Hz empty; loaded ring rings at 22 Hz
    const ring = makeRing(22);
    const est = estimateFromRing(ring, 60, { baselineHz: 25, phoneMassG: 170 });
    expect(est).not.toBeNull();
    const expected = 170 * (Math.pow(25 / est.fLoadedHz, 2) - 1);
    expect(est.grams).toBeCloseTo(expected, 6);
    expect(est.grams).toBeGreaterThan(0);
    expect(est.confidence).toBeGreaterThan(0);
    expect(est.confidence).toBeLessThanOrEqual(0.8);
  });

  it('no calibration → null (honest unusable)', () => {
    expect(estimateFromRing(makeRing(20), 60, null)).toBeNull();
  });

  it('rejects non-power-of-two and short rings', () => {
    const cal = { baselineHz: 25, phoneMassG: 170 };
    expect(estimateFromRing(new Float64Array(100), 60, cal)).toBeNull();
    expect(estimateFromRing(new Float64Array(32), 60, cal)).toBeNull();
  });
});

/* ── excitationPlan ──────────────────────────────────────── */

describe('excitationPlan', () => {
  it('is deterministic and alternates pulse/gap', () => {
    const a = excitationPlan();
    const b = excitationPlan();
    expect(a).toEqual(b);
    expect(a.length).toBe(20); // 10 pulses × (on, off)
    expect(a[0]).toBeGreaterThan(0);
    expect(a[1]).toBeGreaterThan(0);
  });
});

/* ── channel lifecycle (injected sensors, no hardware) ───── */

describe('VibrationResonanceChannel lifecycle', () => {
  function makeChannel(storage) {
    let motionCb = null;
    const sensorAccess = {
      vibrate: () => true,
      onMotion: (cb) => { motionCb = cb; },
      offMotion: (cb) => { expect(cb).toBe(motionCb); motionCb = null; },
    };
    const ch = new VibrationResonanceChannel({ storage });
    return { ch, sensorAccess, feed: (evt) => motionCb && motionCb(evt) };
  }

  function fillRing(feed, freqHz, n = 512) {
    for (let i = 0; i < n; i++) {
      const z = 9.81 + Math.sin((2 * Math.PI * freqHz * i) / 60);
      feed({ accelerationIncludingGravity: { x: 0, y: 0, z } });
    }
  }

  it('start → fill → calibrateEmpty → estimate → stop, full loop', () => {
    const storage = mockStorage();
    const { ch, sensorAccess, feed } = makeChannel(storage);

    expect(ch.start(sensorAccess)).toBe(true);
    expect(ch.running).toBe(true);
    ch.excite();

    fillRing(feed, 25);           // empty-phone baseline at 25 Hz
    expect(ch.calibrateEmpty(170)).toBe(true);
    expect(storage.getItem(CALIBRATION_STORAGE_KEY)).toBeTruthy();

    fillRing(feed, 22);           // loaded: shifted down
    const est = ch.estimate();
    expect(est).not.toBeNull();
    expect(est.grams).toBeGreaterThan(0);
    expect(est.unitsNote).toContain('Hz');
    expect(est.confidence).toBeGreaterThan(0);

    ch.stop();
    expect(ch.running).toBe(false);
    expect(ch.estimate()).toBeNull(); // stopped → unusable
  });

  it('estimate before ring is full → null', () => {
    const { ch, sensorAccess, feed } = makeChannel(mockStorage());
    ch.start(sensorAccess);
    fillRing(feed, 25, 100); // only 100 of 512
    expect(ch.estimate()).toBeNull();
    ch.stop();
  });

  it('start without any sensor access → false', () => {
    const ch = new VibrationResonanceChannel({ storage: mockStorage() });
    // Node test env has no navigator.vibrate and we pass empty access
    const savedNav = globalThis.navigator;
    try {
      // simulate absence of vibration API even if a jsdom-like global exists
      expect(ch.start({ vibrate: null, onMotion: null })).toBe(false);
    } finally {
      void savedNav;
    }
  });

  it('calibration persists across channel instances', () => {
    const storage = mockStorage();
    const a = new VibrationResonanceChannel({ storage });
    a.saveCalibration(25.4, 168);
    const b = new VibrationResonanceChannel({ storage });
    const cal = b.loadCalibration();
    expect(cal.baselineHz).toBeCloseTo(25.4);
    expect(cal.phoneMassG).toBe(168);
  });

  it('corrupt calibration JSON → null, not throw', () => {
    const storage = mockStorage();
    storage.setItem(CALIBRATION_STORAGE_KEY, '{not json');
    const ch = new VibrationResonanceChannel({ storage });
    expect(ch.loadCalibration()).toBeNull();
  });
});

/* ── fuzz ────────────────────────────────────────────────── */

describe('fuzz: deflection math stays finite and monotonic', () => {
  // Simple seeded PRNG (deterministic — failures reproduce)
  function mulberry32(seed) {
    return function () {
      let t = (seed += 0x6d2b79f5);
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  it('500 random (f_empty, f_loaded, phoneMass) → finite, ≥ 0', () => {
    const rnd = mulberry32(42);
    for (let i = 0; i < 500; i++) {
      const fE = 5 + rnd() * 40;
      const fL = fE * (0.5 + rnd() * 0.5);
      const mP = 80 + rnd() * 220;
      const g = resonanceMassGrams(fE, fL, mP);
      expect(Number.isFinite(g)).toBe(true);
      expect(g).toBeGreaterThanOrEqual(0);
    }
  });

  it('monotonic: lower loaded freq → never lighter', () => {
    const fE = 30, mP = 170;
    let prev = -Infinity;
    for (let fL = 29.5; fL >= 5; fL -= 0.37) {
      const g = resonanceMassGrams(fE, fL, mP);
      expect(g).toBeGreaterThanOrEqual(prev - 1e-9);
      prev = g;
    }
  });

  it('fuzz findResonantPeakHz against noisy synthetic spectra', () => {
    const rnd = mulberry32(7);
    for (let i = 0; i < 60; i++) {
      const f = 8 + rnd() * 30;
      const n = 512;
      const re = new Float64Array(n);
      const im = new Float64Array(n);
      for (let k = 0; k < n; k++) {
        const noise = (rnd() - 0.5) * 0.05;
        re[k] = (9.81 + Math.sin((2 * Math.PI * f * k) / 60) + noise) *
                0.5 * (1 - Math.cos((2 * Math.PI * k) / (n - 1)));
      }
      for (let k = 0; k < n / 2; k++) im[k] = 0;
      const { mags } = fftMagnitudes(re, im, n, 60);
      const peak = findResonantPeakHz(mags, 60);
      if (peak) {
        expect(Number.isFinite(peak.freqHz)).toBe(true);
        expect(peak.freqHz).toBeGreaterThan(5);
        expect(peak.freqHz).toBeLessThan(45);
      }
      // null is also legal when SNR gate fails — just no crash/NaN
    }
  });

  it('constants exported for the app wiring', () => {
    expect(SETTLE_MS).toBeGreaterThan(0);
    expect(SAMPLE_WINDOW_MS).toBeGreaterThan(SETTLE_MS);
  });
});
