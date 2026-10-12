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

describe('digital precision scale units conversion', () => {
  it('converts grams to ounces, carats, grains, pennyweights, and troy ounces correctly', async () => {
    const { convertWeight } = await import('../js/scaleMath.js');
    
    // 100g to oz
    const oz = convertWeight(100, 'oz');
    expect(oz.value).toBeCloseTo(3.527, 2);
    expect(oz.label).toBe('oz');

    // 10g to ct (carats: 1g = 5ct)
    const ct = convertWeight(10, 'ct');
    expect(ct.value).toBeCloseTo(50.0, 1);
    expect(ct.label).toBe('ct');

    // 1g to gn (grains: 1g ≈ 15.432gn)
    const gn = convertWeight(1, 'gn');
    expect(gn.value).toBeCloseTo(15.43, 1);
    expect(gn.label).toBe('gn');

    // 10g to dwt (pennyweight: 1g ≈ 0.643dwt)
    const dwt = convertWeight(10, 'dwt');
    expect(dwt.value).toBeCloseTo(6.43, 1);
    expect(dwt.label).toBe('dwt');

    // 31.1035g to ozt (1 troy oz ≈ 31.1035g)
    const ozt = convertWeight(31.1035, 'ozt');
    expect(ozt.value).toBeCloseTo(1.0, 2);
    expect(ozt.label).toBe('ozt');
  });
});

describe('piece counting (PCS mode) math', () => {
  it('computes exact pieces count based on calibrated sample mass', async () => {
    const { calculatePieceCount } = await import('../js/scaleMath.js');

    // Sample: 10 coins weigh 50.0g -> unit weight = 5.0g/pc
    const pieceWeight = 5.0;

    expect(calculatePieceCount(50.0, pieceWeight)).toBe(10);
    expect(calculatePieceCount(125.0, pieceWeight)).toBe(25);
    expect(calculatePieceCount(49.8, pieceWeight)).toBe(10); // tolerance around 50g
    expect(calculatePieceCount(0, pieceWeight)).toBe(0);
    expect(calculatePieceCount(10, 0)).toBe(0);
  });
});

describe('digital spirit level tilt math', () => {
  it('correctly classifies flat resting phone as level (< 1.5°)', async () => {
    const { calculateTiltAngle } = await import('../js/scaleMath.js');

    // Phone perfectly flat: x=0, y=0, z=9.8
    const flat = calculateTiltAngle(0, 0, 9.8);
    expect(flat.total).toBeCloseTo(0, 1);
    expect(flat.isLevel).toBe(true);
    expect(flat.isAcceptable).toBe(true);

    // Slight tilt (0.05 m/s² on y): pitch ≈ 0.29°
    const slight = calculateTiltAngle(0, 0.05, 9.8);
    expect(slight.total).toBeLessThan(1.5);
    expect(slight.isLevel).toBe(true);

    // Moderate tilt (0.4 m/s² on x): roll ≈ 2.3° -> acceptable but not level
    const moderate = calculateTiltAngle(0.4, 0, 9.8);
    expect(moderate.isLevel).toBe(false);
    expect(moderate.isAcceptable).toBe(true);

    // Excessive tilt (1.0 m/s² on y): pitch ≈ 5.8° -> bad tilt
    const excessive = calculateTiltAngle(0, 1.0, 9.8);
    expect(excessive.isLevel).toBe(false);
    expect(excessive.isAcceptable).toBe(false);
  });
});
