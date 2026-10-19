import { describe, it, expect } from 'vitest';
import { VerificationLedger } from '../js/verificationLedger.js';

function memStorage() {
  const m = new Map();
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => { m.set(k, String(v)); },
    removeItem: (k) => { m.delete(k); }
  };
}

function makeLedger() {
  return new VerificationLedger({ storage: memStorage(), deviceModel: 'test-device' });
}

function addFive(l, errors = [0.04, -0.06, 0.08, -0.03, 0.05]) {
  errors.forEach((measuredError, i) => l.record({ referenceWeight: 5, measuredError, timestamp: i + 1 }));
}

describe('verification ledger', () => {
  it('computes MAE, bias, RMSE and max error', () => {
    const l = makeLedger();
    l.record({ referenceWeight: 5, measuredError: 0.1, timestamp: 1 });
    l.record({ referenceWeight: 5, measuredError: -0.3, timestamp: 2 });
    l.record({ referenceWeight: 10, measuredError: 0.2, timestamp: 3 });

    const s = l.stats();
    expect(s.count).toBe(3);
    expect(s.meanError).toBeCloseTo(0, 6);
    expect(s.meanAbsError).toBeCloseTo(0.2, 6);
    expect(s.rmse).toBeCloseTo(Math.sqrt(0.14 / 3), 6);
    expect(s.maxAbsError).toBeCloseTo(0.3, 6);
  });

  it('withholds a public numeric claim until all five verifies exist', () => {
    const l = makeLedger();
    for (let i = 0; i < 4; i++) l.record({ referenceWeight: 5, measuredError: 0.04, timestamp: i + 1 });
    const pending = l.accuracyClaim();
    expect(pending.text).toBe('UNVERIFIED');
    expect(pending.ready).toBe(false);
    expect(pending.remaining).toBe(1);

    l.record({ referenceWeight: 5, measuredError: 0.04, timestamp: 5 });
    const ready = l.accuracyClaim();
    expect(ready.text).toBe('±0.1g');
    expect(ready.ready).toBe(true);
    expect(ready.remaining).toBe(0);
  });

  it('public claim = worst |error| in a complete window, rounded UP to 0.1g', () => {
    const l = makeLedger();
    addFive(l, [0.12, 0.04, 0.02, -0.03, 0.05]);
    expect(l.accuracyClaim().text).toBe('±0.2g');

    const one = l.accuracyClaim(1);
    expect(one.text).toBe('±0.1g');
  });

  it('persists across instances through storage', () => {
    const storage = memStorage();
    const a = new VerificationLedger({ storage, deviceModel: 'test-device' });
    addFive(a, [0.4, 0.1, 0.1, 0.1, 0.1]);
    const b = new VerificationLedger({ storage, deviceModel: 'test-device' });
    expect(b.accuracyClaim().text).toBe('±0.5g');
  });

  it('exports a bounded diagnostic snapshot without sharing mutable references', () => {
    const l = makeLedger();
    addFive(l);
    const snapshot = l.exportSnapshot();
    expect(snapshot.schema).toBe(1);
    expect(snapshot.entries).toHaveLength(5);
    expect(snapshot.claim.ready).toBe(true);
    snapshot.entries[0].measuredError = 99;
    expect(l.recent(1)[0].measuredError).not.toBe(99);
  });

  it('rejects invalid records instead of corrupting the ledger', () => {
    const l = makeLedger();
    expect(l.record({ referenceWeight: 0, measuredError: 0.1 })).toBeNull();
    expect(l.record({ referenceWeight: 5, measuredError: NaN })).toBeNull();
    expect(l.record(null)).toBeNull();
    expect(l.stats()).toBeNull();
  });

  it('stores deviceModel per record', () => {
    const l = makeLedger();
    const e = l.record({ referenceWeight: 5, measuredError: 0.1, deviceModel: 'pixel-test' });
    expect(e.deviceModel).toBe('pixel-test');
    expect(l.recent()[0].deviceModel).toBe('pixel-test');
  });
});
