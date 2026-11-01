import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {registerHooks} from 'node:module';
const threeURL=new URL('../shared/vendor/three.module.js',import.meta.url).href;
registerHooks({resolve(spec,context,next){return spec==='three'?{url:threeURL,shortCircuit:true}:next(spec,context)}});
const THREE=await import(threeURL),{createEarthCutout}=await import('../shared/earth-cutout.js'),{LAND_CONTOUR,buildCliff}=await import('../shared/cliff.js'),{WORLD}=await import('../shared/style.js');
const earth=createEarthCutout({contour:LAND_CONTOUR,palette:WORLD}),cliff=buildCliff(THREE,WORLD);cliff.position.set(-10,0,-10);
const scene=new THREE.Scene();scene.add(earth,cliff);scene.updateMatrixWorld(true);
let checks=0;
function ray(origin,direction,objects=earth){return new THREE.Raycaster(new THREE.Vector3(...origin),new THREE.Vector3(...direction)).intersectObject(objects,true)}
const land=ray([0,3,10],[0,-1,0]);assert.ok(land.length&&Math.abs(land[0].point.y+.48)<.001,'ground has no upper earth cap');checks++;
const underside=ray([0,-20,10],[0,1,0]);assert.ok(underside.length&&Math.abs(underside[0].point.y+13.3)<.001,'earth has no closed underside');checks++;
const gorge=ray([-10,3,-16.5],[0,-1,0]);assert.ok(gorge.length&&gorge[0].point.y<-9.1,'foundation filled the carved canyon');checks++;
const clearSky=ray([-10,-8,-16.5],[0,1,0]);assert.equal(clearSky.length,0,'an earth cap crosses the fall opening');checks++;
const riverUnderside=ray([-10,-20,-16.5],[0,1,0]);assert.ok(riverUnderside.length&&Math.abs(riverUnderside[0].point.y+13.3)<.001,'riverbed is still a floating plane');checks++;
const gorgeCombined=ray([-10,3,-16.5],[0,-1,0],scene);assert.ok(gorgeCombined.length&&gorgeCombined[0].point.y<=-8.9,'rock detailing obstructs the fall');checks++;
const lateral=[];for(const height of [-1,-3,-6,-10,-12.5]){const hits=ray([-80,height,10],[1,0,0]);assert.ok(hits.length,'missing outer earth wall at '+height);checks++;lateral.push({height,x:hits[0].point.x});}
let meshCount=0,triangles=0;earth.traverse(o=>{if(!o.isMesh)return;meshCount++;triangles+=(o.geometry.index?.count||o.geometry.attributes.position.count)/3;for(const key of ['position','normal','uv']){assert.ok(o.geometry.attributes[key],'missing '+key+' for static batching');checks++;assert.ok(o.geometry.attributes[key].array.every(Number.isFinite),'invalid '+key);checks++;}});
const bounds=new THREE.Box3().setFromObject(earth);assert.ok(bounds.min.y<-13.29&&bounds.max.y>-.49);checks++;
const report={result:'passed',checks,meshCount,triangles,topY:land[0].point.y,bottomY:underside[0].point.y,gorgeFoundationTop:gorge[0].point.y,originalRiverBedY:gorgeCombined[0].point.y,lateralWalls:lateral};
await fs.writeFile(new URL('../qa/earth-cutout-report.json',import.meta.url),JSON.stringify(report,null,2));console.log(JSON.stringify(report));
