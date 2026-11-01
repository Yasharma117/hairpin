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
let scene;const ink={rtColor:{},render(s){scene=s;}};
const world=createWorld({renderer,ink});
world.frame(0);world.render();
const THREE=await import(threeURL);
const collisions=[];
const bodyBox=new THREE.Box3(new THREE.Vector3(-1.5,.28,-.62),new THREE.Vector3(1.5,1.42,.62));
for(const id of ['climb','nongpoh','cloud']) {
 await world.focus(id,{immediate:true});
 const landmark=scene.getObjectByName('landmark-'+id);
 for(let n=0;n<=40;n++) {
  world.setState(id,{phase:'drive',progress:n/40,fallT:-1});world.frame(0);world.render();scene.updateMatrixWorld(true);
  const p=world.audit.taxi, inverse=new THREE.Matrix4().compose(new THREE.Vector3(p.x,p.y,p.z),new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),p.yaw),new THREE.Vector3(1,1,1)).invert();
  let hits=0;
  landmark.traverse(o=>{
   if(!o.isMesh||o.material.transparent)return;
   const positions=o.geometry.attributes.position,index=o.geometry.index,transform=new THREE.Matrix4().multiplyMatrices(inverse,o.matrixWorld);
   const count=index?index.count:positions.count;
   for(let i=0;i<count;i+=3){const vertices=[];for(let j=0;j<3;j++){const k=index?index.getX(i+j):i+j;vertices.push(new THREE.Vector3().fromBufferAttribute(positions,k).applyMatrix4(transform));}if(bodyBox.intersectsTriangle(new THREE.Triangle(...vertices)))hits++;}
  });
  if(hits)collisions.push({id,u:n/40,hits,x:p.x,z:p.z});
 }
}
world.dispose();assert.equal(collisions.length,0,JSON.stringify(collisions));await fs.writeFile(new URL('../qa/scene-clearance-report.json',import.meta.url),JSON.stringify({result:'passed',samples:123,collisions},null,2));console.log(JSON.stringify({result:'passed',samples:123,collisions}));
