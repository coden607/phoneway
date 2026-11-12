import{describe,it,expect}from'vitest';import{residualDiagnostics}from'../js/residualDiagnostics.js';
describe('residual diagnostics',()=>{it('is zero for perfect model',()=>{const p=[{grams:1,deltaA:.01},{grams:5,deltaA:.05}];expect(residualDiagnostics(p,x=>x*100).maxAbs).toBe(0)});it('keeps signed bias',()=>{const p=[{grams:1,deltaA:.01},{grams:5,deltaA:.05}];expect(residualDiagnostics(p,x=>x*100+.2).bias).toBeCloseTo(.2)})});
// base-refresh: rerun against current main
