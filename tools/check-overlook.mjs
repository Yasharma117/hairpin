import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { registerHooks } from 'node:module';
const threeURL=new URL('../shared/vendor/three.module.js',import.meta.url).href;
registerHooks({resolve(spec,context,next){return spec==='three'?{url:threeURL,shortCircuit:true}:next(spec,context)}});
function node(){const children=[],selectors=new Map(),classes=new Set(),attributes=new Map();return {children,hidden:false,style:{setProperty(){}},classList:{add(c){classes.add(c)},remove(c){classes.delete(c)},toggle(c,on){if(on??!classes.has(c))classes.add(c);else classes.delete(c)}},setAttribute(k,v){attributes.set(k,v)},getAttribute(k){return attributes.get(k)},focus(){},insertAdjacentHTML(){},querySelector(s){if(!selectors.has(s))selectors.set(s,node());return selectors.get(s)},getContext(){return new Proxy({measureText(){return {width:20}}},{get(o,k){return o[k]||(()=>{})}})}};
}
globalThis.document={createElement:node};globalThis.window={matchMedia(){return {matches:false}}};globalThis.matchMedia=window.matchMedia;globalThis.innerWidth=1280;globalThis.innerHeight=720;
let writes=[];globalThis.localStorage={getItem(){return JSON.stringify({name:'QA rider',build:'f',top:'hoodie'})},setItem(k,v){writes.push([k,v])}};
const {loadOverlook}=await import('../shared/overlook.js');
let checks=0;
function fixture(t){
 const layer=node(),events=new Map(),input={hold:false,ptr:null,source:null};let state;
 const ctx={layer,input,params:new URLSearchParams({t:String(t)}),isTouch:false,bed(){},rpm(){},engineOff(){},say(){},score(){},progress(){},prompt(){},go(){},worldState(s){state=structuredClone(s)},on(target,type,fn){if(!events.has(target))events.set(target,new Map());events.get(target).set(type,fn)}};
 const chapter=loadOverlook(ctx),button=layer.querySelector('#wish');layer.querySelector('#quote').children=Array.from({length:5},node);
 const fire=(type,extra={})=>events.get(button)?.get(type)?.({preventDefault(){},stopPropagation(){},...extra});
 const step=(seconds)=>{for(let t=0;t<seconds;t+=1/60)chapter.frame(Math.min(1/60,seconds-t));};chapter.frame(0);
 return {chapter,input,layer,button,fire,step,get state(){return state}};
}
// Brushing the scene must never accidentally bank a wish, even while the star is visible.
const brushing=fixture(15);brushing.input.source='pointer';brushing.input.hold=true;
for(let i=0;i<90;i++){brushing.input.ptr=[200+i*7,350+Math.sin(i*.2)*130];brushing.chapter.frame(1/60);assert.equal(brushing.state.banked,false);checks++;}
assert.ok(brushing.state.breeze.strength>0,'pointer movement must reach the breeze');assert.ok(brushing.state.pointer.active&&brushing.state.pointer.pressed);checks+=2;
brushing.chapter.dispose();
// A cancelled hold drains instead of keeping a wish after the finger has left.
const cancelled=fixture(15);cancelled.fire('pointerdown');cancelled.step(.4);assert.ok(cancelled.state.wishProgress>.3&&cancelled.state.wishProgress<.6);cancelled.fire('pointercancel');cancelled.step(.5);assert.equal(cancelled.state.banked,false);assert.equal(cancelled.state.wishProgress,0);checks+=3;cancelled.chapter.dispose();
// Button and keyboard are both intentional actions. A completed wish is committed exactly once.
for(const control of ['button','keyboard']){
 const f=fixture(15),before=writes.length;
 if(control==='button')f.fire('pointerdown',{pointerId:1});else{f.input.source='keyboard';f.input.hold=true;}
 f.step(1.05);assert.equal(f.state.banked,true,control+' could not keep the wish');assert.equal(f.state.bankEvent,1);assert.equal(f.state.wishProgress,1);assert.equal(writes.length,before+1);assert.equal(f.button.getAttribute('aria-label'),'Wish kept');checks+=5;
 f.fire('pointerdown');f.step(.4);assert.equal(f.state.bankEvent,1);assert.equal(writes.length,before+1);checks+=2;f.chapter.dispose();
}
const late=fixture(27);assert.equal(late.layer.querySelector('#wish-moment').hidden,false);late.fire('pointerdown');late.step(1.05);assert.equal(late.state.banked,true,'reading or brushing must not make a visitor miss the wish');checks+=2;late.chapter.dispose();
const season=fixture(10);assert.equal(season.layer.querySelector('#season-note').hidden,false);assert.equal(season.state.starUp,false);checks+=2;season.chapter.dispose();
const ending=fixture(60);assert.equal(ending.state.phase,'done');assert.equal(ending.layer.querySelector('#end').hidden,false);checks+=2;ending.chapter.dispose();
const report={result:'passed',checks,coverage:['canvas brushing cannot bank a wish','pointer reaches breeze','cancelled hold drains','button and keyboard each keep once','wish remains available after the star','festival caption precedes star','quote reaches final controls']};
await fs.writeFile(new URL('../qa/overlook-interactions-report.json',import.meta.url),JSON.stringify(report,null,2));console.log(JSON.stringify(report));
