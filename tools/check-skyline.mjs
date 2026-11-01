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
let checks=0;const skyline=createSkyline(),report={result:'passed',views:[],bridge:{},crossfade:{}};
const star=skyline.scene.getObjectByName('shooting-star'),trail=skyline.scene.getObjectByName('shooting-star-trail');
assert.ok(star&&trail,'hero star and trail must be addressable for verification');checks++;
assert.equal(trail.frustumCulled,false,'moving trail cannot retain its initial origin bound');checks++;
function projection(object,camera,w,h){const p=object.position.clone().project(camera);object.geometry.computeBoundingSphere();const radius=object.geometry.boundingSphere.radius*object.scale.x;const side=object.position.clone().add(new THREE.Vector3(radius,0,0)).project(camera);return {x:p.x,y:p.y,z:p.z,diameterPixels:Math.abs(side.x-p.x)*w};}
for(const [name,w,h] of [['desktop',1280,720],['phone',390,844]]){
 skyline.resize(w,h);const samples=[];
 for(let i=1;i<=19;i++){
  const starK=i/20;skyline.frame(0,{phase:'stop',since:14+starK*9,starK,starUp:true,look:{name:'QA rider',build:'f',top:'hoodie'}});skyline.scene.updateMatrixWorld(true);
  assert.ok(star.visible&&trail.visible,'active star is hidden');checks++;
  const direction=star.position.clone().sub(skyline.camera.position),sightline=new THREE.Raycaster(skyline.camera.position,direction.clone().normalize(),.1,direction.length()-.3);
  const obstruction=sightline.intersectObject(skyline.scene,true).filter(hit=>hit.object!==star&&hit.object.isMesh&&!hit.object.material?.transparent);
  assert.equal(obstruction.length,0,name+' shooting star is hidden behind foreground scenery at '+starK);checks++;
  const p=projection(star,skyline.camera,w,h);assert.ok(Number.isFinite(p.x+p.y+p.z));assert.ok(p.z>-1&&p.z<1,'star outside camera depth');assert.ok(Math.abs(p.x)<1&&Math.abs(p.y)<1,name+' star leaves the screen at '+starK);assert.ok(p.diameterPixels>=2.5,name+' star is too small for the presentation grid');checks+=4;samples.push({starK,...p});
 }
 skyline.frame(1/60,{phase:'stop',since:23,starK:1,starUp:false});assert.ok(!star.visible&&!trail.visible,'finished star must disappear');checks++;
 const sprites=[];skyline.scene.traverse(o=>{if(o.isMesh&&o.userData.pixelArt&&o.material.isShaderMaterial)sprites.push(o)});assert.equal(sprites.length,2,'lookout needs both travellers');checks++;
 for(const sprite of sprites){sprite.geometry.computeBoundingBox();const size=sprite.geometry.boundingBox.getSize(new THREE.Vector3()).multiply(sprite.getWorldScale(new THREE.Vector3()));assert.ok(size.y>.6&&size.y<3.2,'traveller scale exceeds the terrace');checks++;}
 skyline.frame(0,{phase:'stop',since:15,starK:1/9,starUp:true,look:{name:'QA rider',build:'f',top:'hoodie'}});skyline.scene.updateMatrixWorld(true);
 const travellers=[];
 for(const actorName of ['skyline-yash','skyline-rider']){
  const actor=skyline.scene.getObjectByName(actorName);assert.ok(actor,'missing named traveller');checks++;
  let sprite;actor.traverse(o=>{if(o.isMesh&&o.userData.pixelArt&&o.material.isShaderMaterial)sprite=o});assert.ok(sprite);checks++;
  const positions=sprite.geometry.attributes.position,bounds={minX:Infinity,maxX:-Infinity,minY:Infinity,maxY:-Infinity};
  for(let i=0;i<positions.count;i++){const p=new THREE.Vector3().fromBufferAttribute(positions,i).applyMatrix4(sprite.matrixWorld).project(skyline.camera);bounds.minX=Math.min(bounds.minX,p.x);bounds.maxX=Math.max(bounds.maxX,p.x);bounds.minY=Math.min(bounds.minY,p.y);bounds.maxY=Math.max(bounds.maxY,p.y);}
  assert.ok(bounds.minX>-.98&&bounds.maxX<.98,name+' '+actorName+' is cropped horizontally');assert.ok(bounds.minY>-.98&&bounds.maxY<.98,name+' '+actorName+' is cropped vertically');checks+=2;travellers.push({name:actorName,...bounds});
 }
 report.views.push({name,width:w,height:h,samples,travellers});
}
let vertices=0,instances=0;skyline.scene.traverse(o=>{if(o.geometry){const a=o.geometry.attributes.position?.array;if(a)for(const n of a){assert.ok(Number.isFinite(n),'nonfinite skyline geometry');checks++;vertices++;}}if(o.isInstancedMesh){for(const n of o.instanceMatrix.array){assert.ok(Number.isFinite(n),'nonfinite instance transform');checks++;}instances+=o.count;}});
assert.ok(skyline.scene.getObjectByName('city-windows').count>500);assert.ok(skyline.scene.getObjectByName('foreground-petals').count>=60);checks+=2;
// Run the real Shillong chapter with image/audio/UI fixtures. This checks the bridge,
// including QA jumps, without copying the narrative's star timing into a second implementation.
const {load}=await import('../09-shillong/scene.js');
for(const target of [0,10,13,15,24]){
 let state;const ctx={input:{hold:false,ptr:null},layer:fakeNode(),U:{uMode:{value:0}},params:new URLSearchParams({t:String(target)}),ink:{size:new THREE.Vector2(1280,720),layoutSize:new THREE.Vector2(400,225),render(){}},isTouch:false,bed(){},rpm(){},engineOff(){},say(){},score(){},prompt(){},progress(){},on(){},worldState(s){state=s}};
 const chapter=await load(ctx);chapter.resize(1280,720);chapter.frame(0);
 assert.equal(state.phase,'stop');assert.equal(state.since,target);assert.equal(state.starUp,target===15,'real chapter sends incorrect star visibility at '+target);checks+=3;
 if(target===15){assert.ok(Math.abs(state.starK-1/9)<1e-9,'star should start after the quiet reveal');checks++;}skyline.frame(0,state);assert.equal(star.visible,state.starUp);checks++;report.bridge[target]={phase:state.phase,since:state.since,starK:state.starK,starUp:state.starUp};chapter.dispose();
}
// The shared renderer should capture the outgoing miniature once, reveal continuously,
// and restore the miniature when the visitor opens the road map.
const {createWorld}=await import('../shared/world.js');let renderedScene,held=0,reveal=1;const reveals=[];
const ink={rtColor:{},uniforms:{uPaletteMix:{value:.72}},render(s){renderedScene=s},holdFrame(){held++},revealFrame(v){reveal=v;reveals.push(v)}};
const world=createWorld({renderer:{capabilities:{maxSamples:4},shadowMap:{}},ink});await world.focus('shillong',{immediate:true});world.setState('shillong',{phase:'arrive',since:0});world.frame(0);world.render();const miniature=renderedScene;
for(let i=0;i<=100;i++){world.setState('shillong',{phase:'stop',since:i/10,starUp:false});world.frame(.1);world.render();if(i<60)assert.equal(renderedScene,miniature);else assert.notEqual(renderedScene,miniature);assert.ok(reveal>=0&&reveal<=1);checks+=2;}
assert.equal(held,1,'crossfade should capture only once');assert.equal(reveal,1,'city view never fully revealed');checks+=2;
await world.overview({immediate:true});world.frame(0);world.render();assert.equal(renderedScene,miniature);assert.equal(reveal,1);checks+=2;
report.crossfade={captures:held,fullyRevealed:true,overviewRestoresMiniature:true};world.dispose();skyline.dispose();Object.assign(report,{checks,geometryValues:vertices,instances});await fs.writeFile(new URL('../qa/skyline-report.json',import.meta.url),JSON.stringify(report,null,2));console.log(JSON.stringify({result:report.result,checks,geometryValues:vertices,instances,bridge:report.bridge,crossfade:report.crossfade}));
