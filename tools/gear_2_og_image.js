// Oct 25 2026 sim — link-preview card (og:image) for texts / Instagram / Facebook.
//   node tools/gear_2_og_image.js   → assets/og-oct25.jpg (1200x630)
const fs = require('fs');
const path = require('path');
const puppeteer = require('C:/Users/kevsc/Desktop/Claude/hyrox_pdf/node_modules/puppeteer');

const ROOT = path.resolve(__dirname, '..');
const b64 = f => fs.readFileSync(path.join(ROOT, f)).toString('base64');
const img = (f, type) => `data:${type};base64,${b64(f)}`;

const html = `<!doctype html><html><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=DM+Mono:wght@500&family=Inter+Tight:wght@800;900&display=swap" rel="stylesheet">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { width: 1200px; height: 630px; background: #1A1818; color: #fff; font-family: 'Inter Tight', sans-serif; overflow: hidden; position: relative; }
  .glow { position: absolute; inset: 0; background: radial-gradient(700px 420px at 88% 38%, rgba(255,255,51,0.09), transparent 62%); }
  .left { position: absolute; left: 64px; top: 58px; width: 620px; }
  .mono { font-family: 'DM Mono', monospace; font-size: 20px; letter-spacing: 0.06em; text-transform: uppercase; color: #E5DDCF; }
  h1 { font-weight: 900; text-transform: uppercase; font-size: 108px; line-height: 0.9; letter-spacing: -0.035em; margin: 22px 0 24px; }
  .hl { background: #FFFF33; color: #1A1818; padding: 2px 12px 0 6px; margin-left: -6px; display: inline-block; }
  .date { font-weight: 900; font-size: 40px; text-transform: uppercase; letter-spacing: -0.01em; }
  .sub { font-weight: 800; font-size: 26px; color: #EDEBE7; margin-top: 10px; }
  .by { position: absolute; left: 64px; bottom: 50px; display: flex; align-items: center; gap: 24px; }
  .by img { height: 36px; }
  .by .x { color: #BDB6AC; font-size: 28px; font-weight: 800; }
  .card { position: absolute; background: #fff; box-shadow: 0 24px 60px rgba(0,0,0,0.5); }
  .card img { display: block; width: 100%; }
  .hat { width: 470px; right: 40px; top: 44px; transform: rotate(3deg); }
  .band { width: 380px; right: 250px; top: 330px; transform: rotate(-4deg); padding: 10px; }
  .band2 { width: 270px; right: 40px; top: 400px; transform: rotate(5deg); padding: 8px; }
  .tag { position: absolute; right: 360px; top: 44px; background: #FFFF33; color: #0E0C0C; font-family: 'DM Mono', monospace; font-size: 16px;
         letter-spacing: 0.05em; text-transform: uppercase; padding: 9px 13px 8px; transform: rotate(-3deg); box-shadow: 0 10px 24px rgba(0,0,0,0.35); z-index: 3; }
  .tag b { display: block; font-family: 'Inter Tight'; font-weight: 900; font-size: 30px; letter-spacing: -0.02em; line-height: 1; }
</style></head><body>
  <div class="glow"></div>
  <div class="card hat"><img src="${img('assets/gear/hat-sunset-moss.jpg', 'image/jpeg')}"></div>
  <div class="card band"><img src="${img('assets/gear/headband-camo-front.jpg', 'image/jpeg')}"></div>
  <div class="card band2"><img src="${img('assets/gear/headband-black-blue-front.jpg', 'image/jpeg')}"></div>
  <div class="tag">$25 entry<b>Headband or hat</b></div>
  <div class="left">
    <div class="mono">Koda CrossFit Iron View</div>
    <h1>Hyrox<br><span class="hl">Simulation</span></h1>
    <div class="date">Sunday, October 25</div>
    <div class="sub">Heats every 10 min · 9:00–11:50 AM</div>
  </div>
  <div class="by">
    <span class="mono" style="font-size:16px;color:#BDB6AC">Presented by</span>
    <img src="${img('assets/sponsors/centr-logo-white.svg', 'image/svg+xml')}">
    <span class="x">×</span>
    <img src="${img('assets/sponsors/boxbasics-logo-white.png', 'image/png')}">
  </div>
</body></html>`;

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  await page.setViewport({ width: 1200, height: 630 });
  await page.setContent(html, { waitUntil: 'networkidle0' });
  await page.evaluate(() => document.fonts.ready);
  const out = path.join(ROOT, 'assets', 'og-oct25.jpg');
  await page.screenshot({ path: out, type: 'jpeg', quality: 88 });
  await browser.close();
  console.log(out, Math.round(fs.statSync(out).size / 1024) + ' KB');
})();
