import{describe,it,expect}from'vitest';import{classifyDelta}from'../js/extrapolationGuard.js';
const p=[{deltaA:.01,grams:1},{deltaA:.2,grams:20}];describe('extrapolation guard',()=>{it('accepts in-range',()=>expect(classifyDelta(.1,p).trusted).toBe(true));it('flags above range',()=>expect(classifyDelta(.3,p).state).toBe('above-range'))});
// base-refresh: rerun against current main
