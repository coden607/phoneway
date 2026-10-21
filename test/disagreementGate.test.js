import{describe,it,expect}from'vitest';import{gateConsensus}from'../js/disagreementGate.js';
describe('disagreement gate',()=>{it('accepts agreeing estimators',()=>expect(gateConsensus([{grams:5,confidence:1},{grams:5.1,confidence:1}]).ready).toBe(true));it('rejects disagreement',()=>expect(gateConsensus([{grams:5,confidence:1},{grams:8,confidence:1}]).ready).toBe(false))});
// base-refresh: rerun against current main
