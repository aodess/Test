import * as THREE from 'three';

export const palette = {coal: '#181a1b', white:'#f2ebdd',lime:'#d6f36a',coral:'#ff7864',blue:'#4562eb'};
export function matte(color:string){
  const material = new THREE.MeshStandardMaterial({color,roughness:.71,metalness:.05});
  material.onBeforeCompile = shader => {
    shader.fragmentShader = shader.fragmentShader.replace('#include <common>',`#include <common>\nfloat surfaceGrain(vec3 p){return fract(sin(dot(p,vec3(12.9898,78.233,45.164)))*43758.5453);}`)
      .replace('#include <color_fragment>',`#include <color_fragment>\ndiffuseColor.rgb *= .97 + .06 * surfaceGrain(vec3(gl_FragCoord.xy,1.0));`);
  };
  return material;
}
function profile(width:number,depth:number){
  const w=width/2,h=depth/2,r=Math.min(.085,depth*.4);const s=new THREE.Shape();
  s.moveTo(-w+r,-h);s.lineTo(w-r,-h);s.quadraticCurveTo(w,-h,w,-h+r);s.lineTo(w,h-r);s.quadraticCurveTo(w,h,w-r,h);s.lineTo(-w+r,h);s.quadraticCurveTo(-w,h,-w,h-r);s.lineTo(-w,-h+r);s.quadraticCurveTo(-w,-h,-w+r,-h);
  return s;
}
export function ribbon(points:number[][],color:string,width=.62,depth=.2){
  const curve=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p as [number,number,number])),false,'catmullrom',.48);
  const geometry=new THREE.ExtrudeGeometry(profile(width,depth),{steps:110,bevelEnabled:false,extrudePath:curve,curveSegments:5});
  geometry.computeVertexNormals();
  const mesh=new THREE.Mesh(geometry,matte(color));mesh.castShadow=true;mesh.receiveShadow=true;return mesh;
}
export function sculpture(kind='hero'){
  const group=new THREE.Group();
  if(kind==='hero'){
    const lime=ribbon([[.9,1.95,-.25],[-.7,2,-.1],[-1.65,1.1,.1],[-.85,.25,.6],[.95,-.25,.65],[1.35,-1.15,.45],[.35,-1.65,.25],[-1.2,-1.4,.1]],palette.lime,.84,.24);
    lime.rotation.z=-.20;group.add(lime);
    const coral=ribbon([[-1.5,-1.7,.5],[-.7,-.85,1.0],[.25,.4,.9],[1.1,1.45,.15],[1.8,1.15,-.35],[1.45,.35,-.4],[.5,.1,-.1]],palette.coral,.70,.26);
    coral.rotation.z=-.12;group.add(coral);
    const ring=new THREE.Mesh(new THREE.TorusGeometry(1.38,.22,20,96,Math.PI*1.65),matte(palette.blue));ring.position.set(.05,.15,-.65);ring.rotation.set(.35,-.45,-1.1);ring.castShadow=true;group.add(ring);
    const chip=new THREE.Mesh(new THREE.IcosahedronGeometry(.16,0),matte(palette.coral));chip.position.set(1.7,-1.7,.4);chip.rotation.z=.4;chip.castShadow=true;group.add(chip);
    group.rotation.set(.05,-.12,.02);
  }
  if(kind==='pulse'){
    for(let i=0;i<8;i++){
      const arc=new THREE.Mesh(new THREE.TorusGeometry(.7+i*.155,.052+i*.005,16,96,Math.PI*1.76),matte(palette.coral));
      arc.rotation.set(.25,.35,-.5+i*.06);arc.position.set(0,.25,(i-4)*.095);arc.castShadow=true;group.add(arc);
    }
    const disc=new THREE.Mesh(new THREE.CylinderGeometry(.61,.61,.13,64),matte('#212522'));disc.rotation.x=Math.PI/2;disc.position.set(0,.25,.5);disc.castShadow=true;group.add(disc);
    const center=new THREE.Mesh(new THREE.CylinderGeometry(.12,.12,.15,40),matte(palette.coral));center.rotation.x=Math.PI/2;center.position.set(0,.25,.52);group.add(center);
    group.rotation.z=-.24;
  }
  if(kind==='form'){
    group.add(ribbon([[-1.25,-1.25,.55],[-1.1,-.2,.25],[-.85,.2,-.55],[-.75,1.4,-.7],[.4,1.6,-.7],[1.05,.6,-.4],[.45,-.05,.55],[.3,-.4,1.0],[1.1,-1.25,.85]],palette.lime,1.23,.18));
    group.rotation.y=-.32;group.position.y=.1;
  }
  if(kind==='orbit'){
    const core=new THREE.Mesh(new THREE.SphereGeometry(.64,48,32),new THREE.MeshStandardMaterial({color:palette.white,roughness:.28,metalness:.22}));core.position.y=.3;core.castShadow=true;group.add(core);
    [[1.38,.24,.2],[1.7,1.05,-.7],[1.95,-.8,.9]].forEach(([r,x,y],i)=>{const ring=new THREE.Mesh(new THREE.TorusGeometry(r,.09+i*.025,20,120),matte(i===1?'#8096ff':palette.blue));ring.position.y=.3;ring.rotation.set(x,y,i*.2);ring.castShadow=true;group.add(ring);});
    const moon=new THREE.Mesh(new THREE.SphereGeometry(.19,24,16),matte(palette.lime));moon.position.set(1.6,1.2,.8);moon.castShadow=true;group.add(moon);
  }
  return group;
}

export const sprayVertex=`varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`;
export const sprayFragment=`uniform sampler2D map;uniform float reveal;varying vec2 vUv;
float random(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453123);}
void main(){vec4 paint=texture2D(map,vUv);float grain=random(floor(vUv*720.0));float threshold=vUv.x*.62+vUv.y*.22+grain*.16;float mask=1.0-smoothstep(reveal-.10,reveal,threshold);gl_FragColor=vec4(paint.rgb,paint.a*mask*.45);
#include <tonemapping_fragment>
#include <colorspace_fragment>
}`;

export function disposeGroup(group:THREE.Object3D){group.traverse(object=>{if(object instanceof THREE.Mesh){object.geometry.dispose();const mats=Array.isArray(object.material)?object.material:[object.material];mats.forEach(m=>m.dispose());}});}
