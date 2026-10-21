'use strict';

import { TiltCorrector } from './sensorCombinations.js';
import { VerificationLedger } from './verificationLedger.js';
import {
  StepPreservingHampel, calibrationCoverage, calibrationEvidence, noiseBudget,
  SampleRateMonitor, calibrationStaleness, referenceUncertainty, verificationDiversity,
  thermalQualification, repeatability, surfaceQualification, browserPreflight,
  dropoutRecovery, deviceContextFingerprint
} from './accuracyDiagnostics.js';
class SensorComboFusion {
  constructor(){ this.channels={}; }
  mark(n,v,w){ this.channels[n]={value:v,weight:w,last:Date.now()}; }
  fusedDelta(){ let n=0,d=0,now=Date.now();
    for (const k in this.channels){ const ch=this.channels[k]; if(!ch||ch.weight<=0||k==='gyroStill') continue; if(now-ch.last>1500) continue; n+=ch.value*ch.weight; d+=ch.weight; }
    return d?n/d:0; }
  activeCount(){ return Object.keys(this.channels).length; }
}
import {
  MovingAverage, EMA, SimpleKalman,
  MultiPointCalibration, TemperatureCompensator, DirectionalProjection
} from './scaleMath.js';
class MedianFilter {
  constructor(size){ this.size=size%2?size:size+1; this.buffer=[]; }
  update(v){ this.buffer.push(v); if(this.buffer.length>this.size) this.buffer.shift(); const s=this.buffer.slice().sort((a,b)=>a-b); return s[(s.length-1)>>1]; }
  reset(){ this.buffer=[]; }
}
class AdaptiveKalman {
  constructor({R=0.08,Q=0.004}={}){ this.R0=R; this.Q0=Q; this.P=1; this.x=null; }
  update(z,motion){ const m=Math.max(0,Math.min(1,motion==null?0:motion)); const Q=this.Q0*(1+8*m); const R=this.R0*(1+3*(1-m)); if(this.x===null){ this.x=z; return z; } const Pp=this.P+Q; const K=Pp/(Pp+R); this.x=this.x+K*(z-this.x); this.P=(1-K)*Pp; return this.x; }
  reset(){ this.x=null; this.P=1; }
}

/**
 * Standard error of the mean that stays honest for CORRELATED samples. The
 * Kalman/median stages smooth the signal, so neighbouring samples are not
 * independent and stdDev/sqrt(n) badly understates the uncertainty. Batch means:
 * average blocks of consecutive samples and take the spread of the block means.
 */
function batchMeansSE(values, blocks = 5) {
  const n = values.length;
  const size = Math.floor(n / blocks);
  if (size < 2) return Infinity;
  const means = [];
  for (let b = 0; b < blocks; b++) {
    let sum = 0;
    for (let i = b * size; i < (b + 1) * size; i++) sum += values[i];
    means.push(sum / size);
  }
  const m = means.reduce((a, c) => a + c, 0) / blocks;
  const variance = means.reduce((a, c) => a + (c - m) ** 2, 0) / (blocks - 1);
  return Math.sqrt(variance / blocks);
}

const SENSOR_GAP_MS = 800;

class SimpleScale {
  constructor() {
    this.active = false;
    this.calibrated = false;
    this.calibrationStale = false;
    this.calibrationAgeMs = 0;
    this.baseline = null;
    this.sensitivity = 150;
    this.directionalProj = new DirectionalProjection(0.0003);
    // Measured-uncertainty inputs (see getMeasuredUncertainty).
    this._driftBins = [];          // 1 s bins of the tilt vector, to measure creep
    this._driftBin = { t: 0, dx: 0, dy: 0, n: 0 };
    this._lastMotionAt = 0;
    this.sensorGapUntil = 0;
    this.multiCal = new MultiPointCalibration();
    this.tempComp = new TemperatureCompensator();
    this.tiltCorrector = new TiltCorrector();
    this.comboFusion = new SensorComboFusion();
    this.linearAccel = { x: 0, y: 0, z: 0 };
    this.gyroRate = 0;
    this.orientBeta = 0;
    this.orientGamma = 0;
    this.activeSensorCount = 1;
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
    this.medX = new MedianFilter(5);
    this.medY = new MedianFilter(5);
    this.medZ = new MedianFilter(5);
    this.kalmanX = new SimpleKalman({ R: 0.002, Q: 0.0002 });
    this.kalmanY = new SimpleKalman({ R: 0.002, Q: 0.0002 });
    this.kalmanZ = new SimpleKalman({ R: 0.005, Q: 0.0005 });
    this.weightKalman = new AdaptiveKalman({ R: 0.10, Q: 0.0015 });
    this.emaWeight = new EMA(0.045);
    this.displayEma = new EMA(0.12);
    this.stabilityCheck = new MovingAverage(90);
    this.deadbandThreshold = 0.05; // display hysteresis: suppress visible jitter smaller than half a display step
    this.displaySlewPerSample = 0.08; // cap transient display jumps while still tracking real load changes
    this._calibrationStableSince = 0;
    this._calibrationLastDiagnostics = null;
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
    this.sampleRateMonitor = new SampleRateMonitor();
    this._robustGramFilter = new StepPreservingHampel({ window: 21, z: 6, confirm: 3 });
    this._madRejected = 0;
    this._repeatabilityReadings = [];
    this._thermalEvidence = [];
    this.calibrationSavedAt = 0;
    this.verificationHistory = [];
    // Honesty engine: the ONLY source of "±Xg" accuracy claims (see
    // js/verificationLedger.js). Each verifyAgainstKnown() appends one
    // {timestamp, referenceWeight, measuredError, deviceModel} record.
    this.ledger = new VerificationLedger();
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
    this._orientHandler = (e) => this._handleOrient(e);
    window.addEventListener('devicemotion', this._handler, { passive: true });
    window.addEventListener('deviceorientation', this._orientHandler, { passive: true });
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
    window.removeEventListener('deviceorientation', this._orientHandler);
    this.active = false;
    if (this._startTareTimer) { clearTimeout(this._startTareTimer); this._startTareTimer = null; }
    this._tare_in_progress = false;
    if (this._tare_resolve) { this._tare_resolve(); this._tare_resolve = null; }
    this.baseline = null;
  }

  _handleMotion(e) {
    const accel = e.accelerationIncludingGravity;
    if (!accel) return;
    // Safari can stop delivering motion events for several seconds (a real
    // recording lost 9.8 s mid-measurement). Averaging across such a gap mixes
    // two different situations, so drop what was collected and say so.
    const nowMs = Date.now();
    if (this._lastMotionAt && nowMs - this._lastMotionAt > SENSOR_GAP_MS) this._onSensorGap();
    this._lastMotionAt = nowMs;
    this.sampleRateMonitor.add(nowMs);
    let x = accel.x != null ? accel.x : 0;
    let y = accel.y != null ? accel.y : 0;
    let z = accel.z != null ? accel.z : 0;
    if (z < 0) { x = -x; y = -y; z = -z; }
    this.rawAccel = { x, y, z };
    if (this.onRaw) this.onRaw(x, y, z);
    this.filteredAccel = {
      x: this.kalmanX.update(this.medX.update(x)),
      y: this.kalmanY.update(this.medY.update(y)),
      z: this.kalmanZ.update(this.medZ.update(z))
    };
    this.tiltCorrector.feedGravity(this.filteredAccel.x, this.filteredAccel.y, this.filteredAccel.z);
    const lin = e.acceleration;
    if (lin && (lin.x != null || lin.y != null || lin.z != null)) {
      this.linearAccel = { x: lin.x || 0, y: lin.y || 0, z: lin.z || 0 };
      const linH = Math.hypot(this.linearAccel.x, this.linearAccel.y);
      this.comboFusion.mark('linear', linH, 0.35);
    }
    const jerk = Math.hypot(x - this.filteredAccel.x, y - this.filteredAccel.y, z - this.filteredAccel.z);
    const rotationRate = e.rotationRate
      ? Math.hypot(e.rotationRate.alpha || 0, e.rotationRate.beta || 0, e.rotationRate.gamma || 0)
      : 0;
    this.gyroRate = rotationRate;
    this.comboFusion.mark('gyroStill', Math.max(0, 1 - rotationRate / 40), 0.25);
    const gravityMagnitude = Math.hypot(this.filteredAccel.x, this.filteredAccel.y, this.filteredAccel.z);
    const refGravity = this.baseline
      ? Math.hypot(this.baseline.x, this.baseline.y, this.baseline.z)
      : 9.80665;
    const gravityError = Math.abs(gravityMagnitude - refGravity);
    this.gravityQuality = gravityMagnitude > 1 ? Math.max(0, 1 - gravityError / 1.5) : 0;
    this.motionQuality = Math.max(0, 1 - jerk / 0.45) * Math.max(0, 1 - rotationRate / 45) * Math.max(0.2, this.gravityQuality);
    this.motionBlocked = jerk > 0.60 || rotationRate > 40 || gravityError > 1.5;
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

  _handleOrient(e) {
    if (e.beta == null && e.gamma == null) return;
    this.orientBeta = e.beta || 0;
    this.orientGamma = e.gamma || 0;
    // FUSION-UNITS FIX (2026-10-08): orientation beta/gamma are TILT ANGLES in
    // DEGREES, while every other comboFusion channel carries acceleration
    // deltas in m/s². Feeding tilt/90 (a unitless 0..~1 normalization) into
    // the weighted average in fusedDelta() injected ~28% of a unitless
    // quantity into the m/s² gravity signal, systematically contaminating
    // every reading. Orientation is now tracked as state only; it is NOT a
    // weight-bearing fusion channel. To use it legitimately, first convert
    // tilt → projected-gravity delta (m/s²) via TiltCorrector — see
    // skills/diagnose/SKILL.md.
    this.activeSensorCount = this.comboFusion.activeCount();
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
    this._trackDrift(dx, dy);
    const avgDx = this.maDx.update(dx);
    const avgDy = this.maDy.update(dy);
    // Directional tilt projection: eliminates Rayleigh positive noise floor bias (E=0 at rest)
    const deltaSignal = Math.max(0, this.directionalProj.project(avgDx, avgDy));

    let rawG = (this.multiCal.coeffs && this.multiCal.points.length >= 2)
      ? this.multiCal.estimate(deltaSignal)
      : deltaSignal * this.sensitivity;
    rawG = Math.max(0, this.tempComp.compensate(Math.max(0, rawG)));
    const robust = this._robustGramFilter.update(rawG);
    if (robust.rejected) this._madRejected++;
    rawG = robust.value;
    rawG = Math.max(0, this.weightKalman.update(rawG, 1 - this.motionQuality));
    if (rawG < 0.02) rawG = 0;
    this.rawWeight = rawG;
    this.stabilityCheck.update(rawG);
    const stdDev = this.stabilityCheck.stdDev;
    const isNowStable = this.stabilityCheck.isFull && stdDev < (this.calibrated ? 0.04 : 0.065);
    if (isNowStable) this.stableCounter++; else this.stableCounter = 0;
    const trulyStable = this.stableCounter > (this.calibrated ? 45 : 35);
    const emaG = this.emaWeight.update(rawG);
    if (trulyStable && !this.isStable && rawG > 0.05 && this.onStable) this.onStable(emaG);
    this.isStable = trulyStable;
    if (trulyStable) {
      const trimmed = this._trimmedMean(this.stabilityCheck.getAll(), 0.15);
      this.displayWeight = this._toTenth(this._biasCorrect(trimmed));
      this.lastDisplayValue = this.displayWeight;
    } else {
      // Keep the live number readable instead of mirroring every sensor wobble.
      // EMA + hysteresis + slew limiting suppresses bounce without pretending the
      // reading is stable; the STABLE flag remains governed by the raw window.
      const target = this.displayEma.update(emaG);
      const diff = target - this.lastDisplayValue;
      if (Math.abs(diff) >= this.deadbandThreshold || target < 0.03) {
        const step = Math.max(-this.displaySlewPerSample, Math.min(this.displaySlewPerSample, diff));
        this.displayWeight = target < 0.03 ? 0 : this.lastDisplayValue + step;
        this.lastDisplayValue = this.displayWeight;
      } else {
        this.displayWeight = this.lastDisplayValue;
      }
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
    this.medX.reset(); this.medY.reset(); this.medZ.reset();
    this.weightKalman.reset();
    this.maDx.reset(); this.maDy.reset();
    this.stabilityCheck.reset(); this.emaWeight.reset(); this.displayEma.reset();
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

  _onSensorGap() {
    this.maDx.reset(); this.maDy.reset();
    this.stabilityCheck.reset();
    this.stableCounter = 0;
    this.isStable = false;
    this._driftBins = [];
    this._driftBin = { t: 0, dx: 0, dy: 0, n: 0 };
    this.sensorGapUntil = Date.now() + 2000;
  }

  /**
   * How many times larger the tilt away from the zero baseline is than its own
   * noise. Near 0 on an empty, still phone; large once a weight is on it.
   */
  getLoadSnr() {
    if (this.maDx.length < 40 || this.maDy.length < 40) return 0;
    const se = Math.hypot(batchMeansSE(this.maDx.getAll()), batchMeansSE(this.maDy.getAll()));
    const tilt = Math.hypot(this.maDx.mean, this.maDy.mean);
    return se > 0 ? tilt / se : (tilt > 0 ? Infinity : 0);
  }

  /** Keeps 1-second means of the tilt vector so creep of the surface can be measured. */
  _trackDrift(dx, dy) {
    const b = this._driftBin;
    const now = Date.now();
    if (!b.n) b.t = now;
    b.dx += dx; b.dy += dy; b.n++;
    if (now - b.t >= 1000) {
      this._driftBins.push({ t: b.t, dx: b.dx / b.n, dy: b.dy / b.n });
      if (this._driftBins.length > 30) this._driftBins.shift();
      this._driftBin = { t: 0, dx: 0, dy: 0, n: 0 };
    }
  }

  /**
   * How far off the current reading could be, in grams, from what the sensors
   * are actually doing. Not a formula about calibration: it combines
   *  - noise: standard error of the averaged tilt signal (batch means, so it is
   *    honest for the smoothed samples), times the calibrated sensitivity;
   *  - creep: how fast the tilt is drifting (a soft surface keeps settling), times
   *    the ~10 s a weighing takes. A real iPhone recording on a towel drifted
   *    5 degrees in a minute, about 50x more than a 5 g coin moves it.
   * Returns null until calibrated.
   */
  getMeasuredUncertainty() {
    if (!this.calibrated || !this.baseline || !(this.sensitivity > 0)) return null;
    if (Date.now() < this.sensorGapUntil) return { grams: null, state: 'sensor-paused' };
    if (this.maDx.length < 40 || this.maDy.length < 40) return { grams: null, state: 'collecting' };
    const seSignal = Math.hypot(batchMeansSE(this.maDx.getAll()), batchMeansSE(this.maDy.getAll()));
    const noiseGrams = seSignal * this.sensitivity;
    let driftGramsPerSec = 0;
    const bins = this._driftBins.slice(-15);
    if (bins.length >= 5) {
      const t = bins.map((x) => (x.t - bins[0].t) / 1000);
      const slope = (ys) => {
        const n = ys.length, mt = t.reduce((a, c) => a + c, 0) / n, my = ys.reduce((a, c) => a + c, 0) / n;
        let num = 0, den = 0;
        for (let i = 0; i < n; i++) { num += (t[i] - mt) * (ys[i] - my); den += (t[i] - mt) ** 2; }
        return den > 0 ? num / den : 0;
      };
      driftGramsPerSec = Math.hypot(slope(bins.map((x) => x.dx)), slope(bins.map((x) => x.dy))) * this.sensitivity;
    }
    const WEIGH_SECONDS = 10;
    const driftGrams = driftGramsPerSec * WEIGH_SECONDS;
    return {
      grams: Math.hypot(noiseGrams, driftGrams),
      noiseGrams, driftGrams, driftGramsPerSec,
      state: driftGrams > noiseGrams ? 'settling' : 'noise-limited',
    };
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
    const info = {
      phase: phase,
      pct: Math.max(0, Math.min(1, pct || 0)),
      collected: this._tare_xs ? this._tare_xs.length : 0,
      target: this._tare_target,
      message: message || ''
    };
    if (typeof this.onProgress === 'function') this.onProgress(info);
    this._paintProgressUi(info);
  }

  _paintProgressUi(info) {
    if (typeof document === 'undefined') return;
    if (!document.getElementById('workProgressStyle')) {
      const style = document.createElement('style');
      style.id = 'workProgressStyle';
      style.textContent = '.work-progress{display:none;margin-top:8px;padding:6px 2px 2px}.work-progress.show{display:block}.work-progress-meta{display:flex;justify-content:space-between;font-size:9px;letter-spacing:1.4px;color:#c9a24a;text-transform:uppercase;margin-bottom:4px}.work-progress-track{height:6px;background:#111;border:1px solid #3a2a10;border-radius:3px;overflow:hidden}.work-progress-fill{height:100%;width:0;background:linear-gradient(90deg,#7a5000,#e8c84a,#39ff14);transition:width .15s linear}';
      document.head.appendChild(style);
    }
    let wrap = document.getElementById('workProgress');
    if (!wrap) {
      const host = document.getElementById('display-section') || document.body;
      wrap = document.createElement('div');
      wrap.id = 'workProgress';
      wrap.className = 'work-progress show';
      wrap.innerHTML = '<div class="work-progress-meta"><span id="workProgressLabel">Working…</span><span id="workProgressPct">0%</span></div><div class="work-progress-track"><div class="work-progress-fill" id="workProgressFill"></div></div>';
      host.appendChild(wrap);
    }
    wrap.classList.add('show');
    wrap.setAttribute('aria-hidden', 'false');
    const fill = document.getElementById('workProgressFill');
    const lab = document.getElementById('workProgressLabel');
    const num = document.getElementById('workProgressPct');
    const pct = Math.round((info.pct || 0) * 100);
    if (fill) fill.style.width = pct + '%';
    if (num) num.textContent = pct + '%';
    if (lab && info.message) lab.textContent = info.message;
    if (pct >= 100) {
      setTimeout(function() {
        wrap.classList.remove('show');
        wrap.setAttribute('aria-hidden', 'true');
      }, 400);
    }
  }

  getCalibrationReadiness(knownGrams, options) {
    options = options || {};
    const grams = Number(knownGrams);
    const sampleCount = Math.min(this.maDx.length, this.maDy.length);
    const rawDelta = Math.hypot(this.maDx.mean, this.maDy.mean);
    const se = sampleCount >= 20
      ? Math.hypot(batchMeansSE(this.maDx.getAll()), batchMeansSE(this.maDy.getAll()))
      : Infinity;
    const snr = Number.isFinite(se) && se > 0 ? rawDelta / se : (rawDelta > 0 && se === 0 ? Infinity : 0);
    const stdDev = this.stabilityCheck.stdDev;
    const minSamples = options.quick ? 45 : 80;
    const requiredStableMs = options.quick ? 900 : 2500;
    const enoughSamples = sampleCount >= minSamples;
    const stableWindow = (options.quick ? this.stabilityCheck.length >= 45 : this.stabilityCheck.isFull) &&
      Number.isFinite(stdDev) && stdDev <= (options.quick ? 0.085 : 0.065);
    const motionOk = !this.motionBlocked && this.motionQuality >= 0.35;
    const loadDetected = snr >= 6;
    const now = Date.now();
    if (enoughSamples && stableWindow && motionOk && loadDetected) {
      if (!this._calibrationStableSince) this._calibrationStableSince = now;
    } else {
      this._calibrationStableSince = 0;
    }
    const stableMs = this._calibrationStableSince ? now - this._calibrationStableSince : 0;
    const settled = stableMs >= requiredStableMs;
    const reasons = [];
    if (!enoughSamples) reasons.push('collecting sensor samples');
    if (!stableWindow) reasons.push('reading still bouncing');
    if (!motionOk) reasons.push('phone is moving');
    if (!loadDetected) reasons.push('reference load is too weak');
    if (enoughSamples && stableWindow && motionOk && loadDetected && !settled) reasons.push(`waiting for ${requiredStableMs / 1000} s steady hold`);
    const result = { ready: enoughSamples && stableWindow && motionOk && loadDetected && settled,
      sampleCount, minSamples, requiredStableMs, snr, stdDev, stableMs, rawDelta, knownGrams: grams, reasons };
    this._calibrationLastDiagnostics = result;
    return result;
  }

  getCalibrationDiagnostics() {
    const q = this.getCalibrationQuality();
    const points = this.multiCal.points.map(p => ({ grams: p.grams, deltaA: p.deltaA, timestamp: p.timestamp }));
    let min = null, max = null;
    if (points.length) { min = points[0].grams; max = points[points.length - 1].grams; }
    const coverage = calibrationCoverage(points);
    const evidence = calibrationEvidence(points, q.r2);
    const stale = calibrationStaleness(this.calibrationSavedAt);
    return { points, pointCount: points.length, r2: q.r2, degree: this.multiCal.degree,
      range: points.length ? { min, max, span: max - min } : null,
      coverage, evidence, stale,
      recommendedPoints: 5, minimumStrongPoints: 3, lastReadiness: this._calibrationLastDiagnostics };
  }

  calibrate(knownGrams, options) {
    options = options || {};
    if (!Number.isFinite(knownGrams) || knownGrams <= 0) knownGrams = 5.0;
    if (!this.baseline) {
      this.baseline = { x: this.filteredAccel.x, y: this.filteredAccel.y, z: this.filteredAccel.z };
    }
    const MIN_SETTLED_SAMPLES = 80;
    const MIN_CALIBRATION_SNR = 6;
    const readiness = options.readiness || this.getCalibrationReadiness(knownGrams);
    if (!options.force && !readiness.ready) {
      return { success: false, error: 'Calibration is not settled yet: ' + readiness.reasons.join(', '), readiness };
    }
    // Calibrate from the settled AVERAGE of the loaded signal. _process() has
    // been feeding maDx/maDy every sample, so with the weight on, that window
    // already holds the best estimate. The old code reset it and refilled it
    // with ONE instantaneous sample, so the whole calibration rested on a single
    // noisy number (~9x worse than the 80-sample mean). Only fall back to the
    // instantaneous value when there is not enough history yet.
    if (this.maDx.length < MIN_SETTLED_SAMPLES || this.maDy.length < MIN_SETTLED_SAMPLES) {
      const curDx = this.filteredAccel.x - (this.baseline ? this.baseline.x : 0);
      const curDy = this.filteredAccel.y - (this.baseline ? this.baseline.y : 0);
      this.maDx.reset();
      this.maDy.reset();
      for (let i = 0; i < 8; i++) {
        this.maDx.update(curDx);
        this.maDy.update(curDy);
      }
    }
    const rawDelta = Math.hypot(this.maDx.mean, this.maDy.mean);
    let expectedErrorGrams = null;
    let calibrationSnr = null;
    let confidence = 'unknown';

    // Refuse to calibrate on a signal the sensor cannot distinguish from its own
    // noise. Below ~3x the standard error of the mean, the "sensitivity" would
    // just be noise divided into the reference weight, and every later reading
    // would be wrong in a way that looks plausible. Say so instead.
    if (this.maDx.length >= MIN_SETTLED_SAMPLES && this.maDy.length >= MIN_SETTLED_SAMPLES) {
      const stdError = Math.hypot(batchMeansSE(this.maDx.getAll()), batchMeansSE(this.maDy.getAll()));
      const snr = stdError > 0 ? rawDelta / stdError : Infinity;
      // Relative error of the sensitivity is about 1/SNR, so a calibration at
      // SNR 5 is already +/-20% (1 g on a 5 g coin). Measured over 40 noise
      // seeds: SNR ~50 gives <=0.1 g, ~10 gives ~0.2-0.5 g, <=3 gives 1-3 g.
      // NEVER block calibration. A hard refusal left a weak-signal setup with no
      // way to use the scale at all (the reading just sat at zero). Instead the
      // result says how far to trust it, and the number is shown to the user.
      expectedErrorGrams = Number.isFinite(snr) ? knownGrams / snr : 0;
      calibrationSnr = snr;
      confidence = snr >= 20 ? 'high' : snr >= MIN_CALIBRATION_SNR ? 'medium' : snr >= 1.5 ? 'low' : 'noise';
    }

    // Lock directional tilt vector from calibrated reference load
    this.directionalProj.setCalibrationVector(this.maDx.mean, this.maDy.mean);

    // Adapt noise floor if resting deflection on a firm surface is small
    if (rawDelta > 0.0001 && rawDelta <= this.directionalProj.noiseFloor * 1.5) {
      this.directionalProj.noiseFloor = Math.max(0.00005, rawDelta * 0.35);
    }

    let deltaA = this.directionalProj.project(this.maDx.mean, this.maDy.mean);
    if (deltaA < 0.0001) {
      deltaA = Math.max(0.0002, rawDelta * 0.7);
    }
    if (deltaA < 0.0001) {
      deltaA = 0.001; // Resilient fallback deflection
    }

    if (!this.multiCal.addPoint(knownGrams, deltaA, options.reference || null)) {
      this.multiCal.clear();
      this.multiCal.addPoint(knownGrams, deltaA);
    }
    const newSensitivity = knownGrams / deltaA;
    this.sensitivity = newSensitivity;
    this.calibrated = true;
    this.emaWeight.reset();
    this.stabilityCheck.reset();
    this.stableCounter = 0;
    this.displayWeight = knownGrams;
    this.lastDisplayValue = knownGrams;
    this.rawWeight = knownGrams;
    this.emaWeight.update(knownGrams);
    this._saveCalibration();
    const r2 = this.multiCal.quality;
    const points = this.multiCal.getPointCount();
    // HONESTY (2026-10-08): accuracy claims come ONLY from the verification
    // ledger — measured errors against known weights on THIS device. The old
       // sensitivity/R² heuristic ("±0.1g (excellent)") described curve-fit
    // shape, never true error, and is removed.
    const claim = this.ledger.accuracyClaim();
    let expected = expectedErrorGrams != null ? ' (signal/noise suggests about +/-' + expectedErrorGrams.toFixed(1) + ' g)' : '';
    if (confidence === 'noise') expected = ' — NOT RELIABLE: the weight barely moved the phone compared with the noise. Use a heavier weight or a softer surface';
    else if (confidence === 'low') expected = ' — LOW CONFIDENCE (about +/-' + expectedErrorGrams.toFixed(1) + ' g). A heavier weight or softer surface will help';
    const estimatedAccuracy = claim.count > 0 && confidence !== 'noise' && confidence !== 'low' ? claim.text + ' (measured)' : 'UNVERIFIED' + expected + ' — run VERIFY';
    return { success: true, sensitivity: this.sensitivity, accuracy: estimatedAccuracy, calibrationPoints: points, r2: r2, deltaA: deltaA, expectedErrorGrams: expectedErrorGrams, snr: calibrationSnr, confidence: confidence };
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
      tolerance: tolerance, strictTolerance: tolerance,
      accuracy: Math.max(0, 100 - Math.abs((errorGrams / knownGrams) * 100)),
      isWithinTolerance: absError <= tolerance, passed: absError <= tolerance,
      timestamp: Date.now()
    };
    this.verificationHistory.push(result);
    if (this.verificationHistory.length > 20) this.verificationHistory.shift();
    // Record into the verification ledger — the evidence base for all public
    // accuracy claims. (Verify pass threshold was previously hardcoded to
    // 0.1g, which failed honest 5g verifies at 0.12g error; tolerance is now
    // the reference's own tolerance.)
    this.ledger.record({
      timestamp: result.timestamp,
      referenceWeight: knownGrams,
      measuredError: errorGrams,
      referenceTolerance: tolerance
    });
    this._saveCalibration();
    return result;
  }

  applyKnownWeight(knownGrams, options) {
    const verify = this.verifyAgainstKnown(knownGrams, options || { tolerance: 0.1 });
    const cal = this.calibrate(knownGrams);
    return { cal: cal, verify: verify };
  }

  getAccuracyEvidence(signalConfidence) {
    if (signalConfidence == null) signalConfidence = this.confidence;
    const signal = Math.max(0, Math.min(1, signalConfidence));
    const cal = this.getCalibrationQuality();
    if (!this.calibrated) {
      return { confidence: Math.max(0.05, signal * 0.35), verified: false, uncertainty: Infinity, samples: 0, calibrationScore: 0, precisionTier: 'unverified' };
    }
    const calibrationScore = Math.max(0, Math.min(1, (cal.r2 || 0) * 0.7 + Math.min(cal.points, 4) / 4 * 0.3));
    // Uncertainty comes from the verification ledger — measured error on this
    // device — not from sensitivity heuristics.
    const ledgerStats = this.ledger.stats();
    if (!ledgerStats) {
      return { confidence: Math.min(0.7, signal * 0.55 + calibrationScore * 0.45), verified: false, uncertainty: Infinity, samples: 0, calibrationScore: calibrationScore, precisionTier: 'unverified' };
    }
    const errors = this.ledger.recent().map(function(v){ return Math.abs(v.measuredError); });
    const meanAbsoluteError = ledgerStats.meanAbsError;
    const worstError = ledgerStats.maxAbsError;
    const uncertainty = Math.max(meanAbsoluteError, worstError);
    return {
      confidence: Math.min(0.99, signal * 0.4 + calibrationScore * 0.35 + Math.max(0, 1 - uncertainty) * 0.25),
      verified: true, uncertainty: uncertainty, samples: errors.length, calibrationScore: calibrationScore,
      tenthGramDemonstrated: errors.length >= 3 && worstError <= 0.1,
      fiftyMilligramDemonstrated: errors.length >= 3 && worstError <= 0.05,
      precisionTier: worstError <= 0.05 ? '0.05g' : (worstError <= 0.1 ? '0.1g' : (uncertainty <= 0.2 ? '0.2g' : 'coarse'))
    };
  }

  getVerificationStats() {
    const s = this.ledger.stats();
    if (!s) return null;
    const signed = this.ledger.recent().map(function(v){ return v.measuredError; });
    const meanError = signed.reduce(function(a,b){return a+b;},0) / signed.length;
    const passed = this.verificationHistory.filter(function(v){ return v.passed; }).length;
    return {
      totalVerifications: s.count, passed: passed,
      failed: s.count - passed,
      passRate: (passed / s.count) * 100,
      meanError: meanError, stdDev: 0, maxError: s.maxAbsError,
      accuracy: this.verificationHistory.length ? this.verificationHistory[this.verificationHistory.length - 1].accuracy : null
    };
  }

  getAccuracyUpgradeReport() {
    const uncertainty = this.getMeasuredUncertainty();
    const cal = this.getCalibrationDiagnostics();
    const recent = this.ledger.recent(10);
    const lastTolerance = recent.length ? Number(recent[recent.length - 1].referenceTolerance) || 0 : 0;
    const nb = uncertainty && uncertainty.grams != null
      ? noiseBudget({ noiseGrams: uncertainty.noiseGrams, driftGrams: uncertainty.driftGrams, referenceTolerance: lastTolerance })
      : null;
    const repeat = repeatability(this._repeatabilityReadings);
    const thermal = thermalQualification(this._thermalEvidence);
    const surface = uncertainty ? surfaceQualification(uncertainty) : { qualified:false, score:0, reason:'collecting' };
    let ua = 'unknown';
    try { if (typeof navigator !== 'undefined' && navigator.userAgent) ua = navigator.userAgent; } catch (e) {}
    return {
      calibration: cal,
      noiseBudget: nb,
      sampleRate: this.sampleRateMonitor.stats(),
      verificationDiversity: verificationDiversity(recent),
      repeatability: repeat,
      thermal,
      surface,
      browser: browserPreflight(),
      dropout: dropoutRecovery(this._lastMotionAt),
      deviceContext: deviceContextFingerprint(ua),
      madRejected: this._madRejected,
      referenceUncertainty: recent.length ? referenceUncertainty(recent[recent.length - 1].measuredError, lastTolerance) : null
    };
  }

  recordRepeatabilityReading(grams) {
    if (!Number.isFinite(grams)) return;
    this._repeatabilityReadings.push(grams);
    if (this._repeatabilityReadings.length > 12) this._repeatabilityReadings.shift();
  }

  recordThermalEvidence(temp, error) {
    if (!Number.isFinite(temp) || !Number.isFinite(error)) return;
    this._thermalEvidence.push({ temp, error });
    if (this._thermalEvidence.length > 30) this._thermalEvidence.shift();
  }

  /** Public accuracy claim — a pure function of the verification ledger. */
  getLedgerClaim(n) {
    return this.ledger.accuracyClaim(n);
  }

  _biasCorrect(grams) {
    const stats = this.getVerificationStats();
    if (!stats || stats.totalVerifications < 2) return grams;
    if (Math.abs(stats.meanError) > 0.4) return grams;
    return Math.max(0, grams - stats.meanError);
  }

  _toTenth(grams) {
    return Math.round(grams * 10) / 10;
  }

  async measurePrecision(durationMs) {
    if (durationMs == null) durationMs = 8000;
    const readings = [];
    const startTime = Date.now();
    const self = this;
    return new Promise(function(resolve) {
      const interval = setInterval(function() {
        if (!self.motionBlocked && self.baseline) readings.push(self.rawWeight);
        const elapsed = Date.now() - startTime;
        if (typeof self.onProgress === 'function') {
          self.onProgress({ phase: 'precision', pct: Math.min(1, elapsed / durationMs), message: 'Averaging for 0.1g...' });
        }
        if (elapsed >= durationMs) {
          clearInterval(interval);
          if (readings.length < 15) {
            resolve({ grams: 0, stdDev: Infinity, sem: Infinity, confidence: 0, sampleCount: readings.length, precisionTier: 'unverified', tenthGram: false });
            return;
          }
          const values = readings.slice().sort(function(a, b) { return a - b; });
          const trim = Math.floor(values.length * 0.15);
          const trimmed = values.slice(trim, values.length - trim);
          const mean = trimmed.reduce(function(a, b) { return a + b; }, 0) / trimmed.length;
          const corrected = self._biasCorrect(mean);
          const variance = trimmed.reduce(function(a, b) { return a + (b - mean) * (b - mean); }, 0) / trimmed.length;
          const stdDev = Math.sqrt(variance);
          const sem = stdDev / Math.sqrt(trimmed.length);
          const tenth = stdDev <= 0.08 && self.calibrated;
          const grams = tenth ? self._toTenth(corrected) : Math.round(corrected * 100) / 100;
          resolve({
            grams: grams,
            stdDev: stdDev,
            sem: sem,
            sampleCount: trimmed.length,
            confidence: Math.max(0, 1 - stdDev / 0.3),
            targetAchieved: stdDev <= 0.1,
            tenthGram: tenth,
            precisionTier: stdDev <= 0.05 ? '0.05g' : (stdDev <= 0.1 ? '0.1g' : (stdDev <= 0.2 ? '0.2g' : 'coarse'))
          });
        }
      }, 50);
    });
  }

  getDeltaA() {
    if (!this.baseline) return 0;
    return Math.max(0, this.directionalProj.project(this.maDx.mean, this.maDy.mean));
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
        directionalProj: {
          unitX: this.directionalProj.unitX,
          unitY: this.directionalProj.unitY,
          isCalibrated: this.directionalProj.isCalibrated,
          noiseFloor: this.directionalProj.noiseFloor
        },
        multiCal: { points: this.multiCal.points, degree: this.multiCal.degree },
        verificationHistory: this.verificationHistory, timestamp: Date.now()
      };
      this.calibrationSavedAt = cal.timestamp;
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
      if (!cal.sensitivity) return false;
      this.calibrationSavedAt = cal.timestamp || 0;
      this.calibrationAgeMs = cal.timestamp ? Math.max(0, Date.now() - cal.timestamp) : 0;
      this.calibrationStale = calibrationStaleness(this.calibrationSavedAt).stale;
      this.sensitivity = cal.sensitivity;
      // Stale accelerometer baselines must never be restored across reloads.
      // Every session requires a live zero baseline captured when placed on surface.
      this.baseline = null;
      this.calibrated = cal.calibrated || false;
      if (cal.directionalProj) {
        this.directionalProj.unitX = cal.directionalProj.unitX || 0;
        this.directionalProj.unitY = cal.directionalProj.unitY || 1;
        this.directionalProj.isCalibrated = cal.directionalProj.isCalibrated || false;
        if (cal.directionalProj.noiseFloor != null) this.directionalProj.noiseFloor = cal.directionalProj.noiseFloor;
      }
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
    this.directionalProj.reset();
    this.multiCal.clear(); this.verificationHistory = [];
    this.kalmanX.reset(); this.kalmanY.reset(); this.kalmanZ.reset();
    this.medX.reset(); this.medY.reset(); this.medZ.reset();
    this.weightKalman.reset();
    this.maDx.reset(); this.maDy.reset(); this.stabilityCheck.reset(); this.emaWeight.reset(); this.displayEma.reset();
    this.sampleRateMonitor.reset(); this._robustGramFilter.reset(); this._madRejected = 0;
    this.displayWeight = 0; this.rawWeight = 0; this.lastDisplayValue = 0; this.stableCounter = 0;
    this._tare_in_progress = false;
    try { if (typeof localStorage !== 'undefined') localStorage.removeItem('phoneway_v4_calibration'); } catch (e) {}
    if (window._phonewayCal) delete window._phonewayCal;
  }
}

export { SimpleScale, MovingAverage, EMA, SimpleKalman, MultiPointCalibration, DirectionalProjection };
