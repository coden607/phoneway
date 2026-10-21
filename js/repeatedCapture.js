'use strict';
function mean(a){return a.reduce((x,y)=>x+y,0)/a.length}
function median(a){const s=a.slice().sort((x,y)=>x-y),m=Math.floor(s.length/2);return s.length%2?s[m]:(s[m-1]+s[m])/2}
function medianOfMeans(values,groups=5){const v=(values||[]).filter(Number.isFinite);if(!v.length)return null;const g=Math.max(1,Math.min(groups,v.length)),size=Math.ceil(v.length/g),means=[];for(let i=0;i<v.length;i+=size)means.push(mean(v.slice(i,i+size)));return median(means)}
function capturePoint(grams,deltas){const deltaA=medianOfMeans(deltas);return deltaA==null?null:{grams,deltaA,captures:deltas.filter(Number.isFinite).length};}
export{medianOfMeans,capturePoint};