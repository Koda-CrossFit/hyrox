// Oct 25 2026 sim — the "HYROX SIM · WEIGHT OPTIONS" reference graphic with
// the Oct 25 date. Same source + loads as the June/Sept graphic
// (Desktop/Claude/hyrox_pdf/weights.html); only the date pill changes.
//   node tools/gear_3_weights_graphic.js  → assets/hyrox-sim-weights-oct25.jpg
const fs = require('fs');
const path = require('path');
const puppeteer = require('C:/Users/kevsc/Desktop/Claude/hyrox_pdf/node_modules/puppeteer');

const SRC = 'C:/Users/kevsc/Desktop/Claude/hyrox_pdf/weights.html';
const OUT = path.resolve(__dirname, '..', 'assets', 'hyrox-sim-weights-oct25.jpg');
const WIDTH = +(process.argv[2] || 1900);

(async () => {
  let html = fs.readFileSync(SRC, 'utf8');
  if (!html.includes('JUNE 7, 2026')) throw new Error('date string not found in ' + SRC);
  html = html.replace(/JUNE 7, 2026/g, 'OCTOBER 25, 2026');
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  await page.setViewport({ width: WIDTH, height: 800, deviceScaleFactor: 2 });
  await page.setContent(html, { waitUntil: 'networkidle0' });
  await page.evaluate(() => document.fonts.ready);
  const box = await page.evaluate(() => { let r = 0, b = 0; document.body.querySelectorAll('*').forEach(e => { const q = e.getBoundingClientRect(); if (q.width && q.height) { r = Math.max(r, q.right); b = Math.max(b, q.bottom); } }); return { w: Math.ceil(r), h: Math.ceil(Math.max(b, document.body.scrollHeight)) }; });
  const w = Math.min(WIDTH, box.w), h = box.h;
  await page.setViewport({ width: WIDTH, height: h, deviceScaleFactor: 2 });
  await page.screenshot({ path: OUT, type: 'jpeg', quality: 88, clip: { x: 0, y: 0, width: w, height: h } });
  await browser.close();
  console.log(OUT, w * 2 + 'x' + h * 2, Math.round(fs.statSync(OUT).size / 1024) + ' KB');
})();
