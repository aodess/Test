import {readdir,readFile,writeFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
await mkdir('licenses/dependencies',{recursive:true});
const records=[];
async function inspect(dir){
 let pkg;try{pkg=JSON.parse(await readFile(path.join(dir,'package.json'),'utf8'));}catch{return;}
 if(!pkg.name)return;
 const files=(await readdir(dir)).filter(n=>/^(license|licence|copying|notice)(\.|$)/i.test(n));
 const record={name:pkg.name,version:pkg.version,license:pkg.license||'See package source',notices:[]};
 for(const file of files){try{const text=await readFile(path.join(dir,file),'utf8');const target=`${pkg.name.replaceAll('/','__')}__${file}.txt`;await writeFile('licenses/dependencies/'+target,text);record.notices.push(target);}catch{}}
 records.push(record);
}
for(const e of await readdir('node_modules',{withFileTypes:true})){if(!e.isDirectory()||e.name.startsWith('.'))continue;if(e.name.startsWith('@')){for(const child of await readdir('node_modules/'+e.name)){await inspect(`node_modules/${e.name}/${child}`);}}else await inspect('node_modules/'+e.name);}
await writeFile('licenses/dependencies.json',JSON.stringify(records.sort((a,b)=>a.name.localeCompare(b.name)),null,2));
await writeFile('THIRD_PARTY_NOTICES.md',`# Third-party notices\n\nThe complete installed dependency inventory and preserved license texts are in licenses/.\nGolos Text and Space Grotesk: SIL Open Font License 1.1. Local WOFF2 files include Latin and Cyrillic coverage as needed.\nAstro, React, Three.js, R3F and Drei retain their original notices.\nGSAP and @gsap/react use the GSAP Standard No Charge License, not MIT. Free commercial website use is permitted; visual animation builder restrictions apply.\nOfficial license checked on 2026-10-03: https://gsap.com/community/standard-license/\nNo paid plugins, fonts, models, stock subscriptions or proprietary asset API are used.\nSupplied images 01–07 were provided by the project owner; their original files remain in the owner's Library.\n`);
console.log(`Preserved license inventory for ${records.length} packages.`);
