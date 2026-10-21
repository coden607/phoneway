'use strict';
function invert2(a,b,c,d){const det=a*d-b*c;if(Math.abs(det)<1e-12)return null;return[d/det,-b/det,-c/det,a/det]}
function fuseTwo(a,b,{varA=1,varB=1,cov=0}={}){
 const inv=invert2(varA,cov,cov,varB);if(!inv)return{value:(a+b)/2,weights:[.5,.5],degraded:true};
 const w1=inv[0]+inv[1],w2=inv[2]+inv[3],s=w1+w2;if(Math.abs(s)<1e-12)return{value:(a+b)/2,weights:[.5,.5],degraded:true};
 const wa=w1/s,wb=w2/s;return{value:wa*a+wb*b,weights:[wa,wb],degraded:false};
}
function disagreement(a,b,sigmaA=1,sigmaB=1){const s=Math.sqrt(Math.max(1e-12,sigmaA*sigmaA+sigmaB*sigmaB));return Math.abs(a-b)/s;}
export{fuseTwo,disagreement};