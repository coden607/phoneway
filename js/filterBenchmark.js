'use strict';
function mae(actual,pred){let n=0,s=0;for(let i=0;i<Math.min(actual.length,pred.length);i++){if(Number.isFinite(actual[i])&&Number.isFinite(pred[i])){s+=Math.abs(actual[i]-pred[i]);n++;}}return n?s/n:Infinity;}
function rmse(actual,pred){let n=0,s=0;for(let i=0;i<Math.min(actual.length,pred.length);i++){if(Number.isFinite(actual[i])&&Number.isFinite(pred[i])){const e=actual[i]-pred[i];s+=e*e;n++;}}return n?Math.sqrt(s/n):Infinity;}
function settlingSamples(pred,target,tol=.1,hold=5){for(let i=0;i<=pred.length-hold;i++){let ok=true;for(let j=0;j<hold;j++)if(Math.abs(pred[i+j]-target)>tol){ok=false;break;}if(ok)return i;}return Infinity;}
function scoreFilter({actual,pred,target,tolerance=.1,hold=5}){return{mae:mae(actual,pred),rmse:rmse(actual,pred),settlingSamples:settlingSamples(pred,target,tolerance,hold)};}
function rankFilters(results){return Object.entries(results).map(([name,v])=>({name,...v})).sort((a,b)=>(a.rmse+b.settlingSamples*.001)-(b.rmse+a.settlingSamples*.001));}
export{mae,rmse,settlingSamples,scoreFilter,rankFilters};