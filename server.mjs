import http from 'node:http';
import {createReadStream} from 'node:fs';
import {stat} from 'node:fs/promises';
import path from 'node:path';
const root=path.resolve('dist');
const types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp','.avif':'image/avif','.woff2':'font/woff2','.txt':'text/plain; charset=utf-8','.ico':'image/x-icon'};
const server=http.createServer(async(req,res)=>{
  res.setHeader('X-Content-Type-Options','nosniff');
  res.setHeader('Referrer-Policy','strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy','camera=(), microphone=(), geolocation=()');
  if(req.method!=='GET'&&req.method!=='HEAD'){res.writeHead(405,{'Allow':'GET, HEAD'});return res.end('Method not allowed');}
  let pathname;try{pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);}catch{res.writeHead(400);return res.end('Bad request');}
  if(pathname==='/health'){res.writeHead(200,{'Content-Type':'application/json','Cache-Control':'no-store'});return res.end(req.method==='HEAD'?undefined:JSON.stringify({status:'ok',service:'sprayform-portfolio'}));}
  if(pathname.includes('\0')){res.writeHead(400);return res.end('Bad request');}
  let file=path.resolve(root,'.'+pathname);
  if(file!==root&&!file.startsWith(root+path.sep)){res.writeHead(403);return res.end('Forbidden');}
  try{
    let info=await stat(file);if(info.isDirectory()){file=path.join(file,'index.html');info=await stat(file);}if(!info.isFile())throw Error('Not a file');
    const contentType=types[path.extname(file)]||'application/octet-stream';
    const accepts=req.headers['accept-encoding']||'';
    res.setHeader('Vary','Accept-Encoding');
    for(const [encoding,suffix] of [['br','.br'],['gzip','.gz']]){
      if(!new RegExp(`\\b${encoding}\\b(?!;q=0(?:\\D|$))`).test(accepts))continue;
      try{const compressed=await stat(file+suffix);file+=suffix;info=compressed;res.setHeader('Content-Encoding',encoding);break;}catch{}
    }
    const etag=`W/"${info.size}-${Math.floor(info.mtimeMs)}"`;
    res.setHeader('ETag',etag);res.setHeader('Content-Type',contentType);
    res.setHeader('Cache-Control',pathname.startsWith('/_astro/')?'public, max-age=31536000, immutable':/\.(woff2|avif|webp|png|svg)$/.test(file)?'public, max-age=86400':'public, max-age=0, must-revalidate');
    if(req.headers['if-none-match']===etag){res.writeHead(304);return res.end();}
    res.setHeader('Content-Length',info.size);res.writeHead(200);
    if(req.method==='HEAD')return res.end();
    createReadStream(file).on('error',()=>res.destroy()).pipe(res);
  }catch{res.writeHead(404,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'});res.end(req.method==='HEAD'?undefined:'<!doctype html><html lang="ru"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>404 — SPRAYFORM</title><body style="background:#181a1b;color:#f2ebdd;font:18px system-ui;padding:10vw"><h1>Здесь пока чистая стена.</h1><p>Страница не найдена.</p><a style="color:#d6f36a" href="/">Вернуться к SPRAYFORM</a></body></html>');}
});
server.listen(Number(process.env.PORT)||4321,'0.0.0.0',()=>console.log(`SPRAYFORM listening on ${Number(process.env.PORT)||4321}`));
process.on('SIGTERM',()=>server.close(()=>process.exit(0)));
