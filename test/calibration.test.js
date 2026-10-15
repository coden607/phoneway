import { describe, it, expect, beforeAll } from 'vitest';

// SimpleScale reads window/localStorage; give it minimal stand-ins (node env).
let SimpleScale;
const store = new Map();
beforeAll(async () => {
  globalThis.localStorage = {
    getItem: (k) => store.get(k) ?? null,
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
  };
  globalThis.window = { addEventListener() {}, removeEventListener() {}, dispatchEvent() {} };
  ({ SimpleScale } = await import('../js/simpleScale.js'));
});

function rng(seed) {
  let s = seed >>> 0;
  const r = () => (s = (1664525 * s + 1013904223) >>> 0) / 4294967296;
  return () => Math.sqrt(-2 * Math.log(Math.max(r(), 1e-12))) * Math.cos(2 * Math.PI * r());
}

// Rest, tare, load a 5 g coin, calibrate, then remove and replace the coin.
function session({ sigma, deflection, seed = 7 }) {
  const gauss = rng(seed);
  store.clear();                 // a fresh phone has no saved calibration
  delete globalThis.window._phonewayCal;
  const s = new SimpleScale();
  s.active = true;
  let dx = 0;
  const feed = (n) => {
    for (let i = 0; i < n; i++) {
      s._handleMotion({
        accelerationIncludingGravity: { x: dx + sigma * gauss(), y: 0.1 + sigma * gauss(), z: 9.8 + sigma * gauss() },
        acceleration: { x: 0, y: 0, z: 0 },
        rotationRate: { alpha: 0, beta: 0, gamma: 0 },
      });
    }
  };
  feed(30);
  s._tare_in_progress = true; s._tare_started_at = Date.now();
  s._tare_warmup_count = 0; s._tare_xs = []; s._tare_ys = []; s._tare_zs = [];
  feed(120);
  dx = deflection; feed(200);
  const cal = s.calibrate(5);
  const out = { cal, scale: s };
  if (!cal.success) return out;
  feed(300); out.withCoin = s.displayWeight;
  dx = 0; feed(400); out.removed = s.displayWeight;
  dx = deflection; feed(500); out.replaced = s.displayWeight;
  return out;
}

const SEEDS = Array.from({ length: 20 }, (_, i) => (i + 1) * 7919);
const median = (a) => a.slice().sort((x, y) => x - y)[Math.floor(a.length / 2)];

// Results depend on the random noise, so every claim here is over 20 seeds.
// Regression background: calibrate() used to refill its average from ONE sample,
// giving 4.6 g / 3.26 g for a 5 g coin at moderate signal levels, and it would
// calibrate on pure noise, so readings sat near zero after calibration.
describe('calibration from the settled average', () => {
  it('reads the reference weight back to about 0.1 g on a strong signal', () => {
    for (const seed of SEEDS) {
      const r = session({ sigma: 0.003, deflection: 0.05, seed });
      expect(r.cal.success).toBe(true);
      expect(Math.abs(r.withCoin - 5)).toBeLessThan(0.25);
      expect(Math.abs(r.replaced - 5)).toBeLessThan(0.25);
      expect(r.removed).toBeLessThan(0.25);
    }
  });

  it('stays within a fraction of a gram on a moderate signal', () => {
    const errors = [];
    for (const seed of SEEDS) {
      const r = session({ sigma: 0.003, deflection: 0.01, seed });
      expect(r.cal.success).toBe(true);
      errors.push(Math.max(Math.abs(r.withCoin - 5), Math.abs(r.replaced - 5)));
      expect(r.removed).toBeLessThan(1);
    }
    expect(median(errors)).toBeLessThan(0.4);
    expect(Math.max(...errors)).toBeLessThan(1.0);
  });

  it('reports the error it expects from its own signal-to-noise', () => {
    const r = session({ sigma: 0.003, deflection: 0.01, seed: SEEDS[0] });
    expect(r.cal.expectedErrorGrams).toBeGreaterThan(0);
    expect(r.cal.accuracy).toMatch(/UNVERIFIED/);
    expect(r.cal.accuracy).toMatch(/\+\/-/);
  });

  it('never blocks calibration, and labels a weak signal honestly', () => {
    // Regression: a hard refusal left weak-signal setups with no way to use the
    // scale at all. Calibration must proceed and say how far to trust it.
    let labelled = 0;
    for (const seed of SEEDS) {
      const r = session({ sigma: 0.003, deflection: 0.0005, seed });
      expect(r.cal.success).toBe(true);
      expect(r.scale.calibrated).toBe(true);
      if (r.cal.confidence === 'low' || r.cal.confidence === 'noise') {
        labelled++;
        expect(r.cal.accuracy).toMatch(/LOW CONFIDENCE|NOT RELIABLE/);
      }
    }
    expect(labelled).toBeGreaterThanOrEqual(17);
  });

  it('rates a strong signal high confidence and a moderate one at least medium', () => {
    expect(session({ sigma: 0.003, deflection: 0.05 }).cal.confidence).toBe('high');
    const m = session({ sigma: 0.003, deflection: 0.01 }).cal.confidence;
    expect(['high', 'medium']).toContain(m);
  });
});
