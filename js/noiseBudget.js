// Noise-and-sensitivity budget: can this device physically resolve 0.1 g?
//
// detection limit = 3 * sigma / sensitivity        (3-sigma, not a best case)
// averaging N independent readings divides sigma by sqrt(N).
//
// The ledger can only display +/-0.1 g when every one of the last five errors
// is under 0.1 g, so a detection limit above 0.1 g means that claim is not
// physically available and the product must say so.
//


const MIN_SAMPLES = 30;
const TARGET_GRAMS = 0.1;

export function computeBudget({ restSamples, sensitivityPerGram, averagedReadings = 1 }) {
  if (!Number.isFinite(sensitivityPerGram) || sensitivityPerGram <= 0) {
    throw new Error('sensitivityPerGram must be a positive number (deflection units per gram)');
  }
  if (!Array.isArray(restSamples) || restSamples.length < MIN_SAMPLES) {
    throw new Error(`need at least ${MIN_SAMPLES} rest samples to estimate noise`);
  }
  if (!restSamples.every(Number.isFinite)) {
    throw new Error('rest samples must all be finite numbers');
  }
  if (!Number.isFinite(averagedReadings) || averagedReadings < 1) {
    throw new Error('averagedReadings must be >= 1');
  }

  const n = restSamples.length;
  const mean = restSamples.reduce((a, b) => a + b, 0) / n;
  const variance = restSamples.reduce((a, b) => a + (b - mean) ** 2, 0) / (n - 1);
  const noiseStdDev = Math.sqrt(variance);

  const effectiveSigma = noiseStdDev / Math.sqrt(averagedReadings);
  const minResolvableGrams = (3 * effectiveSigma) / sensitivityPerGram;

  return {
    samples: n,
    noiseStdDev,
    sensitivityPerGram,
    averagedReadings,
    minResolvableGrams,
    reaches0p1g: minResolvableGrams < TARGET_GRAMS,
    verdict: minResolvableGrams < TARGET_GRAMS
      ? `0.1 g is physically reachable (detection limit ${minResolvableGrams.toFixed(3)} g)`
      : `0.1 g is NOT reachable on this noise floor (detection limit ${minResolvableGrams.toFixed(3)} g); ` +
        'state the measured figure instead of claiming 0.1 g',
  };
}


const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const meanVec = (vs) => [0, 1, 2].map((i) => vs.reduce((s, v) => s + v[i], 0) / vs.length);

/**
 * Two short recordings of [x, y, z] acceleration: phone at rest, then with a
 * known mass on it. The axis that moved is the signal axis; noise is measured
 * along that same axis, so the figure answers "can THIS device resolve it".
 * Sensitivity uses the nominal mass, so it inherits the reference's tolerance
 * (a few percent for a coin) - fine for a noise budget, not for an accuracy claim.
 */
export function analyzeLoadTest({ restVectors, loadedVectors, grams }) {
  if (!Number.isFinite(grams) || grams <= 0) throw new Error('grams must be a positive number');
  for (const set of [restVectors, loadedVectors]) {
    if (!Array.isArray(set) || set.length < MIN_SAMPLES) {
      throw new Error(`need at least ${MIN_SAMPLES} samples in each recording`);
    }
    if (!set.every((v) => Array.isArray(v) && v.length === 3 && v.every(Number.isFinite))) {
      throw new Error('every sample must be three finite numbers');
    }
  }
  const delta = meanVec(loadedVectors).map((m, i) => m - meanVec(restVectors)[i]);
  const shift = Math.hypot(...delta);
  if (shift < 1e-9) throw new Error('no measurable shift between rest and loaded recordings');
  const unit = delta.map((d) => d / shift);
  const projected = restVectors.map((v) => dot(v, unit));
  return { ...computeBudget({ restSamples: projected, sensitivityPerGram: shift / grams }),
    shift, grams };
}
