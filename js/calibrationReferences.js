'use strict';

/**
 * Calibration reference sets.
 *
 * Certified masses are the preferred path for accuracy work. Household
 * references are convenience fallbacks and intentionally carry weaker trust.
 * No household object is treated as a 0.1 g standard.
 */
const CERTIFIED_5_POINT = [
  { id:'cert_1g', grams:1, tolerance:0.005, trust:'certified', label:'1 g calibration weight' },
  { id:'cert_2g', grams:2, tolerance:0.005, trust:'certified', label:'2 g calibration weight' },
  { id:'cert_5g', grams:5, tolerance:0.005, trust:'certified', label:'5 g calibration weight' },
  { id:'cert_10g', grams:10, tolerance:0.01, trust:'certified', label:'10 g calibration weight' },
  { id:'cert_20g', grams:20, tolerance:0.01, trust:'certified', label:'20 g calibration weight' },
];

const HOUSEHOLD_5_POINT = [
  { id:'bill_1', grams:1.0, tolerance:0.15, trust:'nominal', label:'US $1 bill (approximate)' },
  { id:'penny_modern', grams:2.5, tolerance:0.15, trust:'nominal', label:'Modern US penny (nominal)' },
  { id:'nickel', grams:5.0, tolerance:0.20, trust:'nominal', label:'US nickel (nominal)' },
  { id:'two_nickels', grams:10.0, tolerance:0.30, trust:'nominal', label:'2 US nickels (nominal stack)' },
  { id:'four_quarters', grams:22.68, tolerance:0.50, trust:'nominal', label:'4 US quarters (nominal stack)' },
];

function validateReferenceSet(set) {
  const points=(set||[]).filter(x=>Number.isFinite(x.grams)&&x.grams>0);
  const sorted=points.slice().sort((a,b)=>a.grams-b.grams);
  const min=sorted[0]?.grams ?? null, max=sorted.at(-1)?.grams ?? null;
  const unique=new Set(sorted.map(x=>x.grams.toFixed(4))).size;
  const span=min==null?0:max-min;
  const ratio=min&&max?max/min:0;
  return {
    count:points.length,
    unique,
    min,
    max,
    span,
    rangeRatio:ratio,
    adequate:points.length>=5 && unique>=5 && ratio>=10,
    certifiedOnly:points.length>0 && points.every(x=>x.trust==='certified'),
  };
}

function bestFivePointSet({ certifiedAvailable=false }={}) {
  return certifiedAvailable ? CERTIFIED_5_POINT.map(x=>({...x})) : HOUSEHOLD_5_POINT.map(x=>({...x}));
}

function referenceWeightVariance(ref) {
  const t=Math.max(0,Number(ref?.tolerance)||0);
  // Treat the stated ± tolerance as a conservative one-sigma floor for
  // weighting. The fit should never give a weak nominal reference more
  // influence than a certified mass.
  return Math.max(1e-8,t*t);
}

function referenceFitWeight(ref) {
  return 1/referenceWeightVariance(ref);
}

export {
  CERTIFIED_5_POINT,
  HOUSEHOLD_5_POINT,
  validateReferenceSet,
  bestFivePointSet,
  referenceWeightVariance,
  referenceFitWeight,
};
