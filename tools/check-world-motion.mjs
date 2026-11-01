import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
// Resolve Three in Node without changing the browser's import map.
import { registerHooks } from 'node:module';
const threeURL=new URL('../shared/vendor/three.module.js',import.meta.url).href;
registerHooks({resolve(spec,context,next){return spec==='three'?{url:threeURL,shortCircuit:true}:next(spec,context);}});
const fakeNode=()=>({width:0,height:0,style:{},dataset:{},classList:{toggle(){}},children:[],append(...nodes){this.children.push(...nodes);},setAttribute(){},addEventListener(){},remove(){},getContext(){return new Proxy({measureText(){return {width:50}},createRadialGradient(){return {addColorStop(){}}},createLinearGradient(){return {addColorStop(){}}}}, {get(o,k){return k in o?o[k]:()=>{}}})}});
globalThis.document={createElement:fakeNode,body:fakeNode()};globalThis.window={matchMedia(){return {matches:false}}};globalThis.innerWidth=1280;globalThis.innerHeight=800;globalThis.matchMedia=window.matchMedia;
const {createWorld}=await import('../shared/world.js');
const renderer={capabilities:{maxSamples:4},shadowMap:{}};
let scene,camera;const ink={rtColor:{},render(s,c){scene=s;camera=c;}};
const world=createWorld({renderer,ink});
await world.focus('edge',{immediate:true});world.setState('edge',{phase:'drive',driveU:0,fallT:-1});world.frame(0);world.render();
const angle=(a,b)=>Math.atan2(Math.sin(b-a),Math.cos(b-a));let checks=0,old=world.audit.taxi;
for(let i=1;i<=240;i++){world.setState('edge',{phase:'drive',driveU:i/240,since:i/60,fallT:-1});world.frame(1/60);const p=world.audit.taxi;assert.ok(Math.hypot(p.x-old.x,p.z-old.z)<.1);assert.ok(Math.abs(angle(old.yaw,p.yaw))<.04);old=p;checks+=2;}
world.setState('edge',{phase:'car',angle:0,fallT:-1,since:0});world.frame(0);let parked=world.audit.taxi;assert.ok(Math.hypot(parked.x-old.x,parked.z-old.z)<.001);assert.ok(Math.abs(angle(old.yaw,parked.yaw))<.001);checks+=2;
const phases=[['car',2],['pout',4.2],['yout',6.6],['seated',47]];
for(const [phase,end] of phases)for(let t=0;t<end;t+=1/60){world.setState('edge',{phase,since:t,fallT:-1,angle:.4});world.frame(1/60);const p=world.audit.taxi;assert.ok(Math.hypot(p.x-parked.x,p.z-parked.z)<1e-8);assert.ok(Math.abs(angle(p.yaw,parked.yaw))<1e-8);checks+=2;}
const fall=[];for(let t=0;t<2.5;t+=1/120){world.setState('edge',{phase:'flick',since:3.5+t,fallT:t,angle:.4,fallStartAngle:.4});world.frame(1/120);const p=world.audit.taxi;assert.ok(Math.abs(angle(p.yaw,parked.yaw))<1e-8&&p.roll===0);fall.push({...p,t});checks++;}
// Inspect the actual rendered geometry rather than a painted dark patch.
const THREE=await import(threeURL);const roadScene=scene;scene.updateMatrixWorld(true);
const solid=[];scene.traverse(o=>{if(o.isMesh&&o.visible&&!o.userData.pixelArt&&!o.material?.transparent)solid.push(o);});
const ray=new THREE.Raycaster(new THREE.Vector3(-10,4,-16.5),new THREE.Vector3(0,-1,0));
const hits=ray.intersectObjects(solid,false);assert.ok(hits.length&&hits[0].point.y<-6,'actual terrain must have a deep opening under the fall');checks++;
// Every chapter boundary must visibly carry the same vehicle from the previous end pose.
const order=['stand','jorabat','climb','nongpoh','cloud','edge','shillong'],journeys=[];
for(let pair=0;pair<order.length-1;pair++){
 const from=order[pair],to=order[pair+1],vehicleName=from==='edge'?'truck':'taxi';
 await world.focus(from,{immediate:true});
 world.setState(from,{phase:from==='edge'?'lift':'drive',progress:1,driveU:1,fallT:from==='edge'?3:-1,truckU:1,truckGo:2.8});world.frame(0);world.render();
 world.setState(to,{phase:to==='shillong'?'arrive':'drive',progress:0,driveU:0,fallT:-1,truckU:0,truckGo:0});
 const promise=world.focus(to,{viaOverview:true});old=world.audit[vehicleName];let maxStep=0,maxTurn=0,distance=0,visible=0;
 for(let i=0;i<900;i++){
  world.frame(1/60);world.render();const p=world.audit[vehicleName],step=Math.hypot(p.x-old.x,p.z-old.z),turn=Math.abs(angle(old.yaw,p.yaw));
  assert.ok(p.visible,'travelling vehicle disappeared');assert.ok(step<.6,from+' → '+to+' teleports');assert.ok(turn<.3,from+' → '+to+' changes heading discontinuously');
  const projected=new THREE.Vector3(p.x,p.y,p.z).project(camera);if(Math.abs(projected.x)<.98&&Math.abs(projected.y)<.98)visible++;
  maxStep=Math.max(maxStep,step);maxTurn=Math.max(maxTurn,turn);distance+=step;old=p;checks+=3;
 }
 await promise;world.frame(0);const end=world.audit[vehicleName];
 assert.equal(world.audit.active,to);assert.ok(Math.hypot(end.x-old.x,end.z-old.z)<.001,'arrival jumps');assert.ok(Math.abs(angle(end.yaw,old.yaw))<.001,'arrival heading jumps');assert.ok(visible>=890,'journey leaves the visible frame');checks+=4;
 journeys.push({from,to,vehicle:vehicleName,distance,maxStep,maxTurn,visibleFrames:visible,frames:900});
}
// Arrival has a separate supported seat; people leave the truck before sitting down.
await world.focus('shillong',{immediate:true});world.setState('shillong',{phase:'arrive',since:0,look:{name:'QA rider',build:'f',top:'hoodie'}});world.frame(0);
assert.ok(world.audit.actors.filter(a=>['Yash','QA rider'].includes(a.name)).every(a=>!a.visible));checks++;
const truckPosition=world.audit.truck;
for(let i=0;i<=360;i++){
 world.setState('shillong',{phase:'stop',since:i/60});world.frame(1/60);world.render();roadScene.updateMatrixWorld(true);
 for(const actor of world.audit.actors.filter(a=>a.visible&&['Yash','QA rider'].includes(a.name))){
  assert.ok(Math.hypot(actor.x-truckPosition.x,actor.z-truckPosition.z)>1.7,'exit is inside truck centre');checks++;
  if(actor.animation==='sit'){
   const supportRay=new THREE.Raycaster(new THREE.Vector3(actor.x,actor.y+.02,actor.z),new THREE.Vector3(0,-1,0));
   const supports=supportRay.intersectObject(roadScene.getObjectByName('landmark-shillong'),true);
   assert.ok(supports.length&&Math.abs(supports[0].point.y-.515)<.03,'seated actor needs a real bench');checks++;
  }
 }
}
world.dispose();
const report={result:'passed',checks,geometryDropY:hits[0].point.y,journeys,fall};await fs.writeFile(new URL('../qa/world-motion-report.json',import.meta.url),JSON.stringify(report,null,2));console.log(JSON.stringify({result:report.result,checks,geometryDropY:report.geometryDropY}));
