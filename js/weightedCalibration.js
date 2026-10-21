'use strict';

function weightedLinearFit(points) {
  const p=(points||[]).filter(x=>Number.isFinite(x.deltaA)&&Number.isFinite(x.grams)&&x.deltaA>0&&x.grams>=0);
  if(p.length<2) return null;
  let sw=0,sx=0,sy=0,sxx=0,sxy=0;
  for(const x of p){
    const tol=Math.max(1e-6,Number(x.tolerance)||0.1);
    const w=1/(tol*tol);
    sw+=w; sx+=w*x.deltaA; sy+=w*x.grams; sxx+=w*x.deltaA*x.deltaA; sxy+=w*x.deltaA*x.grams;
  }
  const d=sw*sxx-sx*sx;
  if(Math.abs(d)<1e-12) return null;
  const slope=(sw*sxy-sx*sy)/d;
  const intercept=(sy-slope*sx)/sw;
  return {slope,intercept,estimate:(deltaA)=>slope*deltaA+intercept};
}

function weightedResiduals(points,fit){
  if(!fit) return [];
  return (points||[]).map(p=>({
    grams:p.grams,
    predicted:fit.estimate(p.deltaA),
    residual:p.grams-fit.estimate(p.deltaA),
    tolerance:Math.max(0,Number(p.tolerance)||0)
  }));
}

function weightedRmse(points,fit){
  const r=weightedResiduals(points,fit);
  if(!r.length) return Infinity;
  let sw=0,se=0;
  for(const x of r){const t=Math.max(1e-6,x.tolerance||0.1),w=1/(t*t);sw+=w;se+=w*x.residual*x.residual;}
  return Math.sqrt(se/sw);
}

export { weightedLinearFit, weightedResiduals, weightedRmse };
