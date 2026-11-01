// One continuous miniature world. Chapter scripts own the story; this renderer owns its place in the landscape.
import * as THREE from 'three';
import { makeTaxi, makeTruck, keyLight, clamp } from './kit.js';
import { person, normalise } from './folk.js';
import { WORLD } from './style.js';
import { buildLandmark } from './landmarks.js';
import { createSkyline } from './skyline.js';
import { createLandscapeLife } from './landscape-life.js';
import { createEarthCutout } from './earth-cutout.js';
import { createOverviewOrbit, DEFAULT_VIEW, viewDirection, modelFitPoints } from './overview-camera.js';
import { LAND_CONTOUR, ROAD_POINTS } from './cliff.js';
import { EDGE_SITE, SHILLONG_SITE, TRUCK_SIGNAL, edgeTaxiPose, edgeApproach, sampleWalk, BOARDING_ROUTE, EXIT_ROUTES, characterFacing } from './choreography.js';

export const WORLD_STOPS = [
  { id: 'stand', label: 'The taxi stand', place: 'JORABAT', x: -18, z: 10 },
  { id: 'jorabat', label: 'The dashboard', place: 'A FEW THINGS I’VE MADE', x: -4, z: 11 },
  { id: 'climb', label: 'The climb', place: 'INTO THE KHASI HILLS', x: 11, z: 8 },
  { id: 'nongpoh', label: 'A roadside stop', place: 'NONGPOH', x: 18, z: -6 },
  { id: 'cloud', label: 'Above the clouds', place: 'THE CLOUD LINE', x: 5, z: -13 },
  { id: 'edge', label: 'The hairpin', place: 'A TURN IN THE ROAD', x: -10, z: -10 },
  { id: 'shillong', label: 'A wish for the road', place: 'SHILLONG', x: -18, z: -29 },
];

export function createWorld({ renderer, ink, onSelect = () => {}, still = false }) {
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-30, 30, 25, -25, .1, 250);
  const P = WORLD;
  const skyline=createSkyline();let skylineStarted=false;
  // Multisample the geometry pass: fine roof edges and pine needles stay smooth as the camera approaches.
  ink.rtColor.samples = Math.min(4, renderer.capabilities.maxSamples || 4);
  const states = new Map(), stops = new Map(), actors = [], animated = [];
  let width = innerWidth, height = innerHeight, elapsed = 0, active = null, mode = 'overview';
  let transition = null, disposed = false, lookKey = '', passengerActor = null, mood = 0;
  let focusTarget = null, journey = null, lastEdgePitch = -.25;
  const orbit=createOverviewOrbit();let overviewFrame=null;
  const target = new THREE.Vector3(0, 0, -6), pose = { x: 0, y: 0, z: -6, span: 60, ...DEFAULT_VIEW };
  const camOffset = new THREE.Vector3(65, 60, -65).normalize().multiplyScalar(90);
  const materialCache = new Map();
  const mat = (color, extra = {}) => { const key = (color?.isColor ? color.getHexString() : color) + JSON.stringify(Object.fromEntries(Object.entries(extra).map(([k,v]) => [k,v?.isTexture?v.uuid:v]))); if (!materialCache.has(key)) materialCache.set(key, new THREE.MeshStandardMaterial({ color, roughness: .9, metalness: 0, ...extra })); return materialCache.get(key); };
  const mesh = (g, color, pos, extra) => { const m = new THREE.Mesh(g, mat(color, extra)); if (pos) m.position.set(...pos); m.castShadow = m.receiveShadow = true; scene.add(m); return m; };
  // Low ambient plus a broad key preserves the construction in roofs, foliage and rock.
  const hemi = new THREE.HemisphereLight(P.cream, P.leaf, .9); scene.add(hemi);
  const sun = new THREE.DirectionalLight(P.cream, 2.65); sun.position.set(-24, 48, -35); scene.add(sun);
  sun.target.position.set(0, 0, -6); scene.add(sun.target);
  sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -43, right: 43, top: 40, bottom: -40, near: 4, far: 125 });
  sun.shadow.camera.updateProjectionMatrix(); sun.shadow.bias = -.00022; sun.shadow.normalBias = .045; sun.shadow.radius = 2;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  // Ink has four scene passes. Rebuild the shadow map only for the actual colour pass.
  renderer.shadowMap.autoUpdate = false;
  // Ink schedules the single beauty-pass shadow update; auxiliary passes reuse it.
  const fill = new THREE.DirectionalLight(P.water, .52); fill.position.set(25, 15, 20); scene.add(fill);
  const practical = new THREE.PointLight(P.amber, 0, 13, 2); scene.add(practical);
  const daylight=new THREE.Color(P.cream),dusk=new THREE.Color(P.water),twilight=new THREE.Color(P.night);


  // The cut edge reads as one little piece of the hills, rather than seven separate cards.
  const contour = LAND_CONTOUR;
  const shape = new THREE.Shape(); contour.forEach(([x,z],i) => i ? shape.lineTo(x,-z) : shape.moveTo(x,-z)); shape.closePath();
  const landGeo = new THREE.ExtrudeGeometry(shape, { depth: .55, bevelEnabled: false, curveSegments: 10 });
  landGeo.rotateX(-Math.PI / 2); landGeo.translate(0, -.55, 0);
  const land = new THREE.Mesh(landGeo, [mat(P.grass), mat(P.earth)]); land.receiveShadow = true; scene.add(land);
  const earth=createEarthCutout({contour,palette:P});scene.add(earth);
  // A soft paper shadow anchors the whole landscape to the page.
  const shadowCanvas = document.createElement('canvas'); shadowCanvas.width = shadowCanvas.height = 128;
  const sc = shadowCanvas.getContext('2d'), grad = sc.createRadialGradient(64,64,16,64,64,64); grad.addColorStop(0,P.ink+'30'); grad.addColorStop(1,P.ink+'00'); sc.fillStyle=grad; sc.fillRect(0,0,128,128);
  const shadowTex = new THREE.CanvasTexture(shadowCanvas); const groundShadow = mesh(new THREE.PlaneGeometry(76,65), P.cream, [0,-13.38,-5], { map: shadowTex, transparent: true, opacity: .8, depthWrite: false }); groundShadow.rotation.x=-Math.PI/2;
  groundShadow.castShadow=false;groundShadow.receiveShadow=false;groundShadow.material=new THREE.MeshBasicMaterial({map:shadowTex,transparent:true,opacity:.52,depthWrite:false});

  const roadPoints = ROAD_POINTS;
  const road = new THREE.CatmullRomCurve3(roadPoints.map(([x,z])=>new THREE.Vector3(x,.075,z)), false, 'catmullrom', .3);
  function ribbon(curve, breadth, color, elevation) {
    const positions=[], normals=[], indices=[], samples=420;
    for(let i=0;i<=samples;i++) { const t=i/samples,p=curve.getPoint(t),d=curve.getTangent(t),nx=-d.z,nz=d.x; for(const s of [-1,1]) { positions.push(p.x+nx*breadth*s/2,elevation,p.z+nz*breadth*s/2); normals.push(0,1,0); } if(i<samples){const a=i*2;indices.push(a,a+1,a+2,a+1,a+3,a+2);} }
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));g.setIndex(indices);return mesh(g,color);
  }
  ribbon(road,2.7,P.creamDeep,.035); ribbon(road,2.15,P.road,.065);
  const edgeOrigin=WORLD_STOPS.find(s=>s.id==='edge');
  const approachCurve=new THREE.CatmullRomCurve3(Array.from({length:30},(_,i)=>{const p=edgeApproach(i/29);return new THREE.Vector3(edgeOrigin.x+p.x,.07,edgeOrigin.z+p.z);}));
  ribbon(approachCurve,2.55,P.creamDeep,.037);ribbon(approachCurve,2.1,P.road,.068);
  const serviceRoad=new THREE.CatmullRomCurve3([[-12,-1.3],[-5,-1.3],[2,-1.3],[7,-1.3],[9,-4]].map(([x,z])=>new THREE.Vector3(edgeOrigin.x+x,.07,edgeOrigin.z+z)));
  ribbon(serviceRoad,2.6,P.creamDeep,.038);ribbon(serviceRoad,2.12,P.road,.069);
  for(let t=.006;t<1;t+=.012) { const p=road.getPoint(t), d=road.getTangent(t); const dash=mesh(new THREE.BoxGeometry(.3,.018,.055),P.cream,[p.x,.084,p.z]);dash.rotation.y=-Math.atan2(d.z,d.x); }
  // Road studs and timber crash barriers give the miniature a human scale.
  for(let t=.02;t<.99;t+=.021) { const p=road.getPoint(t),d=road.getTangent(t); for(const s of [-1,1]) { const post=mesh(new THREE.BoxGeometry(.07,.26,.07),P.cream,[p.x-d.z*1.25*s,.16,p.z+d.x*1.25*s]); const cap=mesh(new THREE.BoxGeometry(.075,.07,.075),P.red,[post.position.x,.29,post.position.z]); } }

  const roadClearSamples=[...road.getPoints(500),...approachCurve.getPoints(100),...serviceRoad.getPoints(100)];
  const clearOfRoad=(x,z,r)=>!roadClearSamples.some(p=>Math.hypot(p.x-x,p.z-z)<r);
  function onLand(x,z,margin=0){let inside=false;for(let i=0,j=contour.length-1;i<contour.length;j=i++){const a=contour[i],b=contour[j];if((a[1]>z)!==(b[1]>z)&&x<(b[0]-a[0])*(z-a[1])/(b[1]-a[1])+a[0])inside=!inside;}return inside;}
  const tinted = (color, amount) => new THREE.Color(color).lerp(new THREE.Color(amount >= 0 ? P.cream : P.night), Math.abs(amount));
  let seed=117; const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  const terraceSites=[[-19,17,4.5],[-3,18,5.3],[14,15,4.6],[25,-15,3.5],[8,-26,4.2],[-27,-13,3.4]];
  const terraceY=(x,z)=>{let y=0;for(const [hx,hz,r] of terraceSites)for(let tier=0;tier<4;tier++){const radius=r*(1-tier*.17);if(((x-hx)/radius)**2+((z-hz)/(radius*.57))**2<.93)y=Math.max(y,.34+tier*.3475);}return y;};
  function pine(x,z,s=1) {
    if(!onLand(x,z)||!clearOfRoad(x,z,2.8))return;
    const base=terraceY(x,z);
    mesh(new THREE.CylinderGeometry(.055*s,.13*s,1.7*s,7),P.wood,[x,base+.85*s,z]);
    // Five asymmetrical bough skirts, a visible trunk, and branch tips give each tree a constructed silhouette.
    const turn=random()*Math.PI*2;
    for(let k=0;k<5;k++){
      const radius=(.78-k*.125)*s, y=base+(.7+k*.34)*s;
      const skirt=mesh(new THREE.ConeGeometry(radius,.95*s,7),k%2?P.leaf:P.leafLight,[x,y+.43*s,z]);
      skirt.rotation.y=turn+k*.52;skirt.scale.z=.88;
      if(k<3)for(let b=0;b<3;b++){
        const a=turn+b*Math.PI*2/3+k*.6;
        const tip=mesh(new THREE.ConeGeometry(radius*.31,.55*s,5),k%2?P.leafLight:P.leaf,[x+Math.cos(a)*radius*.64,y+.32*s,z+Math.sin(a)*radius*.64]);
        tip.rotation.y=a;tip.rotation.z=Math.sin(a)*.12;
      }
    }
  }
  const nature = [[-27,14],[-22,18],[-12,18],[0,18],[14,16],[24,10],[27,-11],[20,-18],[12,-23],[0,-25],[-8,-27],[-28,-21],[-28,-6],[-24,0],[-16,-3],[-2,0],[7,0]];
  nature.forEach(([x,z])=>{for(let j=0;j<5;j++){const xx=x+(random()-.5)*4,zz=z+(random()-.5)*3;pine(xx,zz,.65+random()*.5);}});
  for(let i=0;i<65;i++){const x=-28+random()*54,z=-28+random()*46; if(!onLand(x,z)||road.getPoints(90).some(p=>Math.hypot(x-p.x,z-p.z)<2.3)||WORLD_STOPS.some(p=>Math.hypot(x-p.x,z-p.z)<6.5))continue; const r=.15+random()*.35;const rock=mesh(new THREE.DodecahedronGeometry(r,0),P.rock,[x,r*.35,z]);rock.scale.y=.55;rock.rotation.y=random()*6;}
  // Built-up contours explain the hills; exposed stone is visible beneath the grassy crown.
  for(const [x,z,r] of terraceSites) {
    for(let tier=0;tier<4;tier++){
      const radius=r*(1-tier*.17),h=.36+tier*.015;
      const mound=mesh(new THREE.CylinderGeometry(radius*.93,radius,h,11),tier===0?P.rock:tier%2?P.grassLight:P.grass,[x,.16+tier*.34,z]);
      mound.scale.z=.57;mound.rotation.y=.2;
      if(tier<2)for(let j=0;j<7;j++){
        const a=j/7*Math.PI*2,stone=mesh(new THREE.DodecahedronGeometry(.20+random()*.11,0),P.rock,[x+Math.cos(a)*radius*.9,.22+tier*.34,z+Math.sin(a)*radius*.5]);stone.scale.set(1.4,.6,.8);
      }
    }
  }
  // Walking paths and low dry-stone boundaries tie the little settlements to the road.
  function footpath(points,w=.52){const c=new THREE.CatmullRomCurve3(points.map(([x,z])=>new THREE.Vector3(x,.014,z)));ribbon(c,w,P.earth,.018);for(let i=0;i<points.length-1;i++){const [x,z]=points[i];const step=mesh(new THREE.BoxGeometry(.31,.045,.22),P.rock,[x,.04,z]);step.rotation.y=i*.7;}}
  footpath([[-21,8],[-22,5],[-24,3],[-24,0],[-22,-2]],.6);
  footpath([[15,-8],[15,-5],[13,-3],[10,-2],[7,0]],.48);
  for(const [x,z,run] of [[-24,2,4.5],[12,-3,4.5],[-5,-24,4]]){
    for(let course=0;course<2;course++)for(let j=0;j<Math.ceil(run/.48);j++){
      const stoneX=x+j*.45+(course%2)*.2;if(!clearOfRoad(stoneX,z,2.3))continue;const stone=mesh(new THREE.DodecahedronGeometry(.24,0),course?P.rock:P.earth,[stoneX,.14+course*.25,z]);stone.scale.set(1.2,.63,.7);stone.rotation.y=j*.9;
    }
  }
  // Grass has direction and scale. Broad low patches replace speckled random dots.
  for(let i=0;i<70;i++){
    const x=-27+random()*53,z=-28+random()*46;
    if(!onLand(x,z)||road.getPoints(80).some(p=>Math.hypot(x-p.x,z-p.z)<2)||WORLD_STOPS.some(p=>Math.hypot(x-p.x,z-p.z)<6))continue;
    const patch=mesh(new THREE.CircleGeometry(.4+random()*.8,7),i%3?P.grassLight:P.leafLight,[x,.012,z]);patch.rotation.x=-Math.PI/2;patch.scale.y=.45;
    for(let b=0;b<3;b++){const blade=mesh(new THREE.ConeGeometry(.055,.25+random()*.15,3),P.leafLight,[x+(random()-.5)*.5,.13,z+(random()-.5)*.3]);blade.rotation.z=.2;}
  }

  // Batch static scenery by paint. This keeps the detail while avoiding hundreds of little draw calls.
  scene.updateMatrixWorld(true);
  const staticBatches=new Map();
  for(const o of [...scene.children]){if(!o.isMesh||Array.isArray(o.material)||o.material.map)continue;if(!staticBatches.has(o.material))staticBatches.set(o.material,[]);staticBatches.get(o.material).push(o);}
  for(const [material,pieces] of staticBatches){if(pieces.length<2)continue;const gs=pieces.map(o=>{const g=o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone();g.applyMatrix4(o.matrixWorld);return g;});const g=new THREE.BufferGeometry();for(const [key,components] of [['position',3],['normal',3]]){const a=new Float32Array(gs.reduce((n,p)=>n+p.getAttribute(key).array.length,0));let offset=0;for(const p of gs){a.set(p.getAttribute(key).array,offset);offset+=p.getAttribute(key).array.length;}g.setAttribute(key,new THREE.BufferAttribute(a,components));}const batch=new THREE.Mesh(g,material);batch.name='landscape-details';batch.castShadow=true;batch.receiveShadow=true;scene.add(batch);for(const p of pieces){scene.remove(p);p.geometry.dispose();}for(const p of gs)p.dispose();}

  const u = { value: 2 };
  const taxi = makeTaxi(u), truck = makeTruck(u); scene.add(taxi.jeep,truck.truck);truck.truck.scale.setScalar(.8);truck.truck.visible=false;
  taxi.jeepMat.uniforms.uExposure.value=1.28; taxi.jeepMat.uniforms.uL.value=1.1;
  truck.mat.uniforms.uExposure.value=1.2; truck.mat.uniforms.uL.value=1.1;
  for(const vehicle of [taxi.jeep,truck.truck])vehicle.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});
  const taxiGround=.10,truckGround=.072;
  // Door pivots belong to the vehicle, so a tilted car and its open doors stay together.
  const taxiDoors=[-1,1].map(side=>{
    const pivot=new THREE.Group();pivot.position.set(.82,.2,side*.71);taxi.body.add(pivot);
    const add=(w,h,d,color,x,y,z)=>{const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat(color));m.position.set(x,y,z);m.castShadow=true;pivot.add(m);};
    add(1.2,.55,.045,P.ink,-.60,.36,0);add(1.1,.37,.035,P.blue,-.60,.83,0);
    add(1.2,.045,.05,P.ink,-.60,1.04,0);add(.06,.39,.05,P.ink,-1.16,.83,0);add(.06,.39,.05,P.ink,-.04,.83,0);
    add(.16,.035,.065,P.cream,-.98,.57,-side*.035);return pivot;
  });
  taxi.jeep.position.set(-18,taxiGround,7);taxi.jeep.rotation.y=.03;
  for(const stop of WORLD_STOPS) {
    const group=buildLandmark(stop.id,THREE,P);const setBack=['climb','nongpoh'].includes(stop.id)?2:0;group.userData.sceneOffsetZ=setBack;group.position.set(stop.x,0,stop.z+setBack);scene.add(group);
    stops.set(stop.id,{...stop,group});
    group.traverse(o=>{ if(o.userData?.animations) animated.push(...o.userData.animations); });
  }
  const life=createLandscapeLife({palette:P,edgeOrigin});scene.add(life.group);
  const contactCanvas=document.createElement('canvas');contactCanvas.width=contactCanvas.height=128;
  const cx=contactCanvas.getContext('2d'),cg=cx.createRadialGradient(64,64,8,64,64,63);cg.addColorStop(0,P.night+'ba');cg.addColorStop(.42,P.night+'70');cg.addColorStop(1,P.night+'00');cx.fillStyle=cg;cx.fillRect(0,0,128,128);
  const contactTex=new THREE.CanvasTexture(contactCanvas);
  const roadSamples=road.getPoints(250);
  const groundAt=(x,z)=>roadSamples.some(p=>Math.hypot(p.x-x,p.z-z)<1.09)?.065:0;
  function contact(x,z,w,d,opacity=.46){const m=new THREE.Mesh(new THREE.PlaneGeometry(w,d),new THREE.MeshBasicMaterial({map:contactTex,transparent:true,opacity,depthWrite:false}));m.position.set(x,.023,z);m.rotation.x=-Math.PI/2;m.renderOrder=1;scene.add(m);return m;}
  for(const stop of WORLD_STOPS)contact(stop.x,stop.z+.25+(stops.get(stop.id).group.userData.sceneOffsetZ||0),9,6,.30);
  const taxiShadow=contact(-18,7,4.5,2.4,.68),truckShadow=contact(-18,-26,6,3.2,.62);
  const poolCanvas=document.createElement('canvas');poolCanvas.width=poolCanvas.height=128;
  const pc=poolCanvas.getContext('2d'),pg=pc.createRadialGradient(64,64,0,64,64,64);pg.addColorStop(0,P.cream+'b0');pg.addColorStop(.42,P.amber+'70');pg.addColorStop(1,P.amber+'00');pc.fillStyle=pg;pc.fillRect(0,0,128,128);
  const poolTex=new THREE.CanvasTexture(poolCanvas);
  function headlights(){const root=new THREE.Group();scene.add(root);const pool=new THREE.Mesh(new THREE.PlaneGeometry(6,3),new THREE.MeshBasicMaterial({map:poolTex,transparent:true,opacity:0,depthWrite:false}));pool.rotation.x=-Math.PI/2;pool.position.set(4,.093,0);root.add(pool);const beams=[];for(const z of [-.48,.48]){const beam=new THREE.Mesh(new THREE.ConeGeometry(.7,4.5,10,1,true),new THREE.MeshBasicMaterial({color:P.cream,transparent:true,opacity:0,depthWrite:false,side:THREE.DoubleSide}));beam.rotation.z=Math.PI/2;beam.position.set(3.8,.42,z);root.add(beam);beams.push(beam);}return {root,pool,beams};}
  const taxiLights=headlights(),truckLights=headlights();

  const actorGroundShadows=new Map();
  function addActor(who,x,z,scale=.029) {
    const p=person(who); p.obj.scale.setScalar(scale);p.obj.position.set(x,.12,z);p.setLight(1.1,-1,'warm');scene.add(p.obj);actors.push(p);p.shadow.visible=false;const ground=contact(x,z,.82,.46,.55);actorGroundShadows.set(p,ground);return p;
  }
  const yash=addActor('you',-20,6), friend=addActor('friend',-15.5,9,.025), market=addActor('basket',17.7,-3.5,.025), walker=addActor('walker',9,6,.026);
  passengerActor=addActor({build:'f',skin:2,hair:'long',top:'hoodie'},-18.9,6);
  const driver=addActor('driver',-12,-13.6,.028);driver.obj.visible=false;
  const ghost=addActor('ghost',-8.5,-14.5,.028);ghost.obj.visible=false;ghost.play('sit').face('back',true);
  ghost.mesh.layers.set(3);ghost.mesh.material.uniforms.uWorldGhost={value:0};
  ghost.mesh.material.fragmentShader=ghost.mesh.material.fragmentShader.replace('varying vec2 vUv;','varying vec2 vUv; uniform float uWorldGhost;').replace('if (s == 0) discard;','if (s == 0) discard; if (fract(sin(dot(floor(gl_FragCoord.xy), vec2(12.9898, 78.233))) * 43758.5453) > uWorldGhost) discard;');
  const ember=mesh(new THREE.SphereGeometry(.035,6,4),P.amber,[-9,1,-14.5],{emissive:P.amber,emissiveIntensity:.7});ember.visible=false;
  const localMist=[];for(let i=0;i<8;i++){const cloud=mesh(new THREE.SphereGeometry(1,16,8),P.cream,[1+i*1.3,.5+(i%3)*.22,-16+(i%2)*.7],{transparent:true,opacity:0,depthWrite:false});cloud.scale.set(2.3,.55,1);cloud.visible=false;cloud.castShadow=false;localMist.push(cloud);}

  const starShape=new THREE.Shape();for(let i=0;i<10;i++){const a=i*Math.PI/5+Math.PI/2,r=i%2?.13:.3;const x=Math.cos(a)*r,y=Math.sin(a)*r;i?starShape.lineTo(x,y):starShape.moveTo(x,y);}starShape.closePath();
  const wishStar=mesh(new THREE.ExtrudeGeometry(starShape,{depth:.07,bevelEnabled:false}),P.amber,[-18,5,-26]);wishStar.visible=false;wishStar.material.emissive.set(P.amber);wishStar.material.emissiveIntensity=.8;wishStar.castShadow=false;
  const starTrail=mesh(new THREE.CylinderGeometry(.018,.018,1,5),P.cream,[-18,5,-26],{transparent:true,opacity:.8});starTrail.visible=false;
  const stopRoad=new Map();for(const stop of WORLD_STOPS){let best=Infinity,bestT=0;for(let i=0;i<=420;i++){const t=i/420,p=road.getPoint(t),d=Math.hypot(p.x-stop.x,p.z-(stop.z-3));if(d<best){best=d;bestT=t;}}stopRoad.set(stop.id,bestT);}

  const rainGeometry=new THREE.BufferGeometry(),rainPositions=new Float32Array(90*6);
  rainGeometry.setAttribute('position',new THREE.BufferAttribute(rainPositions,3));
  const rain=new THREE.LineSegments(rainGeometry,new THREE.LineBasicMaterial({color:P.water,transparent:true,opacity:.45}));rain.frustumCulled=false;rain.visible=false;scene.add(rain);
  const petals=new THREE.InstancedMesh(new THREE.PlaneGeometry(.09,.14),new THREE.MeshBasicMaterial({color:P.pink,side:THREE.DoubleSide,transparent:true,opacity:.85,depthWrite:false}),30);petals.frustumCulled=false;petals.visible=false;scene.add(petals);
  const particleMatrix=new THREE.Matrix4(),particleRotation=new THREE.Quaternion(),particleScale=new THREE.Vector3(1,1,1);
  const historical=[addActor('grandpa',-12, -14,.028),addActor('friend',-13,-14,.027)];historical.forEach(p=>{p.setThen(true);p.obj.visible=false;});
  function nearestRoadT(point){let best=Infinity,result=0;for(let i=0;i<=650;i++){const p=road.getPoint(i/650),d=(p.x-point.x)**2+(p.z-point.z)**2;if(d<best){best=d;result=i/650;}}return result;}
  function roadPose(t,y=taxiGround){const p=road.getPoint(clamp(t,0,1)),d=road.getTangent(clamp(t,0,1));return {x:p.x,y,z:p.z,yaw:Math.atan2(-d.z,d.x),pitch:0,roll:0,visible:true,t};}
  function chapterPose(id,state={}){
    const stop=stops.get(id)||WORLD_STOPS[0];
    if(id==='edge'){const p=edgeTaxiPose(state,state.fallStartAngle==null?lastEdgePitch:-clamp(Math.abs(state.fallStartAngle),0,.58));return {...p,x:p.x+stop.x,z:p.z+stop.z};}
    if(id==='shillong')return {...SHILLONG_SITE.truck,x:stop.x+SHILLONG_SITE.truck.x,z:stop.z+SHILLONG_SITE.truck.z,visible:true};
    if(id==='stand')return {x:-18,y:taxiGround,z:7,yaw:0,pitch:0,roll:0,visible:true};
    const moving=['climb','nongpoh','cloud'].includes(id),t=(stopRoad.get(id)||0)+(moving?-.015+clamp(Number(state.progress)||0,0,1)*.030:0);
    return roadPose(t,id==='shillong'?truckGround:taxiGround);
  }
  const angleMix=(a,b,t)=>a+Math.atan2(Math.sin(b-a),Math.cos(b-a))*t;
  function putVehicle(vehicle,pose){vehicle.position.set(pose.x,pose.y,pose.z);vehicle.rotation.set(0,pose.yaw,0);vehicle.visible=pose.visible!==false;}
  function actorPose(actor,point,animation='idle',facing='back',visible=true){actor.obj.position.set(point.x,point.y??.10,point.z);actor.obj.visible=visible;actor.play(animation).face(facing,true);}
  function walkingPose(actor,points,k,origin={x:0,z:0},visible=true){const p=sampleWalk(points,k),right=new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld,0);actorPose(actor,{x:origin.x+p.x,z:origin.z+p.z},k<1?'walk':'idle',characterFacing(p.dx,p.dz,{x:right.x,z:right.z}),visible);}
  const labels=document.createElement('nav');labels.className='world-labels';labels.setAttribute('aria-label','Explore the seven stops');document.body.append(labels);
  const markers=WORLD_STOPS.map((s,i)=>{const b=document.createElement('button');b.type='button';b.className='world-marker';b.dataset.scene=s.id; const number=document.createElement('span');number.className='world-marker-number';number.textContent=String(i+1).padStart(2,'0'); const text=document.createElement('span');text.className='world-marker-text';text.textContent=s.label;b.append(number,text);b.setAttribute('aria-label',`${i+1}. ${s.label} — ${s.place}`);b.addEventListener('click',()=>onSelect(s.id));labels.append(b);return {button:b,point:new THREE.Vector3(s.x,.3,s.z-4.8)};});
  const projected=new THREE.Vector3();
  // Fit real model bounds, including the river and its waterfall, not a page-sized shadow.
  scene.updateMatrixWorld(true);const fitPoints=[];
  const fitted=scene.children.filter(o=>o!==groundShadow&&o.isMesh&&o.visible&&!o.userData.pixelArt&&!Array.isArray(o.material)&&!o.material.transparent);
  fitted.push(land,earth,...[...stops.values()].map(s=>s.group),life.group);
  fitPoints.push(...modelFitPoints(fitted),...life.viewPoints);
  orbit.setBounds(fitPoints);
  function overviewPose() {
    const home=active===null,w=width,h=height;
    const frame=home?(overviewFrame||(w/h>1.1?{left:370,top:h*.24,width:Math.max(120,w-394),height:h*.68}:{left:18,top:h*.43,width:w-36,height:h*.43})):{left:24,top:70,width:w-48,height:h-130};
    return orbit.fit(w,h,frame);
  }
  function focusedPose(id) {const s=stops.get(id)||WORLD_STOPS[0],aspect=width/height;return {...DEFAULT_VIEW,x:s.x,y:id==='edge'?-1.1:id==='climb'?1.6:1.1,z:s.z-(id==='edge'?3.8:['climb','nongpoh'].includes(id)?0:1),span:Math.max(id==='edge'?15.5:id==='climb'?16.5:id==='nongpoh'?14.8:12.8,(aspect<.9?14.7:17.5)/aspect)};}
  function applyPose() {target.set(pose.x,pose.y,pose.z);camOffset.copy(viewDirection(pose.yaw,pose.tilt)).multiplyScalar(90);camera.position.copy(target).add(camOffset);camera.lookAt(target);const aspect=width/height;camera.left=-pose.span*aspect/2;camera.right=pose.span*aspect/2;camera.top=pose.span/2;camera.bottom=-pose.span/2;camera.updateProjectionMatrix();camera.updateMatrixWorld();}
  function positionMarkers() {
    const visible=mode==='overview';labels.hidden=!visible;const frame=active===null?orbit.audit.frame:null;
    for(const m of markers){m.button.disabled=!visible;projected.copy(m.point).project(camera);const half=(m.labelWidth||(m.labelWidth=m.button.offsetWidth||180))*.5;
      const left=frame?frame.left:0,right=frame?frame.left+frame.width:width;
      m.button.style.left=`${clamp((projected.x*.5+.5)*width,left+half+8,right-half-8)}px`;
      m.button.style.top=`${clamp((-projected.y*.5+.5)*height,frame?frame.top+36:36,frame?frame.top+frame.height:height-20)}px`;
      m.button.style.visibility=projected.z<1?'visible':'hidden';m.button.classList.toggle('is-current',m.button.dataset.scene===active);
    }
  }
  function resolveTransition() {if(transition){transition.resolve();transition=null;}}
  function move(poses,finalMode,immediate) {
    poses=poses.map(step=>({...step,pose:{...DEFAULT_VIEW,...step.pose}}));
    resolveTransition(); if(immediate || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {Object.assign(pose,poses.at(-1).pose);mode=finalMode;applyPose();positionMarkers();return Promise.resolve();}
    mode='transition';positionMarkers();return new Promise(resolve=>{transition={from:{...pose},steps:poses,index:0,time:0,finalMode,resolve};});
  }
  function focus(id,{viaOverview=false,immediate=false}={}) {
    orbit.end(true);
    if(!stops.has(id))return Promise.resolve();
    const changed=active!==id,previous=active;focusTarget=id;
    if(changed&&viaOverview&&previous){
      const vehicle=previous==='edge'||previous==='shillong'?truck.truck:taxi.jeep;
      const to=chapterPose(id,states.get(id)||{}),t0=nearestRoadT(vehicle.position),t1=nearestRoadT(to);
      // Distance sampling keeps the car's pace steady through both short and long spline segments.
      const route=[];let length=0,previousPoint=roadPose(t0);
      for(let i=0;i<=240;i++){const t=t0+(t1-t0)*i/240,point=roadPose(t);if(i)length+=Math.hypot(point.x-previousPoint.x,point.z-previousPoint.z);route.push({t,distance:length});previousPoint=point;}
      journey={vehicle,from:vehicle.position.clone(),fromYaw:vehicle.rotation.y,to,t0,t1,route,length,elapsed:0,lead:.65,duration:clamp(length/4,4.4,8.4),span:Math.max(24,Math.min(33,focusedPose(previous).span*1.45))};
    }
    const end=focusedPose(id),journeySteps=journey?[
      {pose:{x:journey.from.x,y:1.1,z:journey.from.z,span:journey.span},duration:.95},
      {pose:{x:journey.to.x,y:1.1,z:journey.to.z,span:journey.span},duration:journey.duration},
      {pose:end,duration:.95},
    ]:null;
    const movement=move(journeySteps||(viaOverview?[{pose:overviewPose(),duration:.95},{pose:end,duration:1.45}]:[{pose:end,duration:1.6}]),'focus',immediate);
    if(immediate||window.matchMedia?.('(prefers-reduced-motion: reduce)').matches){active=id;focusTarget=null;journey=null;return movement;}
    return movement.then(()=>{active=id;focusTarget=null;journey=null;if(changed&&id==='edge')lastEdgePitch=-.25;});
  }
  function beginOrbit(){if(mode!=='overview'||transition)return false;orbit.begin();return true;}
  function dragOrbit(dx,dy,dt){if(mode==='overview'&&!transition)orbit.drag(dx,dy,dt);}
  function endOrbit(cancel=false){orbit.end(cancel);}
  function resetOrbit(){orbit.reset();if(mode==='overview')return move([{pose:overviewPose(),duration:.7}],'overview',false);return Promise.resolve();}
  function setOverviewFrame(frame){overviewFrame=frame?{...frame}:null;}
  function overview({immediate=false}={}) {return move([{pose:overviewPose(),duration:1.2}],'overview',immediate);}
  function setState(id,state={}) { states.set(id,{...states.get(id),...state}); if(state.look){ const {name,first,lines,...appearance}=normalise(state.look); const key=JSON.stringify(appearance); if(key!==lookKey){lookKey=key;const old=passengerActor,i=actors.indexOf(old);if(i>=0)actors.splice(i,1);scene.remove(old.obj);const oldShadow=actorGroundShadows.get(old);if(oldShadow){oldShadow.removeFromParent();oldShadow.geometry.dispose();oldShadow.material.dispose();}actorGroundShadows.delete(old);old.dispose();passengerActor=addActor(state.look,-18.9,6);}} }
  function frame(dt) {
    if(disposed)return;dt=clamp(dt,0,.1);elapsed=still?(Number(states.get(active)?.since)||0):elapsed+dt;
    if(transition){const t=transition,step=t.steps[t.index];t.time+=dt;const k=Math.min(t.time/step.duration,1),ease=k*k*k*(k*(k*6-15)+10);for(const key of ['x','y','z','span','tilt'])pose[key]=THREE.MathUtils.lerp(t.from[key],step.pose[key],ease);pose.yaw=angleMix(t.from.yaw,step.pose.yaw,ease);if(k>=1){t.index++;t.time=0;t.from={...pose};if(t.index===t.steps.length){mode=t.finalMode;transition=null;t.resolve();}}}
    if(mode==='overview'&&!transition){orbit.update(dt);Object.assign(pose,overviewPose());}
    life.update(elapsed);
    applyPose();
    for(const a of actors){a.obj.quaternion.copy(camera.quaternion);a.update(dt);}
    for(const a of animated){if(!a.object)continue;if(a.type==='float')a.object.position.y=(a.baseY??(a.baseY=a.object.position.y))+Math.sin(elapsed*(a.speed||.5)+(a.phase||0))*(a.amount||.12);else if(a.type==='sway')a.object.rotation.z=Math.sin(elapsed*(a.speed||.6)+(a.phase||0))*(a.amount||.025);else if(a.type==='turn')a.object.rotation.y=(a.baseRotation??(a.baseRotation=a.object.rotation.y))+elapsed*(a.speed||.1);}
    const s=states.get(active)||{},stop=stops.get(active)||WORLD_STOPS[0],progress=clamp(Number(s.progress)||0,0,1);
    const atStand=!active||active==='stand',atEdge=active==='edge',atEnd=active==='shillong',changing=focusTarget!==null&&focusTarget!==active;
    const truckPhase=atEdge&&['truck','stop','lift'].includes(s.phase),memory=atEdge&&s.phase==='seated'&&(Number(s.memory)||0)>.65;
    const carPose=chapterPose(active||'stand',s);putVehicle(taxi.jeep,carPose);
    taxi.hang.rotation.z=atEdge?carPose.pitch:0;
    if(atEdge&&s.fallT<0&&s.phase!=='drive')lastEdgePitch=carPose.pitch;
    taxi.jeep.visible=!atEnd&&carPose.visible&&!memory;
    if(atEnd)putVehicle(truck.truck,chapterPose('shillong',s));
    else {
      const k=clamp(Number(s.truckU)||0,0,1),go=Math.max(0,Number(s.truckGo)||0);
      const x=EDGE_SITE.truckStop.x+(1-k)*-11+go*2.8,z=EDGE_SITE.truckStop.z-1.8*Math.max(0,Math.min(1,(go-1)/1.8));
      putVehicle(truck.truck,{x:stop.x+x,y:truckGround,z:stop.z+z,yaw:Math.max(0,Math.min(1,(go-1)/1.8))*Math.PI/2});
      truck.truck.visible=truckPhase;
    }
    const boardTime=Number(s.boardingSince)||0,boarding=atStand&&s.phase==='boarding';
    actorPose(yash,{x:-20,z:6},'idle','right',atStand);
    actorPose(passengerActor,{x:-18.9,z:6},'idle','left',atStand);
    if(boarding){
      walkingPose(passengerActor,BOARDING_ROUTE,clamp(boardTime/3.7,0,1));passengerActor.obj.visible=boardTime<4.0;
      yash.play(boardTime<3.7?'wave':'idle');yash.obj.visible=boardTime<4.5;
    }
    taxiDoors.forEach((door,i)=>{
      let opening=boarding&&i===0?Math.min(1,Math.max(0,(boardTime-2.3)/.3))*(1-Math.min(1,Math.max(0,(boardTime-4.1)/.3))):0;
      if(atEdge){if(i===0&&['pout','yout','seated','flick'].includes(s.phase))opening=1;if(i===1&&['yout','seated','flick'].includes(s.phase))opening=1;}
      door.visible=opening>.01;door.rotation.y=(i===0?-1:1)*1.05*opening;
    });
    const flagSpots=TRUCK_SIGNAL.flagSpots;
    if(atEdge){
      for(const [i,a] of [passengerActor,yash].entries()){
        const seated=EDGE_SITE.seats[i],exitName=i===0?'pout':'yout',exitDuration=i===0?4.2:6.6;
        a.obj.visible=false;
        if(s.phase===exitName){const k=clamp((s.since-.55)/(exitDuration-.55),0,1);walkingPose(a,EXIT_ROUTES[i],k,stop);if(k>=1)actorPose(a,{x:stop.x+seated[0],z:stop.z+seated[1]},'sit','front');}
        else if(i===0&&s.phase==='yout'||['seated','flick'].includes(s.phase))actorPose(a,{x:stop.x+seated[0],z:stop.z+seated[1]},'sit','front',!memory);
        else if(s.phase==='truck'){
          const k=clamp((s.since-.8)/(TRUCK_SIGNAL.ready-.8),0,1);
          walkingPose(a,TRUCK_SIGNAL.routes[i],k,stop);if(k>=1)a.play(s.flagging||s.flagStage==='braking'&&Number(s.brakeProgress)<.3?'flag':'idle').face('left',true);
        } else if(s.phase==='stop')actorPose(a,{x:stop.x+flagSpots[i][0],z:stop.z+flagSpots[i][1]},'idle','left');
        else if(s.phase==='lift'){
          const delay=i*.65,k=clamp((s.since-delay)/2.7,0,1),points=[flagSpots[i],[4.8,flagSpots[i][1]],[4.8,-2.65],[2.05+i*.08,-3.1]];
          walkingPose(a,points,k,stop,s.since<3.1+delay);if(k>=1){const enter=clamp((s.since-delay-2.7)/.4,0,1);a.obj.position.y=.12+enter*.5;a.obj.position.z=stop.z-3.1+enter*1.15;a.play('idle');}
        }
      }
    } else if(atEnd){
      [yash,passengerActor].forEach((a,i)=>{
        const seated=SHILLONG_SITE.seats[i],k=clamp(((Number(s.since)||0)-.35-i*.6)/4.8,0,1),outside=s.phase!=='arrive';
        walkingPose(a,[...SHILLONG_SITE.exit,seated],k,stop,outside);
        if(k>=1)actorPose(a,{x:stop.x+seated[0],y:SHILLONG_SITE.seatY,z:stop.z+seated[1]},s.starUp?'lookup':'sit','back',outside);
      });
    }
    const ghostOpacity=atEdge?(s.phase==='seated'?clamp(((Number(s.since)||0)-39)/2.5,0,1):s.phase==='flick'?1-clamp((Number(s.since)||0)/1.5,0,1):0):0;
    actorPose(ghost,{x:stop.x+EDGE_SITE.ghost[0],z:stop.z+EDGE_SITE.ghost[1]},'sit','front',ghostOpacity>0);ghost.mesh.material.uniforms.uWorldGhost.value=ghostOpacity;ghost.setEmber(.3+Math.sin(elapsed*.7)*.25);
    historical.forEach((a,i)=>actorPose(a,{x:stop.x+EDGE_SITE.seats[i][0],z:stop.z+EDGE_SITE.seats[i][1]},'idle','front',memory));
    ember.visible=atEdge&&(s.phase==='seated'&&s.since>=37||s.phase==='flick'&&s.since<2.5);
    ember.position.set(stop.x+EDGE_SITE.ghost[0]+.22,.9,stop.z+EDGE_SITE.ghost[1]);if(s.phase==='flick'){const t=Number(s.since)||0;ember.position.z-=t*.85;ember.position.y+=t*.5-t*t*.5;}
    actorPose(driver,{x:truck.truck.position.x+1.94,z:truck.truck.position.z+.90,y:.35},s.phase==='stop'&&s.since<1.2?'leanwave':'lean','front',atEdge&&s.phase==='stop');
    if(truck.cabDoor){const exitTime=Number(s.since)||0,opening=atEnd&&s.phase!=='arrive'?clamp(exitTime/.25,0,1)*(1-clamp((exitTime-1.6)/.4,0,1)):(Number(s.cabDoor)||0);truck.cabDoor.rotation.y=-1.1*opening;}
    friend.obj.visible=atStand&&!boarding;market.obj.visible=true;
    const walkTime=elapsed%12,walking=walkTime<5||walkTime>=6&&walkTime<11;
    walker.obj.position.set(8.5+(walkTime<6?Math.min(walkTime,5):Math.max(0,11-walkTime)),.10,3.5);walker.play(walking?'walk':'idle').face(walkTime<6?'left':'right',true);
    if(changing){
      [yash,passengerActor,ghost,driver,...historical].forEach(a=>a.obj.visible=false);friend.obj.visible=false;taxi.jeep.visible=truck.truck.visible=false;
      if(journey){
        journey.elapsed+=dt;const k=clamp((journey.elapsed-journey.lead)/journey.duration,0,1),ease=k*k*(3-2*k),distance=journey.length*ease;
        let segment=1;while(segment<journey.route.length-1&&journey.route[segment].distance<distance)segment++;
        const a=journey.route[segment-1],b=journey.route[segment],fraction=clamp((distance-a.distance)/Math.max(1e-6,b.distance-a.distance),0,1);
        const point=roadPose(THREE.MathUtils.lerp(a.t,b.t,fraction),journey.vehicle===truck.truck?truckGround:taxiGround);
        const start=clamp(k/.12,0,1),end=clamp((k-.88)/.12,0,1);
        point.x=THREE.MathUtils.lerp(journey.from.x,point.x,start);point.z=THREE.MathUtils.lerp(journey.from.z,point.z,start);point.yaw=angleMix(journey.fromYaw,point.yaw,start);
        point.x=THREE.MathUtils.lerp(point.x,journey.to.x,end);point.z=THREE.MathUtils.lerp(point.z,journey.to.z,end);point.yaw=angleMix(point.yaw,journey.to.yaw,end);
        putVehicle(journey.vehicle,point);taxi.hang.rotation.z=0;taxiDoors.forEach(d=>{d.rotation.y=0;d.visible=false;});
        // Keep the journey in view long enough to read it. The close destination shot comes after arrival.
        if(transition?.index===1&&transition.steps.length===3){pose.x=point.x;pose.y=1.1;pose.z=point.z;pose.span=journey.span;applyPose();}
      }
    }
    const starK=clamp(Number(s.starK)||0,0,1);wishStar.visible=atEnd&&!!s.starUp&&!changing;
    if(wishStar.visible){wishStar.position.set(stop.x-4+starK*7,4.8-starK*1.6,stop.z-6);wishStar.quaternion.copy(camera.quaternion);wishStar.rotateZ(elapsed*.22);wishStar.scale.setScalar(s.banked?1.15:1);}
    starTrail.visible=wishStar.visible&&starK>0&&starK<1;
    if(starTrail.visible){const tail=wishStar.position.clone().add(new THREE.Vector3(-1.5,.65,0));starTrail.position.copy(wishStar.position).add(tail).multiplyScalar(.5);starTrail.scale.y=1.64;starTrail.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),wishStar.position.clone().sub(tail).normalize());}
    const cityStar=stops.get('shillong').group.userData.star;if(cityStar){cityStar.visible=!!s.banked||mode==='overview';if(s.banked)cityStar.rotation.y=elapsed*.3;}
    rain.visible=mode==='focus'&&['nongpoh','cloud'].includes(active);rain.position.set(stop.x,0,stop.z-2);
    if(rain.visible){for(let i=0;i<90;i++){const x=Math.sin(i*12.7)*9,z=Math.sin(i*4.3)*6,y=8-((elapsed*5.8+i*.73)%8);rainPositions.set([x,y,z,x+.12,y-.55,z-.04],i*6);}rainGeometry.attributes.position.needsUpdate=true;}
    petals.visible=atEnd&&mode==='focus';if(petals.visible){for(let i=0;i<30;i++){const t=(elapsed*.17+i*.127)%1;particleRotation.copy(camera.quaternion);particleRotation.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,0,1),elapsed*.6+i));particleMatrix.compose(new THREE.Vector3(stop.x-4.4+Math.sin(i*2.6)*1.8+t*1.3,3.8-t*3.7,stop.z-.1+Math.cos(i*1.7)*1.1-t),particleRotation,particleScale);petals.setMatrixAt(i,particleMatrix);}petals.instanceMatrix.needsUpdate=true;}
    keyLight(taxi.jeepMat,camera,taxi.jeep.position,sun.position,1.1);keyLight(truck.mat,camera,truck.truck.position,sun.position,1.1);
    // The paper remains warm; the focused stretch of road changes from dusk into a clear, blue evening.
    const focusedSpan=focusedPose(active).span,nearFocus=clamp(1-(pose.span-focusedSpan)/(focusedSpan*.6),0,1);
    const moodTarget=mode==='overview'?0:({cloud:.7,edge:memory?0:.9,shillong:.85}[active]||0)*nearFocus;
    mood=still?moodTarget:mood+(moodTarget-mood)*(1-Math.exp(-dt*1.7));
    hemi.color.copy(daylight).lerp(dusk,mood*.55);hemi.groundColor.set(P.leaf).lerp(twilight,mood*.58);hemi.intensity=.9-mood*.12;
    sun.color.copy(daylight).lerp(dusk,mood*.62);sun.intensity=2.65-mood*1.45;
    fill.intensity=.52+mood*.12;taxi.jeepMat.uniforms.uExposure.value=1.28-mood*.08;
    const fixture=stops.get(active)?.group.userData.practical||{x:active==='stand'?2.1:-1.2,y:2.8,z:-.6};practical.position.set(stop.x+fixture.x,fixture.y,stop.z+fixture.z+(stops.get(active)?.group.userData.sceneOffsetZ||0));practical.intensity=mood*11;
    for(const [lights,vehicle,scale] of [[taxiLights,taxi.jeep,1],[truckLights,truck.truck,1.15]]){lights.root.visible=vehicle.visible&&mood>.18&&!(vehicle===taxi.jeep&&atEdge&&s.phase!=='drive');lights.root.position.set(vehicle.position.x,0,vehicle.position.z);lights.root.rotation.y=vehicle.rotation.y;lights.root.scale.setScalar(scale);const lampPower=atEnd&&s.phase!=='arrive'?.16:1;lights.pool.material.opacity=mood*.36*lampPower;for(const beam of lights.beams)beam.material.opacity=mood*.038*lampPower;}

    taxiShadow.visible=taxi.jeep.visible&&!(atEdge&&s.fallT>0);taxiShadow.position.set(taxi.jeep.position.x,.095,taxi.jeep.position.z);taxiShadow.rotation.z=taxi.jeep.rotation.y;taxiShadow.scale.x=atEdge?.56:1;if(atEdge)taxiShadow.position.z=stop.z-2.45;
    truckShadow.visible=truck.truck.visible;truckShadow.position.set(truck.truck.position.x,.095,truck.truck.position.z);truckShadow.rotation.z=truck.truck.rotation.y;
    truck.mat.uniforms.uLamp.value=atEnd&&s.phase!=='arrive'?.12+.88*(1-clamp(s.since/1.4,0,1)):1;
    if(atEdge&&s.flagStage==='braking'&&s.brakeProgress<.25)truck.mat.uniforms.uLamp.value=.55+.45*(Math.sin(Number(s.brakeProgress)*Math.PI*16)>0?1:0);
    for(const [a,shadow] of actorGroundShadows){const ground=groundAt(a.obj.position.x,a.obj.position.z);if(!(atEdge||atEnd)&&a!==ghost)a.obj.position.y=ground+.015;shadow.visible=a.obj.visible&&!a.look?.ghost;shadow.position.set(a.obj.position.x,ground+.018,a.obj.position.z);a.shadow.visible=false;}

    for(let i=0;i<localMist.length;i++){const cloud=localMist[i],fog=['cloud','edge'].includes(active)&&mode==='focus'?clamp(Number(s.fog)||0,0,1):0;cloud.material.opacity=still?fog*.13:cloud.material.opacity+(fog*.13-cloud.material.opacity)*(1-Math.exp(-dt*2));cloud.visible=cloud.material.opacity>.003;cloud.position.set(stop.x-5+i*1.3+Math.sin(elapsed*.13+i)*.28,.35+(i%3)*.22,stop.z-3+(i%2)*.7);}
    if(atEnd)skyline.frame(dt,s);
    positionMarkers();
  }
  function render(){
    if(disposed)return;
    const state=states.get(active)||{},cinematic=active==='shillong'&&state.phase!=='arrive'&&Number(state.since)>=6&&mode==='focus';
    if(ink.uniforms?.uPaletteMix)ink.uniforms.uPaletteMix.value=cinematic?.18:.72;
    if(cinematic){
      if(!skylineStarted){ink.holdFrame?.();skylineStarted=true;}
      ink.revealFrame?.(clamp((Number(state.since)-6)/2.5,0,1));
      ink.render(skyline.scene,skyline.camera,null,skyline.night);
    }else{skylineStarted=false;ink.revealFrame?.(1);ink.render(scene,camera,[taxi.jeep,truck.truck],P.cream);}
  }
  function resize(w,h){width=w;height=h;for(const m of markers)m.labelWidth=0;skyline.resize(w,h);if(transition){transition.steps.forEach((step,i)=>{if(journey&&i<transition.steps.length-1){step.pose={...DEFAULT_VIEW,x:i?journey.to.x:journey.from.x,y:1.1,z:i?journey.to.z:journey.from.z,span:journey.span};}else step.pose=i===transition.steps.length-1&&transition.finalMode==='focus'?focusedPose(focusTarget||active):overviewPose();});}else Object.assign(pose,mode==='overview'?overviewPose():focusedPose(active));applyPose();positionMarkers();}
  function dispose(){disposed=true;skyline.dispose();resolveTransition();labels.remove();for(const a of actors)a.dispose();const geometries=new Set(),materials=new Set(),textures=new Set();scene.traverse(o=>{if(o.geometry)geometries.add(o.geometry);for(const m of [].concat(o.material||[])){materials.add(m);for(const v of Object.values(m))if(v?.isTexture)textures.add(v);}});for(const g of geometries)g.dispose();for(const m of materials)m.dispose();for(const t of textures)t.dispose();shadowTex.dispose();contactTex.dispose();poolTex.dispose();}
  Object.assign(pose,overviewPose());applyPose();positionMarkers();
  return {frame,render,resize,focus,overview,setState,dispose,beginOrbit,dragOrbit,endOrbit,resetOrbit,setOverviewFrame,get mode(){return mode;},
    get audit(){const vehicle=(v,pitch=0)=>({x:v.position.x,y:v.position.y,z:v.position.z,yaw:v.rotation.y,roll:v.rotation.z,pitch,visible:v.visible});return {orbit:orbit.audit,landscape:life.audit,overlook:active==='shillong'?{...skyline.audit,wishProgress:states.get(active)?.wishProgress,banked:states.get(active)?.banked,bankEvent:states.get(active)?.bankEvent,pointer:states.get(active)?.pointer}:undefined,active,phase:states.get(active)?.phase,since:states.get(active)?.since,fallT:states.get(active)?.fallT,mode,taxi:vehicle(taxi.jeep,taxi.hang.rotation.z),truck:vehicle(truck.truck),actors:actors.map(a=>({name:a.look.name||'',x:a.obj.position.x,y:a.obj.position.y,z:a.obj.position.z,visible:a.obj.visible,animation:a.anim}))};}
  };
}
