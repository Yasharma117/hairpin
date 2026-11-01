// Ground-space staging shared by geometry, playback, and the motion checks.
// Taxi local +X is its nose. A yaw of PI/2 points that nose toward world -Z.
export const EDGE_SITE = Object.freeze({
  lipZ: -4,
  drop: 9,
  rest: Object.freeze({ x: 0, y: .10, z: -3.05, yaw: Math.PI / 2 }),
  seats: Object.freeze([[-2.25, -4.28], [-3.45, -4.28]]),
  ghost: Object.freeze([-4.55, -4.12]),
  ledge: Object.freeze([[-4.8,-2.6],[-1.3,-2.6],[-1.35,-4.65],[-2.4,-5.05],[-4.85,-4.65]]),
  truckStop: Object.freeze({x: .2, y: .072, z: -1.3, yaw: 0}),
});
// Both travellers wait on the same verge, beyond the moving truck's swept width.
export const TRUCK_SIGNAL = Object.freeze({
  ready:4.2, waveSeconds:1.4, brakeSeconds:2.4,
  flagSpots:Object.freeze([[3.75,-2.8],[2.55,-2.95]]),
  routes:Object.freeze([
    [[-2.25,-4.28],[-2.25,-3.2],[3.75,-3.2],[3.75,-2.8]],
    [[-3.45,-4.28],[-3.45,-3.6],[2.55,-3.6],[2.55,-2.95]],
  ]),
});
export const truckApproachU = since => Math.min(.80,Math.max(0,since)*.15);
export function truckBrakeU(from,elapsed){const k=Math.min(1,Math.max(0,elapsed/TRUCK_SIGNAL.brakeSeconds));return from+(1-from)*(1-(1-k)**2);}
export const SHILLONG_SITE = Object.freeze({
  truck: Object.freeze({x:4,y:.072,z:-3.3,yaw:Math.PI}),
  seats: Object.freeze([[-5.6,-5.3],[-4.4,-5.3]]),
  seatY: .52,
  exit: Object.freeze([[2.2,-4.65],[-.3,-4.65],[-2.8,-5.3]]),
});
const clamp = (n, a = 0, b = 1) => Math.min(b, Math.max(a, n));
const smooth = (a, b, n) => { const k = clamp((n - a) / (b - a)); return k * k * (3 - 2 * k); };
export function edgeApproach(u) {
  const t=clamp(u),v=1-t;
  const a=[6,.8],b=[1.8,.8],c=[0,-.25],d=[EDGE_SITE.rest.x,EDGE_SITE.rest.z];
  const x=v*v*v*a[0]+3*v*v*t*b[0]+3*v*t*t*c[0]+t*t*t*d[0];
  const z=v*v*v*a[1]+3*v*v*t*b[1]+3*v*t*t*c[1]+t*t*t*d[1];
  const dx=3*v*v*(b[0]-a[0])+6*v*t*(c[0]-b[0])+3*t*t*(d[0]-c[0]);
  const dz=3*v*v*(b[1]-a[1])+6*v*t*(c[1]-b[1])+3*t*t*(d[1]-c[1]);
  return {x,y:EDGE_SITE.rest.y,z,yaw:Math.atan2(-dz,dx),pitch:0,roll:0,visible:true};
}
export function edgeTaxiPose(state, fallPitch=-.25) {
  if (state.phase==='drive') {
    const p=edgeApproach(state.driveU ?? 0);
    p.pitch=state.hold && state.driveU>.55?-.035:0;
    return p;
  }
  const p={...EDGE_SITE.rest,pitch:-clamp(Math.abs(Number(state.angle)||0),0,.58),roll:0,visible:true};
  const f=Math.min(2,Number(state.fallT));
  if (f>=0) {
    // Slide across this exact lip, then accelerate vertically. No yaw reset or world-space roll.
    p.z-=1.9*smooth(0,.95,f);
    p.y-=4*Math.max(0,f-.25)**2;
    p.pitch=fallPitch+(-1.30-fallPitch)*smooth(0,1.15,f);
    p.visible=p.y>-EDGE_SITE.drop-1;
  }
  return p;
}
export function sampleWalk(points, amount) {
  const lengths=points.slice(1).map((p,i)=>Math.hypot(p[0]-points[i][0],p[1]-points[i][1]));
  const total=lengths.reduce((a,b)=>a+b,0);let distance=clamp(amount)*total;
  for(let i=0;i<lengths.length;i++){
    if(distance<=lengths[i] || i===lengths.length-1){const t=lengths[i]?clamp(distance/lengths[i]):0,a=points[i],b=points[i+1];return {x:a[0]+(b[0]-a[0])*t,z:a[1]+(b[1]-a[1])*t,dx:b[0]-a[0],dz:b[1]-a[1]};}
    distance-=lengths[i];
  }
  return {x:points[0][0],z:points[0][1],dx:1,dz:0};
}
export const BOARDING_ROUTE = Object.freeze([[-18.9,6],[-15.8,6],[-15.8,8.25],[-17.65,8.25]]);
export const EXIT_ROUTES = Object.freeze([
  [[-1.0,-2.8],[-1.4,-2.5],[-2.25,-2.6],[-2.25,-4.28]],
  [[1.05,-3.1],[1.5,-2.0],[1.5,-.65],[-3.45,-.65],[-3.45,-4.28]],
]);
export function characterFacing(dx,dz,cameraRight={x:-.707,z:-.707}) {
  const horizontal=dx*cameraRight.x+dz*cameraRight.z;
  // Motion toward the camera is a front view; motion away is the back view.
  const toward=dx*.707-dz*.707;
  return Math.abs(horizontal)>.65*Math.abs(toward)?(horizontal>0?'right':'left'):(toward>0?'front':'back');
}
