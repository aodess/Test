import {readdir,readFile,writeFile} from 'node:fs/promises';
import {gzipSync,brotliCompressSync,constants} from 'node:zlib';
async function walk(dir){for(const entry of await readdir(dir,{withFileTypes:true})){const p=dir+'/'+entry.name;if(entry.isDirectory())await walk(p);else if(/\.(js|css|html|json|svg)$/.test(p)){const buffer=await readFile(p);if(buffer.length<1024)continue;await writeFile(p+'.br',brotliCompressSync(buffer,{params:{[constants.BROTLI_PARAM_QUALITY]:9}}));await writeFile(p+'.gz',gzipSync(buffer,{level:9}));}}}
await walk('dist');console.log('Production text assets precompressed (Brotli + gzip).');
