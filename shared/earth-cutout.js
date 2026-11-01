import * as THREE from 'three';
import { RAVINE_BED } from './cliff.js';
import { EDGE_SITE } from './choreography.js';

// A carved piece of ground: the upper rings preserve the canyon notch, while
// bedrock continues underneath its river. The grass cap is supplied by world.js.
export function createEarthCutout({contour,palette:P,edgeOrigin={x:-10,z:-10}}) {
  const group=new THREE.Group();group.name='earth-cutout';group.userData.bottomY=-13.3;group.userData.riverBedY=-EDGE_SITE.drop-.11;
  const materialCache=new Map();
  const material=color=>{const key=color?.isColor?color.getHexString():color;if(!materialCache.has(key))materialCache.set(key,new THREE.MeshStandardMaterial({color,emissive:color,emissiveIntensity:.12,flatShading:true,roughness:.98,side:THREE.DoubleSide}));return materialCache.get(key);};
  const mix=(a,b,t)=>new THREE.Color(a).lerp(new THREE.Color(b),t);
  const strata=[mix(P.earth,'#8e684c',.35),mix(P.earth,'#8e8371',.48),mix(P.rock,'#b4a28b',.38),mix(P.rock,'#787d75',.30),mix(P.rock,'#626d69',.47),mix(P.rock,'#495b59',.55)];
  const put=(geometry,color,name)=>{if(!geometry.attributes.normal)geometry.computeVertexNormals();if(!geometry.attributes.uv)geometry.setAttribute('uv',new THREE.Float32BufferAttribute(new Float32Array(geometry.attributes.position.count*2),2));const mesh=new THREE.Mesh(geometry,material(color));mesh.name=name;mesh.castShadow=mesh.receiveShadow=true;group.add(mesh);return mesh;};
  const shapeGeometry=(points,y,down=false)=>{const shape=new THREE.Shape();points.forEach((p,i)=>i?shape.lineTo(p.x,-p.z):shape.moveTo(p.x,-p.z));shape.closePath();const g=new THREE.ShapeGeometry(shape);g.rotateX(-Math.PI/2);g.translate(0,y,0);if(down){const index=g.index;for(let i=0;i<index.count;i+=3){const b=index.getX(i+1),c=index.getX(i+2);index.setX(i+1,c);index.setX(i+2,b);}g.computeVertexNormals();}return g;};
  function sampleContour(source){const points=[];for(let i=0;i<source.length;i++){const a=source[i],b=source[(i+1)%source.length],count=Math.max(2,Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])/3));for(let n=0;n<count;n++){const t=n/count;points.push({x:THREE.MathUtils.lerp(a[0],b[0],t),z:THREE.MathUtils.lerp(a[1],b[1],t)});}}return points;}
  function inward(points,i){const a=points[(i+points.length-1)%points.length],b=points[i],c=points[(i+1)%points.length];let area=0;for(let j=0;j<points.length;j++){const p=points[j],q=points[(j+1)%points.length];area+=p.x*q.z-q.x*p.z;}const sign=area>=0?1:-1,one=new THREE.Vector2(-(b.z-a.z),b.x-a.x).normalize().multiplyScalar(sign),two=new THREE.Vector2(-(c.z-b.z),c.x-b.x).normalize().multiplyScalar(sign),normal=one.clone().add(two).normalize(),miter=Math.max(.55,normal.dot(one));return {x:normal.x/miter,z:normal.y/miter};}
  function loft(source,levels,colors,label){
    const points=sampleContour(source),normals=points.map((p,i)=>inward(points,i)),clockwise=points.reduce((area,p,i)=>{const q=points[(i+1)%points.length];return area+p.x*q.z-q.x*p.z;},0)<0;
    const rings=levels.map((level,j)=>points.map((p,i)=>{const inset=level.inset*(.90+.10*Math.sin(i*.83)),jitter=j===0||j===levels.length-1?0:Math.sin(i*.69+j*.8)*level.jitter;return {x:p.x+normals[i].x*inset,z:p.z+normals[i].z*inset,y:level.y+jitter};}));
    for(let band=0;band<rings.length-1;band++){
      const data=[];
      for(let i=0;i<points.length;i++){const n=(i+1)%points.length,a=rings[band][i],b=rings[band][n],c=rings[band+1][i],d=rings[band+1][n];for(const v of (clockwise?[a,c,b,b,c,d]:[a,b,c,b,d,c]))data.push(v.x,v.y,v.z);}
      const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(data,3));g.computeVertexNormals();put(g,colors[Math.min(band,colors.length-1)],`${label}-stratum-${band+1}`);
    }
    put(shapeGeometry(rings[0],levels[0].y),colors[0],`${label}-top`);
    put(shapeGeometry(rings.at(-1),levels.at(-1).y,true),colors.at(-1),`${label}-underside`);
    return {points,normals,rings};
  }
  const levels=[{y:-.48,inset:0,jitter:0},{y:-1.35,inset:.045,jitter:.075},{y:-3.25,inset:.17,jitter:.13},{y:-5.9,inset:.32,jitter:.18},{y:-9.05,inset:.48,jitter:.16},{y:-11.2,inset:.68,jitter:.12},{y:-13.3,inset:.88,jitter:0}];
  const main=loft(contour,levels,strata,'earth');
  const riverContour=RAVINE_BED.map(([x,z])=>[x+edgeOrigin.x,z+edgeOrigin.z]);
  loft(riverContour,[{y:-EDGE_SITE.drop-.11,inset:0,jitter:0},{y:-11.2,inset:.20,jitter:.11},{y:-13.3,inset:.45,jitter:0}],strata.slice(4),'river-foundation');

  // Embedded rock and occasional joints belong to the faces, with most of each
  // stone inside the earth. They do not become freestanding decorative debris.
  const stoneColor=mix(P.rock,P.night,.29),jointColor=mix(P.rock,P.night,.52);
  for(let i=1;i<main.points.length;i+=5){
    const p=main.points[i],n=main.normals[i],level=2+(i%3),y=THREE.MathUtils.lerp(levels[level].y,levels[level+1].y,.46),inset=THREE.MathUtils.lerp(levels[level].inset,levels[level+1].inset,.46);
    const stone=put(new THREE.DodecahedronGeometry(.40+(i%4)*.065,0),stoneColor,'embedded-bedrock');stone.position.set(p.x+n.x*(inset-.08),y,p.z+n.z*(inset-.08));stone.scale.set(.85,.32,1.4);stone.rotation.y=i*.71;
    const q=main.points[(i+1)%main.points.length],length=Math.min(1.7,Math.hypot(q.x-p.x,q.z-p.z)*.65),joint=put(new THREE.BoxGeometry(length,.045,.035),jointColor,'bedding-joint');joint.position.set(p.x+n.x*(inset-.018),y+.40,p.z+n.z*(inset-.018));joint.rotation.y=Math.atan2(-(q.z-p.z),q.x-p.x);joint.rotation.z=Math.sin(i)*.07;
  }
  // Merge fixed geology by paint while retaining actual continuous seam vertices.
  group.updateMatrixWorld(true);const batches=new Map();for(const mesh of [...group.children]){if(!batches.has(mesh.material))batches.set(mesh.material,[]);batches.get(mesh.material).push(mesh);}
  for(const [paint,pieces]of batches){if(pieces.length<2)continue;const parts=pieces.map(mesh=>{const g=mesh.geometry.index?mesh.geometry.toNonIndexed():mesh.geometry.clone();g.applyMatrix4(mesh.matrixWorld);return g;}),g=new THREE.BufferGeometry();for(const [name,size]of[['position',3],['normal',3],['uv',2]]){const data=new Float32Array(parts.reduce((n,p)=>n+p.attributes[name].array.length,0));let offset=0;for(const p of parts){data.set(p.attributes[name].array,offset);offset+=p.attributes[name].array.length;}g.setAttribute(name,new THREE.BufferAttribute(data,size));}const mesh=new THREE.Mesh(g,paint);mesh.name='stratified-earth';mesh.castShadow=mesh.receiveShadow=true;group.add(mesh);for(const piece of pieces){piece.removeFromParent();piece.geometry.dispose();}for(const p of parts)p.dispose();}
  return group;
}
