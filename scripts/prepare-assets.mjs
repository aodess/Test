import sharp from 'sharp';
import {writeFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
const source=process.argv[2]||'../source-assets';
await mkdir('public/assets',{recursive:true});
const names=['01_art_direction.png','02_brick_albedo.png','03_spray_decal.png','04_project_pulse.png','05_project_form.png','06_project_orbit.png','07_logo_sf.png'];
const manifest={note:'Seven supplied SPRAYFORM assets inspected. 01 is reference/fallback only; the interactive hero uses real procedural geometry. No baked depth inferred from albedo.',assets:[]};
for(const [i,name] of names.entries()){
 const file=path.join(source,name),metadata=await sharp(file).metadata();
 const record={id:String(i+1).padStart(2,'0'),source:name,format:metadata.format,width:metadata.width,height:metadata.height,hasAlpha:metadata.hasAlpha,outputs:[],usage:''};
 if(i===0){
  for(const w of [640,1200])for(const format of ['avif','webp']){
   const out=`hero-${w}.${format}`;
   await sharp(file).resize(w,Math.round(w*1120/1200),{fit:'cover',position:'right'}).toFormat(format,{quality:format==='avif'?55:84}).toFile('public/assets/'+out);record.outputs.push(out);
  }record.usage='Composition reference and static fallback only. Right crop at natural proportions.';
 }else if(i===1){
  await sharp(file).resize(1024,1024).webp({quality:85}).toFile('public/assets/brick.webp');record.outputs=['brick.webp'];record.usage='Non-repeating albedo, clamped separately on each wall. Original is not guaranteed seamless. No normal or depth inferred.';
 }else if(i===2){
  await sharp(file).resize(1024,1024).webp({quality:90,alphaQuality:100}).toFile('public/assets/spray.webp');record.outputs=['spray.webp'];record.usage='True-alpha wall decal; custom GLSL reveal. Geometry supplies all depth.';
 }else if(i>=3&&i<=5){
  const id=['pulse','form','orbit'][i-3];
  for(const w of [480,960])for(const format of ['avif','webp']){
   const out=`${id}-${w}.${format}`;await sharp(file).resize(w,w*.75,{fit:'cover'}).toFormat(format,{quality:format==='avif'?57:85}).toFile('public/assets/'+out);record.outputs.push(out);
  }record.usage='Art cover for a clearly labeled concept, never presented as an actual product screenshot.';
 }else {record.outputs=['/mark.svg','/favicon.svg'];record.usage='Direction for an independently redrawn clean monochrome SVG. Raster has visible alpha artifacts; not shipped.';}
 manifest.assets.push(record);
}
await writeFile('assets-manifest.json',JSON.stringify(manifest,null,2));
console.log('Seven assets processed; AVIF/WebP responsive covers and real-alpha spray saved.');
