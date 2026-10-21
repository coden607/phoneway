'use strict';
class RepeatedPlacementProtocol{
 constructor({required=5}={}){this.required=required;this.cycles=[];}
 add({placed,removed}){if(!Number.isFinite(placed)||!Number.isFinite(removed))return false;this.cycles.push({placed,removed});return true;}
 summary(known){if(!this.cycles.length)return{ready:false,count:0};const vals=this.cycles.map(x=>x.placed),mean=vals.reduce((a,b)=>a+b,0)/vals.length;const variance=vals.reduce((a,b)=>a+(b-mean)**2,0)/vals.length;const removedMax=Math.max(...this.cycles.map(x=>Math.abs(x.removed)));return{ready:this.cycles.length>=this.required,count:this.cycles.length,mean,stdDev:Math.sqrt(variance),bias:Number.isFinite(known)?mean-known:null,removedMax};}
}
export{RepeatedPlacementProtocol};