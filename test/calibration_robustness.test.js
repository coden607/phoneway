import { beforeEach, describe, expect, it } from 'vitest';

function installBrowserStubs() {
  const store = new Map();
  globalThis.window = globalThis.window || {};
  globalThis.localStorage = {
    getItem: (k) => store.has(k) ? store.get(k) : null,
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k)
  };
}

describe('settled multi-point calibration', () => {
  beforeEach(() => installBrowserStubs());

  it('refuses a rushed calibration before enough settled evidence exists', async () => {
    const { SimpleScale } = await import('../js/simpleScale.js');
    const scale = new SimpleScale();
    scale.baseline = { x: 0, y: 0, z: 9.8 };
    scale.filteredAccel = { x: 0.02, y: 0.01, z: 9.8 };
    const result = scale.calibrate(5);
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/not settled/i);
  });

  it('accepts a settled point and retains up to four distinct points', async () => {
    const { SimpleScale } = await import('../js/simpleScale.js');
    const scale = new SimpleScale();
    scale.baseline = { x: 0, y: 0, z: 9.8 };
    scale.motionBlocked = false;
    scale.motionQuality = 1;

    const seedSettled = (dx, dy) => {
      scale.maDx.reset(); scale.maDy.reset(); scale.stabilityCheck.reset();
      for (let i = 0; i < 100; i++) {
        const jitter = ((i % 5) - 2) * 0.000002;
        scale.maDx.update(dx + jitter);
        scale.maDy.update(dy - jitter);
        scale.stabilityCheck.update(5 + jitter);
      }
      scale._calibrationStableSince = Date.now() - 3000;
    };

    for (const [grams, dx, dy] of [[1,0.001,0.0002],[5,0.005,0.001],[10,0.010,0.002],[20,0.020,0.004]]) {
      seedSettled(dx, dy);
      const result = scale.calibrate(grams);
      expect(result.success).toBe(true);
    }

    const q = scale.getCalibrationQuality();
    expect(q.points).toBe(4);
    expect(scale.getCalibrationDiagnostics().pointCount).toBe(4);
    const saved = JSON.parse(globalThis.localStorage.getItem('phoneway_v4_calibration'));
    expect(saved.multiCal.points).toHaveLength(4);
  });
});
