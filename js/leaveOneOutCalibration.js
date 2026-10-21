'use strict';
function linearFit(points){
  if(points.length<2)return null;
  const n=points.length,sx=points.reduce((a,p)=>a+p.deltaA,0),sy=points.reduce((a,p)=>a+p.grams,0);
  const sxx=points.reduce((a,p)=>a+p.deltaA*p.deltaA,0),sxy=points.reduce((a,p)=>a+p.deltaA*p.grams,0);
  const d=n*sxx-sx*sx;if(Math.abs(d)<1e-12)return null;
  const m=(n*sxy-sx*sy)/d,b=(sy-m*sx)/n; return x=>m*x+b;
}
function leaveOneOut(points){
  const p=(points||[]).filter(x=>Number.isFinite(x.deltaA)&&Number.isFinite(x.grams));
  return p.map((held,i)=>{const fit=linearFit(p.filter((_,j)=>j!==i));const pred=fit?fit(held.deltaA):null;return {index:i,grams:held.grams,predicted:pred,error:pred==null?Infinity:pred-held.grams};});
}
function looSummary(points){const r=leaveOneOut(points),e=r.map(x=>Math.abs(x.error)).filter(Number.isFinite);return {results:r,maxAbsError:e.length?Math.max(...e):Infinity,mae:e.length?e.reduce((a,b)=>a+b,0)/e.length:Infinity};}
export{leaveOneOut,looSummary};