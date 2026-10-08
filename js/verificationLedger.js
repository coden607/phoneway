'use strict';

/**
 * verificationLedger.js — Phoneway's honesty engine (Foundation v5).
 *
 * The ONLY legitimate source of "±Xg" accuracy claims.
 *
 * Every verification (measuring a known reference weight) appends one record:
 *   { timestamp, referenceWeight, measuredError, deviceModel }
 * The displayed accuracy claim is a pure function of the last N records:
 *   claim = ceil-to-0.1g of the worst |measuredError| in the window.
 * No sensitivity heuristics, no curve-fit shape guesses, no marketing.
 *
 * Storage: localStorage key `phoneway_v5_ledger` (falls back to in-memory
 * where localStorage is unavailable, e.g. tests or private mode).
 */

const LEDGER_KEY = 'phoneway_v5_ledger';
const DEFAULT_MAX_ENTRIES = 50;
const CLAIM_WINDOW = 5; // last N verifications drive the public claim

function bestEffortStorage() {
  try {
    if (typeof localStorage !== 'undefined' && localStorage) return localStorage;
  } catch (e) { /* private mode etc. */ }
  const mem = new Map();
  return {
    getItem: (k) => (mem.has(k) ? mem.get(k) : null),
    setItem: (k, v) => { mem.set(k, String(v)); },
    removeItem: (k) => { mem.delete(k); }
  };
}

function bestEffortDeviceModel() {
  try {
    if (typeof navigator !== 'undefined' && navigator.userAgent) return navigator.userAgent;
  } catch (e) { /* non-browser env */ }
  return 'unknown device';
}

function roundUpTenth(g) {
  if (!Number.isFinite(g) || g <= 0) return 0.1;
  // Always round UP: exact tenths (0.4, 0.5) jump to the next band —
  // a measured 0.4g error claims ±0.5g, never ±0.4g. We under-promise.
  const t = g * 10;
  const nearest = Math.round(t);
  if (Math.abs(t - nearest) < 1e-9) return (nearest + 1) / 10;
  return Math.ceil(t) / 10;
}

class VerificationLedger {
  constructor(options) {
    options = options || {};
    this.storage = options.storage || bestEffortStorage();
    this.maxEntries = options.maxEntries || DEFAULT_MAX_ENTRIES;
    this.deviceModel = options.deviceModel || bestEffortDeviceModel();
    this.entries = this._load();
  }

  _load() {
    try {
      const raw = this.storage.getItem(LEDGER_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed.filter(function (e) {
        return e && Number.isFinite(e.referenceWeight) && Number.isFinite(e.measuredError);
      });
    } catch (e) { return []; }
  }

  _save() {
    try {
      this.storage.setItem(LEDGER_KEY, JSON.stringify(this.entries));
    } catch (e) { /* storage full / unavailable — ledger degrades to in-memory */ }
  }

  /** Append one verification record. Returns the stored entry, or null if invalid. */
  record(entry) {
    if (!entry || !Number.isFinite(entry.referenceWeight) || entry.referenceWeight <= 0) return null;
    if (!Number.isFinite(entry.measuredError)) return null;
    const stored = {
      timestamp: Number.isFinite(entry.timestamp) ? entry.timestamp : Date.now(),
      referenceWeight: entry.referenceWeight,
      measuredError: entry.measuredError,
      deviceModel: entry.deviceModel || this.deviceModel
    };
    this.entries.push(stored);
    if (this.entries.length > this.maxEntries) {
      this.entries.splice(0, this.entries.length - this.maxEntries);
    }
    this._save();
    return stored;
  }

  /** Last n entries (oldest → newest). n omitted = all. */
  recent(n) {
    if (!Number.isFinite(n) || n <= 0) return this.entries.slice();
    return this.entries.slice(-n);
  }

  /** Error statistics over the last n verifications. Null when empty. */
  stats(n) {
    const sample = this.recent(n);
    if (!sample.length) return null;
    const abs = sample.map(function (e) { return Math.abs(e.measuredError); });
    const meanAbsError = abs.reduce(function (a, b) { return a + b; }, 0) / abs.length;
    const maxAbsError = Math.max.apply(null, abs);
    return { count: sample.length, meanAbsError: meanAbsError, maxAbsError: maxAbsError };
  }

  /**
   * The public accuracy claim — a pure function of recorded measurements.
   * Claim = worst |error| in the window, rounded UP to the nearest 0.1g.
   * Empty ledger → explicitly unverified. We would rather say "we don't know"
   * than invent a number.
   */
  accuracyClaim(n) {
    const window = Number.isFinite(n) && n > 0 ? n : CLAIM_WINDOW;
    const s = this.stats(window);
    if (!s) {
      return { text: 'UNVERIFIED', detail: 'run VERIFY with a known weight', count: 0, meanAbsError: null, maxAbsError: null };
    }
    const claim = roundUpTenth(Math.max(s.meanAbsError, s.maxAbsError));
    return {
      text: '±' + claim.toFixed(1) + 'g',
      detail: 'measured on this device — worst of your last ' + s.count + ' verifies',
      count: s.count,
      meanAbsError: s.meanAbsError,
      maxAbsError: s.maxAbsError
    };
  }

  clear() {
    this.entries = [];
    try { this.storage.removeItem(LEDGER_KEY); } catch (e) { /* ignore */ }
  }
}

export { VerificationLedger, LEDGER_KEY, CLAIM_WINDOW };
