import { describe, it, expect, beforeAll, vi, afterEach } from 'vitest';

// A real iPhone 14 recording on a towel showed: per-sample noise ~0.013 m/s^2,
// a tilt that crept ~5 degrees in a minute (about 50x a 5 g coin), and Safari
// pausing motion events for ~10 s. The uncertainty shown to the user must come
// from those measurable things, not from a formula that always says +/-0.1 g.
let SimpleScale;
const store = new Map();
let clock = 1_000_000;
beforeAll(async () => {
  globalThis.localStorage = { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => store.set(k, String(v)), removeItem: (k) => store.delete(k) };
  globalThis.window = { addEventListener() {}, removeEventListener() {}, dispatchEvent() {} };
  ({ SimpleScale } = await import('../js/simpleScale.js'));
});
afterEach(() => vi.restoreAllMocks());

function rng(seed) {
  let s = seed >>> 0;
  const r = () => (s = (1664525 * s + 1013904223) >>> 0) / 4294967296;
  return () => Math.sqrt(-2 * Math.log(Math.max(r(), 1e-12))) * Math.cos(2 * Math.PI * r());
}

function calibratedScale({ sigma = 0.013, deflection = 0.05, seed = 11 } = {}) {
  store.clear(); delete globalThis.window._phonewayCal;
  clock = 1_000_000;
  vi.spyOn(Date, 'now').mockImplementation(() => clock);
  const g = rng(seed);
  const s = new SimpleScale();
  s.active = true;
  let dx = 0;
  const feed = (n, dxAt = () => dx) => {
    for (let i = 0; i < n; i++) {
      clock += 16;
      s._handleMotion({ accelerationIncludingGravity: { x: dxAt(i) + sigma * g(), y: 0.1 + sigma * g(), z: 9.8 + sigma * g() }, acceleration: { x: 0, y: 0, z: 0 }, rotationRate: { alpha: 0, beta: 0, gamma: 0 } });
    }
  };
  feed(30);
  s._tare_in_progress = true; s._tare_started_at = Date.now(); s._tare_warmup_count = 0; s._tare_xs = []; s._tare_ys = []; s._tare_zs = [];
  feed(120);
  dx = deflection; feed(400);
  s.calibrate(5, { force: true });
  return { s, feed, setDx: (v) => { dx = v; }, advance: (ms) => { clock += ms; } };
}

describe('measured uncertainty', () => {
  it('is null until the scale is calibrated', () => {
    const s = new SimpleScale();
    expect(s.getMeasuredUncertainty()).toBeNull();
  });

  it('on a still surface it is noise-limited and a small fraction of the coin', () => {
    const { s, feed } = calibratedScale({ deflection: 0.3 });
    feed(900);
    const u = s.getMeasuredUncertainty();
    expect(u.state).toBe('noise-limited');
    expect(u.grams).toBeGreaterThan(0);
    expect(u.grams).toBeLessThan(1);
    expect(u.driftGramsPerSec).toBeLessThan(0.2);
  });

  it('a creeping surface is reported as settling with a much larger uncertainty', () => {
    const still = calibratedScale({ deflection: 0.3 });
    still.feed(900);
    const calm = still.s.getMeasuredUncertainty().grams;

    const creep = calibratedScale({ deflection: 0.3 });
    // tilt drifting steadily, like the soft surface in the real recording
    creep.feed(900, (i) => 0.3 + i * 0.0006);   // ~0.04 m/s^2 per second
    const u = creep.s.getMeasuredUncertainty();
    expect(u.state).toBe('settling');
    expect(u.driftGramsPerSec).toBeGreaterThan(0.2);
    expect(u.grams).toBeGreaterThan(calm * 3);
  });

  it('never reports +/-0.1 g just because the scale is calibrated', () => {
    // The old badge printed "+/-0.1g" for any calibrated scale. With this much
    // noise and no verification the honest figure is not 0.1 g.
    const { s, feed } = calibratedScale({ sigma: 0.013, deflection: 0.02 });
    feed(900);
    expect(s.getMeasuredUncertainty().grams).toBeGreaterThan(0.1);
  });

  it('drops its averages and says so when the sensor stream pauses', () => {
    const { s, feed, advance } = calibratedScale({ deflection: 0.3 });
    feed(300);
    expect(s.getMeasuredUncertainty().grams).not.toBeNull();
    advance(9800);                       // Safari stopped delivering events
    feed(2);
    const u = s.getMeasuredUncertainty();
    expect(u.state).toBe('sensor-paused');
    expect(u.grams).toBeNull();
    expect(s.isStable).toBe(false);
    // ...and it recovers by collecting fresh data, not by trusting the old.
    feed(10);
    expect(s.getMeasuredUncertainty().state).toBe('sensor-paused');   // still inside the 2 s hold
    feed(150);                                                          // ~2.4 s of new samples
    const after = s.getMeasuredUncertainty();
    expect(after.grams).not.toBeNull();
    expect(s.maDx.length).toBeLessThan(200);                            // only post-gap data is averaged
  });
});
