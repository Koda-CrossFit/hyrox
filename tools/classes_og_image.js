// Free classes page (classes.html) — link-preview card (og:image) for texts / Instagram / Facebook.
//   node tools/classes_og_image.js   → assets/og-classes.jpg (1200x630)
const fs = require('fs');
const path = require('path');
const puppeteer = require('C:/Users/kevsc/Desktop/Claude/hyrox_pdf/node_modules/puppeteer');

const ROOT = path.resolve(__dirname, '..');
const mark = 'data:image/png;base64,' + fs.readFileSync(path.join(ROOT, 'assets/koda-mark.png')).toString('base64');

const html = `<!doctype html><html><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=DM+Mono:wght@500&family=Inter+Tight:wght@800;900&display=swap" rel="stylesheet">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { width: 1200px; height: 630px; background: #1A1818; color: #fff; font-family: 'Inter Tight', sans-serif; overflow: hidden; position: relative; }
  .glow { position: absolute; inset: 0; background: radial-gradient(700px 420px at 86% 40%, rgba(255,255,51,0.09), transparent 62%); }
  .bgword { position: absolute; right: -30px; bottom: -70px; font-weight: 900; font-size: 380px; line-height: 0.8; letter-spacing: -0.05em;
            color: transparent; -webkit-text-stroke: 2px rgba(223,213,195,0.10); }
  .left { position: absolute; left: 64px; top: 60px; width: 760px; }
  .mono { font-family: 'DM Mono', monospace; font-size: 21px; letter-spacing: 0.06em; text-transform: uppercase; color: #E5DDCF; }
  h1 { font-weight: 900; text-transform: uppercase; font-size: 150px; line-height: 0.88; letter-spacing: -0.035em; margin: 26px 0 30px; }
  .hl { background: #FFFF33; color: #1A1818; padding: 4px 16px 0 8px; margin-left: -8px; display: inline-block; }
  .date { font-weight: 900; font-size: 44px; text-transform: uppercase; letter-spacing: -0.01em; }
  .sub { font-weight: 800; font-size: 28px; color: #EDEBE7; margin-top: 12px; }
  .brand { position: absolute; right: 64px; top: 58px; display: flex; align-items: center; gap: 14px; font-weight: 800; font-size: 24px; text-transform: uppercase; letter-spacing: 0.02em; }
  .brand img { width: 52px; filter: brightness(0) invert(1); }
</style></head><body>
  <div class="glow"></div>
  <div class="bgword">KODA</div>
  <div class="brand"><img src="${mark}">Koda CrossFit Iron View</div>
  <div class="left">
    <div class="mono">For our Hyrox Simulation athletes</div>
    <h1>3 Free<br><span class="hl">Classes</span></h1>
    <div class="date">Now through Monday, Nov 30</div>
    <div class="sub">HYROX · CrossFit · and more — pick yours</div>
  </div>
</body></html>`;

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  await page.setViewport({ width: 1200, height: 630 });
  await page.setContent(html, { waitUntil: 'networkidle0' });
  await page.evaluate(() => document.fonts.ready);
  const out = path.join(ROOT, 'assets', 'og-classes.jpg');
  await page.screenshot({ path: out, type: 'jpeg', quality: 88 });
  await browser.close();
  console.log('wrote ' + out);
})().catch(e => { console.error(e); process.exit(1); });
