'use strict';

/**
 * Accuracy diagnostics are evidence gates, not accuracy claims.
 * They make bad sensor/calibration conditions visible and machine-testable.
 */
function median(values) {
  if (!values.length) return 0;
  const s = values.slice().sort((a,b)=>a-b);
  const m = Math.floor(s.length/2);
  return s.length % 2 ? s[m] : (s[m-1]+s[m])/2;
}

function mad(values) {
  if (!values.length) return 0;
  const m = median(values);
  return median(values.map(v=>Math.abs(v-m)));
}

class StepPreservingHampel {
  constructor({window=21,z=6,confirm=3}={}) {
    this.window=window; this.z=z; this.confirm=confirm; this.history=[]; this.pending=[];
  }
  update(value) {
    if (!Number.isFinite(value)) return { value, rejected:false, step:false };
    if (this.history.length < 9) {
      this._push(value); return { value, rejected:false, step:false };
    }
    const m=median(this.history), d=mad(this.history), sigma=Math.max(1e-9,d*1.4826);
    const isOutlier=Math.abs(value-m)>this.z*sigma;
    if (!isOutlier) {
      this.pending=[]; this._push(value); return { value, rejected:false, step:false };
    }
    const dir=Math.sign(value-m);
    if (!this.pending.length || Math.sign(this.pending[0]-m)===dir) this.pending.push(value);
    else this.pending=[value];
    if (this.pending.length >= this.confirm) {
      const accepted=median(this.pending);
      this.pending=[];
      this.history=[];
      this._push(accepted);
      return { value, rejected:false, step:true };
    }
    return { value:m, rejected:true, step:false };
  }
  _push(v){ this.history.push(v); if(this.history.length>this.window)this.history.shift(); }
  reset(){ this.history=[]; this.pending=[]; }
}

function rejectMadOutlier(value, history, z=6) {
  if (!history || history.length < 9) return { value, rejected:false };
  const m = median(history);
  const d = mad(history);
  const sigma = Math.max(1e-9, d * 1.4826);
  if (Math.abs(value-m) > z*sigma) return { value:m, rejected:true };
  return { value, rejected:false };
}

function calibrationCoverage(points) {
  const masses=(points||[]).map(p=>Number(p.grams)).filter(g=>g>0).sort((a,b)=>a-b);
  if (!masses.length) return { score:0,count:0,min:null,max:null,span:0 };
  const unique=[...new Set(masses.map(x=>x.toFixed(4)))].length;
  const span=masses[masses.length-1]-masses[0];
  const spread=masses[masses.length-1] > 0 ? span/masses[masses.length-1] : 0;
  return { score:Math.min(1,(unique/4)*0.55+spread*0.45),count:unique,min:masses[0],max:masses[masses.length-1],span };
}

function calibrationEvidence(points, r2) {
  const coverage=calibrationCoverage(points);
  return { ready:coverage.count>=3 && Number(r2)>=0.97 && coverage.score>=0.55, coverage, r2:Number(r2)||0 };
}

function noiseBudget({noiseGrams=0,driftGrams=0,referenceTolerance=0}={}) {
  const sensor=Math.hypot(Math.max(0,noiseGrams),Math.max(0,driftGrams));
  const total=Math.hypot(sensor,Math.max(0,referenceTolerance));
  return { sensorGrams:sensor,totalGrams:total, limiting:driftGrams>noiseGrams?'drift':'noise' };
}

class SampleRateMonitor {
  constructor(max=120){ this.max=max; this.times=[]; }
  add(t=Date.now()){ this.times.push(t); if(this.times.length>this.max)this.times.shift(); }
  reset(){this.times=[];}
  stats(){
    if(this.times.length<3)return {hz:0,medianGapMs:null,maxGapMs:null,samples:this.times.length,healthy:false};
    const gaps=[]; for(let i=1;i<this.times.length;i++)gaps.push(this.times[i]-this.times[i-1]);
    const mg=median(gaps); const max=Math.max(...gaps); const hz=mg>0?1000/mg:0;
    return {hz,medianGapMs:mg,maxGapMs:max,samples:this.times.length,healthy:hz>=30&&max<800};
  }
}

function calibrationStaleness(savedAt, now=Date.now(), maxAgeMs=7*24*3600*1000) {
  const age=Math.max(0,now-(Number(savedAt)||0));
  return { stale:!savedAt||age>maxAgeMs,ageMs:age,maxAgeMs };
}

function referenceUncertainty(measuredError, tolerance=0) {
  return Math.hypot(Math.abs(Number(measuredError)||0),Math.max(0,Number(tolerance)||0));
}

function verificationDiversity(entries) {
  const masses=(entries||[]).map(e=>Number(e.referenceWeight)).filter(x=>x>0);
  const unique=[...new Set(masses.map(x=>x.toFixed(3)))];
  const min=masses.length?Math.min(...masses):null,max=masses.length?Math.max(...masses):null;
  return { uniqueMasses:unique.length,range:min==null?0:max-min,ready:unique.length>=3 };
}

function thermalQualification(samples) {
  const s=(samples||[]).filter(x=>Number.isFinite(x.temp)&&Number.isFinite(x.error));
  if(s.length<6)return {qualified:false,correlation:null,samples:s.length};
  const mean=a=>a.reduce((x,y)=>x+y,0)/a.length, xs=s.map(x=>x.temp),ys=s.map(x=>x.error),mx=mean(xs),my=mean(ys);
  let num=0,dx=0,dy=0; for(let i=0;i<s.length;i++){const a=xs[i]-mx,b=ys[i]-my;num+=a*b;dx+=a*a;dy+=b*b;}
  const correlation=dx&&dy?num/Math.sqrt(dx*dy):0;
  return {qualified:Math.abs(correlation)>=0.5,correlation,samples:s.length};
}

function repeatability(readings) {
  const a=(readings||[]).filter(Number.isFinite);
  if(a.length<3)return {ready:false,spread:Infinity,stdDev:Infinity,count:a.length};
  const mean=a.reduce((x,y)=>x+y,0)/a.length;
  const stdDev=Math.sqrt(a.reduce((x,y)=>x+(y-mean)**2,0)/a.length);
  return {ready:true,spread:Math.max(...a)-Math.min(...a),stdDev,count:a.length};
}

function surfaceQualification({noiseGrams,driftGramsPerSec}={}) {
  const noise=Number(noiseGrams),drift=Number(driftGramsPerSec);
  if(!Number.isFinite(noise)||!Number.isFinite(drift))return {qualified:false,score:0,reason:'collecting'};
  const score=Math.max(0,1-Math.min(1,noise/0.25)*0.55-Math.min(1,drift/0.05)*0.45);
  return {qualified:score>=0.55,score,reason:score>=0.55?'ok':(drift>0.05?'surface creep':'sensor noise')};
}

function browserPreflight(env=globalThis) {
  const secure=typeof env.isSecureContext==='boolean'?env.isSecureContext:true;
  const motion=typeof env.DeviceMotionEvent!=='undefined';
  const needsPermission=motion&&typeof env.DeviceMotionEvent.requestPermission==='function';
  return {secureContext:secure,motion,needsPermission,ready:secure&&motion};
}

function dropoutRecovery(lastAt, now=Date.now(), gapMs=800) {
  const gap=lastAt?now-lastAt:Infinity;
  return {gapMs:gap,dropped:gap>gapMs,fresh:lastAt>0&&gap<=gapMs};
}

function deviceContextFingerprint(text) {
  let h=2166136261; const s=String(text||'unknown');
  for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619);}
  return (h>>>0).toString(16).padStart(8,'0');
}

export {
  median,mad,rejectMadOutlier,StepPreservingHampel,calibrationCoverage,calibrationEvidence,noiseBudget,
  SampleRateMonitor,calibrationStaleness,referenceUncertainty,verificationDiversity,
  thermalQualification,repeatability,surfaceQualification,browserPreflight,
  dropoutRecovery,deviceContextFingerprint
};
