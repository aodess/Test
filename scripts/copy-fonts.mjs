import {copyFile,mkdir} from 'node:fs/promises';
await mkdir('public/fonts',{recursive:true}); await mkdir('licenses',{recursive:true});
for(const [font,subsets] of [['golos-text',['cyrillic','latin']],['space-grotesk',['latin']]]){
  for(const subset of subsets){const file=`${font}-${subset}-wght-normal.woff2`; await copyFile(`node_modules/@fontsource-variable/${font}/files/${file}`,`public/fonts/${file}`);}
  await copyFile(`node_modules/@fontsource-variable/${font}/LICENSE`,`licenses/${font}-OFL.txt`);
}
console.log('Local WOFF2 and OFL licenses copied.');
