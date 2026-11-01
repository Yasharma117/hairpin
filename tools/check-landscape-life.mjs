import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {registerHooks} from 'node:module';
const threeURL=new URL('../shared/vendor/three.module.js',import.meta.url).href;
registerHooks({resolve(spec,context,next){return spec==='three'?{url:threeURL,shortCircuit:true}:next(spec,context)}});
const {createLandscapeLife}=await import('../shared/landscape-life.js'),{WORLD}=await import('../shared/style.js');
const life=createLandscapeLife({palette:WORLD,edgeOrigin:{x:-10,z:-10}}),surface=life.group.getObjectByName('ravine-water');let checks=0;
const before=new Float32Array(surface.geometry.attributes.position.array);life.update(1.7);const after=surface.geometry.attributes.position.array;let moved=0;for(let i=1;i<after.length;i+=3)if(Math.abs(after[i]-before[i])>.005)moved++;assert.ok(moved>100,'river surface is static');checks++;
const fixed=JSON.stringify(life.audit);life.update(25);life.update(1.7);assert.equal(JSON.stringify(life.audit),fixed,'water and birds retain old simulation state');checks++;
let maximumBirdStep=0;life.update(0);let old=life.audit.birds;
for(let i=1;i<=480;i++){life.update(i/60);const a=life.audit;assert.ok(a.water.minY>-8.95&&a.water.maxY<-8.75,'water has risen into the road or sunk through the bed');checks++;for(const [j,b]of a.birds.entries()){const step=Math.hypot(...b.position.map((v,k)=>v-old[j].position[k]));maximumBirdStep=Math.max(maximumBirdStep,step);assert.ok(step<.04,'bird teleports');assert.ok(Math.abs(b.wings[0]+b.wings[1])<1e-9,'wingbeat is disconnected');checks+=2;}old=a.birds;}
life.group.traverse(o=>{if(o.geometry){assert.ok(o.geometry.attributes.position.array.every(Number.isFinite),'non-finite scenery geometry');checks++;}});
const report={result:'passed',checks,movingWaterVertices:moved,waterVertices:surface.geometry.attributes.position.count,birds:life.audit.birds.length,maximumBirdStep,waterY:[life.audit.water.minY,life.audit.water.maxY],deterministic:true};
await fs.writeFile(new URL('../qa/landscape-life-report.json',import.meta.url),JSON.stringify(report,null,2));console.log(JSON.stringify(report));
