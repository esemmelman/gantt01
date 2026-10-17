const { chromium } = require('@playwright/test');
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs');
const server = http.createServer((req,res)=>{const file=req.url==='/'?'index.html':req.url.slice(1);if(!['index.html','app.js','style.css'].includes(file)){res.writeHead(404).end();return;}res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':'text/html');res.end(fs.readFileSync(file));});
(async()=>{await new Promise(r=>server.listen(0,r));const browser=await chromium.launch({headless:true,channel:'msedge'});const page=await browser.newPage({viewport:{width:1440,height:1000}});let failures=[];page.on('pageerror',e=>failures.push(e.message));
try{
 await page.goto(process.env.TEST_URL||'http://localhost:'+server.address().port);await page.waitForFunction(()=>document.querySelector('#status').textContent==='All changes saved');
 const baseline=await page.locator('.task-row').count();assert(baseline>=8);
 await page.locator('[data-toggle]').first().click();assert(await page.locator('.task-row').count()<baseline);await page.locator('#expand').click();assert.equal(await page.locator('.task-row').count(),baseline);
 await page.locator('#search').fill('Stakeholder');assert.equal(await page.locator('.task-row').count(),4);await page.locator('#search').fill('');
 await page.locator('#add').click();await page.locator('[name=title]').fill('Verification task');await page.locator('[name=progress]').fill('45');await page.locator('#save').click();await page.waitForFunction(n=>document.querySelectorAll('.task-row').length===n,baseline+1);
 await page.reload();await page.getByRole('button',{name:'Verification task',exact:true}).click();assert.equal(await page.locator('[name=progress]').inputValue(),'45');await page.locator('[name=title]').fill('Verified persistence');await page.locator('#save').click();await page.getByRole('button',{name:'Verified persistence',exact:true}).waitFor();
 const bar=page.locator('.bar').last();const before=await bar.getAttribute('title');const box=await bar.boundingBox();await page.mouse.move(box.x+20,box.y+12);await page.mouse.down();await page.mouse.move(box.x+92,box.y+12,{steps:8});await page.mouse.up();await page.waitForFunction(()=>document.querySelector('#status').textContent==='All changes saved');await page.waitForTimeout(500);assert.notEqual(await page.locator('.bar').last().getAttribute('title'),before);
 await page.getByRole('button',{name:'Verified persistence',exact:true}).click();page.once('dialog',d=>d.accept());await page.locator('#delete').click();await page.waitForFunction(n=>document.querySelectorAll('.task-row').length===n,baseline);
 await page.locator('#zoom').selectOption('18');await page.locator('#today').click();const download=page.waitForEvent('download');await page.locator('#export').click();assert.equal((await download).suggestedFilename(),'gantt-tasks.csv');
 await page.screenshot({path:'desktop-preview.png',fullPage:true});await page.setViewportSize({width:390,height:844});await page.screenshot({path:'mobile-preview.png',fullPage:true});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),true);
 assert.deepEqual(failures,[]);console.log('PASS: load, collapse, four-level search, create, edit, persistence, drag, delete, zoom, CSV, mobile layout; no JS errors.');
}finally{await browser.close();server.close();}})().catch(e=>{console.error(e);process.exitCode=1;});

