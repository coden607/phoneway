import{describe,it,expect}from'vitest';import{BlindVerificationSession}from'../js/blindVerification.js';
describe('blind verification',()=>{it('does not need known mass during capture',()=>{const s=new BlindVerificationSession();expect(s.capture(5.02)).toBe(true);expect(s.reveal(5,.05).passed).toBe(true)});it('reports failure honestly',()=>{const s=new BlindVerificationSession();s.capture(5.5);expect(s.reveal(5,.1).passed).toBe(false)})});
// base-refresh: rerun against current main
