import assert from 'node:assert/strict';
import * as THREE from '../shared/vendor/three.module.js';
import {EDGE_SITE,edgeTaxiPose,edgeApproach,sampleWalk,BOARDING_ROUTE,EXIT_ROUTES} from '../shared/choreography.js';
import {LAND_CONTOUR,ROAD_POINTS} from '../shared/cliff.js';
const inside=(x,z,poly)=>{let yes=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){const a=poly[i],b=poly[j];if((a[1]>z)!==(b[1]>z)&&x<(b[0]-a[0])*(z-a[1])/(b[1]-a[1])+a[0])yes=!yes;}return yes;};
let checks=0;
const ok=(v,message)=>{checks++;assert.ok(v,message);};
const delta=(a,b)=>Math.atan2(Math.sin(b-a),Math.cos(b-a));
let previous=edgeApproach(0);
for(let i=1;i<=1000;i++){
 const p=edgeApproach(i/1000);ok(Math.hypot(p.x-previous.x,p.z-previous.z)<.02,'approach step jumps');ok(Math.abs(delta(previous.yaw,p.yaw))<.01,'approach heading snaps');ok(inside(p.x-10,p.z-10,LAND_CONTOUR),'approach leaves land');previous=p;
}
const end=edgeTaxiPose({phase:'drive',driveU:1}),park=edgeTaxiPose({phase:'car',angle:0,fallT:-1});
for(const k of ['x','y','z','yaw'])ok(Math.abs(end[k]-park[k])<1e-9,'drive-to-stop changes '+k);
ok(EDGE_SITE.rest.z-1.65<EDGE_SITE.lipZ,'nose must overhang the real lip');
ok(EDGE_SITE.rest.z+1.1>EDGE_SITE.lipZ,'rear wheels must remain supported');
let old=edgeTaxiPose({phase:'flick',fallT:0},-.4),crossed=false;
for(let i=1;i<=300;i++){
 const p=edgeTaxiPose({phase:'flick',fallT:i/120},-.4);
 ok(p.x===0&&p.yaw===Math.PI/2&&p.roll===0,'fall turns or rolls off its own line');
 ok(p.z<=old.z+1e-9&&p.y<=old.y+1e-9,'fall reverses');
 ok(p.pitch>=-1.31&&p.pitch<=-.39,'fall makes a full rotation');
 if(p.z<EDGE_SITE.lipZ&&p.y>-.8)crossed=true;old=p;
}
ok(crossed,'car must cross the lip before sinking through solid road');
for(const p of [...EDGE_SITE.seats,EDGE_SITE.ghost])ok(inside(...p,EDGE_SITE.ledge),'seated figure has no stone underneath');
for(let i=0;i<=500;i++){
 const p=sampleWalk(BOARDING_ROUTE,i/500);ok(!(p.x>-19.66&&p.x<-16.36&&p.z>6.32&&p.z<7.68),'boarding walks through taxi');
}
for(const path of EXIT_ROUTES)for(let i=0;i<=200;i++){const p=sampleWalk(path,i/200);ok(p.z>EDGE_SITE.lipZ||inside(p.x,p.z,EDGE_SITE.ledge),'exit walks into the canyon');}
const road=new THREE.CatmullRomCurve3(ROAD_POINTS.map(([x,z])=>new THREE.Vector3(x,0,z)),false,'catmullrom',.3);
for(let i=0;i<=2000;i++){const p=road.getPoint(i/2000);ok(inside(p.x,p.z,LAND_CONTOUR),'road center leaves the actual terrain at '+p.x+','+p.z);}
console.log(JSON.stringify({result:'passed',checks,coverage:['approach/stop continuity','fixed-axis fall','real lip crossing','supported seating','boarding and exit clearance','entire road on land']},null,2));
