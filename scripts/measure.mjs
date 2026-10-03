import {chromium} from 'playwright';
import {writeFile} from 'node:fs/promises';
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||'/root/.cache/ms-playwright/chromium_headless_shell-1194/chrome-linux/headless_shell',args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const page=await browser.newPage({viewport:{width:1440,height:1000}});
await page.addInitScript(()=>{
 window.__sfMetrics={frames:[],count:0};
 let rafId=0,lastFrame=-1;
 function clock(){rafId++;requestAnimationFrame(clock)}requestAnimationFrame(clock);
 for(const method of ['drawElements','drawArrays']){
  const original=WebGL2RenderingContext.prototype[method];
  WebGL2RenderingContext.prototype[method]=function(...args){window.__sfMetrics.count++;if(lastFrame!==rafId){window.__sfMetrics.frames.push(performance.now());lastFrame=rafId;}return original.apply(this,args)};
 }
});
await page.goto('http://127.0.0.1:4321/',{waitUntil:'networkidle'});await page.locator('.scene-host[data-ready="true"]').waitFor();await page.waitForTimeout(1500);
const resources=await page.evaluate(()=>performance.getEntriesByType('resource').map(r=>({name:new URL(r.name).pathname,encoded:r.encodedBodySize,type:r.initiatorType})));
const rect=await page.locator('.scene-host').boundingBox();
await page.evaluate(()=>window.__sfMetrics.frames=[]);
for(let i=0;i<45;i++){await page.mouse.move(rect.x+rect.width*(.15+.7*i/45),rect.y+rect.height*.45);await page.waitForTimeout(16)}
const rendered=await page.evaluate(()=>window.__sfMetrics.frames);
const active=rendered.slice(1).map((t,i)=>t-rendered[i]).sort((a,b)=>a-b);
await page.mouse.move(0,0);await page.waitForTimeout(1300);const start=await page.evaluate(()=>window.__sfMetrics.count);await page.waitForTimeout(500);const idle=await page.evaluate(()=>window.__sfMetrics.count)-start;
await page.evaluate(()=>scrollTo({top:document.documentElement.scrollHeight,behavior:"instant"}));await page.waitForTimeout(800);const offscreenStart=await page.evaluate(()=>window.__sfMetrics.count);await page.waitForTimeout(500);const offscreen=await page.evaluate(()=>window.__sfMetrics.count)-offscreenStart;
const out={renderer:'Chromium 141 / SwiftShader software WebGL2; desktop emulation 1440×1000',medianSubmittedFrameIntervalMs:active[Math.floor(active.length/2)],p95SubmittedFrameIntervalMs:active[Math.floor(active.length*.95)],activeFrames:rendered.length,idleDrawCallsIn500ms:idle,offscreenDrawCallsIn500ms:offscreen,resources,notes:'CPU-side draw submission timing, not GPU-presented FPS or physical-device performance. No 60fps guarantee.'};
await writeFile('test-results/performance.json',JSON.stringify(out,null,2));console.log(JSON.stringify({...out,resources:undefined}));
await browser.close();
