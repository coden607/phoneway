import { describe, it, expect } from 'vitest';
import { MultiPointCalibration } from '../js/scaleMath.js';

describe('calibration math: tilt-delta → grams', () => {
  it('converts monotonically — larger deflection never reads lighter', () => {
    const cal = new MultiPointCalibration();
    cal.addPoint(5, 0.010);   // API: addPoint(grams, deltaA)
    cal.addPoint(10, 0.020);

    let prev = -Infinity;
    for (let d = 0; d <= 0.030; d += 0.001) {
      const g = cal.estimate(d);
      expect(Number.isFinite(g)).toBe(true);
      expect(g).toBeGreaterThanOrEqual(prev - 1e-9);
      prev = g;
    }
  });

  it('is approximately linear between calibration points', () => {
    const cal = new MultiPointCalibration();
    cal.addPoint(5, 0.010);
    cal.addPoint(10, 0.020);
    expect(cal.estimate(0.015)).toBeCloseTo(7.5, 1);
  });

  it('extrapolates linearly below the first point (documented behavior)', () => {
    const cal = new MultiPointCalibration();
    cal.addPoint(5, 0.010);
    cal.addPoint(10, 0.020);
    expect(cal.estimate(0.005)).toBeCloseTo(2.5, 1);
  });

  it('returns null when there is nothing to fit (honest, not zero)', () => {
    const cal = new MultiPointCalibration();
    cal.addPoint(5, 0.010); // single point — no fit yet
    expect(cal.estimate(0.010)).toBeNull();
  });
});
