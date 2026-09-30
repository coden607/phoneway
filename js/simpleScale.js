'use strict';

import { TiltCorrector } from './sensorCombinations.js';
import {
  MovingAverage, EMA, SimpleKalman,
  MultiPointCalibration, TemperatureCompensator
} from './scaleMath.js';

class SimpleScale {
  constructor() {
    this.active = false;
    this.calibrated = false;
    this.calibrationStale = false;
    this.calibrationAgeMs = 0;
    this.baseline = null;
    this.sensitivity = 150;
    this.multiCal = new MultiPointCalibration();
    this.tempComp = new TemperatureCompensator();
    this.tiltCorrector = new TiltCorrector();
    this.rawAccel = { x: 0, y: 0, z: 9.8 };
    this.filteredAccel = { x: 0, y: 0, z: 9.8 };
    this.rawWeight = 0;
    this.displayWeight = 0;
    this.confidence = 0;
    this.isStable = false;
    this.motionQuality = 0;
    this.motionBlocked = false;
    this.gravityQuality = 0;
    this.maDx = new MovingAverage(80);
    this.maDy = new MovingAverage(80);
    this.kalmanX = new SimpleKalman({ R: 0.002, Q: 0.0002 });
    this.kalmanY = new SimpleKalman({ R: 0.002, Q: 0.0002 });
    this.kalmanZ = new SimpleKalman({ R: 0.005, Q: 0.0005 });
    this.emaWeight = new EMA(0.08);
    this.stabilityCheck = new MovingAverage(60);
    this.deadbandThreshold = 0.08;
    this.lastDisplayValue = 0;
    this.stableCounter = 0;
    this._tare_in_progress = false;
    this._tare_target = 60;
    this._tare_warmup = 10;
    this._tare_warmup_count = 0;
    this._tare_blocked_count = 0;
    this._tare_started_at = 0;
    this._tare_xs = [];
    this._tare_ys = [];
    this._tare_zs = [];
    this._tare_resolve = null;
    this.sampleRate = 60;
    this.verificationHistory = [];
    this.onWeight = null;
    this.onRaw = null;
    this.onStable = null;
    this.onProgress = null;
    this._loadCalibration();
  }

  async requestPermission() {
    if (typeof DeviceMotionEvent !== 'undefined' && typeof DeviceMotionEvent.requestPermission === 'function') {
      try { return (await DeviceMotionEvent.requestPermission()) === 'granted'; }
      catch (e) { return false; }
    }
    return true;
  }

  start() {
    if (this.active) return;
    this._handler = (e) => this._handleMotion(e);
    window.addEventListener('devicemotion', this._handler, { passive: true });
    this.active = true;
    this.baseline = null;
    if (this._startTareTimer) clearTimeout(this._startTareTimer);
    this._startTareTimer = setTimeout(() => {
      this._startTareTimer = null;
      if (this.active) this.tare();
    }, 1000);
  }

  stop() {
    if (!this.active) return;
    window.removeEventListener('devicemotion', this._handler);
    this.active = false;
    if (this._startTareTimer) { clearTimeout(this._startTareTimer); this._startTareTimer = null; }
    this._tare_in_progress = false;
    if (this._tare_resolve) { this._tare_resolve(); this._tare_resolve = null; }
    this.baseline = null;
  }

  _handleMotion(e) {
    const accel = e.accelerationIncludingGravity;
    if (!accel) return;
    let x = accel.x != null ? accel.x : 0;
    let y = accel.y != null ? accel.y : 0;
    let z = accel.z != null ? accel.z : 0;
    if (z < 0) { x = -x; y = -y; z = -z; }
    this.rawAccel = { x, y, z };
    if (this.onRaw) this.onRaw(x, y, z);
    this.filteredAccel = {
      x: this.kalmanX.update(x),
      y: this.kalmanY.update(y),
      z: this.kalmanZ.update(z)
    };
    this.tiltCorrector.feedGravity(this.filteredAccel.x, this.filteredAccel.y, this.filteredAccel.z);
    const jerk = Math.hypot(x - this.filteredAccel.x, y - this.filteredAccel.y, z - this.filteredAccel.z);
    const rotationRate = e.rotationRate
      ? Math.hypot(e.rotationRate.alpha || 0, e.rotationRate.beta || 0, e.rotationRate.gamma || 0)
      : 0;
    const gravityMagnitude = Math.hypot(this.filteredAccel.x, this.filteredAccel.y, this.filteredAccel.z);
    const gravityError = Math.abs(gravityMagnitude - 9.80665);
    this.gravityQuality = gravityMagnitude > 1 ? Math.max(0, 1 - gravityError / 0.5) : 0;
    this.motionQuality = Math.max(0, 1 - jerk / 0.35) * Math.max(0, 1 - rotationRate / 45) * this.gravityQuality;
    this.motionBlocked = jerk > 0.45 || rotationRate > 35 || gravityError > 0.5;
    if (this._tare_in_progress) {
      const elapsed = Date.now() - (this._tare_started_at || Date.now());
      if (this._tare_warmup_count < this._tare_warmup) {
        this._tare_warmup_count++;
        this._emitProgress('tare-warmup', this._tare_warmup_count / this._tare_warmup, 'Warming sensors...');
      } else {
        const acceptAnyway = this._tare_blocked_count > 25 || elapsed > 1800;
        if (!this.motionBlocked || acceptAnyway) {
          this._tare_xs.push(this.filteredAccel.x);
          this._tare_ys.push(this.filteredAccel.y);
          this._tare_zs.push(this.filteredAccel.z);
        } else {
          this._tare_blocked_count++;
        }
        const collected = this._tare_xs.length;
        this._emitProgress('tare', Math.min(1, collected / this._tare_target),
          this.motionBlocked ? 'Hold still - collecting baseline...' : 'Locking zero baseline...');
        if (collected >= this._tare_target || elapsed > 3500) this._finishTare();
      }
    }
    this._process();
  }

  _process() {
    if (!this.baseline) return;
    if (this.motionBlocked) {
      this.isStable = false;
      this.stableCounter = 0;
      this.confidence = 0;
      if (this.onWeight) this.onWeight(this.displayWeight, this.confidence, false);
      return;
    }
    const dx = this.filteredAccel.x - this.baseline.x;
    const dy = this.filteredAccel.y - this.baseline.y;
    const avgDx = this.maDx.update(dx);
    const avgDy = this.maDy.update(dy);
    const deltaHorizontal = Math.sqrt(avgDx * avgDx + avgDy * avgDy);
    let rawG = (this.multiCal.coeffs && this.multiCal.points.length >= 2)
      ? this.multiCal.estimate(deltaHorizontal)
      : deltaHorizontal * this.sensitivity;
    rawG = Math.max(0, this.tempComp.compensate(Math.max(0, rawG)));
    if (rawG < 0.05) rawG = 0;
    this.rawWeight = rawG;
    this.stabilityCheck.update(rawG);
    const stdDev = this.stabilityCheck.stdDev;
    const isNowStable = this.stabilityCheck.isFull && stdDev < (this.calibrated ? 0.06 : 0.08);
    if (isNowStable) this.stableCounter++; else this.stableCounter = 0;
    const trulyStable = this.stableCounter > (this.calibrated ? 30 : 25);
    const emaG = this.emaWeight.update(rawG);
    if (trulyStable && !this.isStable && rawG > 0.1 && this.onStable) this.onStable(emaG);
    this.isStable = trulyStable;
    if (trulyStable) {
      this.displayWeight = this._trimmedMean(this.stabilityCheck.getAll(), 0.15);
      this.lastDisplayValue = this.displayWeight;
    } else if (Math.abs(emaG - this.lastDisplayValue) >= this.deadbandThreshold || emaG < 0.05) {
      this.displayWeight = emaG;
      this.lastDisplayValue = emaG;
    }
    const stabilityScore = Math.max(0, 1 - stdDev / 0.15);
    const surfaceScore = this._getSurfaceQualityScore();
    const signalScore = this.calibrated ? 0.9 : Math.min(1, this.rawWeight / 2);
    const calPoints = this.multiCal.getPointCount();
    const calMult = !this.calibrated ? 0.35 : (calPoints >= 3 ? 1.0 : calPoints >= 2 ? 0.85 : 0.70);
    this.confidence = (stabilityScore * 0.45 + signalScore * 0.20 + surfaceScore * 0.25 + this.motionQuality * 0.10) * calMult;
    if (this.onWeight) this.onWeight(this.displayWeight, this.confidence, this.isStable);
  }

  _trimmedMean(values, trimPct) {
    if (trimPct == null) trimPct = 0.1;
    if (values.length < 4) return values.reduce(function(a,b){return a+b;},0) / values.length;
    const sorted = values.slice().sort(function(a,b){return a-b;});
    const n = Math.floor(sorted.length * trimPct);
    const trimmed = sorted.slice(n, sorted.length - n);
    return trimmed.reduce(function(a,b){return a+b;},0) / trimmed.length;
  }

  _getSurfaceQualityScore() {
    if (!this.calibrated) return 0.3;
    if (this.sensitivity > 250) return 1.0;
    if (this.sensitivity > 150) return 0.85;
    if (this.sensitivity > 80) return 0.6;
    return 0.3;
  }

  tare() {
    this.kalmanX.reset(); this.kalmanY.reset(); this.kalmanZ.reset();
    this.maDx.reset(); this.maDy.reset();
    this.stabilityCheck.reset(); this.emaWeight.reset();
    this.stableCounter = 0;
    this.tempComp.calibrateZero();
    this._tare_xs = []; this._tare_ys = []; this._tare_zs = [];
    this._tare_warmup_count = 0;
    this._tare_blocked_count = 0;
    this._tare_started_at = Date.now();
    this._tare_in_progress = true;
    this._emitProgress('tare-warmup', 0, 'Starting tare...');
    const self = this;
    return new Promise(function(resolve) {
      self._tare_resolve = resolve;
      setTimeout(function(){ if (self._tare_in_progress) self._finishTare(); }, 4000);
    });
  }

  _finishTare() {
    if (!this._tare_in_progress && !this._tare_resolve) return;
    this._tare_in_progress = false;
    if (this._tare_xs.length >= 8) {
      this.baseline = {
        x: this._trimmedMean(this._tare_xs),
        y: this._trimmedMean(this._tare_ys),
        z: this._trimmedMean(this._tare_zs)
      };
    } else if (!this.baseline) {
      this.baseline = { x: this.filteredAccel.x, y: this.filteredAccel.y, z: this.filteredAccel.z };
    }
    this.maDx.reset(); this.maDy.reset();
    this.stabilityCheck.reset(); this.emaWeight.reset();
    this.stableCounter = 0;
    this.displayWeight = 0; this.lastDisplayValue = 0; this.rawWeight = 0;
    this._emitProgress('tare', 1, 'Baseline locked');
    if (this._tare_resolve) { const done = this._tare_resolve; this._tare_resolve = null; done(); }
  }

  _emitProgress(phase, pct, message) {
    if (typeof this.onProgress === 'function') {
      this.onProgress({
        phase: phase,
        pct: Math.max(0, Math.min(1, pct || 0)),
        collected: this._tare_xs ? this._tare_xs.length : 0,
        target: this._tare_target,
        message: message || ''
      });
    }
  }

  calibrate(knownGrams) {
    if (!Number.isFinite(knownGrams) || knownGrams <= 0) return { success: false, error: 'Choose a valid reference weight' };
    if (!this.baseline) return { success: false, error: 'Must tare first' };
    if (this.maDx.length < 20) return { success: false, error: 'Still settling - wait a moment' };
    if (this.motionBlocked && this.motionQuality < 0.25) return { success: false, error: 'Hold the phone still and try again' };
    const deltaA = Math.sqrt(this.maDx.mean * this.maDx.mean + this.maDy.mean * this.maDy.mean);
    if (deltaA < 0.0005) return { success: false, error: 'Signal too weak - use softer surface or heavier weight' };
    if (!this.multiCal.addPoint(knownGrams, deltaA)) return { success: false, error: 'Calibration signal was invalid - try again' };
    const newSensitivity = knownGrams / deltaA;
    this.sensitivity = this.calibrated ? 0.7 * newSensitivity + 0.3 * this.sensitivity : newSensitivity;
    this.calibrated = true;
    this._saveCalibration();
    const r2 = this.multiCal.quality;
    let estimatedAccuracy = '+/-1g (poor)';
    if (this.sensitivity > 300 && r2 > 0.98) estimatedAccuracy = '+/-0.1g (excellent)';
    else if (this.sensitivity > 200 && r2 > 0.95) estimatedAccuracy = '+/-0.2g (very good)';
    else if (this.sensitivity > 120 && r2 > 0.90) estimatedAccuracy = '+/-0.3g (good)';
    else if (this.sensitivity > 60) estimatedAccuracy = '+/-0.5g (ok)';
    return { success: true, sensitivity: this.sensitivity, accuracy: estimatedAccuracy, calibrationPoints: this.multiCal.getPointCount(), r2: r2, deltaA: deltaA };
  }

  verifyAgainstKnown(knownWeight, options) {
    options = options || {};
    if (!this.isStable) return { valid: false, error: 'Wait for stable reading' };
    const reference = (typeof knownWeight === 'object' && knownWeight)
      ? knownWeight
      : { grams: knownWeight, tolerance: options.tolerance != null ? options.tolerance : 0.1, name: options.name || 'Known weight' };
    const knownGrams = Number(reference.grams);
    if (!Number.isFinite(knownGrams) || knownGrams <= 0) return { valid: false, error: 'Choose a valid reference weight' };
    const tolerance = Number.isFinite(reference.tolerance) ? reference.tolerance : 0.1;
    const measured = this.displayWeight;
    const errorGrams = measured - knownGrams;
    const absError = Math.abs(errorGrams);
    const result = {
      valid: true, reference: reference, knownGrams: knownGrams, measuredGrams: measured,
      errorGrams: errorGrams, error: errorGrams, errorPercent: (errorGrams / knownGrams) * 100,
      tolerance: tolerance, strictTolerance: Math.min(tolerance, 0.1),
      accuracy: Math.max(0, 100 - Math.abs((errorGrams / knownGrams) * 100)),
      isWithinTolerance: absError <= tolerance, passed: absError <= Math.min(tolerance, 0.1),
      timestamp: Date.now()
    };
    this.verificationHistory.push(result);
    if (this.verificationHistory.length > 20) this.verificationHistory.shift();
    this._saveCalibration();
    return result;
  }

  getAccuracyEvidence(signalConfidence) {
    if (signalConfidence == null) signalConfidence = this.confidence;
    const signal = Math.max(0, Math.min(1, signalConfidence));
    const history = this.verificationHistory;
    const cal = this.getCalibrationQuality();
    if (!this.calibrated) {
      return { confidence: Math.max(0.05, signal * 0.35), verified: false, uncertainty: Infinity, samples: 0, calibrationScore: 0, precisionTier: 'unverified' };
    }
    const calibrationScore = Math.max(0, Math.min(1, (cal.r2 || 0) * 0.7 + Math.min(cal.points, 4) / 4 * 0.3));
    if (history.length === 0) {
      return { confidence: Math.min(0.7, signal * 0.55 + calibrationScore * 0.45), verified: false, uncertainty: Infinity, samples: 0, calibrationScore: calibrationScore, precisionTier: 'unverified' };
    }
    const errors = history.map(function(v){ return Math.abs(v.errorGrams != null ? v.errorGrams : (v.error || 0)); });
    const meanAbsoluteError = errors.reduce(function(s,e){return s+e;},0) / errors.length;
    const worstError = Math.max.apply(null, errors);
    const uncertainty = Math.max(meanAbsoluteError, worstError);
    return {
      confidence: Math.min(0.99, signal * 0.4 + calibrationScore * 0.35 + Math.max(0, 1 - uncertainty) * 0.25),
      verified: true, uncertainty: uncertainty, samples: history.length, calibrationScore: calibrationScore,
      tenthGramDemonstrated: history.length >= 3 && worstError <= 0.1,
      precisionTier: worstError <= 0.1 ? '0.1g' : (uncertainty <= 0.2 ? '0.2g' : 'coarse')
    };
  }

  getVerificationStats() {
    if (!this.verificationHistory.length) return null;
    const errors = this.verificationHistory.map(function(v){ return v.errorGrams; });
    const meanError = errors.reduce(function(a,b){return a+b;},0) / errors.length;
    const passed = this.verificationHistory.filter(function(v){ return v.passed; }).length;
    return {
      totalVerifications: this.verificationHistory.length, passed: passed,
      failed: this.verificationHistory.length - passed,
      passRate: (passed / this.verificationHistory.length) * 100,
      meanError: meanError, stdDev: 0, maxError: Math.max.apply(null, errors.map(Math.abs)),
      accuracy: this.verificationHistory[this.verificationHistory.length - 1].accuracy
    };
  }

  async measurePrecision(durationMs) {
    if (durationMs == null) durationMs = 5000;
    const readings = [];
    const startTime = Date.now();
    const self = this;
    return new Promise(function(resolve) {
      const interval = setInterval(function() {
        if (!self.motionBlocked && self.isStable) readings.push(self.rawWeight);
        if (Date.now() - startTime >= durationMs) {
          clearInterval(interval);
          if (readings.length < 10) {
            resolve({ grams: 0, stdDev: Infinity, confidence: 0, sampleCount: readings.length });
            return;
          }
          const values = readings.slice().sort(function(a,b){return a-b;});
          const trim = Math.floor(values.length * 0.1);
          const trimmed = values.slice(trim, values.length - trim);
          const mean = trimmed.reduce(function(a,b){return a+b;},0) / trimmed.length;
          const variance = trimmed.reduce(function(a,b){return a+(b-mean)*(b-mean);},0) / trimmed.length;
          const stdDev = Math.sqrt(variance);
          resolve({ grams: mean, stdDev: stdDev, sampleCount: trimmed.length, confidence: Math.max(0, 1 - stdDev / 0.5), targetAchieved: stdDev <= 0.05 });
        }
      }, 50);
    });
  }

  getDeltaA() {
    if (!this.baseline) return 0;
    return Math.sqrt(this.maDx.mean * this.maDx.mean + this.maDy.mean * this.maDy.mean);
  }

  getSurfaceQuality() {
    if (!this.calibrated) return 'unknown';
    if (this.sensitivity > 300) return 'excellent';
    if (this.sensitivity > 180) return 'good';
    if (this.sensitivity > 80) return 'ok';
    return 'poor';
  }

  getCalibrationQuality() {
    return { points: this.multiCal.getPointCount(), r2: this.multiCal.quality, sensitivity: this.sensitivity, isQuadratic: this.multiCal.degree === 2 };
  }

  _saveCalibration() {
    try {
      const cal = {
        sensitivity: this.sensitivity, baseline: this.baseline, calibrated: this.calibrated,
        multiCal: { points: this.multiCal.points, degree: this.multiCal.degree },
        verificationHistory: this.verificationHistory, timestamp: Date.now()
      };
      if (typeof localStorage !== 'undefined') localStorage.setItem('phoneway_v4_calibration', JSON.stringify(cal));
      window._phonewayCal = cal;
    } catch (e) {}
  }

  _loadCalibration() {
    try {
      let saved = typeof localStorage !== 'undefined' ? localStorage.getItem('phoneway_v4_calibration') : null;
      if (!saved && window._phonewayCal) saved = JSON.stringify(window._phonewayCal);
      if (!saved) return false;
      const cal = JSON.parse(saved);
      if (!(cal.sensitivity && cal.baseline)) return false;
      this.calibrationAgeMs = cal.timestamp ? Math.max(0, Date.now() - cal.timestamp) : 0;
      this.calibrationStale = this.calibrationAgeMs > 30 * 24 * 60 * 60 * 1000;
      this.sensitivity = cal.sensitivity;
      this.baseline = cal.baseline;
      this.calibrated = cal.calibrated || false;
      if (cal.multiCal) {
        this.multiCal.points = cal.multiCal.points || [];
        this.multiCal.degree = cal.multiCal.degree || 1;
        this.multiCal._fit();
      }
      if (cal.verificationHistory) this.verificationHistory = cal.verificationHistory;
      return true;
    } catch (e) { return false; }
  }

  reset() {
    this.baseline = null; this.calibrated = false; this.sensitivity = 150;
    this.multiCal.clear(); this.verificationHistory = [];
    this.kalmanX.reset(); this.kalmanY.reset(); this.kalmanZ.reset();
    this.maDx.reset(); this.maDy.reset(); this.stabilityCheck.reset(); this.emaWeight.reset();
    this.displayWeight = 0; this.rawWeight = 0; this.lastDisplayValue = 0; this.stableCounter = 0;
    this._tare_in_progress = false;
    try { if (typeof localStorage !== 'undefined') localStorage.removeItem('phoneway_v4_calibration'); } catch (e) {}
    if (window._phonewayCal) delete window._phonewayCal;
  }
}

export { SimpleScale, MovingAverage, EMA, SimpleKalman, MultiPointCalibration };
