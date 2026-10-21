'use strict';
function requiredSettleMs({noiseGrams=0,driftGramsPerSec=0,sampleHz=60}={}){
 const noise=Math.max(0,noiseGrams),drift=Math.max(0,driftGramsPerSec),hz=Math.max(1,sampleHz);
 const base=700,noisePenalty=Math.min(5000,noise*8000),driftPenalty=Math.min(7000,drift*40000),ratePenalty=hz<45?(45-hz)*40:0;
 return Math.round(Math.min(12000,Math.max(700,base+noisePenalty+driftPenalty+ratePenalty)));
}
function settleReady(stableMs,metrics){const requiredMs=requiredSettleMs(metrics);return{requiredMs,ready:stableMs>=requiredMs};}
export{requiredSettleMs,settleReady};