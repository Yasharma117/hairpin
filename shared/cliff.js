import { EDGE_SITE } from './choreography.js';
// This is the outline of the actual land, not a dark decal painted over its top.
// The western notch opens the cliff to the page; the route turns around its eastern head.
export const LAND_CONTOUR = [
  [-29,7],[-27,17],[-17,21],[-5,22],[9,20],[22,15],[28,5],[29,-8],
  [22,-22],[9,-31],[-4,-35],[-20,-38],[-29,-31],[-31,-23],
  [-22,-22],[-13,-21],[-6,-20],[-3.6,-17],[-4.5,-14],[-9,-14],[-16,-14],[-21,-13.6],[-26,-13.5],[-31,-12.8],[-31,-3],
];
export const ROAD_POINTS = [
  [-26,7],[-18,7],[-10,8],[-4,8],[3,11],[10,6],[22,4],[24,-3],
  [18,-9],[11,-16.2],[5,-16],[-1,-16.3],[-4,-9.2],[-7.5,-10.4],[-9.5,-12.0],[-10,-12.55],
  [-8.6,-12.45],[-5.0,-10.8],[-.8,-15.5],[-.8,-23],[-8,-30],[-18,-32],[-25,-32],
];
// The low river shares this boundary with the actual ravine floor.
export const RAVINE_BED = [[-21,-3.3],[-16,-4],[-11,-4.1],[-6,-4.8],[5.8,-5.0],[6.4,-8.4],[3.8,-12],[-4,-13],[-13,-13],[-22,-13]];
export function buildCliff(THREE,P) {
  const group=new THREE.Group();group.name='open-cliff';
  const materials=new Map();
  const material=color=>{const key=color?.isColor?color.getHexString():color;if(!materials.has(key))materials.set(key,new THREE.MeshStandardMaterial({color,flatShading:true,roughness:1,side:THREE.DoubleSide}));return materials.get(key);};
  const put=(geo,color)=>{if(!geo.getAttribute('uv'))geo.setAttribute('uv',new THREE.Float32BufferAttribute(new Float32Array(geo.attributes.position.count*2),2));const m=new THREE.Mesh(geo,material(color));m.castShadow=true;m.receiveShadow=true;group.add(m);return m;};
  // Local coordinates at the edge stop. This wall is nine metres high and faces the open canyon.
  const rim=[[-21,-2.8],[-16,-3.5],[-11,-3.6],[-6,-4],[-1,-4],[5.5,-4],[6.4,-7]];
  for(let band=0;band<5;band++){
    const top=-band*EDGE_SITE.drop/5,bottom=-(band+1)*EDGE_SITE.drop/5;
    for(let i=0;i<rim.length-1;i++){
      const a=rim[i],b=rim[i+1],out=band*.22,nextOut=(band+1)*.22;
      const ax=a[0]+Math.sin(i*1.2)*band*.04,bx=b[0]+Math.sin((i+1)*1.2)*band*.04;
      const an=a[0]+Math.sin(i*1.2)*(band+1)*.04,bn=b[0]+Math.sin((i+1)*1.2)*(band+1)*.04;
      // Each stratum is a closed wedge backed into the bank, not a floating face.
      const inward=new THREE.Vector2(-(b[1]-a[1]),b[0]-a[0]).normalize(),thickness=1.45+band*.1;
      const front=[[ax,top,a[1]-out],[bx,top,b[1]-out],[an,bottom,a[1]-nextOut],[bn,bottom,b[1]-nextOut]],vertices=front.concat(front.map(p=>[p[0]+inward.x*thickness,p[1],p[2]+inward.y*thickness]));
      const positions=[];for(const face of [[0,1,2],[1,3,2],[4,6,5],[5,6,7],[0,4,1],[1,4,5],[2,3,6],[3,7,6],[0,2,4],[2,6,4],[1,5,3],[3,5,7]])for(const index of face)positions.push(...vertices[index]);
      const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.computeVertexNormals();
      const stoneColor=new THREE.Color(P.rock).lerp(new THREE.Color(P.night),.18+band*.07),m=put(g,stoneColor);m.name='backed-gorge-stratum';if(band===4)m.material.roughness=.56;
      // Plates overlap the wall, with most of their thickness buried in it.
      const block=put(new THREE.DodecahedronGeometry(.46+(i%3)*.08,0),band%2?new THREE.Color(P.rock).lerp(new THREE.Color(P.night),.28):P.rock);
      block.position.set((a[0]+b[0])*.5,top-.85,(a[1]+b[1])*.5-.11-out);block.scale.set(1.8,.38,.82);block.rotation.z=Math.sin(i+band)*.07;
    }
  }
  // Fracture seams follow the actual sloping face instead of hanging in front of it.
  const jointColor=new THREE.Color(P.rock).lerp(new THREE.Color(P.night),.58);
  function faceZ(x,y){let segment=0;while(segment<rim.length-2&&x>rim[segment+1][0])segment++;const a=rim[segment],b=rim[segment+1],t=Math.max(0,Math.min(1,(x-a[0])/(b[0]-a[0])));return a[1]+(b[1]-a[1])*t+y/EDGE_SITE.drop*1.10;}
  for(const [i,x]of[-17.5,-12.2,-8.4,-5.8,-.4,3.5].entries()){
    const top=-1.2-(i%3)*1.8,bottom=top-1.0-(i%2)*.7,a=new THREE.Vector3(x,top,faceZ(x,top)-.025),b=new THREE.Vector3(x+.16*Math.sin(i),bottom,faceZ(x,bottom)-.025),d=b.clone().sub(a);
    const seam=put(new THREE.CylinderGeometry(.032,.042,d.length(),5),jointColor);seam.position.copy(a).add(b).multiplyScalar(.5);seam.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize());
  }
  // Low talus and a dark riverbed are visibly below the deck. They never cover the opening.
  const floor=new THREE.Shape();for(const [i,p] of RAVINE_BED.entries())i?floor.lineTo(p[0],-p[1]):floor.moveTo(p[0],-p[1]);floor.closePath();
  const bed=new THREE.ShapeGeometry(floor);bed.rotateX(-Math.PI/2);const bottom=put(bed,'#70877b');bottom.position.y=-EDGE_SITE.drop;bottom.name='gorge-gravel-bed';bottom.material.emissive.set('#70877b');bottom.material.emissiveIntensity=.12;
  for(let i=0;i<17;i++){const rock=put(new THREE.DodecahedronGeometry(.30+(i%4)*.14,0),i%3?P.rock:new THREE.Color(P.rock).lerp(new THREE.Color(P.water),.22));rock.position.set(-17+i*1.25+Math.sin(i*2)*.22,-EDGE_SITE.drop+.1,-6.2-(i%3)*.93);rock.scale.set(1.5,.7,1);rock.rotation.y=i*.71;}
  // Weathered wet stone anchors both sides of the western cascade to the lower foundation.
  for(const [x,y,z,s]of[[-20.7,-8.7,-7.7,.52],[-20.9,-8.6,-10.5,.59],[-21.05,-10.7,-7.55,.82],[-21.18,-10.8,-10.7,.91]]){const rock=put(new THREE.DodecahedronGeometry(s,0),new THREE.Color(P.rock).lerp(new THREE.Color(P.water),.18).lerp(new THREE.Color(P.night),.18));rock.position.set(x,y,z);rock.scale.set(.46,1.25,.8);rock.material.roughness=.5;}

  // A thick outcrop projects beyond the cliff: both people sit on stone, away from the falling car.
  const ledge=EDGE_SITE.ledge;
  const s=new THREE.Shape();ledge.forEach(([x,z],i)=>i?s.lineTo(x,-z):s.moveTo(x,-z));s.closePath();
  const g=new THREE.ExtrudeGeometry(s,{depth:.65,bevelEnabled:false});g.rotateX(-Math.PI/2);g.translate(0,-.65,0);put(g,P.rock).name='safe-seat-ledge';
  // Broken safety barrier, with a car-width opening at the exact fall line x=0.
  for(const x of [-5.1,-3.8,-1.5,1.45,3.0,4.7]){
    const post=put(new THREE.BoxGeometry(.16,.78,.18),P.cream);post.position.set(x,.39,-3.95);
    const band=put(new THREE.BoxGeometry(.17,.20,.19),P.night);band.position.set(x,.51,-3.95);
  }
  for(const [x,w] of [[-4,2.3],[3.2,2.8]]){const rail=put(new THREE.BoxGeometry(w,.12,.10),P.wood);rail.position.set(x,.69,-3.95);}
  const broken=put(new THREE.BoxGeometry(1.4,.11,.11),P.wood);broken.position.set(.85,-.8,-4.25);broken.rotation.z=-.7;
  const mistMat=new THREE.MeshBasicMaterial({color:P.water,transparent:true,opacity:.16,depthWrite:false});
  for(let i=0;i<5;i++){const mist=new THREE.Mesh(new THREE.SphereGeometry(1,12,8),mistMat);mist.position.set(-8+i*2.8,-5.8-(i%2)*1.1,-7.8);mist.scale.set(2.4,.22,1.2);group.add(mist);}
  return group;
}
