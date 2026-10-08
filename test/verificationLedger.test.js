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

describe('verification ledger', () => {
  it('averages |error| correctly over the last N records', () => {
    const l = makeLedger();
    l.record({ referenceWeight: 5, measuredError: 0.1, timestamp: 1 });
    l.record({ referenceWeight: 5, measuredError: -0.3, timestamp: 2 });
    l.record({ referenceWeight: 10, measuredError: 0.2, timestamp: 3 });

    const s2 = l.stats(2);
    expect(s2.count).toBe(2);
    expect(s2.meanAbsError).toBeCloseTo(0.25, 6);
    expect(s2.maxAbsError).toBeCloseTo(0.3, 6);

    const sAll = l.stats();
    expect(sAll.count).toBe(3);
    expect(sAll.meanAbsError).toBeCloseTo((0.1 + 0.3 + 0.2) / 3, 6);
  });

  it('public claim = worst |error| in window, rounded UP to 0.1g', () => {
    const l = makeLedger();
    expect(l.accuracyClaim().text).toBe('UNVERIFIED');

    l.record({ referenceWeight: 5, measuredError: 0.12, timestamp: 1 });
    l.record({ referenceWeight: 5, measuredError: 0.04, timestamp: 2 });
    expect(l.accuracyClaim().text).toBe('±0.2g'); // worst 0.12 → 0.2, NOT 0.1

    l.record({ referenceWeight: 5, measuredError: 0.02, timestamp: 3 });
    expect(l.accuracyClaim().text).toBe('±0.2g'); // window still holds the 0.12

    const claim = l.accuracyClaim(1); // last 1 only
    expect(claim.text).toBe('±0.1g');
  });

  it('persists across instances through storage', () => {
    const storage = memStorage();
    const a = new VerificationLedger({ storage, deviceModel: 'test-device' });
    a.record({ referenceWeight: 5, measuredError: 0.4, timestamp: 1 });
    const b = new VerificationLedger({ storage, deviceModel: 'test-device' });
    expect(b.accuracyClaim().text).toBe('±0.5g');
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
