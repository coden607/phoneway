import { describe, it, expect } from 'vitest';
import { computeBudget } from '../scripts/noise-budget.mjs';

// Deterministic pseudo-noise so the expected figure is analytic, not lucky.
function lcg(seed) {
  let s = seed >>> 0;
  return () => { s = (1664525 * s + 1013904223) >>> 0; return s / 4294967296; };
}
function gaussian(rand) {
  const u = Math.max(rand(), 1e-12), v = rand();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}
function signal(n, mean, sigma, seed) {
  const r = lcg(seed);
  return Array.from({ length: n }, () => mean + sigma * gaussian(r));
}

describe('noise budget', () => {
  it('detection limit = 3 sigma / sensitivity', () => {
    const rest = signal(5000, 0, 0.002, 1);
    const b = computeBudget({ restSamples: rest, sensitivityPerGram: 0.02 });
    // sigma ~0.002 -> 3*0.002/0.02 = 0.3 g
    expect(b.noiseStdDev).toBeGreaterThan(0.0019);
    expect(b.noiseStdDev).toBeLessThan(0.0021);
    expect(b.minResolvableGrams).toBeGreaterThan(0.28);
    expect(b.minResolvableGrams).toBeLessThan(0.32);
    expect(b.reaches0p1g).toBe(false);
  });

  it('says 0.1 g is reachable only when the limit is under 0.1 g', () => {
    const quiet = signal(5000, 0, 0.0004, 2);
    const b = computeBudget({ restSamples: quiet, sensitivityPerGram: 0.02 });
    expect(b.minResolvableGrams).toBeLessThan(0.1);
    expect(b.reaches0p1g).toBe(true);
  });

  it('refuses zero or negative sensitivity instead of dividing by zero', () => {
    const rest = signal(100, 0, 0.001, 3);
    expect(() => computeBudget({ restSamples: rest, sensitivityPerGram: 0 })).toThrow(/sensitivity/i);
    expect(() => computeBudget({ restSamples: rest, sensitivityPerGram: -1 })).toThrow(/sensitivity/i);
  });

  it('refuses too few samples to estimate noise', () => {
    expect(() => computeBudget({ restSamples: [0.1, 0.2], sensitivityPerGram: 0.02 })).toThrow(/samples/i);
  });

  it('refuses non-finite samples rather than hiding them', () => {
    const rest = signal(100, 0, 0.001, 4);
    rest[10] = NaN;
    expect(() => computeBudget({ restSamples: rest, sensitivityPerGram: 0.02 })).toThrow(/finite/i);
  });

  it('averaging N readings improves the limit by sqrt(N)', () => {
    const rest = signal(5000, 0, 0.002, 5);
    const one = computeBudget({ restSamples: rest, sensitivityPerGram: 0.02 });
    const avg = computeBudget({ restSamples: rest, sensitivityPerGram: 0.02, averagedReadings: 16 });
    expect(avg.minResolvableGrams).toBeCloseTo(one.minResolvableGrams / 4, 3);
  });
});

import { analyzeLoadTest } from '../js/noiseBudget.js';

function vecs(n, base, sigma, seed) {
  const r = lcg(seed);
  return Array.from({ length: n }, () => base.map((b) => b + sigma * gaussian(r)));
}

describe('analyzeLoadTest', () => {
  it('finds sensitivity from the shift per gram and noise along that axis', () => {
    // Placing 5 g shifts z by 0.1 -> sensitivity 0.02 per gram; sigma 0.002 -> 0.3 g
    const rest = vecs(3000, [0.1, -0.2, 9.8], 0.002, 11);
    const loaded = vecs(3000, [0.1, -0.2, 9.9], 0.002, 12);
    const b = analyzeLoadTest({ restVectors: rest, loadedVectors: loaded, grams: 5 });
    expect(b.sensitivityPerGram).toBeGreaterThan(0.0195);
    expect(b.sensitivityPerGram).toBeLessThan(0.0205);
    expect(b.minResolvableGrams).toBeGreaterThan(0.27);
    expect(b.minResolvableGrams).toBeLessThan(0.33);
    expect(b.reaches0p1g).toBe(false);
  });

  it('uses whichever axis actually moved, not a fixed one', () => {
    const rest = vecs(3000, [0, 0, 9.8], 0.002, 21);
    const loaded = vecs(3000, [0.1, 0, 9.8], 0.002, 22);   // moved on x
    const b = analyzeLoadTest({ restVectors: rest, loadedVectors: loaded, grams: 5 });
    expect(b.sensitivityPerGram).toBeGreaterThan(0.0195);
    expect(b.sensitivityPerGram).toBeLessThan(0.0205);
  });

  it('refuses when nothing moved rather than inventing a sensitivity', () => {
    const rest = vecs(100, [0, 0, 9.8], 0, 31);
    expect(() => analyzeLoadTest({ restVectors: rest, loadedVectors: rest, grams: 5 }))
      .toThrow(/shift/i);
  });

  it('refuses bad mass and malformed samples', () => {
    const rest = vecs(100, [0, 0, 9.8], 0.001, 41);
    expect(() => analyzeLoadTest({ restVectors: rest, loadedVectors: rest, grams: 0 })).toThrow(/grams/i);
    expect(() => analyzeLoadTest({ restVectors: [[1, 2]], loadedVectors: rest, grams: 5 })).toThrow(/samples/i);
    const bad = vecs(100, [0, 0, 9.8], 0.001, 42); bad[3] = [0, NaN, 0];
    expect(() => analyzeLoadTest({ restVectors: bad, loadedVectors: rest, grams: 5 })).toThrow(/finite/i);
  });
});
