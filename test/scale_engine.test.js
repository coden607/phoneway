import test from 'node:test';
import assert from 'node:assert/strict';
import { ScaleEngine } from '../js/scale_engine.js';

test('PhoneWeigh Standalone ScaleEngine (25 Features)', async (t) => {
  const engine = new ScaleEngine();

  await t.test('1. Viewport scaling calculation', () => {
    const vp = engine.calculateViewportScale(390, 844);
    assert.equal(vp.isMobile, true);
    assert.equal(vp.scaleFactor, 1.0);
    assert.equal(vp.cssHeightUnit, '100dvh');
  });

  await t.test('2. Low-pass filter damping', () => {
    const f = engine.applyLowPassFilter(10);
    assert.ok(f < 2.0);
  });

  await t.test('3. Tare retention', () => {
    engine.setTare(15.2);
    assert.equal(engine.getTare(), 15.2);
    engine.resetTare();
    assert.equal(engine.getTare(), 0);
  });

  await t.test('4. Unit conversion', () => {
    const oz = engine.convertWeight(100, 'g', 'oz');
    assert.ok(Math.abs(oz - 3.5274) < 0.001);
  });

  await t.test('5. Settle stabilization detection', () => {
    const s = engine.checkStabilization([10.001, 10.002, 10.001, 10.000, 10.001]);
    assert.equal(s.stabilized, true);
    assert.equal(s.audioChime.frequencyHz, 880);
  });

  await t.test('6. WCAG 48px touch target validation', () => {
    assert.equal(engine.validateTouchTarget(48, 48).compliant, true);
    assert.equal(engine.validateTouchTarget(30, 30).compliant, false);
  });

  await t.test('7-8. Measurement history & CSV export', () => {
    engine.clearHistory();
    engine.recordMeasurement(25.0, 'g');
    assert.equal(engine.getHistory().length, 1);
    const csv = engine.exportCSV();
    assert.ok(csv.includes('25'));
  });

  await t.test('9-10. PWA manifest and haptics', () => {
    assert.ok(engine.getServiceWorkerManifest().precacheUrls.includes('/index.html'));
    assert.deepEqual(engine.getHapticPattern('tare'), [40]);
  });

  await t.test('11-12. Sensitivity scaling and tilt compensation', () => {
    assert.equal(engine.scaleSensitivity(10, 0.005), 12);
    assert.equal(engine.compensateTilt(100, 0, 0), 100);
  });

  await t.test('13-14. Variance and two-point calibration', () => {
    assert.equal(engine.calculateVariance([5, 5, 5]), 0);
    const cal = engine.calibrateTwoPoint(
      { rawSensorReading: 100, knownGrams: 5 },
      { rawSensorReading: 200, knownGrams: 10 }
    );
    assert.equal(cal.slope, 0.05);
    assert.equal(engine.applyCalibrationCurve(150), 7.5);
  });

  await t.test('15-17. Overload, peak hold, piece count', () => {
    assert.equal(engine.checkOverload(600).isOverloaded, true);
    engine.resetPeakWeight();
    engine.recordMeasurement(80, 'g');
    const peak = engine.getPeakWeight();
    assert.ok(peak > 0);
    engine.recordMeasurement(20, 'g');
    assert.equal(engine.getPeakWeight(), peak);
    assert.equal(engine.calculatePieceCount(100, 2.5).pieceCount, 40);
  });

  await t.test('18-20. Snapshot, AZT, and power save rate', () => {
    const snap = engine.exportSnapshot();
    assert.ok(snap.includes('tareOffset'));
    assert.equal(engine.importSnapshot(snap), true);
    assert.equal(engine.applyAZT(0.002), 0.0);
    assert.equal(engine.getSamplingRateHz(), 60);
  });

  await t.test('21-25. Diagnostics, noise gate, BLE, receipt, theme', () => {
    const diag = engine.runSensorDiagnostics([10, 10.01, 9.99], [16.6, 16.7]);
    assert.equal(diag.frequencyHz, 60);
    assert.equal(engine.applyNoiseGate(0.01), 0.0);
    const ble = engine.parseBLEWeightPacket(new Uint8Array([0x00, 10, 0]));
    assert.equal(ble.weightGrams, 50);
    assert.equal(engine.generateReceiptData({ id: '1', netWeight: 5, unit: 'g' }).verified, true);
    assert.equal(engine.getThemeTokens('dark-oled').contrastRatio, '21:1');
  });
});
