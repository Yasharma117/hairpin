import * as THREE from 'three';
import { person, normalise } from './folk.js';

// An illustrative Shillong overlook: Assam-type roofs and verandahs, an irregular
// hill town, and the blue cathedral's twin towers. This is scenery, not a street map.
export function createSkyline() {
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(45, 16 / 9, .1, 600);
  const night = '#152334';
  scene.fog = new THREE.Fog('#293d51', 48, 200);
  scene.add(new THREE.HemisphereLight('#b8cbe4', '#202d36', 1.5));
  const moon = new THREE.DirectionalLight('#b6cbe0', 1.4); moon.position.set(-18, 35, 14); scene.add(moon);
  const cityGlow=new THREE.PointLight('#ffd6a8',55,38,2);cityGlow.position.set(-5,7,-30);scene.add(cityGlow);
  const lantern = new THREE.PointLight('#ffd5a0', 4.5, 11, 2); lantern.position.set(-5.5, 2.8, 3.7); scene.add(lantern);
  let seed = 417, time = 0, lookKey = '', rider = null, previousBanked = false, bankedAt = -100, breeze = 0;
  const rand = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
  const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const mats = new Map(), geometries = new Set(), ownedMaterials = new Set(), textures = new Set();
  const material = (color, extra = {}) => { const key = color + JSON.stringify(extra); if (!mats.has(key)) mats.set(key, new THREE.MeshStandardMaterial({color, roughness: .96, ...extra})); return mats.get(key); };
  const add = (geometry, mat, position = [0, 0, 0], parent = scene) => { geometries.add(geometry); ownedMaterials.add(mat); const mesh = new THREE.Mesh(geometry, mat); mesh.position.set(...position); parent.add(mesh); return mesh; };
  const box = (w, h, d, color, x, y, z, parent = scene, extra = {}) => add(new THREE.BoxGeometry(w, h, d), material(color, extra), [x, y, z], parent);
  const beam = (a, b, r, color, parent = scene) => { const from = new THREE.Vector3(...a), to = new THREE.Vector3(...b), vector = to.clone().sub(from); const mesh = add(new THREE.CylinderGeometry(r * .64, r, vector.length(), 7), material(color), [0,0,0], parent); mesh.position.copy(from).add(to).multiplyScalar(.5); mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0), vector.normalize()); return mesh; };
  const basic = options => { const mat = new THREE.MeshBasicMaterial(options); ownedMaterials.add(mat); return mat; };
  const matrix = new THREE.Matrix4(), scratch = new THREE.Vector3(), quaternion = new THREE.Quaternion(), scale = new THREE.Vector3();
  const zAxis = new THREE.Vector3(0, 0, 1), yAxis = new THREE.Vector3(0, 1, 0);

  const skyMaterial = new THREE.ShaderMaterial({
    depthWrite: false, uniforms: {uTime: {value: 0}},
    vertexShader: 'varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader: `varying vec2 vUv; uniform float uTime;
      float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
      float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+1.),f.x),f.y);}
      void main(){float h=clamp((vUv.y-.18)*1.7,0.,1.);vec3 low=vec3(.23,.31,.39),high=vec3(.025,.055,.105);vec3 c=mix(low,high,pow(h,.65));float cloud=noise(vUv*vec2(12.,30.)+vec2(uTime*.001,0.))*.6+noise(vUv*vec2(24.,56.))*.4;c+=vec3(.032,.042,.06)*smoothstep(.5,.8,cloud)*(1.-h)*.5;gl_FragColor=vec4(c,1.);}`
  });
  const sky = add(new THREE.PlaneGeometry(1000, 550), skyMaterial, [0, 90, -300]); sky.name = 'night-sky'; sky.userData.moving = true;
  for (let layer = 0; layer < 5; layer++) {
    const shape = new THREE.Shape(); shape.moveTo(-250, -45);
    for (let x = -250; x <= 250; x += 5) shape.lineTo(x, 9 + layer * 2.3 + Math.sin(x * .031 + layer * 1.2) * 7 + Math.sin(x * .067 + layer * .7) * 2.4 + Math.cos(x * .013) * 3);
    shape.lineTo(250, -45); shape.closePath();
    add(new THREE.ShapeGeometry(shape), basic({color: ['#263b49','#2c4253','#30485c','#334c61','#354e65'][layer], fog: false}), [0, 0, -105 - layer * 24]);
  }
  function ground(x, z) { return -6.3 + Math.pow(Math.abs(x + 4) / 14, 1.35) * 1.6 + (-z - 20) * .06 + Math.sin(x * .10 + z * .065) * 1.4 + Math.cos(z * .09 - x * .04) * .8; }
  const terrainPositions = [];
  for (let iz = 0; iz < 27; iz++) for (let ix = 0; ix < 34; ix++) {
    const x = -76 + ix * 4.5, z = -12 - iz * 4.5;
    for (const [dx, dz] of [[0,0],[4.5,0],[0,-4.5],[4.5,0],[4.5,-4.5],[0,-4.5]]) terrainPositions.push(x + dx, ground(x + dx, z + dz) - .1, z + dz);
  }
  const terrain = new THREE.BufferGeometry(); terrain.setAttribute('position', new THREE.Float32BufferAttribute(terrainPositions, 3)); terrain.computeVertexNormals(); add(terrain, material('#283b43', {side: THREE.DoubleSide}));

  // Roads follow the contours. The lots are sampled around them, never on a grid.
  const roads = [], roadSamples = [], roadLights = [];
  const routes = [
    [[-54,-18],[-30,-25],[-17,-35],[-4,-44],[18,-52],[31,-68],[47,-92]],
    [[-48,-42],[-30,-49],[-23,-60],[-8,-72],[10,-76],[33,-90]],
    [[-7,-14],[1,-25],[15,-32],[24,-40],[25,-53],[17,-66],[3,-87]],
    [[-62,-69],[-42,-79],[-23,-88],[0,-102],[32,-106],[60,-118]],
  ];
  for (let lane = 0; lane < routes.length; lane++) {
    const curve = new THREE.CatmullRomCurve3(routes[lane].map(([x,z]) => new THREE.Vector3(x, ground(x,z) + .04, z)));
    const points = [], vertices = [], samples = [];
    for (let i = 0; i <= 150; i++) { const p = curve.getPoint(i / 150); p.y = ground(p.x,p.z) + .04; samples.push(p); points.push(p); roadSamples.push(p); if (i % 3 === 0) roadLights.push(p.clone().add(new THREE.Vector3(.7,.12,0))); }
    for (let i = 0; i < 150; i++) {
      const a=samples[i],b=samples[i+1],d=b.clone().sub(a).normalize(),side=new THREE.Vector3(-d.z,0,d.x).multiplyScalar(lane === 0 ? .66 : .43);
      for(const p of [a.clone().add(side),a.clone().sub(side),b.clone().add(side),a.clone().sub(side),b.clone().sub(side),b.clone().add(side)])vertices.push(p.x,p.y,p.z);
    }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3)); geo.computeVertexNormals(); add(geo,material('#46505a',{side:THREE.DoubleSide})); roads.push(curve);
  }
  const windows = [], occupied = [], darkWindows = [];
  function gable(w, d, rise) {
    const geometry = new THREE.BufferGeometry(), x = w/2, z = d/2;
    const vertices = [-x,0,-z,x,0,-z,0,rise,-z,-x,0,z,0,rise,z,x,0,z,-x,0,-z,-x,0,z,0,rise,z,-x,0,-z,0,rise,z,0,rise,-z,x,0,z,x,0,-z,0,rise,-z,x,0,z,0,rise,-z,0,rise,z];
    geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3)); geometry.computeVertexNormals(); return geometry;
  }
  function house(x,z,w,h,d,rotation,variant,detail) {
    const root = new THREE.Group(); root.position.set(x,ground(x,z),z); root.rotation.y=rotation; scene.add(root);
    const wall = ['#727a78','#698083','#8a8275','#606e7b','#7c777f'][variant%5], trim=['#37434b','#314954','#55483f'][variant%3], roof=['#51484c','#3c5657','#59606a','#6d4e4e'][variant%4];
    box(w+.12,.28,d+.15,'#44494c',0,.14,0,root); box(w,h,d,wall,0,h/2+.2,0,root);
    const pitched=variant%5!==0;
    if(pitched) {
      add(gable(w+.38,d+.42,.62+w*.10),material(roof),[0,h+.2,0],root);
      beam([0,h+.86+w*.10,-d*.5-.23],[0,h+.86+w*.10,d*.5+.23],.035,roof,root);
      if(detail)for(let k=1;k<=5;k++)for(const side of [-1,1]){const rx=side*k/6*(w/2+.19),ry=h+.2+(.62+w*.10)*(1-k/6);beam([rx,ry,-d/2-.22],[rx,ry,d/2+.22],.011,'#899091',root);}
    }else { box(w+.23,.14,d+.23,roof,0,h+.24,0,root); box(.48,.54,.48,'#54616b',w*.22,h+.53,-d*.2,root); }
    const stories=h>3?2:1, cols=Math.max(2,Math.round(w/.78));
    for(let floor=0;floor<stories;floor++)for(let j=0;j<cols;j++){
      const lx=-w*.5+(j+.5)*w/cols,ly=.65+floor*h*.49;
      box(.42,.61,.055,trim,lx,ly,d*.5+.035,root);
      if(detail){box(.47,.045,.09,'#a0a49d',lx,ly-.30,d*.5+.05,root);box(.025,.57,.025,trim,lx,ly,d*.5+.08,root);}
      const p=root.localToWorld(new THREE.Vector3(lx,ly,d*.5+.069));(rand()>.13?windows:darkWindows).push([p.x,p.y,p.z,.29,.43,rotation,rand()]);
    }
    for(const side of [-1,1])for(let floor=0;floor<stories;floor++)for(let j=0;j<2;j++){
      if(rand()<.26)continue;
      const lz=(j-.5)*d*.53,ly=.65+floor*h*.49;
      box(.045,.61,.42,trim,side*(w*.5+.025),ly,lz,root);
      const p=root.localToWorld(new THREE.Vector3(side*(w*.5+.052),ly,lz));windows.push([p.x,p.y,p.z,.30,.43,rotation+side*Math.PI/2,rand()]);
    }
    if(detail) {
      // Timber uprights, shallow covered verandahs and framed glazing are the local vocabulary.
      for(const xx of [-w*.5+.04,w*.5-.04])box(.055,h,.06,trim,xx,h/2+.2,d*.5+.04,root);
      box(w,.055,.07,trim,0,.34,d*.5+.05,root);
      if(variant%3===0){box(w*.85,.12,.75,roof,0,1.65,d*.5+.35,root);for(const xx of [-w*.36,w*.36])box(.05,1.55,.05,'#929a93',xx,.82,d*.5+.65,root);box(w*.8,.055,.055,'#929a93',0,.65,d*.5+.67,root);}
      box(.28,.40,.28,'#777f7a',-w*.23,h+.35,-d*.18,root);
    }
  }
  for(let attempt=0;attempt<2500&&occupied.length<330;attempt++) {
    const z=-17-rand()*105,x=(rand()-.5)*(z< -70?133:106),d=1.5+rand()*1.7,w=1.8+rand()*2.5;
    if(roadSamples.some(p=>Math.hypot(p.x-x,p.z-z)<1.5+w*.24))continue;
    if(occupied.some(p=>Math.hypot(p.x-x,p.z-z)<(p.r+w*.5)+.4))continue;
    if(Math.hypot(x-12,z+57)<6.5)continue;
    occupied.push({x,z,r:w*.48});const variant=Math.floor(rand()*18),h=1.5+rand()*2.8+(variant%7===0?1.8:0);
    house(x,z,w,h,d,(rand()-.5)*1.2,variant,z>-44);
  }
  // Blue Gothic facade and twin towers provide an unmistakable city landmark.
  const cathedral=new THREE.Group();cathedral.position.set(12,ground(12,-57)+1.7,-57);cathedral.rotation.y=-.15;scene.add(cathedral);
  box(8,1.7,8,'#47535c',0,-.85,0,cathedral);
  box(5.6,3.7,5.2,'#628899',0,1.85,0,cathedral,{emissive:'#36536d',emissiveIntensity:.18});
  add(gable(5.9,5.55,1.6),material('#45616e'),[0,3.7,0],cathedral);
  for(const side of [-1,1]){
    box(1.15,6.3,1.25,'#6c94a6',side*2.6,3.15,2.25,cathedral,{emissive:'#40677c',emissiveIntensity:.18});
    const spire=add(new THREE.ConeGeometry(.84,1.8,4),material('#496371'),[side*2.6,7.1,2.25],cathedral);spire.rotation.y=Math.PI/4;
    beam([side*2.6,7.9,2.25],[side*2.6,8.7,2.25],.027,'#c8c1a4',cathedral);beam([side*2.6-.2,8.44,2.25],[side*2.6+.2,8.44,2.25],.023,'#c8c1a4',cathedral);
    for(const yy of [3.6,4.8]){box(.42,.75,.035,'#263d50',side*2.6,yy,2.89,cathedral);windows.push([12+side*2.6,cathedral.position.y+yy,-54.07,.22,.47,0,.8]);}
  }
  for(const xx of [-1.55,0,1.55]){box(.58,1.65,.05,'#294450',xx,1.3,2.64,cathedral);windows.push([12+xx,cathedral.position.y+1.65,-54.32,.24,.75,-.15,.95]);}
  const lightGeometry=new THREE.PlaneGeometry(1,1);geometries.add(lightGeometry);
  const lights=new THREE.InstancedMesh(lightGeometry,basic({color:'#fff4d8',fog:true,side:THREE.DoubleSide}),windows.length);lights.name='city-windows';lights.frustumCulled=false;scene.add(lights);
  windows.forEach(([x,y,z,w,h,rotation,tint],i)=>{quaternion.setFromAxisAngle(yAxis,rotation);matrix.compose(scratch.set(x,y,z),quaternion,scale.set(w,h,1));lights.setMatrixAt(i,matrix);lights.setColorAt(i,new THREE.Color(tint>.7?'#ffe8c1':tint>.25?'#f5c58a':'#cbd9da'));});
  const street=new THREE.InstancedMesh(new THREE.SphereGeometry(.055,5,4),basic({color:'#ffce8d'}),roadLights.length);scene.add(street);roadLights.forEach((p,i)=>{matrix.makeTranslation(p.x,p.y,p.z);street.setMatrixAt(i,matrix);});
  const traffic=[];for(let i=0;i<4;i++){const root=new THREE.Group();root.userData.moving=true;scene.add(root);for(const xx of [-.12,.12])add(new THREE.SphereGeometry(.048,5,4),basic({color:i%2?'#ffdba1':'#d9e6e4'}),[xx,.12,0],root);traffic.push(root);}

  // Stone lookout, honest joinery, and warm timber make the foreground tactile.
  box(28,.45,13,'#3a454a',0,-.28,7.5);box(28,.10,.50,'#7a8583',0,.03,1.3);
  for(let x=-13;x<=13;x+=1.25)box(.065,1.05,.065,'#526773',x,.53,1.28);
  box(26,.085,.10,'#91a09f',0,1.04,1.28);box(26,.045,.065,'#596e78',0,.43,1.28);
  box(3.4,.40,.6,'#424a4c',3,.20,3.1);for(let j=0;j<3;j++)box(3.5,.07,.16,'#9d775b',3,.44,2.92+j*.18);
  const yash=person('you');yash.obj.name='skyline-yash';yash.obj.scale.setScalar(.042);yash.setLight(.88,-1,'warm');scene.add(yash.obj);yash.shadow.visible=false;

  // Flowers have five slim, cupped petals. Falling petals are individual tapered
  // blades with an asymmetric curl; there is no heart silhouette or central notch.
  function petalGeometry(length=.17,width=.052) {
    const p=[],uv=[],indices=[];
    for(let j=0;j<=10;j++){
      const t=j/10,w=Math.sin(Math.PI*t)*width*(.78+t*.25),bend=Math.sin(t*Math.PI)*.018,shift=Math.sin(t*2.1)*width*.20;
      p.push(shift-w,t*length-length*.48,bend,shift+w,t*length-length*.48,bend*.3);uv.push(0,t,1,t);
      if(j<10){const a=j*2;indices.push(a,a+1,a+2,a+1,a+3,a+2);}
    }
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeVertexNormals();return g;
  }
  const flowerPositions=[],flowerNormals=[],petal=petalGeometry(.11,.055);
  for(let n=0;n<5;n++){
    const g=petal.toNonIndexed(),transform=new THREE.Matrix4().makeRotationZ(n*Math.PI*2/5);transform.setPosition(Math.sin(-n*Math.PI*2/5)*.04,Math.cos(n*Math.PI*2/5)*.04,0);g.applyMatrix4(transform);flowerPositions.push(...g.attributes.position.array);flowerNormals.push(...g.attributes.normal.array);g.dispose();
  }
  petal.dispose();const flowerGeometry=new THREE.BufferGeometry();flowerGeometry.setAttribute('position',new THREE.Float32BufferAttribute(flowerPositions,3));flowerGeometry.setAttribute('normal',new THREE.Float32BufferAttribute(flowerNormals,3));geometries.add(flowerGeometry);
  const tree=new THREE.Group();tree.name='cherry-tree';tree.position.set(-7,0,3);tree.userData.moving=true;scene.add(tree);
  const boughs=[[[0,0,0],[.2,2.5,-.1],[.9,4.8,-.5],[3,6.8,-1.3],[5.5,7.7,-2]],[[.2,2.5,-.1],[-1,4.5,-.9],[-3,6.9,-1.6],[-5,7.7,-2.2]],[[.9,4.8,-.5],[.6,7,-1.1],[1.2,8.7,-1.8]]];
  boughs.forEach((points,branch)=>points.slice(1).forEach((p,i)=>beam(points[i],p,Math.max(.037,(branch?.13:.28)-i*.06),'#493b42',tree)));
  const flowers=[];
  for(let twig=0;twig<35;twig++){
    const bough=boughs[twig%3],segment=Math.min(bough.length-2,Math.max(1,bough.length-3)+Math.floor(twig/3)%2),a=bough[segment],b=bough[segment+1],t=.2+rand()*.7;
    const base=a.map((v,i)=>v+(b[i]-v)*t),tip=[base[0]+(rand()-.5)*2.3,base[1]+.5+rand()*.85,base[2]+(rand()-.5)*1.8];beam(base,tip,.018+rand()*.018,'#604752',tree);
    for(let j=0;j<24;j++)flowers.push([tip[0]+(rand()-.5)*1.8,tip[1]+(rand()-.5)*1.0,tip[2]+(rand()-.5)*1.4,.65+rand()*.7,rand()*6.28,rand()]);
  }
  const blossom=new THREE.InstancedMesh(flowerGeometry,material('#fff2f1',{side:THREE.DoubleSide,emissive:'#ba7896',emissiveIntensity:.18}),flowers.length);blossom.name='cherry-blossom';blossom.frustumCulled=false;tree.add(blossom);
  flowers.forEach(([x,y,z,s,r,tint],i)=>{quaternion.setFromEuler(new THREE.Euler(-.10+(tint-.5)*.8,(tint-.5)*1.3,r));matrix.compose(scratch.set(x,y,z),quaternion,scale.setScalar(s));blossom.setMatrixAt(i,matrix);blossom.setColorAt(i,new THREE.Color(tint>.65?'#f9d7e0':tint>.3?'#e6a8bd':'#cf849f'));});
  const petalGeo=petalGeometry(.17,.045);geometries.add(petalGeo);
  const petals=new THREE.InstancedMesh(petalGeo,basic({color:'#edbdcf',side:THREE.DoubleSide,transparent:true,opacity:.85,depthWrite:false}),100);petals.name='foreground-petals';petals.frustumCulled=false;scene.add(petals);
  const particleSeeds=Array.from({length:100},(_,i)=>({x:-9+rand()*8.6,z:.5+rand()*8,phase:rand(),period:17+rand()*11,drift:2.5+rand()*5.5,size:.62+rand()*.55,spin:rand()*6.28}));
  const offsets=new Float32Array(400),lastPointer=new THREE.Vector2(),pointerVelocity=new THREE.Vector2();let pointerKnown=false;
  const stars=[];for(let i=0;i<210;i++)stars.push((rand()-.5)*270,23+rand()*95,-190-rand()*40);
  const starField=new THREE.Points(new THREE.BufferGeometry().setAttribute('position',new THREE.Float32BufferAttribute(stars,3)),new THREE.PointsMaterial({color:'#c3d4e5',size:.13,transparent:true,opacity:.55,sizeAttenuation:true,fog:false}));scene.add(starField);
  const shootingStar=add(new THREE.SphereGeometry(.27,8,6),basic({color:'#fff4d0',fog:false}));shootingStar.name='shooting-star';shootingStar.visible=false;
  const trail=new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(),new THREE.Vector3()]),new THREE.LineBasicMaterial({color:'#ffdfab',transparent:true,opacity:.8,fog:false}));scene.add(trail);trail.name='shooting-star-trail';trail.frustumCulled=false;trail.visible=false;
  const haloCanvas=document.createElement('canvas');haloCanvas.width=haloCanvas.height=64;const hc=haloCanvas.getContext('2d'),hg=hc.createRadialGradient(32,32,0,32,32,32);hg.addColorStop(0,'#fff6cf');hg.addColorStop(.18,'#ffe4aa90');hg.addColorStop(1,'#ffd58a00');hc.fillStyle=hg;hc.fillRect(0,0,64,64);const haloTexture=new THREE.CanvasTexture(haloCanvas);textures.add(haloTexture);const halo=add(new THREE.PlaneGeometry(1.5,1.5),basic({map:haloTexture,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,fog:false}));halo.visible=false;halo.frustumCulled=false;

  // Branches sway as one rooted tree, so merge their wood in tree-local space.
  tree.updateMatrixWorld(true);const treeInverse=tree.matrixWorld.clone().invert(),woodBatches=new Map();
  tree.traverse(o=>{if(!o.isMesh||o.isInstancedMesh)return;if(!woodBatches.has(o.material))woodBatches.set(o.material,[]);woodBatches.get(o.material).push(o);});
  for(const [mat,pieces]of woodBatches){
    if(pieces.length<2)continue;const parts=pieces.map(o=>{const g=o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone();g.applyMatrix4(new THREE.Matrix4().multiplyMatrices(treeInverse,o.matrixWorld));return g;});
    const merged=new THREE.BufferGeometry();for(const [name,size]of[['position',3],['normal',3]]){const data=new Float32Array(parts.reduce((n,g)=>n+g.attributes[name].array.length,0));let offset=0;for(const g of parts){data.set(g.attributes[name].array,offset);offset+=g.attributes[name].array.length;}merged.setAttribute(name,new THREE.BufferAttribute(data,size));}
    add(merged,mat,[0,0,0],tree).name='cherry-boughs';pieces.forEach(p=>p.removeFromParent());parts.forEach(g=>g.dispose());
  }

  // Batch all unmoving architecture once. The tree, people and actual effects
  // retain their own transforms and animation rather than being baked into town.
  scene.updateMatrixWorld(true);const batches=new Map();
  scene.traverse(o=>{let moving=false;for(let p=o;p;p=p.parent)if(p.userData.moving)moving=true;if(!o.isMesh||o.isInstancedMesh||o.userData.pixelArt||o.name==='shooting-star'||moving||o.material.transparent)return;if(!batches.has(o.material))batches.set(o.material,[]);batches.get(o.material).push(o);});
  for(const [mat,pieces] of batches){if(pieces.length<2)continue;const parts=pieces.map(o=>{const g=o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone();g.applyMatrix4(o.matrixWorld);return g;});const merged=new THREE.BufferGeometry();for(const [name,size]of[['position',3],['normal',3]]){const data=new Float32Array(parts.reduce((n,g)=>n+g.attributes[name].array.length,0));let offset=0;for(const g of parts){data.set(g.attributes[name].array,offset);offset+=g.attributes[name].array.length;}merged.setAttribute(name,new THREE.BufferAttribute(data,size));}add(merged,mat).name='city-construction';pieces.forEach(p=>p.removeFromParent());parts.forEach(g=>g.dispose());}

  function resize(w,h){camera.aspect=w/h;camera.fov=w/h<.9?60:45;camera.updateProjectionMatrix();}
  function frame(dt,state={}){
    time=Number.isFinite(Number(state.since))?Number(state.since):time+dt;const since=Number(state.since)||0,d=Math.min(.05,Math.max(0,dt));
    const phoneShift=camera.aspect<.9?2.7:0;tree.position.x=-7+phoneShift;
    const reveal=clamp((since-6)/4),ease=reveal*reveal*(3-2*reveal),centre=camera.aspect<.9?2.9:0;camera.position.set(centre,3.3+ease*.85,14.3+ease*1.5);camera.lookAt(centre,3.1+ease*2.3,-40);camera.updateMatrixWorld();skyMaterial.uniforms.uTime.value=time;
    const key=JSON.stringify(normalise(state.look||{name:'Alex',build:'f',top:'hoodie'}));if(key!==lookKey){lookKey=key;if(rider){scene.remove(rider.obj);rider.dispose();}rider=person(state.look||{name:'Alex',build:'f',top:'hoodie'});rider.obj.name='skyline-rider';rider.obj.scale.setScalar(.042);rider.setLight(.88,-1,'warm');scene.add(rider.obj);rider.shadow.visible=false;}
    [yash,rider].forEach((a,i)=>{a.obj.position.set(2.4+i*1.2,.5,3.1);a.play(state.starUp?'lookup':'sit').face('back',true);a.obj.quaternion.copy(camera.quaternion);a.update(dt);});
    if(state.banked&&!previousBanked)bankedAt=time;previousBanked=!!state.banked;const pulse=state.banked&&time>=bankedAt?clamp(1-(time-bankedAt)/3.2):0;
    if(!d){pointerVelocity.set(0,0);pointerKnown=false;}
    const pointer=state.pointer,active=pointer&&pointer.active!==false&&Number.isFinite(pointer.x)&&Number.isFinite(pointer.y);
    if(active){if(pointerKnown&&d>0)pointerVelocity.set((pointer.x-lastPointer.x)/d,(pointer.y-lastPointer.y)/d).clampLength(0,8);else pointerVelocity.set(0,0);lastPointer.set(pointer.x,pointer.y);pointerKnown=true;}else{pointerVelocity.multiplyScalar(.8);pointerKnown=false;}
    const requested=clamp((Number(state.breeze?.strength)||0)+pointerVelocity.length()*.10+(Number(state.gust)||0)*.20+pulse*.24);
    breeze=d?THREE.MathUtils.lerp(breeze,requested,1-Math.exp(-d*2.4)):requested;tree.rotation.z=Math.sin(time*.53)*.0035+breeze*.010;tree.rotation.x=Math.sin(time*.37)*.002;
    const right=new THREE.Vector3(1,0,0).applyQuaternion(camera.quaternion),up=new THREE.Vector3(0,1,0).applyQuaternion(camera.quaternion);
    for(let i=0;i<100;i++){
      const seed=particleSeeds[i],k=(time/seed.period+seed.phase)%1;let x=seed.x+phoneShift+k*(seed.drift+breeze*1.7)+Math.sin(time*.41+i)*.25,y=9-k*10.3,z=seed.z;
      const j=i*4;if(!d){offsets[j]=offsets[j+1]=offsets[j+2]=offsets[j+3]=0;}
      scratch.set(x,y,z).project(camera);
      if(active&&d){const dx=scratch.x-pointer.x,dy=scratch.y-pointer.y,dist=Math.hypot(dx,dy),force=Math.max(0,1-dist/.34);offsets[j+2]+=(-dy*.9+pointerVelocity.x*.09)*force*d*6;offsets[j+3]+=(dx*.45+pointerVelocity.y*.05)*force*d*4;}
      offsets[j+2]+=(breeze*.20-offsets[j]*.7)*d;offsets[j+3]+=(-offsets[j+1]*.7)*d;offsets[j+2]*=Math.exp(-d*1.8);offsets[j+3]*=Math.exp(-d*1.8);offsets[j]=clamp(offsets[j]+offsets[j+2]*d,-1.25,1.25);offsets[j+1]=clamp(offsets[j+1]+offsets[j+3]*d,-.65,.65);
      scratch.set(x,y,z).addScaledVector(right,offsets[j]+pulse*Math.sin(i*2.7)*.14).addScaledVector(up,offsets[j+1]);
      quaternion.copy(camera.quaternion).multiply(new THREE.Quaternion().setFromAxisAngle(zAxis,seed.spin+time*(.23+i%3*.08))).multiply(new THREE.Quaternion().setFromAxisAngle(yAxis,Math.sin(time*1.15+i)*1.25));matrix.compose(scratch,quaternion,scale.setScalar(seed.size));petals.setMatrixAt(i,matrix);
    }petals.instanceMatrix.needsUpdate=true;
    traffic.forEach((root,i)=>{const k=(time*(.012+i*.002)+i*.23)%1,p=roads[i%roads.length].getPoint(k),q=roads[i%roads.length].getTangent(k);p.y=ground(p.x,p.z)+.15;root.position.copy(p);root.rotation.y=Math.atan2(q.x,q.z);});
    const k=clamp(Number(state.starK)||0);shootingStar.visible=trail.visible=halo.visible=!!state.starUp;
    if(state.starUp){const at=(x,y)=>new THREE.Vector3(x,y,.5).unproject(camera).sub(camera.position).normalize().multiplyScalar(90).add(camera.position);const head=at(.05+k*.82,.68-k*.36),tail=at(.05+k*.82-.13,.68-k*.36+.045);shootingStar.position.copy(head);halo.position.copy(head);halo.quaternion.copy(camera.quaternion);const p=trail.geometry.attributes.position;p.setXYZ(0,head.x,head.y,head.z);p.setXYZ(1,tail.x,tail.y,tail.z);p.needsUpdate=true;trail.material.opacity=Math.min(1,k*15,(1-k)*12)*.9;}
  }
  function dispose(){yash.dispose();rider?.dispose();const gs=new Set(geometries),ms=new Set(ownedMaterials);scene.traverse(o=>{if(o.geometry)gs.add(o.geometry);for(const m of[].concat(o.material||[]))ms.add(m);});gs.forEach(g=>g.dispose());ms.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());}
  return {scene,camera,night,frame,resize,dispose,get audit(){let energy=0;for(let i=0;i<offsets.length;i+=4)energy+=Math.abs(offsets[i])+Math.abs(offsets[i+1]);return{breeze,petalDisplacement:energy,bankedAt};}};
}
