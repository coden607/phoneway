import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

let SimpleScale;

beforeAll(async () => {
  globalThis.localStorage = {
    getItem() { return null; },
    setItem() {},
    removeItem() {}
  };
  globalThis.window = {
    addEventListener() {},
    removeEventListener() {},
    dispatchEvent() {}
  };
  ({ SimpleScale } = await import('../js/simpleScale.js'));
});

afterEach(() => {
  vi.useRealTimers();
});

function seedRobustHistory(scale, value = 5) {
  for (let i = 0; i < 12; i++) scale._robustGramFilter.update(value + (i % 2 ? 0.01 : -0.01));
  expect(scale._robustGramFilter.history.length).toBeGreaterThanOrEqual(9);
}

describe('MAD filter lifecycle', () => {
  it('drops pre-tare gram history when zero is redefined', () => {
    vi.useFakeTimers();
    const s = new SimpleScale();
    seedRobustHistory(s);
    s._robustGramFilter.pending = [9];

    const pendingTare = s.tare();

    expect(s._robustGramFilter.history).toHaveLength(0);
    expect(s._robustGramFilter.pending).toHaveLength(0);
    s._finishTare();
    return pendingTare;
  });

  it('drops pre-gap filter and smoother state after a sensor interruption', () => {
    const s = new SimpleScale();
    seedRobustHistory(s);
    s.weightKalman.update(5, 0);
    s.emaWeight.update(5);
    s.displayEma.update(5);

    s._onSensorGap();

    expect(s._robustGramFilter.history).toHaveLength(0);
    expect(s._robustGramFilter.pending).toHaveLength(0);
    expect(s.weightKalman.x).toBeNull();
    expect(s.emaWeight.value).toBeNull();
    expect(s.displayEma.value).toBeNull();
    expect(s.isStable).toBe(false);
  });

  it('drops old gram-space history when calibration changes sensitivity', () => {
    const s = new SimpleScale();
    s.baseline = { x: 0, y: 0, z: 9.8 };
    s.filteredAccel = { x: 0.1, y: 0, z: 9.8 };
    for (let i = 0; i < 80; i++) {
      s.maDx.update(0.1);
      s.maDy.update(0);
      s.stabilityCheck.update(5);
    }
    seedRobustHistory(s, 5);

    const result = s.calibrate(5, { force: true, readiness: { ready: true, reasons: [] } });

    expect(result.success).toBe(true);
    expect(s._robustGramFilter.history).toHaveLength(0);
    expect(s._robustGramFilter.pending).toHaveLength(0);
    expect(s.weightKalman.x).toBeNull();
  });
});
