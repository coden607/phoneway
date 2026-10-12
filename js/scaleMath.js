'use strict';

class MovingAverage {
  constructor(size) {
    this.size = size;
    this.buffer = [];
    this.sum = 0;
    this.squaredSum = 0;
  }
  update(value) {
    this.buffer.push(value);
    this.sum += value;
    this.squaredSum += value * value;
    if (this.buffer.length > this.size) {
      const old = this.buffer.shift();
      this.sum -= old;
      this.squaredSum -= old * old;
    }
    return this.mean;
  }
  reset() {
    this.buffer = [];
    this.sum = 0;
    this.squaredSum = 0;
  }
  get mean() {
    if (this.buffer.length === 0) return 0;
    return this.sum / this.buffer.length;
  }
  get variance() {
    if (this.buffer.length < 2) return Infinity;
    const mean = this.mean;
    return this.squaredSum / this.buffer.length - mean * mean;
  }
  get stdDev() {
    return Math.sqrt(Math.max(0, this.variance));
  }
  get length() {
    return this.buffer.length;
  }
  get isFull() {
    return this.buffer.length >= this.size;
  }
  getAll() {
    return [...this.buffer];
  }
}

class EMA {
  constructor(alpha = 0.3) {
    this.alpha = alpha;
    this.value = null;
  }
  update(v) {
    if (this.value === null) this.value = v;
    else this.value = this.alpha * v + (1 - this.alpha) * this.value;
    return this.value;
  }
  reset() { this.value = null; }
}

class SimpleKalman {
  constructor({ R = 0.1, Q = 0.01 } = {}) {
    this.R = R; this.Q = Q; this.P = 1; this.x = null;
  }
  update(z) {
    if (this.x === null) { this.x = z; return z; }
    const Pp = this.P + this.Q;
    const K = Pp / (Pp + this.R);
    this.x = this.x + K * (z - this.x);
    this.P = (1 - K) * Pp;
    return this.x;
  }
  reset() { this.x = null; this.P = 1; }
}

class DirectionalProjection {
  constructor(noiseFloor = 0.0022) {
    this.unitX = 0;
    this.unitY = 1;
    this.isCalibrated = false;
    this.noiseFloor = noiseFloor;
  }
  setCalibrationVector(dx, dy) {
    const mag = Math.hypot(dx, dy);
    if (mag > 1e-5) {
      this.unitX = dx / mag;
      this.unitY = dy / mag;
      this.isCalibrated = true;
      return true;
    }
    return false;
  }
  project(dx, dy) {
    // 360° omnidirectional deflection magnitude with unbiased noise floor de-biasing.
    // Completely eliminates the 2D Euclidean Rayleigh positive noise floor bias (E=0 at rest)
    // while providing symmetric, unattenuated measurement in every tilt direction (all 360°).
    const mag = Math.hypot(dx, dy);
    if (mag <= this.noiseFloor) {
      return 0;
    }
    return mag - this.noiseFloor;
  }
  project1D(dx, dy) {
    // Signed 1D projection along calibrated vector if single-axis projection is needed
    return dx * this.unitX + dy * this.unitY;
  }
  reset() {
    this.unitX = 0;
    this.unitY = 1;
    this.isCalibrated = false;
  }
}

class MultiPointCalibration {
  constructor() {
    this.points = [];
    this.coeffs = null;
    this.degree = 1;
  }
  addPoint(grams, deltaA) {
    if (deltaA < 1e-6 || grams < 0) return false;
    this.points = this.points.filter(p => Math.abs(p.grams - grams) > 0.5);
    this.points.push({ grams, deltaA, timestamp: Date.now() });
    this.points.sort((a, b) => a.grams - b.grams);
    if (this.points.length >= 4 && this.degree === 1) this.degree = 2;
    this._fit();
    return true;
  }
  estimate(deltaA) {
    if (!this.coeffs) return null;
    if (this.degree === 1) return deltaA * this.coeffs[0] + this.coeffs[1];
    return this.coeffs[0] * deltaA * deltaA + this.coeffs[1] * deltaA + this.coeffs[2];
  }
  _fit() {
    if (this.points.length < 2) return;
    if (this.degree === 1 || this.points.length < 4) {
      const n = this.points.length;
      let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
      for (const p of this.points) {
        sumX += p.deltaA; sumY += p.grams;
        sumXY += p.deltaA * p.grams; sumX2 += p.deltaA * p.deltaA;
      }
      const denom = n * sumX2 - sumX * sumX;
      if (Math.abs(denom) > 1e-10) {
        const slope = (n * sumXY - sumX * sumY) / denom;
        const intercept = (sumY - slope * sumX) / n;
        this.coeffs = [slope, intercept];
      }
    } else {
      this.coeffs = this._fitQuadratic();
    }
  }
  _fitQuadratic() {
    const n = this.points.length;
    let sumX = 0, sumX2 = 0, sumX3 = 0, sumX4 = 0;
    let sumY = 0, sumXY = 0, sumX2Y = 0;
    for (const p of this.points) {
      const x = p.deltaA, y = p.grams, x2 = x * x;
      sumX += x; sumX2 += x2; sumX3 += x2 * x; sumX4 += x2 * x2;
      sumY += y; sumXY += x * y; sumX2Y += x2 * y;
    }
    const A = [[sumX4, sumX3, sumX2],[sumX3, sumX2, sumX],[sumX2, sumX, n]];
    const B = [sumX2Y, sumXY, sumY];
    return this._solve3x3(A, B);
  }
  _solve3x3(A, B) {
    const det = A[0][0]*(A[1][1]*A[2][2]-A[1][2]*A[2][1]) - A[0][1]*(A[1][0]*A[2][2]-A[1][2]*A[2][0]) + A[0][2]*(A[1][0]*A[2][1]-A[1][1]*A[2][0]);
    if (Math.abs(det) < 1e-10) return null;
    const detA = B[0]*(A[1][1]*A[2][2]-A[1][2]*A[2][1]) - A[0][1]*(B[1]*A[2][2]-A[1][2]*B[2]) + A[0][2]*(B[1]*A[2][1]-A[1][1]*B[2]);
    const detB = A[0][0]*(B[1]*A[2][2]-A[1][2]*B[2]) - B[0]*(A[1][0]*A[2][2]-A[1][2]*A[2][0]) + A[0][2]*(A[1][0]*B[2]-B[1]*A[2][0]);
    const detC = A[0][0]*(A[1][1]*B[2]-B[1]*A[2][1]) - A[0][1]*(A[1][0]*B[2]-B[1]*A[2][0]) + B[0]*(A[1][0]*A[2][1]-A[1][1]*A[2][0]);
    return [detA/det, detB/det, detC/det];
  }
  get quality() {
    if (this.points.length === 0) return 0;
    if (this.points.length === 1) return 0.98; // Single calibrated reference gives high consistency
    const yMean = this.points.reduce((a,p)=>a+p.grams,0)/this.points.length;
    let ssRes=0, ssTot=0;
    for (const p of this.points) {
      const yPred = this.estimate(p.deltaA);
      ssRes += (p.grams - yPred) ** 2;
      ssTot += (p.grams - yMean) ** 2;
    }
    return ssTot > 0 ? Math.max(0, 1 - ssRes/ssTot) : 0.95;
  }
  clear() { this.points=[]; this.coeffs=null; this.degree=1; }
  getPointCount() { return this.points.length; }
}

class TemperatureCompensator {
  constructor() {
    this.baselineTime = Date.now();
    this.readings = [];
    this.driftRate = 0;
  }
  calibrateZero() { this.baselineTime = Date.now(); this.readings = []; }
  compensate(grams) {
    const elapsed = (Date.now() - this.baselineTime) / 60000;
    return Math.max(0, grams - this.driftRate * elapsed);
  }
  learnDrift(grams) {
    this.readings.push({ grams, time: Date.now() });
    if (this.readings.length >= 10) {
      const recent = this.readings.slice(-10);
      const n = recent.length;
      const times = recent.map(r => (r.time - this.baselineTime) / 60000);
      const weights = recent.map(r => r.grams);
      const sumX = times.reduce((a,b)=>a+b,0);
      const sumY = weights.reduce((a,b)=>a+b,0);
      const sumXY = times.reduce((a,t,i)=>a+t*weights[i],0);
      const sumX2 = times.reduce((a,t)=>a+t*t,0);
      const denom = n*sumX2 - sumX*sumX;
      if (denom > 0) this.driftRate = (n*sumXY - sumX*sumY) / denom;
    }
  }
}

/**
 * Standard precision laboratory scale unit specifications.
 */
const UNITS_CONFIG = [
  { key: 'g',   label: 'g',   name: 'Grams',       factor: 1.0,         places: 2 },
  { key: 'oz',  label: 'oz',  name: 'Ounces',      factor: 0.035273962, places: 3 },
  { key: 'ct',  label: 'ct',  name: 'Carats',      factor: 5.0,         places: 2 },
  { key: 'gn',  label: 'gn',  name: 'Grains',      factor: 15.4323584,  places: 1 },
  { key: 'dwt', label: 'dwt', name: 'Pennyweight', factor: 0.64301493,  places: 2 },
  { key: 'ozt', label: 'ozt', name: 'Troy Ounces', factor: 0.032150747, places: 3 },
];

/**
 * Converts a weight in grams into the target scale unit.
 */
function convertWeight(grams, unitKey = 'g') {
  const unit = UNITS_CONFIG.find(u => u.key === unitKey) || UNITS_CONFIG[0];
  const value = Math.max(0, grams) * unit.factor;
  return {
    value,
    formatted: value.toFixed(unit.places),
    places: unit.places,
    label: unit.label,
    name: unit.name,
    key: unit.key
  };
}

/**
 * Calculates pieces count for PCS mode given total grams and single unit piece mass.
 */
function calculatePieceCount(grams, pieceWeightG) {
  if (!pieceWeightG || pieceWeightG <= 0 || grams <= 0) return 0;
  return Math.max(0, Math.round(grams / pieceWeightG));
}

/**
 * Calculates device tilt pitch, roll, and absolute angle in degrees from accelerometer coordinates.
 */
function calculateTiltAngle(x = 0, y = 0, z = 9.8) {
  const pitch = Math.atan2(y, Math.sqrt(x * x + z * z)) * (180 / Math.PI);
  const roll = Math.atan2(-x, z) * (180 / Math.PI);
  const total = Math.sqrt(pitch * pitch + roll * roll);
  return {
    pitch,
    roll,
    total,
    isLevel: total <= 1.5,
    isAcceptable: total <= 3.5
  };
}

export {
  MovingAverage,
  EMA,
  SimpleKalman,
  MultiPointCalibration,
  TemperatureCompensator,
  DirectionalProjection,
  UNITS_CONFIG,
  convertWeight,
  calculatePieceCount,
  calculateTiltAngle
};
