import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
const threeURL=new URL('../shared/vendor/three.module.js',import.meta.url).href;
registerHooks({resolve(spec,context,next){return spec==='three'?{url:threeURL,shortCircuit:true}:next(spec,context);}});
function fakeNode(){
 const selectors=new Map(),node={width:0,height:0,style:{},dataset:{},classList:{toggle(){},add(){},remove(){}},children:[],firstChild:{nodeValue:''},append(...nodes){this.children.push(...nodes)},appendChild(node){this.children.push(node)},setAttribute(){},addEventListener(){},remove(){},focus(){},insertAdjacentHTML(){},querySelector(s){if(!selectors.has(s))selectors.set(s,fakeNode());return selectors.get(s)},getContext(){return new Proxy({measureText(){return {width:50}},createImageData(w,h){return {data:new Uint8ClampedArray(w*h*4),width:w,height:h}},getImageData(x,y,w,h){return {data:new Uint8ClampedArray(w*h*4),width:w,height:h}},createRadialGradient(){return {addColorStop(){}}},createLinearGradient(){return {addColorStop(){}}}}, {get(o,k){return k in o?o[k]:()=>{}}})}};
 Object.defineProperty(node,'innerHTML',{set(s){this.children=Array.from({length:(s.match(/<p>/g)||[]).length},fakeNode)},get(){return ''}});return node;
}
globalThis.document={createElement:fakeNode,body:fakeNode()};globalThis.window={matchMedia(){return {matches:false}}};globalThis.innerWidth=1280;globalThis.innerHeight=720;globalThis.matchMedia=window.matchMedia;
globalThis.Image=class{width=1774;height=887;set src(value){queueMicrotask(()=>this.onload?.())}};
globalThis.localStorage={getItem(){return JSON.stringify({name:'QA rider',build:'f',top:'hoodie'})},setItem(){}};
const THREE=await import(threeURL),{load}=await import('../08-edge-scene/scene.js'),{createWorld}=await import('../shared/world.js');
let scene,truckGroup;const ink={rtColor:{},uniforms:{uPaletteMix:{value:.72}},render(s,c,vehicles){scene=s;if(vehicles)truckGroup=vehicles[1];}};
const world=createWorld({renderer:{capabilities:{maxSamples:4},shadowMap:{}},ink});await world.focus('edge',{immediate:true});
const listeners=new Map(),layer=fakeNode(),input={hold:false,ptr:null},noop=()=>{};let state,clock=0,checks=0;
const ctx={input,layer,U:{uMode:{value:0}},params:new URLSearchParams({at:'truck',t:'4.3'}),ink:{size:new THREE.Vector2(1280,720),layoutSize:new THREE.Vector2(400,225),render:noop},isTouch:false,bed:noop,rpm:noop,engineOff:noop,say:noop,score:noop,prompt:noop,progress:noop,subAt:noop,next:noop,sfx:new Proxy({},{get:()=>noop}),on(target,event,callback){listeners.set(target,callback)},worldState(s){state=s;world.setState('edge',s)}};
const chapter=await load(ctx);chapter.resize(1280,720);chapter.frame(0);world.frame(0);world.render();assert.equal(state.phase,'truck');assert.equal(state.flagStage,'waiting');assert.equal(state.flagProgress,0);checks+=3;
let last=world.audit.truck,maximumStep=0;const rows=[];
function step(){clock+=1/60;chapter.frame(1/60);world.frame(1/60);world.render();const p=world.audit.truck,change=Math.hypot(p.x-last.x,p.z-last.z);maximumStep=Math.max(maximumStep,change);assert.ok(change<.07,'truck jumps while it approaches, notices or stops');last=p;checks++;
 if(state.phase==='truck'&&state.since>=4.2){for(const actor of world.audit.actors.filter(a=>a.visible&&['Yash','QA rider'].includes(a.name))){assert.ok(actor.z<p.z-1.2,'a traveller is waiting in the truck lane');checks++;}}
 rows.push({clock,phase:state.phase,stage:state.flagStage,progress:state.flagProgress,acknowledged:state.driverAcknowledged,brake:state.brakeProgress,x:p.x,z:p.z});
}
for(let i=0;i<180;i++)step();assert.equal(state.flagProgress,0);assert.equal(state.phase,'truck','truck auto-stops without a wave');checks+=2;
// A brief wave has visible progress, then drains naturally when the traveller lowers their arm.
input.hold=true;for(let i=0;i<30;i++)step();input.hold=false;const partial=state.flagProgress;assert.ok(partial>.3&&partial<.5);for(let i=0;i<90;i++)step();assert.ok(state.flagProgress<.01);assert.equal(state.phase,'truck');checks+=3;
// The accessible button sends a complete, readable wave; it cannot teleport the truck to a stop.
const waveButton=layer.querySelector('#wave');assert.ok(listeners.has(waveButton));listeners.get(waveButton)({stopPropagation:noop});checks++;
let acknowledgedAt=null,stoppedAt=null;for(let i=0;i<360;i++){step();if(state.driverAcknowledged&&acknowledgedAt===null)acknowledgedAt=clock;if(state.phase==='stop'&&stoppedAt===null)stoppedAt=clock;}
assert.ok(acknowledgedAt!==null&&stoppedAt!==null,'wave never produces a stopped truck');assert.ok(stoppedAt-acknowledgedAt>=2.4-1/60,'conversation begins before braking completes');assert.equal(state.truckU,1);assert.equal(state.flagStage,'stopped');checks+=4;
const stopped=world.audit.truck;for(let i=0;i<60;i++){step();assert.ok(Math.hypot(world.audit.truck.x-stopped.x,world.audit.truck.z-stopped.z)<1e-8);checks++;}
chapter.dispose();world.dispose();const report={result:'passed',checks,maximumStep,acknowledgedAt,stoppedAt,brakingSeconds:stoppedAt-acknowledgedAt,rows};await fs.writeFile(new URL('../qa/truck-flag-report.json',import.meta.url),JSON.stringify(report,null,2));console.log(JSON.stringify({result:'passed',checks,maximumStep,brakingSeconds:report.brakingSeconds}));
