import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
const threeURL=new URL('../shared/vendor/three.module.js',import.meta.url).href;
registerHooks({resolve(spec,context,next){return spec==='three'?{url:threeURL,shortCircuit:true}:next(spec,context);}});
function fakeNode(){
 const selectors=new Map(),node={width:0,height:0,style:{},dataset:{},classList:{toggle(){},add(){},remove(){}},children:[],firstChild:{nodeValue:''},append(...nodes){this.children.push(...nodes)},setAttribute(){},addEventListener(){},remove(){},focus(){},insertAdjacentHTML(){},querySelector(s){if(!selectors.has(s))selectors.set(s,fakeNode());return selectors.get(s)},getContext(){return new Proxy({measureText(){return {width:50}},createImageData(w,h){return {data:new Uint8ClampedArray(w*h*4),width:w,height:h}},getImageData(x,y,w,h){return {data:new Uint8ClampedArray(w*h*4),width:w,height:h}},createRadialGradient(){return {addColorStop(){}}},createLinearGradient(){return {addColorStop(){}}}}, {get(o,k){return k in o?o[k]:()=>{}}})}};
 Object.defineProperty(node,'innerHTML',{set(s){this.children=Array.from({length:(s.match(/<p>/g)||[]).length},fakeNode)},get(){return ''}});return node;
}
globalThis.document={createElement:fakeNode,body:fakeNode()};globalThis.window={matchMedia(){return {matches:false}}};globalThis.innerWidth=1280;globalThis.innerHeight=720;globalThis.matchMedia=window.matchMedia;
globalThis.Image=class{width=1774;height=887;set src(value){queueMicrotask(()=>this.onload?.())}};
globalThis.localStorage={getItem(){return JSON.stringify({name:'QA rider',build:'f',top:'hoodie'})},setItem(){}};
const THREE=await import(threeURL),{createSkyline}=await import('../shared/skyline.js');

const baseline=createSkyline(),interactive=createSkyline();baseline.resize(1280,720);interactive.resize(1280,720);
for(let i=0;i<240;i++){
 const t=15+i/60,base={phase:'stop',since:t,starK:(t-14)/9,starUp:true};baseline.frame(1/60,base);interactive.frame(1/60,{...base,pointer:{x:Math.sin(i*.08)*.8,y:Math.cos(i*.06)*.6,active:true},breeze:{strength:.45}});
}
const a=baseline.scene.getObjectByName('foreground-petals').instanceMatrix.array,b=interactive.scene.getObjectByName('foreground-petals').instanceMatrix.array;
let changed=0;for(let i=0;i<a.length;i++)if(Math.abs(a[i]-b[i])>1e-5)changed++;
assert.ok(changed>100,'pointer does not change visible petal transforms');assert.ok(interactive.audit.petalDisplacement>.1,'pointer interaction has no displacement');
const liveEnergy=interactive.audit.petalDisplacement;
const frozen={phase:'stop',since:17,starUp:true,starK:1/3};interactive.frame(0,frozen);const first=interactive.scene.getObjectByName('foreground-petals').instanceMatrix.array.slice();interactive.frame(0,frozen);assert.deepEqual(interactive.scene.getObjectByName('foreground-petals').instanceMatrix.array,first,'frozen effect is nondeterministic');
const geo=interactive.scene.getObjectByName('foreground-petals').geometry,positions=geo.attributes.position;let maxWidth=0,length=0;geo.computeBoundingBox();const size=geo.boundingBox.getSize(new THREE.Vector3());assert.ok(size.y/size.x>1.7,'petal is too broad and symbolic');
interactive.frame(1/60,{phase:'stop',since:20,banked:true,eventId:1});assert.equal(interactive.audit.bankedAt,20);interactive.frame(1/60,{phase:'stop',since:21,banked:true,eventId:1});assert.equal(interactive.audit.bankedAt,20,'wish shower keeps restarting');
const result={result:'passed',changedTransformValues:changed,liveDisplacement:liveEnergy,interaction:interactive.audit,petalAspectRatio:size.y/size.x,deterministicFreeze:true,singleWishPulse:true};await fs.writeFile(new URL('../qa/petal-interaction-report.json',import.meta.url),JSON.stringify(result,null,2));console.log(JSON.stringify(result));baseline.dispose();interactive.dispose();
