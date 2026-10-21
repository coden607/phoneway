import{describe,it,expect}from'vitest';import{requiredSettleMs,settleReady}from'../js/adaptiveSettling.js';
describe('adaptive settling',()=>{it('settles faster when quiet',()=>expect(requiredSettleMs({noiseGrams:.01,driftGramsPerSec:.001})).toBeLessThan(1500));it('requires longer on creep',()=>expect(requiredSettleMs({noiseGrams:.1,driftGramsPerSec:.1})).toBeGreaterThan(4000));it('reports readiness',()=>expect(settleReady(5000,{noiseGrams:.01}).ready).toBe(true))});
// base-refresh: rerun against current main
