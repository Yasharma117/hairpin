import * as THREE from 'three';
import { createRiver } from './river.js';

// Water and flight share an absolute clock for reproducible stills and replay.
export function createLandscapeLife({palette:P,edgeOrigin={x:-10,z:-10}}) {
  const group=new THREE.Group();group.name='landscape-life';
  const river=createRiver(P);river.group.position.set(edgeOrigin.x,0,edgeOrigin.z);group.add(river.group);
  const birds=new THREE.Group();birds.name='hillside-birds';group.add(birds);
  const bodyMaterial=new THREE.MeshStandardMaterial({color:'#c6c4b4',roughness:.85}),wingMaterial=new THREE.MeshStandardMaterial({color:'#7c8c83',roughness:.87,side:THREE.DoubleSide}),tipMaterial=new THREE.MeshStandardMaterial({color:'#485b58',roughness:.87,side:THREE.DoubleSide});
  const flight=[];
  function birdMesh(geo,material,parent,position){const m=new THREE.Mesh(geo,material);m.castShadow=true;if(position)m.position.set(...position);parent.add(m);return m;}
  function wing(side){
    const wing=new THREE.Group(),g=new THREE.BufferGeometry();
    const vertices=[[0,0,.07],[.19,.022,.075],[.47,-.012,-.04],[.48,-.018,-.13],[.18,.012,-.10],[.02,0,-.16]],p=[];
    for(let i=1;i<vertices.length-1;i++)for(const v of [vertices[0],vertices[i],vertices[i+1]])p.push(v[0]*side,v[1],v[2]);
    g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.computeVertexNormals();birdMesh(g,wingMaterial,wing);
    const tip=new THREE.BufferGeometry();tip.setAttribute('position',new THREE.Float32BufferAttribute([.31*side,0,-.025,.47*side,-.012,-.04,.48*side,-.018,-.13,.31*side,0,-.025,.48*side,-.018,-.13,.30*side,0,-.11],3));tip.computeVertexNormals();birdMesh(tip,tipMaterial,wing);
    wing.position.set(side*.055,.025,0);return wing;
  }
  const routes=[{x:-18,z:5,rx:8.5,rz:4.8,y:6.4,speed:.19,phase:.4},{x:-18,z:5,rx:7.6,rz:4.3,y:7.0,speed:.19,phase:1.05},{x:4,z:-11,rx:7.5,rz:4.4,y:7.8,speed:.15,phase:2.1},{x:-20,z:-18.9,rx:5,rz:1.1,y:-4.2,speed:.24,phase:3.2}];
  routes.forEach((route,i)=>{
    const bird=new THREE.Group();bird.name=`hillside-bird-${i+1}`;bird.scale.setScalar(1.35);birds.add(bird);
    const body=birdMesh(new THREE.SphereGeometry(1,9,6),bodyMaterial,bird);body.scale.set(.083,.08,.21);
    birdMesh(new THREE.SphereGeometry(.062,8,6),bodyMaterial,bird,[0,.035,.17]);
    const beak=birdMesh(new THREE.ConeGeometry(.023,.075,5),tipMaterial,bird,[0,.025,.246]);beak.rotation.x=Math.PI/2;
    const tail=birdMesh(new THREE.ConeGeometry(.075,.16,3),tipMaterial,bird,[0,.01,-.22]);tail.rotation.x=-Math.PI/2;tail.scale.z=.25;
    const left=wing(-1),right=wing(1);bird.add(left,right);flight.push({bird,left,right,route});
  });
  let currentTime=0;
  function update(time=0){
    currentTime=Number.isFinite(time)?time:0;
    river.update(currentTime);
    for(const {bird,left,right,route:r} of flight){const a=currentTime*r.speed+r.phase,dx=-r.rx*Math.sin(a)*r.speed,dz=r.rz*Math.cos(a)*r.speed;bird.position.set(r.x+Math.cos(a)*r.rx,r.y+Math.sin(a*1.8)*.3,r.z+Math.sin(a)*r.rz);bird.rotation.set(Math.sin(a*1.8)*.035,Math.atan2(dx,dz),Math.sin(a)*.12);const flap=Math.sin(currentTime*7.4+r.phase)*(.16+.26*(.5+.5*Math.sin(currentTime*.38+r.phase)));left.rotation.z=-flap;right.rotation.z=flap;}
  }
  update(0);
  return {group,update,viewPoints:routes.flatMap(r=>[-1,1].flatMap(x=>[-1,1].map(z=>new THREE.Vector3(r.x+x*(r.rx+.8),r.y+.8,r.z+z*(r.rz+.8))))),get audit(){return {time:currentTime,...river.audit,birds:flight.map(({bird,left,right})=>({name:bird.name,position:bird.position.toArray(),wings:[left.rotation.z,right.rotation.z]}))};}};
}
