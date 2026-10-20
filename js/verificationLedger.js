'use strict';

/**
 * verificationLedger.js — Phoneway's honesty engine (Foundation v5).
 *
 * The ONLY legitimate source of "±Xg" accuracy claims.
 *
 * Every verification (measuring a known reference weight) appends one record:
 *   { timestamp, referenceWeight, measuredError, deviceModel }
 * The displayed accuracy claim is a pure function of a COMPLETE recent window:
 *   claim = ceil-to-0.1g of the worst |measuredError| in the window.
 * No sensitivity heuristics, no curve-fit shape guesses, no marketing.
 *
 * Storage: localStorage key `phoneway_v5_ledger` (falls back to in-memory
 * where localStorage is unavailable, e.g. tests or private mode).
 */

const LEDGER_KEY = 'phoneway_v5_ledger';
const DEFAULT_MAX_ENTRIES = 50;
const CLAIM_WINDOW = 5;

function bestEffortStorage() {
  try {
    if (typeof localStorage !== 'undefined' && localStorage) return localStorage;
  } catch (e) {}
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
  } catch (e) {}
  return 'unknown device';
}

function roundUpTenth(g) {
  if (!Number.isFinite(g) || g <= 0) return 0.1;
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
    } catch (e) {}
  }

  record(entry) {
    if (!entry || !Number.isFinite(entry.referenceWeight) || entry.referenceWeight <= 0) return null;
    if (!Number.isFinite(entry.measuredError)) return null;
    const stored = {
      timestamp: Number.isFinite(entry.timestamp) ? entry.timestamp : Date.now(),
      referenceWeight: entry.referenceWeight,
      measuredError: entry.measuredError,
      referenceTolerance: Number.isFinite(entry.referenceTolerance) ? Math.max(0, entry.referenceTolerance) : 0,
      deviceModel: entry.deviceModel || this.deviceModel
    };
    this.entries.push(stored);
    if (this.entries.length > this.maxEntries) {
      this.entries.splice(0, this.entries.length - this.maxEntries);
    }
    this._save();
    return stored;
  }

  recent(n) {
    if (!Number.isFinite(n) || n <= 0) return this.entries.slice();
    return this.entries.slice(-n);
  }

  stats(n) {
    const sample = this.recent(n);
    if (!sample.length) return null;
    const errors = sample.map(function (e) { return e.measuredError; });
    const abs = errors.map(Math.abs);
    const meanError = errors.reduce(function (a, b) { return a + b; }, 0) / errors.length;
    const meanAbsError = abs.reduce(function (a, b) { return a + b; }, 0) / abs.length;
    const rmse = Math.sqrt(errors.reduce(function (a, b) { return a + b * b; }, 0) / errors.length);
    const maxAbsError = Math.max.apply(null, abs);
    return {
      count: sample.length,
      meanError,
      meanAbsError,
      rmse,
      maxAbsError
    };
  }

  /**
   * Public claim. A numeric claim is withheld until the requested verification
   * window is complete. The default public window is CLAIM_WINDOW (5).
   */
  accuracyClaim(n) {
    const window = Number.isFinite(n) && n > 0 ? Math.floor(n) : CLAIM_WINDOW;
    const s = this.stats(window);
    if (!s) {
      return {
        text: 'UNVERIFIED',
        detail: 'run VERIFY with a known weight',
        count: 0,
        required: window,
        remaining: window,
        ready: false,
        meanError: null,
        meanAbsError: null,
        rmse: null,
        maxAbsError: null
      };
    }
    if (s.count < window) {
      const remaining = window - s.count;
      return {
        text: 'UNVERIFIED',
        detail: remaining + ' more verification' + (remaining === 1 ? '' : 's') + ' required',
        count: s.count,
        required: window,
        remaining,
        ready: false,
        meanError: s.meanError,
        meanAbsError: s.meanAbsError,
        rmse: s.rmse,
        maxAbsError: s.maxAbsError
      };
    }
    const claim = roundUpTenth(s.maxAbsError);
    return {
      text: '±' + claim.toFixed(1) + 'g',
      detail: 'measured on this device — worst of your last ' + s.count + ' verifies',
      count: s.count,
      required: window,
      remaining: 0,
      ready: true,
      meanError: s.meanError,
      meanAbsError: s.meanAbsError,
      rmse: s.rmse,
      maxAbsError: s.maxAbsError
    };
  }

  /**
   * Portable, read-only diagnostic payload for bug reports and calibration
   * review. No mutation and no hidden accuracy inference.
   */
  exportSnapshot(n) {
    const window = Number.isFinite(n) && n > 0 ? Math.floor(n) : CLAIM_WINDOW;
    return {
      schema: 1,
      exportedAt: Date.now(),
      claimWindow: window,
      claim: this.accuracyClaim(window),
      stats: this.stats(window),
      entries: this.recent(window).map(function (entry) { return { ...entry }; })
    };
  }

  clear() {
    this.entries = [];
    try { this.storage.removeItem(LEDGER_KEY); } catch (e) {}
  }
}

export { VerificationLedger, LEDGER_KEY, CLAIM_WINDOW };
