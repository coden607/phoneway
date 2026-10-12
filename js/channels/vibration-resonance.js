/**
 * channels/vibration-resonance.js — Vibration resonance mass cross-check
 *
 * Real implementation of the `vibration-resonance` channel declared in
 * config/continuity.toml (was: placeholder). Follows the extend-channel
 * contract in skills/extend-channel/SKILL.md.
 *
 * Physics (same formula as audio.js and sensorCombinations.js):
 *   f_loaded = f_empty · √(m_phone / (m_phone + m_added))
 *   m_added  = m_phone · ((f_empty / f_loaded)² − 1)
 *
 * Excitation: navigator.vibrate() pulse trains. The phone+surface system
 * rings at its mechanical resonant frequency; added mass shifts it down.
 * Detection: accelerometer-magnitude FFT (reuses kalman.js fft) with
 * parabolic peak interpolation for sub-bin precision.
 *
 * Honesty: this channel is a CROSS-CHECK. estimate() returns null when
 * sensors/vibration are unavailable, and confidence is gated by peak SNR.
 * Claims still come only from the verification ledger.
 */

'use strict';

import { fft, parabolicPeakFreq } from '../kalman.js';

/* ── Tunables ─────────────────────────────────────────────── */
const RING_SIZE      = 512;    // accel samples (power of 2)
const SAMPLE_RATE_HZ = 60;     // nominal DeviceMotion rate
const F_MIN_HZ       = 5;      // search band low  (phone+surface modes live here)
const F_MAX_HZ       = 45;     // search band high
const MIN_SNR_DB     = 4;      // peak must stand out from median floor
const PEAK_BIN_MIN   = 2;      // ignore DC / lowest bins
const PULSE_MS       = 28;     // one excitation pulse (within ERM/LRA ring-up)
const GAP_MS         = 72;     // silence between pulses → decay ringing
const TRAIN_PULSES   = 10;     // pulses per excitation train
const SETTLE_MS_INTERNAL    = 350;    // stillness required before sampling
const SAMPLE_WINDOW_INTERNAL = 1200;  // excitation + capture window

const CAL_KEY        = 'phoneway_v5_cal_vibration-resonance';
const DEFAULT_PHONE_MASS_G = 170;

/* ═══════════════════════════════════════════════════════════
   Pure math core — unit-tested directly, no sensors required.
   ═══════════════════════════════════════════════════════════ */

/**
 * Resonance mass estimate from frequency shift.
 * @returns grams added (≥ 0), 0 when inputs are invalid
 */
export function resonanceMassGrams(fEmptyHz, fLoadedHz, phoneMassG) {
  if (!Number.isFinite(fEmptyHz) || !Number.isFinite(fLoadedHz) || !Number.isFinite(phoneMassG)) return 0;
  if (fEmptyHz <= 0 || fLoadedHz <= 0 || phoneMassG <= 0) return 0;
  if (fLoadedHz >= fEmptyHz) return 0;          // no added mass → no downward shift
  const ratio = fEmptyHz / fLoadedHz;
  return Math.max(0, phoneMassG * (ratio * ratio - 1));
}

/**
 * Dominant spectral peak in [fMin, fMax] with parabolic interpolation.
 * @param {Float64Array|number[]} magnitudes  one-sided power spectrum
 * @param {number} sampleRateHz
 * @returns {{freqHz:number, magnitude:number, snrDb:number}} | null
 */
export function findResonantPeakHz(magnitudes, sampleRateHz, fMin = F_MIN_HZ, fMax = F_MAX_HZ) {
  const n = magnitudes.length;
  if (!n || !Number.isFinite(sampleRateHz) || sampleRateHz <= 0) return null;
  const binHz = sampleRateHz / (2 * n);          // one-sided: bins 0..N/2
  const lo = Math.max(PEAK_BIN_MIN, Math.ceil(fMin / binHz));
  const hi = Math.min(n - 2, Math.floor(fMax / binHz));
  if (hi <= lo) return null;

  let peakBin = lo;
  for (let i = lo + 1; i <= hi; i++) {
    if (magnitudes[i] > magnitudes[peakBin]) peakBin = i;
  }
  const peakMag = magnitudes[peakBin];
  if (!Number.isFinite(peakMag) || peakMag <= 0) return null;

  // SNR vs median floor of the search band (robust to single spikes)
  const band = [];
  for (let i = lo; i <= hi; i++) band.push(magnitudes[i]);
  band.sort((a, b) => a - b);
  const floor = band[Math.floor(band.length / 2)] || 1e-12;
  const snrDb = 10 * Math.log10((peakMag * peakMag) / (floor * floor));
  if (snrDb < MIN_SNR_DB) return null;

  const refined = parabolicPeakFreq(magnitudes, peakBin, binHz);
  const freqHz = Number.isFinite(refined) && refined > 0 ? refined : peakBin * binHz;
  return { freqHz, magnitude: peakMag, snrDb };
}

/**
 * Deterministic vibrate() excitation plan (ms on/off sequence).
 * On Android, vibrate(ms) with ms in the ERM/LRA ring-up band lets the
 * phone ring at its own mechanical resonance between pulses.
 */
export function excitationPlan() {
  const pattern = [];
  for (let i = 0; i < TRAIN_PULSES; i++) {
    pattern.push(PULSE_MS, GAP_MS);
  }
  return pattern;
}

/**
 * Full estimate pipeline from a raw accel-magnitude ring buffer.
 * Pure: the channel's estimate() is a thin sensor-bound wrapper over this.
 *
 * @param {Float64Array} ring        accel magnitude samples
 * @param {number} sampleRateHz
 * @param {{baselineHz:number, phoneMassG:number}|null} cal
 * @returns {{grams:number, confidence:number, fLoadedHz:number, snrDb:number}|null}
 */
export function estimateFromRing(ring, sampleRateHz, cal) {
  if (!cal || !Number.isFinite(cal.baselineHz) || cal.baselineHz <= 0) return null;
  const n = ring.length;
  if (n < 64 || (n & (n - 1)) !== 0) return null;

  const re = new Float64Array(n);
  const im = new Float64Array(n);
  // Hann window to control spectral leakage
  for (let i = 0; i < n; i++) {
    const w = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (n - 1)));
    re[i] = ring[i] * w;
  }
  fft(re, im);

  const half = n / 2;
  const mags = new Float64Array(half);
  for (let i = 0; i < half; i++) {
    mags[i] = Math.hypot(re[i], im[i]) / half;
  }
  const peak = findResonantPeakHz(mags, sampleRateHz);
  if (!peak) return null;

  const grams = resonanceMassGrams(cal.baselineHz, peak.freqHz, cal.phoneMassG);
  // Confidence: SNR-gated, capped low — this is a cross-check, not a claim source
  const confidence = Math.min(0.8, Math.max(0.1, (peak.snrDb - MIN_SNR_DB) / 30));
  return { grams, confidence, fLoadedHz: peak.freqHz, snrDb: peak.snrDb };
}

/**
 * Two-point calibration of the phone's own mass from a known reference:
 *   m_phone = m_known / ((f_empty / f_loaded)² − 1)
 * @returns calibrated phoneMassG or null when the shift is too small to trust
 */
export function calibratePhoneMass(fEmptyHz, fLoadedHz, knownMassG) {
  const denom = Math.pow(fEmptyHz / fLoadedHz, 2) - 1;
  if (!Number.isFinite(denom) || denom <= 1e-4) return null;
  const mass = knownMassG / denom;
  return Number.isFinite(mass) && mass > 20 && mass < 1000 ? mass : null;
}

/* ═══════════════════════════════════════════════════════════
   Channel class — sensor-bound lifecycle per extend-channel.
   ═══════════════════════════════════════════════════════════ */

export class VibrationResonanceChannel {
  /**
   * @param {{storage?:object, phoneMassG?:number, now?:()=>number}} [opts]
   *   storage defaults to localStorage; inject a mock for tests.
   */
  constructor(opts = {}) {
    this.id = 'vibration-resonance';
    this._storage = opts.storage ?? (typeof localStorage !== 'undefined' ? localStorage : null);
    this._defaultPhoneMassG = opts.phoneMassG ?? DEFAULT_PHONE_MASS_G;
    this._now = opts.now ?? (() => Date.now());

    this._ring = new Float64Array(RING_SIZE);
    this._wIdx = 0;
    this._count = 0;
    this._sampleRateHz = SAMPLE_RATE_HZ;
    this._motionHandler = null;
    this._sensorAccess = null;
    this._running = false;
    this._lastEstimate = null;
  }

  /** Load calibration {baselineHz, phoneMassG} or null. */
  loadCalibration() {
    if (!this._storage) return null;
    try {
      const raw = this._storage.getItem(CAL_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || !Number.isFinite(parsed.baselineHz)) return null;
      return {
        baselineHz: parsed.baselineHz,
        phoneMassG: Number.isFinite(parsed.phoneMassG) ? parsed.phoneMassG : this._defaultPhoneMassG,
      };
    } catch {
      return null;
    }
  }

  /** Persist calibration. */
  saveCalibration(baselineHz, phoneMassG) {
    if (!this._storage) return false;
    if (!Number.isFinite(baselineHz) || baselineHz <= 0) return false;
    this._storage.setItem(CAL_KEY, JSON.stringify({
      baselineHz,
      phoneMassG: Number.isFinite(phoneMassG) ? phoneMassG : this._defaultPhoneMassG,
      savedAt: this._now(),
    }));
    return true;
  }

  /**
   * Begin sampling.
   * @param {{vibrate?:(p:number[])=>boolean, onMotion?:(cb:(e:{accelerationIncludingGravity?:{x:number,y:number,z:number}})=>void)=>void, offMotion?:(cb:Function)=>void}} [sensorAccess]
   */
  start(sensorAccess = {}) {
    const acc = sensorAccess || {};
    const canVibrate = typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function'
      ? (p) => navigator.vibrate(p)
      : (acc.vibrate ?? null);
    const onMotion = acc.onMotion ?? (typeof window !== 'undefined'
      ? (cb) => window.addEventListener('devicemotion', cb)
      : null);
    const offMotion = acc.offMotion ?? (typeof window !== 'undefined'
      ? (cb) => window.removeEventListener('devicemotion', cb)
      : null);

    if (!canVibrate || !onMotion) {
      this._running = false;
      return false;
    }

    this._sensorAccess = { vibrate: canVibrate, onMotion, offMotion };
    this._ring.fill(0);
    this._wIdx = 0;
    this._count = 0;
    this._running = true;
    this._lastEstimate = null;

    this._motionHandler = (e) => {
      const a = e.accelerationIncludingGravity || e.acceleration;
      if (!a) return;
      const mag = Math.sqrt((a.x || 0) ** 2 + (a.y || 0) ** 2 + (a.z || 0) ** 2);
      this._ring[this._wIdx] = mag;
      this._wIdx = (this._wIdx + 1) % RING_SIZE;
      this._count++;
    };
    onMotion(this._motionHandler);
    return true;
  }

  /** Fire the excitation train. Call after start(). */
  excite() {
    if (!this._running || !this._sensorAccess) return false;
    return this._sensorAccess.vibrate(excitationPlan()) !== false;
  }

  /**
   * Estimate from current ring buffer per contract:
   * @returns {{grams:number, confidence:number, unitsNote:string}|null}
   */
  estimate() {
    if (!this._running || this._count < RING_SIZE) return null;
    const cal = this.loadCalibration();
    const est = estimateFromRing(this._ring, this._sampleRateHz, cal);
    if (!est) return null;
    this._lastEstimate = est;
    return {
      grams: est.grams,
      confidence: est.confidence,
      unitsNote: `vibration resonance ${est.fLoadedHz.toFixed(2)} Hz (baseline ${cal.baselineHz.toFixed(2)} Hz), SNR ${est.snrDb.toFixed(1)} dB`,
    };
  }

  /** Capture a no-load baseline from the current ring and persist it. */
  calibrateEmpty(phoneMassG) {
    const n = RING_SIZE;
    const re = new Float64Array(n);
    const im = new Float64Array(n);
    for (let i = 0; i < n; i++) {
      const w = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (n - 1)));
      re[i] = this._ring[i] * w;
    }
    fft(re, im);
    const half = n / 2;
    const mags = new Float64Array(half);
    for (let i = 0; i < half; i++) mags[i] = Math.hypot(re[i], im[i]) / half;
    const peak = findResonantPeakHz(mags, this._sampleRateHz);
    if (!peak) return false;
    return this.saveCalibration(peak.freqHz, phoneMassG ?? this._defaultPhoneMassG);
  }

  stop() {
    if (this._motionHandler && this._sensorAccess?.offMotion) {
      this._sensorAccess.offMotion(this._motionHandler);
    }
    this._motionHandler = null;
    this._sensorAccess = null;
    this._running = false;
  }

  get running() { return this._running; }
  get isUsable() {
    return typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function';
  }
}

export const CALIBRATION_STORAGE_KEY = CAL_KEY;
export const SETTLE_MS = SETTLE_MS_INTERNAL;
export const SAMPLE_WINDOW_MS = SAMPLE_WINDOW_INTERNAL;
