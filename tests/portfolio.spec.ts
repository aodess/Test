import {test,expect} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
for(const [width,height] of [[360,800],[390,844],[768,1024],[1440,1000],[844,390],[1024,768]]){
 test(`Layout and navigation ${width}×${height}`,async({page})=>{
  await page.setViewportSize({width,height});
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('/');await expect(page.locator('h1')).toHaveText(/Сайты\s*с характером\./);
  await page.locator('.scene-host[data-ready="true"]').waitFor({timeout:15000});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.getByRole('link',{name:'Посмотреть работы',exact:true}).click();await expect(page).toHaveURL(/#work$/);
  await expect(page.locator('#work')).toBeInViewport();
  await page.locator('header').getByRole('link',{name:'Подход',exact:true}).click();await expect(page).toHaveURL(/#approach$/);
  await page.locator('header').getByRole('link',{name:'Контакт',exact:true}).click();await expect(page).toHaveURL(/#contact$/);
  await page.getByRole('button',{name:'Обсудить проект',exact:true}).click();await expect(page.locator('#contact-dialog')).toBeVisible();
  await expect(page.locator('#contact-dialog')).toContainText('Заявка не отправлена');await page.getByRole('button',{name:'Понятно'}).click();await expect(page.locator('#contact-dialog')).not.toBeVisible();
  expect(errors).toEqual([]);
 });
}
test('Project dialogs: keyboard, focus restoration, scroll lock and genuine links',async({page})=>{
 await page.goto('/');
 for(const id of ['pulse','form','orbit']){
  const link=page.locator(`[data-project="${id}"]`);await link.focus();await page.keyboard.press('Enter');
  const dialog=page.locator(`#modal-${id}`);await expect(dialog).toBeVisible();await expect(dialog.getByRole('button',{name:'Закрыть описание проекта'})).toBeFocused();
  expect(await page.evaluate(()=>document.body.style.position)).toBe('fixed');
  await page.keyboard.press('Tab');expect(await page.evaluate(()=>!!document.activeElement?.closest('dialog'))).toBe(true);await page.keyboard.press('Shift+Tab');expect(await page.evaluate(()=>!!document.activeElement?.closest('dialog'))).toBe(true);
  await page.keyboard.press('Escape');await expect(dialog).not.toBeVisible();await expect(link).toBeFocused();
  await expect.poll(()=>page.evaluate(()=>document.body.style.position)).toBe('');
 }
 await page.locator('[data-project="orbit"]').click();await page.getByRole('button',{name:'Закрыть описание проекта'}).click();await expect(page.locator('#modal-orbit')).not.toBeVisible();
});
test('Accessibility: main page and open dialogs',async({page})=>{
 await page.goto('/');await page.waitForTimeout(1500);
 const violations=(await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze()).violations;
 expect(violations).toEqual([]);
 await page.locator('[data-project="form"]').click();expect((await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze()).violations).toEqual([]);
});
test('Reduced motion, fallback and no JavaScript',async({browser})=>{
 const reduced=await browser.newContext({reducedMotion:'reduce'});const page=await reduced.newPage();await page.goto('/');
 await page.locator('.scene-host[data-ready="true"]').waitFor();expect(await page.evaluate(()=>matchMedia('(prefers-reduced-motion: reduce)').matches)).toBe(true);
 const before=await page.locator('canvas').screenshot();await page.mouse.move(450,250);await page.waitForTimeout(150);expect(await page.locator('canvas').screenshot()).toEqual(before);await reduced.close();
 const context=await browser.newContext();const fallback=await context.newPage();
 await fallback.addInitScript(()=>{const original=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(this:HTMLCanvasElement,type:string,...args:unknown[]){if(type.startsWith('webgl'))return null;return original.call(this,type,...args as [])} as typeof original;});
 await fallback.goto('/');await expect(fallback.locator('h1')).toBeVisible();await expect(fallback.locator('.scene-fallback img')).toBeVisible();expect(await fallback.locator('canvas').count()).toBe(0);await fallback.locator('[data-project="pulse"]').click();await expect(fallback.locator('#modal-pulse')).toBeVisible();await context.close();
 const nojs=await browser.newContext({javaScriptEnabled:false});const staticPage=await nojs.newPage();await staticPage.goto('/');await expect(staticPage.locator('h1')).toBeVisible();await staticPage.locator('[data-project="pulse"]').click();await expect(staticPage).toHaveURL(/\/projects\/pulse\/$/);await expect(staticPage.getByRole('heading',{name:'Задача'})).toBeVisible();await nojs.close();
});
test('Touch surface keeps vertical panning, pinch zoom and cancel',async({browser})=>{
 const context=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true});const page=await context.newPage();await page.goto('/');await page.locator('.scene-host[data-ready="true"]').waitFor();
 expect(await page.locator('.scene-host').evaluate(el=>getComputedStyle(el).touchAction)).toContain('pan-y');
 expect(await page.locator('meta[name="viewport"]').getAttribute('content')).not.toMatch(/maximum-scale|user-scalable=no/);
 await page.locator('.scene-host').dispatchEvent('pointerdown',{pointerId:4,pointerType:'touch',clientX:160,clientY:200});await page.locator('.scene-host').dispatchEvent('pointermove',{pointerId:4,pointerType:'touch',clientX:230,clientY:202});await page.locator('.scene-host').dispatchEvent('pointercancel',{pointerId:4,pointerType:'touch'});
 await page.mouse.wheel(0,600);await page.waitForTimeout(200);expect(await page.evaluate(()=>scrollY)).toBeGreaterThan(0);await context.close();
});
test('Production server: MIME, 404, health and caching',async({request})=>{
 expect((await request.get('/health')).status()).toBe(200);expect((await request.get('/missing-file')).status()).toBe(404);
 const font=await request.get('/fonts/golos-text-cyrillic-wght-normal.woff2');expect(font.headers()['content-type']).toBe('font/woff2');
 const img=await request.get('/assets/pulse-480.avif');expect(img.headers()['content-type']).toBe('image/avif');
 const html=await request.get('/');expect(html.headers()['content-type']).toContain('text/html');expect((await request.get('/',{headers:{'If-None-Match':html.headers().etag}})).status()).toBe(304);
});
