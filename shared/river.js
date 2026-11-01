import * as THREE from 'three';
import { RAVINE_BED } from './cliff.js';
import { EDGE_SITE } from './choreography.js';

// A single connected stream, from the rounded head pool to the cut-edge falls.
// All motion uses absolute time, including foam travelling along the channel.
export function createRiver(P) {
  const group=new THREE.Group();group.name='ravine-river';
  const waterY=-EDGE_SITE.drop+.14;
  const path=new THREE.CatmullRomCurve3([[4.9,0,-8.7],[2.7,0,-8.2],[-1.4,0,-8.8],[-6.7,0,-8.05],[-11.8,0,-9.2],[-16.5,0,-8.6],[-21.47,0,-9]].map(p=>new THREE.Vector3(...p)),false,'catmullrom',.28);
  const widthStops=[.12,1.9,2.35,2.1,2.65,2.15,1.23];
  const outletX=z=>-21+(z+3.3)/9.7;
  function sample(t,lane=0){
    t=THREE.MathUtils.clamp(t,0,1);const p=path.getPoint(t),d=path.getTangent(t),f=t*(widthStops.length-1),i=Math.min(widthStops.length-2,Math.floor(f)),width=THREE.MathUtils.lerp(widthStops[i],widthStops[i+1],f-i);
    const z=p.z+d.x*lane*width,x=p.x-d.z*lane*width;
    return {x:THREE.MathUtils.lerp(x,outletX(z),THREE.MathUtils.smoothstep(t,.96,1)),z,width};
  }
  const wave=(x,z,t)=>Math.sin(x*1.36+z*.63+t*1.65)*.037+Math.sin(x*.73-z*1.4+t*.88)*.021;
  // A soft sky environment gives the physical water something to reflect even
  // though the landscape itself is presented against a plain paper page.
  const skyWidth=128,skyHeight=64,skyData=new Float32Array(skyWidth*skyHeight*4);
  for(let y=0;y<skyHeight;y++)for(let x=0;x<skyWidth;x++){
    const theta=y/skyHeight*Math.PI,up=Math.max(0,Math.cos(theta)),sun=Math.exp(-((x/skyWidth-.26)**2/.018+(y/skyHeight-.24)**2/.008))*1.8,i=(y*skyWidth+x)*4;
    skyData[i]=.24+up*.57+sun;skyData[i+1]=.34+up*.56+sun;skyData[i+2]=.30+up*.59+sun;skyData[i+3]=1;
  }
  const sky=new THREE.DataTexture(skyData,skyWidth,skyHeight,THREE.RGBAFormat,THREE.FloatType);sky.mapping=THREE.EquirectangularReflectionMapping;sky.colorSpace=THREE.LinearSRGBColorSpace;sky.needsUpdate=true;
  const bed=RAVINE_BED.map(([x,z])=>new THREE.Vector2(x,z));
  function inside(x,z){let yes=false;for(let i=0,j=bed.length-1;i<bed.length;j=i++){const a=bed[i],b=bed[j];if((a.y>z)!==(b.y>z)&&x<(b.x-a.x)*(z-a.y)/(b.y-a.y)+a.x)yes=!yes;}return yes;}
  function bankPoint(t,lane){const p=sample(t,lane);if(inside(p.x,p.z))return p;let nearest=null,dist=Infinity;for(let i=0;i<bed.length;i++){const a=bed[i],b=bed[(i+1)%bed.length],dx=b.x-a.x,dz=b.y-a.y,k=THREE.MathUtils.clamp(((p.x-a.x)*dx+(p.z-a.y)*dz)/(dx*dx+dz*dz),0,1),x=a.x+dx*k,z=a.y+dz*k,d=Math.hypot(x-p.x,z-p.z);if(d<dist){dist=d;nearest={x,z};}}return {...p,...nearest};}
  const rows=128,cols=20,positions=[],colors=[],indices=[],color=new THREE.Color();
  const shallow=new THREE.Color('#83d3c5'),deep=new THREE.Color('#259b9e');
  for(let r=0;r<=rows;r++)for(let c=0;c<=cols;c++){
    const t=r/rows,lane=c/cols*2-1,p=sample(t,lane);positions.push(p.x,waterY,p.z);
    const edge=THREE.MathUtils.smoothstep(Math.abs(lane),.47,1),variation=.035*Math.sin(t*31+lane*4);color.copy(deep).lerp(shallow,edge*.84+variation+.06);colors.push(color.r,color.g,color.b);
    if(r<rows&&c<cols){const a=r*(cols+1)+c,b=a+cols+1;indices.push(a,a+1,b,a+1,b+1,b);}
  }
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));geometry.setIndex(indices);geometry.computeVertexNormals();
  const waterMaterial=new THREE.MeshPhysicalMaterial({color:'#ffffff',vertexColors:true,emissive:'#35a7a8',emissiveIntensity:.29,envMap:sky,envMapIntensity:.8,roughness:.19,metalness:0,clearcoat:1,clearcoatRoughness:.14,transparent:true,opacity:.94,depthWrite:false,side:THREE.DoubleSide});
  const surface=new THREE.Mesh(geometry,waterMaterial);surface.name='ravine-water';surface.receiveShadow=true;surface.renderOrder=2;group.add(surface);
  const base=new Float32Array(geometry.attributes.position.array);
  // Broad, gently sloping gravel shoulders replace the ruler-straight water edge.
  for(const side of [-1,1]){
    const data=[],paint=[],idx=[],across=4;
    for(let r=0;r<=rows;r++)for(let c=0;c<=across;c++){
      const t=r/rows,k=c/across,p=bankPoint(t,side*(1+k*.52));const fade=Math.sin(t*Math.PI)**.35;
      data.push(p.x,waterY-.055+(.24+k*.94)*k*fade+.075*Math.sin(t*56+side)*k,p.z);
      color.set(c===0?'#799c8c':c===1?'#9baca0':c===2?'#b8b5a0':'#a2a28d');paint.push(color.r,color.g,color.b);
      if(r<rows&&c<across){const a=r*(across+1)+c,b=a+across+1;idx.push(a,b,a+1,a+1,b,b+1);}
    }
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(data,3));g.setAttribute('color',new THREE.Float32BufferAttribute(paint,3));g.setIndex(idx);g.computeVertexNormals();
    const m=new THREE.Mesh(g,new THREE.MeshStandardMaterial({vertexColors:true,side:THREE.DoubleSide,roughness:.98,emissive:'#879d8d',emissiveIntensity:.11}));m.name='sloping-river-bank';m.receiveShadow=true;group.add(m);
  }
  // Half-buried boulders and small gravel clusters establish a natural scale.
  const rockGeometry=new THREE.DodecahedronGeometry(1,0),rockPaints=['#728d83','#91a297','#b7b8a5'].map(color=>new THREE.MeshStandardMaterial({color,roughness:.94,emissive:color,emissiveIntensity:.08}));
  for(let i=0;i<48;i++){
    const t=.07+(i/48)*.86,side=i%2?-1:1,p=bankPoint(t,side*(1.04+(i%4)*.10)),radius=.10+(i%7)*.037;
    const m=new THREE.Mesh(rockGeometry,rockPaints[i%3]);m.name='riverbank-stone';m.position.set(p.x,waterY+.02+(i%3)*.055,p.z);m.scale.set(radius*1.6,radius*.68,radius);m.rotation.set(i*.28,i*1.7,i*.13);m.castShadow=m.receiveShadow=true;group.add(m);
  }
  const eddies=[];
  for(let i=0;i<7;i++){
    const t=.16+i*.102,p=sample(t,Math.sin(i*3.7)*.62),radius=.26+(i%3)*.08;
    const rock=new THREE.Mesh(rockGeometry,rockPaints[i%3]);rock.name='stream-boulder';rock.position.set(p.x,waterY+.04,p.z);rock.scale.set(radius*1.3,radius*.75,radius);rock.rotation.set(i*.15,i*2.1,.15);rock.castShadow=rock.receiveShadow=true;group.add(rock);
    const g=new THREE.RingGeometry(radius*1.15,radius*1.15+.075,22,1,Math.PI*.18,Math.PI*1.22);g.rotateX(-Math.PI/2);
    const m=new THREE.Mesh(g,new THREE.MeshBasicMaterial({color:'#d9f0dd',transparent:true,opacity:.55,side:THREE.DoubleSide,depthWrite:false}));m.position.set(p.x-.14,waterY+.045,p.z);m.renderOrder=4;m.name='boulder-eddy';group.add(m);eddies.push({mesh:m,x:p.x,z:p.z,phase:i*1.7});
  }
  const foam=[];
  for(let i=0;i<30;i++){
    const g=new THREE.PlaneGeometry(1,1,14,1);g.rotateX(-Math.PI/2);const m=new THREE.Mesh(g,new THREE.MeshBasicMaterial({color:i%3?'#d9f0dd':'#b3e1d3',transparent:true,opacity:.5,depthWrite:false,side:THREE.DoubleSide}));m.name='river-ripple';m.renderOrder=4;m.frustumCulled=false;group.add(m);foam.push({mesh:m,base:new Float32Array(g.attributes.position.array),phase:i*.61803398875,lane:Math.sin(i*9.3)*.79,length:.018+(i%5)*.007,width:i%5===0?.22:.065});
  }
  const fallGeometry=new THREE.PlaneGeometry(1,1,18,48),fallBase=new Float32Array(fallGeometry.attributes.position.array),fallColors=[];
  for(let i=0;i<fallBase.length;i+=3){const k=.5-fallBase[i+1],u=fallBase[i];color.set('#78cabe').lerp(new THREE.Color('#deeee0'),.20+.33*Math.sin(u*18)**2+.16*k);const alpha=(.76+.24*Math.sin(u*39)**2)*(1-THREE.MathUtils.smoothstep(k,.86,1)*.94);fallColors.push(color.r,color.g,color.b,alpha);}
  fallGeometry.setAttribute('color',new THREE.Float32BufferAttribute(fallColors,4));
  const waterfall=new THREE.Mesh(fallGeometry,new THREE.MeshPhysicalMaterial({color:'#ffffff',vertexColors:true,emissive:'#9ed8cd',emissiveIntensity:.23,envMap:sky,envMapIntensity:.6,roughness:.26,clearcoat:.8,side:THREE.DoubleSide,transparent:true,opacity:.91,depthWrite:false}));waterfall.name='corner-waterfall';waterfall.renderOrder=3;waterfall.frustumCulled=false;group.add(waterfall);
  const fallHeight=4.34,streaks=[];
  for(let i=0;i<13;i++){const g=new THREE.PlaneGeometry(.025+(i%3)*.017,.48+(i%4)*.23);const m=new THREE.Mesh(g,new THREE.MeshBasicMaterial({color:'#e5f4e4',transparent:true,opacity:.64,side:THREE.DoubleSide,depthWrite:false}));m.rotation.y=Math.PI/2;m.renderOrder=4;m.name='falling-water-streak';group.add(m);streaks.push(m);}
  const drops=new THREE.InstancedMesh(new THREE.SphereGeometry(.045,5,4),new THREE.MeshBasicMaterial({color:'#bde6d8',transparent:true,opacity:.6,depthWrite:false}),24);drops.name='waterfall-droplets';drops.frustumCulled=false;group.add(drops);
  const matrix=new THREE.Matrix4(),q=new THREE.Quaternion(),scale=new THREE.Vector3(.7,1.65,.7),point=new THREE.Vector3();
  function update(time=0){
    const a=geometry.attributes.position;for(let i=0;i<a.count;i++)a.setY(i,waterY+wave(base[i*3],base[i*3+2],time));a.needsUpdate=true;geometry.computeVertexNormals();
    for(const e of eddies){e.mesh.position.y=waterY+wave(e.x,e.z,time)+.045;e.mesh.material.opacity=.34+.21*Math.sin(time*1.4+e.phase)**2;e.mesh.scale.setScalar(1+.045*Math.sin(time*1.4+e.phase));}
    for(const f of foam){const t=(time*.065+f.phase)%1,alpha=Math.sin(Math.PI*t);f.mesh.material.opacity=(f.width>.1?.18:.61)*alpha;const a=f.mesh.geometry.attributes.position;
      for(let i=0;i<a.count;i++){const u=f.base[i*3],v=f.base[i*3+2],p=sample(t+u*f.length,f.lane+Math.sin(u*4+f.phase)*.035+v*f.width*Math.cos(u*Math.PI));a.setXYZ(i,p.x,waterY+wave(p.x,p.z,time)+.035,p.z);}a.needsUpdate=true;
    }
    const aFall=fallGeometry.attributes.position;
    for(let i=0;i<aFall.count;i++){const u=fallBase[i*3],k=.5-fallBase[i*3+1],spread=1-k*.08,z=-9+u*2.46*spread,x=outletX(z)-.055-.66*k*k+Math.sin(k*14-time*4.5+u*11)*.028;
      aFall.setXYZ(i,x,waterY-k*fallHeight+Math.sin(u*29)*.14*k,z);}aFall.needsUpdate=true;fallGeometry.computeVertexNormals();
    streaks.forEach((m,i)=>{const k=(time*.46+i*.079)%1,z=-9+Math.sin(i*12.1)*1.07;m.position.set(outletX(z)-.075-.66*k*k,waterY-k*fallHeight,z);m.material.opacity=Math.sin(k*Math.PI)*(.43+(i%3)*.08);});
    for(let i=0;i<24;i++){const k=(time*.58+i*.0417)%1,z=-9+Math.sin(i*6.1)*1.1;point.set(outletX(z)-.55-k*.22,waterY-3.25-k*1.4,z);matrix.compose(point,q,scale);drops.setMatrixAt(i,matrix);}drops.instanceMatrix.needsUpdate=true;
  }
  update(0);
  return {group,update,sample,get audit(){let minY=Infinity,maxY=-Infinity;const a=geometry.attributes.position;for(let i=0;i<a.count;i++){minY=Math.min(minY,a.getY(i));maxY=Math.max(maxY,a.getY(i));}return {water:{minY,maxY,vertices:a.count},waterfall:{top:waterY,bottom:waterY-fallHeight},channel:{length:path.getLength(),banks:2,stones:48,flowLines:foam.length}};}};
}
