import{describe,it,expect}from'vitest';import{minimumDetectableLoad,canDetect}from'../js/detectionLimit.js';
describe('minimum detectable load',()=>{it('rises with noise',()=>expect(minimumDetectableLoad({noiseGrams:.2}).grams).toBeGreaterThan(minimumDetectableLoad({noiseGrams:.05}).grams));it('does not call itself accuracy',()=>expect(minimumDetectableLoad({noiseGrams:.1}).label).toBe('detection-limit'));it('gates weak loads',()=>expect(canDetect(.1,{noiseGrams:.1}).detectable).toBe(false))});
// base-refresh: rerun against current main
