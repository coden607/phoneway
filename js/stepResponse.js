'use strict';
class StepResponseDetector{
 constructor({threshold=.2,confirm=3}={}){this.threshold=threshold;this.confirm=confirm;this.level=null;this.pending=[];}
 update(v){if(!Number.isFinite(v))return{step:false};if(this.level===null){this.level=v;return{step:false,level:v}};const d=v-this.level;if(Math.abs(d)<this.threshold){this.pending=[];this.level=.95*this.level+.05*v;return{step:false,level:this.level}};this.pending.push(v);if(this.pending.length>=this.confirm){const next=this.pending.reduce((a,b)=>a+b,0)/this.pending.length;const from=this.level;this.level=next;this.pending=[];return{step:true,from,to:next,direction:Math.sign(next-from)}}return{step:false,level:this.level};}
 reset(){this.level=null;this.pending=[];}
}
export{StepResponseDetector};