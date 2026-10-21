'use strict';
function angleDeltaDeg(a,b){const ar=(a||{}),br=(b||{});const db=(Number(br.beta)||0)-(Number(ar.beta)||0),dg=(Number(br.gamma)||0)-(Number(ar.gamma)||0);return Math.hypot(db,dg);}
function orientationTrust(baseline,current,{warnDeg=2,invalidateDeg=5}={}){const delta=angleDeltaDeg(baseline,current);return{deltaDeg:delta,state:delta>=invalidateDeg?'invalidate':delta>=warnDeg?'warn':'ok',trusted:delta<invalidateDeg};}
export{angleDeltaDeg,orientationTrust};