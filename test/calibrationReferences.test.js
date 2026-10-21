import { describe,it,expect } from 'vitest';
import {
 CERTIFIED_5_POINT,HOUSEHOLD_5_POINT,validateReferenceSet,bestFivePointSet,referenceFitWeight
} from '../js/calibrationReferences.js';

describe('five-point calibration reference sets',()=>{
 it('prefers a broad certified 1/2/5/10/20 g ladder',()=>{
  const q=validateReferenceSet(CERTIFIED_5_POINT);
  expect(q.count).toBe(5);
  expect(q.certifiedOnly).toBe(true);
  expect(q.adequate).toBe(true);
 });
 it('marks household references as nominal, not certified',()=>{
  const set=bestFivePointSet({certifiedAvailable:false});
  expect(set).toHaveLength(5);
  expect(set.every(x=>x.trust==='nominal')).toBe(true);
  expect(set.some(x=>x.grams===0.1)).toBe(false);
 });
 it('gives tighter certified references more fit influence',()=>{
  expect(referenceFitWeight(CERTIFIED_5_POINT[0])).toBeGreaterThan(referenceFitWeight(HOUSEHOLD_5_POINT[0]));
 });
});
