import{describe,it,expect}from'vitest';import{clusterVariance,chooseAveragingWindow}from'../js/averagingWindow.js';
describe('averaging window selection',()=>{it('returns finite clustered variance',()=>expect(clusterVariance([1,1.1,.9,1,1.01,1.02,.99,1],2)).toBeGreaterThanOrEqual(0));it('selects one candidate',()=>expect([2,4,8]).toContain(chooseAveragingWindow(Array.from({length:32},(_,i)=>1+(i%3)*.01),[2,4,8]).size))});
// base-refresh: rerun against current main
