'use strict';
function checkMonotonic(estimate,min,max,steps=100){
  if(typeof estimate!=='function'||!(max>min))return {ok:false,violations:[]};
  const v=[];let prev=estimate(min);
  for(let i=1;i<=steps;i++){const x=min+(max-min)*i/steps,y=estimate(x);if(!Number.isFinite(y)||y+1e-9<prev)v.push({x,previous:prev,value:y});prev=y;}
  return {ok:v.length===0,violations:v};
}
function clampMonotonicSamples(samples){
  let floor=-Infinity;return (samples||[]).map(s=>{floor=Math.max(floor,s.value);return {...s,value:floor}});
}
export{checkMonotonic,clampMonotonicSamples};