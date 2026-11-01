import * as THREE from 'three';

export const DEFAULT_VIEW = Object.freeze({
  yaw: Math.PI * .75,
  tilt: Math.atan2(60, Math.hypot(65,65)),
});
export const OVERVIEW_VIEW=Object.freeze({...DEFAULT_VIEW,yaw:Math.PI*1.60,tilt:Math.PI*.28});
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));

export function viewDirection(yaw,tilt) {
  const c=Math.cos(tilt);
  return new THREE.Vector3(Math.sin(yaw)*c,Math.sin(tilt),Math.cos(yaw)*c);
}

export function modelFitPoints(objects) {
  const vertices=new Map(),p=new THREE.Vector3(),instance=new THREE.Matrix4(),matrix=new THREE.Matrix4();
  const add=(v)=>{const key=[v.x,v.y,v.z].map(n=>Math.round(n*20)).join(',');if(!vertices.has(key))vertices.set(key,v.clone());};
  for(const root of objects)root.traverse(o=>{
    if(!o.isMesh||!o.geometry?.attributes.position)return;
    const positions=o.geometry.attributes.position,count=o.isInstancedMesh?o.count:1;
    for(let i=0;i<count;i++){
      if(o.isInstancedMesh){o.getMatrixAt(i,instance);matrix.multiplyMatrices(o.matrixWorld,instance);}else matrix.copy(o.matrixWorld);
      for(let j=0;j<positions.count;j++)add(p.fromBufferAttribute(positions,j).applyMatrix4(matrix));
    }
  });
  return [...vertices.values()];
}

// Orbit the actual camera, then fit the model to its own part of the page.
// The text/buttons are outside that rectangle at every rotation.
export function createOverviewOrbit() {
  let yaw=OVERVIEW_VIEW.yaw,tilt=OVERVIEW_VIEW.tilt,dragging=false,vx=0,vy=0;
  let points=[],lastFrame=null;
  function setBounds(next){
    // Keep the model's actual silhouette. A box around all the hills reserves
    // empty corners and makes a long, thin diorama unnecessarily tiny.
    const support=new Set();
    for(let i=0;i<72;i++)for(const pitch of [.38,.65,.88,1.12]){
      const offset=viewDirection(i*Math.PI/36,pitch),right=new THREE.Vector3().crossVectors(new THREE.Vector3(0,1,0),offset).normalize();
      const up=new THREE.Vector3().crossVectors(offset,right).normalize();
      for(const direction of [right,up]){let lo=Infinity,hi=-Infinity,low=null,high=null;for(const p of next){const value=p.dot(direction);if(value<lo){lo=value;low=p;}if(value>hi){hi=value;high=p;}}if(low)support.add(low);if(high)support.add(high);}
    }
    points=[...support].map(p=>p.clone());
  }
  function begin(){dragging=true;vx=vy=0;}
  function drag(dx,dy,seconds=.016){
    if(!dragging)return;
    const dt=clamp(seconds,.012,.1),ax=-dx*.006,ay=dy*.0035;
    yaw+=ax;tilt=clamp(tilt+ay,.38,1.12);
    vx=clamp(ax/dt,-2.5,2.5);vy=clamp(ay/dt,-1.2,1.2);
  }
  function end(cancel=false){dragging=false;if(cancel)vx=vy=0;}
  function update(dt){
    if(dragging||dt<=0)return;
    yaw+=vx*dt;const next=tilt+vy*dt;tilt=clamp(next,.38,1.12);
    if(next!==tilt)vy=0;
    const decay=Math.exp(-dt*6);vx*=decay;vy*=decay;
    if(Math.abs(vx)<.001)vx=0;if(Math.abs(vy)<.001)vy=0;
  }
  function reset(){yaw=OVERVIEW_VIEW.yaw;tilt=OVERVIEW_VIEW.tilt;dragging=false;vx=vy=0;}
  function fit(width,height,frame){
    const left=clamp(frame.left,0,width-1),top=clamp(frame.top,0,height-1);
    const w=Math.max(80,Math.min(frame.width,width-left)),h=Math.max(80,Math.min(frame.height,height-top));
    lastFrame={left,top,width:w,height:h};
    const offset=viewDirection(yaw,tilt),right=new THREE.Vector3().crossVectors(new THREE.Vector3(0,1,0),offset).normalize();
    const up=new THREE.Vector3().crossVectors(offset,right).normalize();
    let minX=Infinity,maxX=-Infinity,minY=Infinity,maxY=-Infinity;
    for(const p of points){const x=p.dot(right),y=p.dot(up);minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y);}
    const span=Math.max((maxX-minX)*height/w,(maxY-minY)*height/h)*1.09;
    const cx=left+w*.5,cy=top+h*.5;
    const sx=(minX+maxX)*.5-(cx-width*.5)*span/height;
    const sy=(minY+maxY)*.5-(height*.5-cy)*span/height;
    const target=right.multiplyScalar(sx).add(up.multiplyScalar(sy));
    return {x:target.x,y:target.y,z:target.z,span,yaw,tilt};
  }
  return {setBounds,begin,drag,end,update,reset,fit,get audit(){return {yaw,tilt,dragging,velocity:[vx,vy],frame:lastFrame};}};
}
