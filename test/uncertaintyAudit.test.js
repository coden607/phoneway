import{describe,it,expect}from'vitest';import{auditUncertainty,uncertaintyScale}from'../js/uncertaintyAudit.js';
describe('uncertainty calibration audit',()=>{it('measures empirical coverage',()=>expect(auditUncertainty([{predicted:.2,error:.1},{predicted:.2,error:.4}]).coverage).toBe(.5));it('increases scale when errors exceed bounds',()=>expect(uncertaintyScale([{predicted:.1,error:.3},{predicted:.1,error:.2}],.9)).toBeGreaterThanOrEqual(3))});
// base-refresh: rerun against current main
