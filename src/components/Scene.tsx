import {Component, Suspense, useEffect, useMemo, useRef, useState, type ReactNode} from 'react';
import {Canvas, useFrame, useThree} from '@react-three/fiber';
import {RoundedBox} from '@react-three/drei/core/RoundedBox';
import * as THREE from 'three';
import gsap from 'gsap';
import {ScrollTrigger} from 'gsap/ScrollTrigger';
import {useGSAP} from '@gsap/react';
import {sculpture, sprayVertex, sprayFragment} from '../lib/sculpture';
gsap.registerPlugin(useGSAP,ScrollTrigger);
type Movement = {x:number;y:number;scroll:number;reveal:number;assembly:number};

class SceneBoundary extends Component<{children:ReactNode;onError:()=>void},{failed:boolean}>{
  state={failed:false};static getDerivedStateFromError(){return {failed:true};}
  componentDidCatch(){this.props.onError();}render(){return this.state.failed?null:this.props.children;}
}
function World({movement,reduced,ready,quality}:{movement:Movement;reduced:boolean;ready:()=>void;quality:boolean}){
  const {camera,invalidate,gl,setDpr}=useThree();
  const assembly=useRef<THREE.Group>(null);
  const paint=useRef<THREE.ShaderMaterial>(null);
  const slowFrames=useRef(0);
  const object=useMemo(()=>sculpture(),[]);
  const textures=useMemo(()=>{
    const loader=new THREE.TextureLoader();
    const brick=loader.load('/assets/brick.webp',()=>invalidate());brick.colorSpace=THREE.SRGBColorSpace;brick.wrapS=brick.wrapT=THREE.ClampToEdgeWrapping;
    const spray=loader.load('/assets/spray.webp',()=>invalidate());spray.colorSpace=THREE.SRGBColorSpace;
    return {brick,spray};
  },[invalidate]);
  const uniforms=useMemo(()=>({map:{value:textures.spray},reveal:{value:reduced?1.1:0}}),[textures,reduced]);
  useEffect(()=>{
    camera.lookAt(0,.05,0);ready();invalidate();
    const lost=(event:Event)=>{event.preventDefault();gl.domElement.closest<HTMLElement>('.scene-host')?.setAttribute('data-ready','false');};
    const restored=()=>{gl.domElement.closest<HTMLElement>('.scene-host')?.setAttribute('data-ready','true');invalidate();};
    gl.domElement.addEventListener('webglcontextlost',lost);gl.domElement.addEventListener('webglcontextrestored',restored);
    return()=>{Object.values(textures).forEach(t=>t.dispose());gl.domElement.removeEventListener('webglcontextlost',lost);gl.domElement.removeEventListener('webglcontextrestored',restored);};
  },[]);
  useFrame((_,delta)=>{
    const d=Math.min(delta,.05), alpha=1-Math.exp(-d*7);
    const targetX=3.8+(reduced?0:movement.x*.65),targetY=2.0+(reduced?0:movement.y*.30+movement.scroll*.35);
    camera.position.x=THREE.MathUtils.lerp(camera.position.x,targetX,alpha);camera.position.y=THREE.MathUtils.lerp(camera.position.y,targetY,alpha);camera.lookAt(0,.05,0);
    if(assembly.current){assembly.current.rotation.y=THREE.MathUtils.lerp(assembly.current.rotation.y,reduced?0:movement.x*.23,alpha);assembly.current.position.y=reduced?0:(1-movement.assembly)*-.28;assembly.current.scale.setScalar(reduced?1:.93+movement.assembly*.07);}
    if(paint.current)paint.current.uniforms.reveal.value=reduced?1.1:movement.reveal;
    // Adapt to measured rendering cost, including software WebGL and older GPUs.
    if(delta>.035&&delta<.2&&slowFrames.current<18){slowFrames.current++;if(slowFrames.current===18)setDpr(.85);}
    if(Math.abs(camera.position.x-targetX)>.002||Math.abs(camera.position.y-targetY)>.002||(!reduced&&Math.abs((assembly.current?.rotation.y||0)-movement.x*.23)>.001)) invalidate();
  });
  return <>
    <color attach="background" args={['#181a1b']}/><fog attach="fog" args={['#181a1b',11,24]}/>
    <ambientLight intensity={.65}/><hemisphereLight args={['#f5edd7','#242a21',1.25]}/>
    <directionalLight position={[-3,7,6]} intensity={2.9} color="#fff1d6" castShadow shadow-mapSize={[quality?1024:512,quality?1024:512]} shadow-camera-left={-5} shadow-camera-right={5} shadow-camera-top={5} shadow-camera-bottom={-5} shadow-normalBias={.04} shadow-bias={-.0002} shadow-radius={5} shadow-camera-far={24}/>
    <mesh position={[0,.1,-2.0]} receiveShadow><planeGeometry args={[9,6]}/><meshStandardMaterial map={textures.brick} roughness={.96}/></mesh>
    <mesh position={[-4,.1,1]} rotation={[0,Math.PI/2,0]} receiveShadow><planeGeometry args={[6,6]}/><meshStandardMaterial map={textures.brick} roughness={.96}/></mesh>
    <mesh rotation={[-Math.PI/2,0,0]} position={[0,-2.3,1]} receiveShadow><planeGeometry args={[12,12]}/><meshStandardMaterial color="#272d2b" roughness={.67} metalness={.13}/></mesh>
    <mesh position={[0,.3,-1.94]}><planeGeometry args={[7,5]}/><shaderMaterial ref={paint} vertexShader={sprayVertex} fragmentShader={sprayFragment} uniforms={uniforms} transparent depthWrite={false} polygonOffset polygonOffsetFactor={-1}/></mesh>
    <RoundedBox args={[3.85,.22,2.65]} position={[0,-2.12,.05]} radius={.055} smoothness={3} receiveShadow castShadow><meshStandardMaterial color="#343b34" roughness={.7}/></RoundedBox>
    <group ref={assembly}><primitive object={object}/></group>
  </>;
}

export default function Scene(){
  const host=useRef<HTMLDivElement>(null);
  const [supported,setSupported]=useState(false),[visible,setVisible]=useState(true),[tabVisible,setTabVisible]=useState(true),[ready,setReady]=useState(false),[reduced,setReduced]=useState(true),[quality,setQuality]=useState(false);
  const invalidateRef=useRef<()=>void>(()=>{});
  const movement=useRef<Movement>({x:0,y:0,scroll:0,reveal:0,assembly:0}).current;
  useEffect(()=>{
    const media=window.matchMedia('(prefers-reduced-motion: reduce)');setReduced(media.matches);
    const changed=()=>{setReduced(media.matches);movement.x=movement.y=movement.scroll=0;invalidateRef.current();};media.addEventListener('change',changed);
    const canvas=document.createElement('canvas');const context=canvas.getContext('webgl2');
    setSupported(!!context&&!new URLSearchParams(location.search).has('no-webgl'));
    context?.getExtension('WEBGL_lose_context')?.loseContext();
    setQuality(window.innerWidth>760 && navigator.hardwareConcurrency>4);
    const observer=new IntersectionObserver(entries=>setVisible(entries[0].isIntersecting),{rootMargin:'80px'});if(host.current)observer.observe(host.current);
    const visibility=()=>setTabVisible(!document.hidden);document.addEventListener('visibilitychange',visibility);
    return()=>{observer.disconnect();document.removeEventListener('visibilitychange',visibility);media.removeEventListener('change',changed);};
  },[]);
  useGSAP(()=>{
    if(!supported||!ready)return;
    if(reduced){movement.reveal=1.1;movement.assembly=1;movement.scroll=0;invalidateRef.current();return;}
    const update=()=>{if(visible&&tabVisible)invalidateRef.current();};
    gsap.to(movement,{reveal:1.1,assembly:1,duration:1.15,ease:'power2.out',onUpdate:update});
    gsap.to(movement,{scroll:1,ease:'none',scrollTrigger:{trigger:'#top',start:'top top',end:'bottom top',scrub:.5},onUpdate:update});
  },{dependencies:[supported,ready,reduced],revertOnUpdate:true});
  useEffect(()=>{if(visible&&tabVisible)invalidateRef.current();},[visible,tabVisible]);
  const gesture=useRef<{id:number;x:number;y:number}|null>(null);
  function reset(){gesture.current=null;movement.x=movement.y=0;invalidateRef.current();}
  return <div className="scene-host" ref={host} data-ready={ready&&supported} aria-hidden="true"
    onPointerDown={event=>{if(reduced||event.pointerType==='mouse')return;gesture.current={id:event.pointerId,x:event.clientX,y:event.clientY};}}
    onPointerMove={event=>{
      if(reduced)return;
      if(event.pointerType==='mouse'){
        const rect=event.currentTarget.getBoundingClientRect();movement.x=((event.clientX-rect.left)/rect.width-.5)*1.5;movement.y=((event.clientY-rect.top)/rect.height-.5)*.8;
      }else if(gesture.current?.id===event.pointerId){const dx=event.clientX-gesture.current.x,dy=event.clientY-gesture.current.y;if(Math.abs(dy)>Math.abs(dx)+8){reset();return;}movement.x=Math.max(-1,Math.min(1,dx/140));}else return;
      invalidateRef.current();
    }} onPointerUp={reset} onPointerCancel={reset} onPointerLeave={reset}>
    {supported&&<SceneBoundary onError={()=>{setSupported(false);setReady(false);}}><Canvas shadows="percentage" frameloop={visible&&tabVisible?'demand':'never'} dpr={[1,quality?1.75:1.5]} camera={{position:[3.8,2,10.0],fov:39,near:.1,far:40}} gl={{alpha:false,antialias:quality,powerPreference:'low-power',toneMapping:THREE.ACESFilmicToneMapping,toneMappingExposure:1.05}}
      onCreated={({invalidate})=>{invalidateRef.current=invalidate;}}><Suspense fallback={null}><World movement={movement} reduced={reduced} ready={()=>setReady(true)} quality={quality}/></Suspense></Canvas></SceneBoundary>}
  </div>;
}
