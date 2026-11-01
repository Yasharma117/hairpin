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

const {DEFAULT_VIEW,OVERVIEW_VIEW,viewDirection,modelFitPoints}=await import('../shared/overview-camera.js');
const THREE=await import(threeURL);let checks=0;
const layouts=[{w:1280,h:720,frame:{left:384,top:164,width:876,height:460}},{w:626,h:750,frame:{left:16,top:327,width:590,height:307}},{w:390,h:844,frame:{left:16,top:330,width:354,height:398}}];
for(const layout of layouts){
 world.setOverviewFrame(layout.frame);world.resize(layout.w,layout.h);world.frame(0);world.render();
 const orbitBefore=world.audit.orbit;assert.deepEqual(orbitBefore.frame,layout.frame);checks++;
 assert.equal(world.beginOrbit(),true);world.dragOrbit(560,-1000,.1);world.frame(0);world.render();
 assert.ok(Math.abs(world.audit.orbit.yaw-orbitBefore.yaw)>3,'drag must rotate the actual overview');assert.equal(world.audit.orbit.tilt,.38);checks+=2;
 world.dragOrbit(0,1000,.1);world.frame(0);assert.equal(world.audit.orbit.tilt,1.12);checks++;
 const p=new THREE.Vector3(-10,0,-10).project(camera);assert.ok(Number.isFinite(p.x+p.y+p.z));checks++;
 world.endOrbit();for(let i=0;i<300;i++)world.frame(1/60);assert.ok(world.audit.orbit.velocity.every(v=>Math.abs(v)<.001),'released orbit must settle');checks++;
 const reset=world.resetOrbit();for(let i=0;i<90;i++)world.frame(1/60);await reset;world.frame(0);world.render();assert.equal(world.mode,'overview');assert.ok(Math.abs(world.audit.orbit.yaw-OVERVIEW_VIEW.yaw)<1e-8);checks+=2;
 // Project the real earth and cliff triangles, not a placeholder bounding box.
 const ground=modelFitPoints([scene.getObjectByName('earth-cutout'),scene.getObjectByName('open-cliff')]);
 for(let turn=0;turn<12;turn++)for(const pitch of [.38,.88,1.12]){
   const before=world.audit.orbit;world.beginOrbit();world.dragOrbit((before.yaw-turn*Math.PI/6)/.006,(pitch-before.tilt)/.0035,.1);world.endOrbit(true);world.frame(0);world.render();
   for(const vertex of ground){const projected=vertex.clone().project(camera),x=(projected.x+1)*layout.w/2,y=(1-projected.y)*layout.h/2;
     assert.ok(x>=layout.frame.left-1&&x<=layout.frame.left+layout.frame.width+1&&y>=layout.frame.top-1&&y<=layout.frame.top+layout.frame.height+1,'rotated geology overlaps the reserved text/buttons or leaves its frame');}
   checks++;
 }
}
// Starting the story after multiple revolutions returns by the shortest angle,
// without applying overview controls to authored chapter choreography.
world.beginOrbit();world.dragOrbit(-2500,-300,.1);world.endOrbit(true);world.frame(0);world.render();
let previous=camera.getWorldDirection(new THREE.Vector3());const entering=world.focus('stand');let largestTurn=0;
for(let i=0;i<120;i++){world.frame(1/60);world.render();const direction=camera.getWorldDirection(new THREE.Vector3());largestTurn=Math.max(largestTurn,previous.angleTo(direction));previous=direction;checks++;}
await entering;assert.equal(world.mode,'focus');assert.equal(world.beginOrbit(),false);assert.ok(previous.dot(viewDirection(DEFAULT_VIEW.yaw,DEFAULT_VIEW.tilt).negate())>.9999);assert.ok(largestTurn<.12,'chapter entry spun or jumped');checks+=4;
await world.overview({immediate:true});world.frame(0);assert.equal(world.beginOrbit(),true);world.endOrbit(true);checks++;
const report={result:'passed',checks,layouts:layouts.map(v=>({width:v.w,height:v.h,frame:v.frame})),largestChapterEntryTurn:largestTurn};world.dispose();await fs.writeFile(new URL('../qa/overview-orbit-report.json',import.meta.url),JSON.stringify(report,null,2));console.log(JSON.stringify(report));
