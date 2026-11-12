'use strict';
function surfaceFingerprint({noiseGrams=0,driftGramsPerSec=0,sensitivity=0}={}){return{noise:Math.max(0,noiseGrams),drift:Math.max(0,driftGramsPerSec),sensitivity:Math.max(0,sensitivity)}}
function relativeDelta(a,b){const d=Math.max(1e-9,Math.abs(a));return Math.abs(b-a)/d}
function compareSurface(base,current,{threshold=.35}={}){if(!base||!current)return{trusted:false,reason:'missing'};const score=Math.max(relativeDelta(base.noise,current.noise),relativeDelta(base.drift,current.drift),relativeDelta(base.sensitivity,current.sensitivity));return{trusted:score<threshold,score,reason:score<threshold?'same':'changed'};}
export{surfaceFingerprint,compareSurface};