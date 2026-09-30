// Oct 25 2026 sim — newsletter graphics in the site's look (Centr palette/type).
//   node tools/newsletter_graphics.js
// → Downloads\Koda Hyrox Sim Oct 25 - Newsletter Graphics\ (4 PNGs, 1200px wide = sharp at 600px email width)
const fs = require('fs');
const path = require('path');
const puppeteer = require('C:/Users/kevsc/Desktop/Claude/hyrox_pdf/node_modules/puppeteer');

const ROOT = path.resolve(__dirname, '..');
const OUT = 'C:/Users/kevsc/Downloads/Koda Hyrox Sim Oct 25 - Newsletter Graphics';
fs.mkdirSync(OUT, { recursive: true });
const URL_TXT = 'koda-crossfit.github.io/hyrox';
const b64 = f => fs.readFileSync(path.join(ROOT, f)).toString('base64');
const img = f => 'data:' + (f.endsWith('.svg') ? 'image/svg+xml' : f.endsWith('.png') ? 'image/png' : 'image/jpeg') + ';base64,' + b64(f);
const G = f => img('assets/gear/' + f);
const LOGO = {
  centrW: img('assets/sponsors/centr-logo-white.svg'), bbW: img('assets/sponsors/boxbasics-logo-white.png'),
  centrK: img('assets/sponsors/centr-logo-black.svg'), bbK: img('assets/sponsors/boxbasics-logo.png'),
};

const BASE_CSS = `
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { width: 1200px; font-family: 'Inter', sans-serif; -webkit-font-smoothing: antialiased; }
  .mono { font-family: 'DM Mono', monospace; font-weight: 500; letter-spacing: .06em; text-transform: uppercase; }
  .disp { font-family: 'Inter Tight', sans-serif; font-weight: 900; text-transform: uppercase; letter-spacing: -.035em; line-height: .9; }
  .hl { background: #FFFF33; color: #1A1818; padding: 2px 12px 0 6px; margin-left: -6px; display: inline-block; }
  .btn { display: inline-flex; align-items: center; gap: 12px; background: #FFFF33; color: #0E0C0C; font-weight: 800; font-size: 26px; text-transform: uppercase; letter-spacing: .02em; padding: 18px 34px; border-radius: 2px; }
  .btn.dark { background: #0E0C0C; color: #fff; } .btn.dark span { color: #FFFF33; }
  .card { background: #fff; overflow: hidden; } .card img { display: block; width: 100%; }
`;
const doc = (css, body, bg) => `<!doctype html><html><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=DM+Mono:wght@500&family=Inter+Tight:wght@800;900&family=Inter:wght@500;600;700;800&display=swap" rel="stylesheet">
<style>${BASE_CSS} body { background: ${bg}; } ${css}</style></head><body><div id="g">${body}</div></body></html>`;

const GRAPHICS = [
  {
    file: '1 - Hero (sign up).png',
    html: doc(`
      #g { position: relative; height: 680px; background: radial-gradient(700px 420px at 86% 34%, rgba(255,255,51,.09), transparent 62%), #1A1818; color: #fff; overflow: hidden; }
      .left { position: absolute; left: 64px; top: 58px; width: 640px; }
      .left .mono { font-size: 19px; color: #E5DDCF; }
      h1 { font-size: 112px; margin: 20px 0 22px; }
      .date { font-family: 'Inter Tight'; font-weight: 900; font-size: 42px; text-transform: uppercase; letter-spacing: -.01em; }
      .sub { font-weight: 700; font-size: 25px; color: #EDEBE7; margin: 10px 0 30px; }
      .url { font-size: 17px; color: #BDB6AC; margin-top: 14px; }
      .hat { position: absolute; right: 44px; top: 70px; width: 440px; }
      .band { position: absolute; right: 190px; top: 392px; width: 360px; padding: 10px; }
      .band2 { position: absolute; right: 44px; top: 452px; width: 250px; padding: 8px; }
      .tag { position: absolute; right: 386px; top: 44px; background: #FFFF33; color: #0E0C0C; font-size: 16px; padding: 9px 13px 8px; z-index: 3; }
      .tag b { display: block; font-family: 'Inter Tight'; font-weight: 900; font-size: 29px; letter-spacing: -.02em; line-height: 1; }
      .by { position: absolute; left: 64px; bottom: 44px; display: flex; align-items: center; gap: 22px; }
      .by img { height: 34px; } .by .x { color: #BDB6AC; font-size: 28px; font-weight: 800; } .by .mono { font-size: 15px; color: #BDB6AC; }
    `, `
      <div class="card hat"><img src="${G('hat-script-black.jpg')}"></div>
      <div class="card band"><img src="${G('headband-black-blue-front.jpg')}"></div>
      <div class="card band2"><img src="${G('headband-mint-front.jpg')}"></div>
      <div class="tag mono">$25 entry<b>Headband or hat</b></div>
      <div class="left">
        <div class="mono">Koda CrossFit Iron View</div>
        <h1 class="disp">Hyrox<br><span class="hl">Simulation</span></h1>
        <div class="date">Sunday, October 25</div>
        <div class="sub">Heats every 10 min · 9:00–11:50 AM</div>
        <span class="btn">Pick your heat →</span>
        <div class="url mono">${URL_TXT}</div>
      </div>
      <div class="by"><span class="mono">Presented by</span><img src="${LOGO.centrW}"><span class="x">×</span><img src="${LOGO.bbW}"></div>
    `, '#1A1818'),
  },
  {
    file: '2 - Gear lineup (headband or hat).png',
    html: doc(`
      #g { background: #EDEBE7; color: #1A1818; padding: 56px 60px 52px; }
      .mono.top { font-size: 18px; color: #5E5954; }
      h1 { font-size: 92px; margin: 14px 0 34px; }
      .row { display: grid; gap: 14px; }
      .bands { grid-template-columns: repeat(3, 1fr); }
      .hats { grid-template-columns: repeat(3, 1fr); margin-top: 14px; }
      .tile { background: #fff; padding: 12px 12px 14px; }
      .tile img { width: 100%; display: block; }
      .bands .tile img { aspect-ratio: 2 / 1; object-fit: cover; }
      .hats .tile img { aspect-ratio: 4 / 3; object-fit: cover; }
      .nm { font-family: 'Inter Tight'; font-weight: 900; text-transform: uppercase; font-size: 21px; letter-spacing: -.01em; margin-top: 10px; }
      .sb { font-size: 16px; color: #5E5954; }
      .foot { display: flex; align-items: center; justify-content: space-between; margin-top: 34px; gap: 20px; }
      .foot .txt { font-size: 22px; font-weight: 600; } .foot .txt b { font-weight: 800; }
      .url { font-size: 16px; color: #5E5954; margin-top: 10px; text-align: right; }
    `, `
      <div class="mono top">Hyrox Simulation · Sunday, Oct 25 · $25 entry</div>
      <h1 class="disp">Every athlete<br>takes home <span class="hl">gear</span></h1>
      <div class="row bands">
        <div class="tile"><img src="${G('headband-black-blue-front.jpg')}"><div class="nm">Black / Blue</div><div class="sb">Headband</div></div>
        <div class="tile"><img src="${G('headband-mint-front.jpg')}"><div class="nm">Jelly Mint</div><div class="sb">Headband</div></div>
        <div class="tile"><img src="${G('headband-camo-front.jpg')}"><div class="nm">Black Ops Camo</div><div class="sb">Headband · + 3 more designs</div></div>
      </div>
      <div class="row hats">
        <div class="tile"><img src="${G('hat-script-black.jpg')}"><div class="nm">Koda Script</div><div class="sb">Hat · 4 colors</div></div>
        <div class="tile"><img src="${G('hat-sunset-moss.jpg')}"><div class="nm">Sunset Peak</div><div class="sb">Hat · 4 colors</div></div>
        <div class="tile"><img src="${G('hat-mountain-graphite.jpg')}"><div class="nm">Koda Mountains</div><div class="sb">Hat · 4 colors</div></div>
      </div>
      <div class="foot">
        <div class="txt"><b>Headband or hat — your pick.</b><br>6 headband designs · 3 hat patches × 4 colors</div>
        <div><span class="btn dark">Sign up <span>→</span></span><div class="url mono">${URL_TXT}</div></div>
      </div>
    `, '#EDEBE7'),
  },
  {
    file: '3 - Sponsors (thank you).png',
    html: doc(`
      #g { background: #FFFF33; color: #0E0C0C; padding: 58px 60px 56px; }
      .mono.top { font-size: 18px; }
      h1 { font-size: 96px; margin: 14px 0 40px; }
      .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
      .sp { background: #1A1818; color: #fff; padding: 40px 36px 36px; }
      .sp img { height: 50px; display: block; margin-bottom: 22px; }
      .sp .role { font-size: 15px; color: #FFFF33; margin-bottom: 14px; }
      .sp p { font-size: 21px; line-height: 1.5; color: #EDEBE7; }
      .foot { margin-top: 30px; font-size: 22px; font-weight: 700; }
    `, `
      <div class="mono top">Hyrox Simulation · Sunday, October 25 · Koda CrossFit Iron View</div>
      <h1 class="disp">Thank you to<br>our sponsors</h1>
      <div class="grid">
        <div class="sp"><img src="${LOGO.centrW}"><div class="mono role">Presenting sponsor · Centr Equipment</div><p>Official HYROX competition equipment — built so you can train like you race.</p></div>
        <div class="sp"><img src="${LOGO.bbW}"><div class="mono role">Presenting sponsor · Box Basics</div><p>Training shoes, apparel and gear for your box — show up ready on race day.</p></div>
      </div>
      <div class="foot">Sign up for a heat: ${URL_TXT}</div>
    `, '#FFFF33'),
  },
  {
    file: '4 - Race details.png',
    html: doc(`
      #g { background: #1A1818; color: #fff; padding: 56px 60px 50px; }
      .mono.top { font-size: 18px; color: #E5DDCF; }
      h1 { font-size: 96px; margin: 14px 0 38px; }
      .facts { display: grid; grid-template-columns: 1fr 1fr; gap: 0 40px; }
      .f { border-top: 1px solid rgba(223,213,195,.28); padding: 20px 0 22px; }
      .f .mono { font-size: 15px; color: #FFFF33; display: block; margin-bottom: 6px; }
      .f b { display: block; font-family: 'Inter Tight'; font-weight: 800; font-size: 34px; letter-spacing: -.015em; line-height: 1.1; }
      .f span.s { display: block; font-size: 19px; color: #BDB6AC; margin-top: 6px; }
      .foot { display: flex; align-items: center; justify-content: space-between; gap: 24px; margin-top: 30px; border-top: 1px solid rgba(223,213,195,.28); padding-top: 30px; }
      .by { display: flex; align-items: center; gap: 20px; } .by img { height: 30px; } .by .x { color: #BDB6AC; font-size: 24px; font-weight: 800; }
      .by .mono { font-size: 14px; color: #BDB6AC; }
      .url { font-size: 15px; color: #BDB6AC; margin-top: 10px; text-align: right; }
    `, `
      <div class="mono top">Koda CrossFit Iron View · Louisville, CO</div>
      <h1 class="disp">Hyrox <span class="hl">Simulation</span></h1>
      <div class="facts">
        <div class="f"><span class="mono">When</span><b>Sunday, October 25</b><span class="s">Heats every 10 min · 9:00–11:50 AM</span></div>
        <div class="f"><span class="mono">Where</span><b>740 S Pierce Ave</b><span class="s">Louisville, CO</span></div>
        <div class="f"><span class="mono">Divisions</span><b>Singles · Doubles · Relay</b><span class="s">Pro, Open or Scaled weights</span></div>
        <div class="f"><span class="mono">Entry</span><b>$25 per athlete</b><span class="s">Includes a custom headband or hat</span></div>
      </div>
      <div class="foot">
        <div class="by"><span class="mono">Presented by</span><img src="${LOGO.centrW}"><span class="x">×</span><img src="${LOGO.bbW}"></div>
        <div><span class="btn">Pick your heat →</span><div class="url mono">${URL_TXT}</div></div>
      </div>
    `, '#1A1818'),
  },
];

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  await page.setViewport({ width: 1200, height: 800, deviceScaleFactor: 1 });
  for (const g of GRAPHICS) {
    await page.setContent(g.html, { waitUntil: 'load', timeout: 90000 });
    await page.evaluate(() => document.fonts.ready);
    const el = await page.$('#g');
    await el.screenshot({ path: path.join(OUT, g.file) });
    const box = await el.boundingBox();
    console.log(g.file, Math.round(box.width) + 'x' + Math.round(box.height), Math.round(fs.statSync(path.join(OUT, g.file)).size / 1024) + ' KB');
  }
  await browser.close();
  console.log('→ ' + OUT);
})();
