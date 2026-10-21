import {describe,it,expect} from 'vitest';
import {weightedLinearFit,weightedResiduals,weightedRmse} from '../js/weightedCalibration.js';

describe('uncertainty-weighted calibration fit',()=>{
 it('fits a linear calibration',()=>{
   const p=[
    {deltaA:.01,grams:1,tolerance:.01},
    {deltaA:.05,grams:5,tolerance:.01},
    {deltaA:.10,grams:10,tolerance:.01},
   ];
   const f=weightedLinearFit(p);
   expect(f.estimate(.075)).toBeCloseTo(7.5,2);
   expect(weightedRmse(p,f)).toBeLessThan(.02);
 });
 it('downweights a weak nominal reference',()=>{
   const p=[
    {deltaA:.01,grams:1,tolerance:.01},
    {deltaA:.05,grams:5,tolerance:.01},
    {deltaA:.10,grams:13,tolerance:2},
   ];
   const f=weightedLinearFit(p);
   expect(f.estimate(.05)).toBeCloseTo(5,1);
   expect(weightedResiduals(p,f)).toHaveLength(3);
 });
});
