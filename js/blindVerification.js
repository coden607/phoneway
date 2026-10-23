'use strict';
class BlindVerificationSession{
 constructor(){this.captures=[];}
 capture(measured){if(!Number.isFinite(measured))return false;this.captures.push(measured);return true;}
 reveal(known,tolerance=.1){if(!this.captures.length||!Number.isFinite(known)||known<=0)return null;const measured=this.captures.reduce((a,b)=>a+b,0)/this.captures.length;const error=measured-known;return{known,measured,error,absError:Math.abs(error),tolerance,passed:Math.abs(error)<=tolerance,captures:this.captures.length};}
 reset(){this.captures=[];}
}
export{BlindVerificationSession};