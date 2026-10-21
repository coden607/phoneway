import { describe,it,expect } from 'vitest';
import {
 rejectMadOutlier,StepPreservingHampel,calibrationCoverage,calibrationEvidence,noiseBudget,SampleRateMonitor,
 calibrationStaleness,referenceUncertainty,verificationDiversity,thermalQualification,
 repeatability,surfaceQualification,browserPreflight,dropoutRecovery,deviceContextFingerprint
} from '../js/accuracyDiagnostics.js';

describe('accuracy enhancement diagnostics',()=>{
 it('rejects isolated MAD spikes but preserves normal values',()=>{
  const h=[1,1.01,.99,1.02,.98,1.01,1,.99,1.02];
  expect(rejectMadOutlier(9,h).rejected).toBe(true);
  expect(rejectMadOutlier(1.01,h).rejected).toBe(false);
 });
 it('preserves a sustained step after confirmation',()=>{
  const f=new StepPreservingHampel({confirm:3});
  for(let i=0;i<12;i++) f.update(0.02+(i%2)*0.001);
  const a=f.update(5), b=f.update(5.01), d=f.update(4.99);
  expect(a.rejected || b.rejected).toBe(true);
  expect(d.step || d.value > 4.9).toBe(true);
  expect(d.value).toBeGreaterThan(4.9);
 });
 it('requires 3-point, high-quality, covered calibration evidence',()=>{
  const p=[{grams:1},{grams:5},{grams:20}];
  expect(calibrationCoverage(p).count).toBe(3);
  expect(calibrationEvidence(p,.99).ready).toBe(true);
  expect(calibrationEvidence(p.slice(0,2),.999).ready).toBe(false);
 });
 it('combines sensor and reference uncertainty conservatively',()=>{
  expect(noiseBudget({noiseGrams:.1,driftGrams:.2,referenceTolerance:.05}).totalGrams).toBeGreaterThan(.22);
  expect(referenceUncertainty(.1,.1)).toBeCloseTo(Math.sqrt(.02));
 });
 it('monitors sample rate and gaps',()=>{
  const m=new SampleRateMonitor(); for(let t=0;t<1000;t+=16)m.add(t);
  expect(m.stats().hz).toBeGreaterThan(50); expect(m.stats().healthy).toBe(true);
 });
 it('marks old calibration stale',()=>expect(calibrationStaleness(1,8*24*3600*1000).stale).toBe(true));
 it('requires diverse verification masses',()=>expect(verificationDiversity([{referenceWeight:1},{referenceWeight:5},{referenceWeight:10}]).ready).toBe(true));
 it('qualifies thermal correction only with measured correlation',()=>{
  const s=[1,2,3,4,5,6].map(x=>({temp:20+x,error:x*.1}));
  expect(thermalQualification(s).qualified).toBe(true);
 });
 it('quantifies repeatability and surface quality',()=>{
  expect(repeatability([5,5.1,4.9]).spread).toBeCloseTo(.2);
  expect(surfaceQualification({noiseGrams:.02,driftGramsPerSec:.005}).qualified).toBe(true);
 });
 it('preflights browser sensors and dropout state',()=>{
  expect(browserPreflight({isSecureContext:true,DeviceMotionEvent:function(){}}).ready).toBe(true);
  expect(dropoutRecovery(1000,1901).dropped).toBe(true);
 });
 it('creates stable non-raw device context fingerprints',()=>{
  expect(deviceContextFingerprint('abc')).toBe(deviceContextFingerprint('abc'));
  expect(deviceContextFingerprint('abc')).not.toContain('abc');
 });
});
