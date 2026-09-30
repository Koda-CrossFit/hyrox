// Oct 25 2026 sim — shareable "Weight Options" graphic, rendered from the SAME
// chart the signup page shows (#weightsChart in index.html), so the two can
// never disagree. Adds an event title band on top.
//   node tools/gear_3_weights_graphic.js  → Downloads\Koda Hyrox Sim Oct 25 - Weight Options.png
const fs = require('fs');
const path = require('path');
const http = require('http');
const puppeteer = require('C:/Users/kevsc/Desktop/Claude/hyrox_pdf/node_modules/puppeteer');

const ROOT = path.resolve(__dirname, '..');
const OUT = 'C:/Users/kevsc/Downloads/Koda Hyrox Sim Oct 25 - Weight Options.png';
const TYPES = { '.html': 'text/html', '.jpg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml' };

(async () => {
  const srv = http.createServer((q, r) => {
    const u = decodeURIComponent(q.url.split('?')[0]);
    const p = path.join(ROOT, u === '/' ? 'index.html' : u);
    fs.readFile(p, (e, b) => {
      if (e) { r.writeHead(404); return r.end(); }
      r.writeHead(200, { 'Content-Type': TYPES[path.extname(p)] || 'application/octet-stream' });
      r.end(b);
    });
  }).listen(0);
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  await page.setViewport({ width: 1160, height: 900, deviceScaleFactor: 2 });
  await page.setRequestInterception(true);
  page.on('request', r => r.url().includes('script.google.com')
    ? r.respond({ status: 200, contentType: 'application/json', body: '{"status":"ok","counts":{},"slotCaps":{}}' })
    : r.continue());
  await page.goto('http://localhost:' + srv.address().port + '/', { waitUntil: 'networkidle0' });
  await page.evaluate(() => document.fonts.ready);
  // Stand the chart alone on the page, wider, with an event title band.
  await page.evaluate(() => {
    const chart = document.getElementById('weightsChart').cloneNode(true);
    document.body.innerHTML = '';
    document.body.style.background = '#1A1818';
    const wrap = document.createElement('div');
    wrap.id = 'shot';
    wrap.style.cssText = 'width:1080px;padding:40px 44px 34px;background:#1A1818;';
    wrap.innerHTML =
      '<div style="font-family:var(--mono);font-size:15px;letter-spacing:.06em;text-transform:uppercase;color:#E5DDCF">Koda CrossFit Iron View · Sunday, October 25 · Presented by Centr × Box Basics</div>' +
      '<div style="font-family:var(--display);font-weight:900;font-size:64px;line-height:.95;letter-spacing:-.03em;text-transform:uppercase;color:#fff;margin:14px 0 26px">Hyrox Sim · <span class="hl">Weight options</span></div>';
    chart.style.marginTop = '0';
    chart.style.padding = '0';
    chart.querySelector('.wt-title').remove();
    wrap.appendChild(chart);
    document.body.appendChild(wrap);
  });
  const el = await page.$('#shot');
  await el.screenshot({ path: OUT });
  await browser.close();
  srv.close();
  console.log(OUT, Math.round(fs.statSync(OUT).size / 1024) + ' KB');
})();
