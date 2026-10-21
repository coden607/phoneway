'use strict';

function summarizeErrors(records){
  const r=(records||[]).filter(x=>Number.isFinite(x.known)&&Number.isFinite(x.measured));
  if(!r.length)return{count:0,bias:null,mae:null,rmse:null,maxAbs:null};
  const e=r.map(x=>x.measured-x.known);
  const abs=e.map(Math.abs);
  return{
    count:r.length,
    bias:e.reduce((a,b)=>a+b,0)/e.length,
    mae:abs.reduce((a,b)=>a+b,0)/abs.length,
    rmse:Math.sqrt(e.reduce((a,b)=>a+b*b,0)/e.length),
    maxAbs:Math.max(...abs)
  };
}

function buildDeviceEvidenceBundle({device,surface,calibration,verification,repeatability,softwareVersion}={}){
  const stats=summarizeErrors(verification);
  const masses=[...new Set((verification||[]).map(x=>x.known).filter(Number.isFinite))].sort((a,b)=>a-b);
  const ready=Boolean(device&&surface&&softwareVersion&&stats.count>=10&&masses.length>=3&&repeatability&&repeatability.count>=3);
  return{
    schema:1,
    generatedAt:Date.now(),
    device:device||null,
    surface:surface||null,
    softwareVersion:softwareVersion||null,
    calibration:calibration||null,
    verification:{records:verification||[],stats,distinctMasses:masses},
    repeatability:repeatability||null,
    releaseReady:ready,
    claimPolicy:ready?'report observed device/surface result only':'UNVERIFIED'
  };
}

export{summarizeErrors,buildDeviceEvidenceBundle};
