import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {registerHooks} from 'node:module';
const threeURL=new URL('../shared/vendor/three.module.js',import.meta.url).href;
registerHooks({resolve(spec,context,next){return spec==='three'?{url:threeURL,shortCircuit:true}:next(spec,context)}});
const {createRiver}=await import('../shared/river.js'),{WORLD}=await import('../shared/style.js'),{RAVINE_BED}=await import('../shared/cliff.js');
const river=createRiver(WORLD),water=river.group.getObjectByName('ravine-water'),fall=river.group.getObjectByName('corner-waterfall');let checks=0;
const polygon=RAVINE_BED;
function inside(x,z){let yes=false;for(let i=0,j=polygon.length-1;i<polygon.length;j=i++){const a=polygon[i],b=polygon[j];if((a[1]>z)!==(b[1]>z)&&x<(b[0]-a[0])*(z-a[1])/(b[1]-a[1])+a[0])yes=!yes;}return yes;}
function edgeDistance(x,z){return Math.min(...polygon.map((a,i)=>{const b=polygon[(i+1)%polygon.length],dx=b[0]-a[0],dz=b[1]-a[1],t=Math.max(0,Math.min(1,((x-a[0])*dx+(z-a[1])*dz)/(dx*dx+dz*dz)));return Math.hypot(x-a[0]-t*dx,z-a[1]-t*dz);}));}
const vertices=water.geometry.attributes.position;for(let i=0;i<vertices.count;i++){const x=vertices.getX(i),z=vertices.getZ(i);assert.ok(inside(x,z)||edgeDistance(x,z)<.025,'water leaks through the canyon floor boundary');checks++;}
const samples=Array.from({length:129},(_,i)=>river.sample(i/128));assert.ok(Math.max(...samples.map(p=>p.z))-Math.min(...samples.map(p=>p.z))>.9,'river has no winding channel');assert.ok(Math.max(...samples.map(p=>p.width))/samples.at(-1).width>1.8,'stream has a constant canal width');checks+=2;
const fallPositions=fall.geometry.attributes.position;
let largestLipGap=0;
for(let c=0;c<=18;c++){const z=fallPositions.getZ(c),nearest=Array.from({length:101},(_,i)=>river.sample(1,i/50-1)).reduce((a,p)=>Math.abs(p.z-z)<Math.abs(a.z-z)?p:a);largestLipGap=Math.max(largestLipGap,Math.hypot(fallPositions.getX(c)-nearest.x,z-nearest.z));}
assert.ok(largestLipGap<.1,'waterfall is detached from the stream lip');checks++;
const ripple=river.group.getObjectByName('river-ripple'),streak=river.group.getObjectByName('falling-water-streak');river.update(0);const foamX0=ripple.geometry.attributes.position.getX(7),fallY0=streak.position.y;river.update(1);assert.ok(ripple.geometry.attributes.position.getX(7)<foamX0-.3,'foam is not travelling downstream');assert.ok(streak.position.y<fallY0-1,'fall streak is not falling');checks+=2;
const snapshot=()=>{const data=[];river.group.traverse(o=>{if(o.name==='river-ripple'||o.name==='corner-waterfall'||o.name==='ravine-water')data.push(...o.geometry.attributes.position.array);if(o.isInstancedMesh)data.push(...o.instanceMatrix.array);});return JSON.stringify(data);};
river.update(2.8);const first=snapshot();river.update(29.4);river.update(2.8);assert.equal(snapshot(),first,'river cannot replay the same frame');checks++;
river.group.traverse(o=>{if(o.geometry){for(const attribute of Object.values(o.geometry.attributes)){assert.ok(attribute.array.every(Number.isFinite),'non-finite water geometry');checks++;}}});
const report={result:'passed',checks,river:river.audit,largestLipGap,downstreamFoam:true,fallingStreaks:true,repeatableGeometry:true};await fs.writeFile(new URL('../qa/river-report.json',import.meta.url),JSON.stringify(report,null,2));console.log(JSON.stringify(report));
