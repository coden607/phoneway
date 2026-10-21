'use strict';
function minimumDetectableLoad({noiseGrams=0,driftGrams=0,sigmaMultiplier=3,referenceTolerance=0}={}){const sensor=Math.hypot(Math.max(0,noiseGrams),Math.max(0,driftGrams));const combined=Math.hypot(sensor,Math.max(0,referenceTolerance));return{grams:combined*Math.max(1,sigmaMultiplier),sensorGrams:sensor,combinedGrams:combined,label:'detection-limit'};}
function canDetect(grams,metrics){const mdl=minimumDetectableLoad(metrics);return{detectable:Number(grams)>=mdl.grams,minimum:mdl.grams};}
export{minimumDetectableLoad,canDetect};