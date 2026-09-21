// render.js — render the member / non-member class-time graphics (PNG + JPEG) from results.json
const fs = require('fs');
const path = require('path');
const puppeteer = require('C:/Users/kevsc/Desktop/Claude/hyrox_pdf/node_modules/puppeteer');
const SP = process.argv[2] || __dirname;
const OUT = process.argv[3] || SP;
fs.mkdirSync(OUT, { recursive: true });
const R = JSON.parse(fs.readFileSync(path.join(SP, 'results.json'), 'utf8'));
const mark = 'data:image/png;base64,' + fs.readFileSync('C:/Users/kevsc/Desktop/Claude/hyrox-simulation-signup/assets/koda-mark.png').toString('base64');

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
const AM = ['5am', '5:30am', '6am', '6:30am', '7am'], PM = ['4pm', '4:30pm', '5pm', '5:30pm', '6pm'];
const TIMES = AM.concat(PM);

const lerp = (a, b, t) => Math.round(a + (b - a) * t);
const hex = (r, g, b) => '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('');
function cellStyle(v, max) {
  if (!v) return 'background:#111507;color:#5a5a5a';
  const t = Math.pow(v / max, 0.9);
  const bg = hex(lerp(24, 214, t), lerp(33, 255, t), lerp(8, 63, t));
  return 'background:' + bg + ';color:' + (t >= 0.45 ? '#0a0a0a' : '#f0f0f0');
}
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');

function page(T, title, sub, note) {
  const max = Math.max(1, ...TIMES.flatMap(t => DAYS.map(d => T.grid[t][d])));
  const maxPeople = Math.max(1, ...TIMES.map(t => T.byTime[t]));
  const rows = (list, label) => '<tr class="g"><th colspan="6">' + label + '</th></tr>' + list.map(t =>
    '<tr><th class="t">' + t + '</th>' + DAYS.map(d => '<td style="' + cellStyle(T.grid[t][d], max) + '">' + (T.grid[t][d] || '·') + '</td>').join('') + '</tr>').join('');
  const bars = (list, label) => '<div class="h">' + label + '</div>' + list.slice().sort((a, b) => T.byTime[b] - T.byTime[a] || list.indexOf(a) - list.indexOf(b)).map(t =>
    '<div class="r"><div class="n">' + t + '</div><div class="bw"><div class="b" style="width:' + Math.round(T.byTime[t] / maxPeople * 100) + '%"></div></div><div class="v">' + T.byTime[t] + '</div></div>').join('');
  const pick = (o) => o.times.length >= 3
    ? { v: 'NO CLEAR PICK', s: o.times.join(', ') + ' tie at ' + o.n + ' of ' + T.people }
    : { v: o.times.join(' · '), s: o.n + ' of ' + T.people + ' people' + (o.times.length > 1 ? ' each' : '') };
  const am = pick(T.topAM), pm = pick(T.topPM);
  const day = T.topDay.days.length >= 3
    ? { v: 'NO CLEAR PICK', s: T.topDay.days.join(', ') + ' tie at ' + T.topDay.n + ' of ' + T.people }
    : { v: T.topDay.days.join(' · '), s: T.topDay.n + ' of ' + T.people + (T.topDay.days.length > 1 ? ' people each' : ' picked a ' + T.topDay.days[0] + ' time') };
  const legend = [0.15, 0.4, 0.65, 1].map(t => { const v = Math.max(1, Math.round(t * max)); return '<i style="' + cellStyle(v, max) + '"></i>'; }).join('');
  return `<!DOCTYPE html><html><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<style>
:root{--bg:#0a0a0a;--panel:#141414;--border:#2a2a2a;--text:#f5f5f5;--muted:#9a9a9a;--accent:#d6ff3f}
*{box-sizing:border-box;margin:0;padding:0}
body{background:var(--bg);color:var(--text);font-family:Inter,sans-serif;width:1200px}
.wrap{padding:52px 60px 40px}
.top{display:flex;align-items:center;justify-content:space-between}
.mark{width:60px;filter:brightness(0) invert(1)}
.eyebrow{font-family:'Bebas Neue';letter-spacing:.25em;font-size:17px;color:var(--accent);border:1px solid var(--accent);border-radius:999px;padding:6px 14px}
h1{font-family:'Bebas Neue';font-weight:400;font-size:74px;letter-spacing:.04em;line-height:1;margin:22px 0 8px}
h1 .a{color:var(--accent)}
.sub{color:var(--muted);font-size:21px;margin-bottom:30px}
.cards{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px;margin-bottom:32px}
.card{background:var(--panel);border:1px solid var(--border);border-radius:14px;padding:18px 22px}
.card .l{font-size:13px;letter-spacing:.1em;text-transform:uppercase;color:var(--muted);font-weight:600;margin-bottom:6px}
.card .v{font-family:'Bebas Neue';font-size:50px;line-height:1;color:var(--accent);white-space:nowrap}
.card .s{font-size:16px;color:var(--text);margin-top:8px}
.two{display:grid;grid-template-columns:1.2fr 1fr;gap:44px;align-items:start}
.sec{font-family:'Bebas Neue';font-size:25px;letter-spacing:.1em;color:var(--accent);margin-bottom:4px}
.secsub{font-size:14px;color:var(--muted);margin-bottom:12px}
table{width:100%;border-collapse:separate;border-spacing:4px;table-layout:fixed}
thead th{font-family:'Bebas Neue';font-size:22px;letter-spacing:.06em;color:var(--accent);font-weight:400;padding:2px 0 4px}
th.t{text-align:left;font-family:Inter;font-size:17px;font-weight:600;color:var(--text);width:88px;letter-spacing:0}
tr.g th{text-align:left;font-family:'Bebas Neue';font-size:17px;letter-spacing:.18em;color:var(--muted);font-weight:400;padding:12px 0 2px;border-bottom:1px solid var(--border)}
td{text-align:center;height:44px;border-radius:8px;font-size:19px;font-weight:600;font-variant-numeric:tabular-nums}
.legend{display:flex;align-items:center;gap:5px;color:var(--muted);font-size:14px;margin-top:10px;justify-content:flex-end}
.legend i{display:inline-block;width:20px;height:14px;border-radius:3px}
.bars .h{font-family:'Bebas Neue';font-size:17px;letter-spacing:.18em;color:var(--muted);margin:12px 0 10px;border-bottom:1px solid var(--border);padding-bottom:4px}
.bars .r{display:grid;grid-template-columns:70px 1fr 40px;align-items:center;gap:12px;margin-bottom:11px}
.bars .n{font-size:17px;font-weight:600}
.bars .bw{background:#161a0c;border-radius:0 6px 6px 0;height:22px}
.bars .b{height:22px;background:var(--accent);border-radius:0 6px 6px 0;min-width:2px}
.bars .v{font-size:18px;font-weight:700;text-align:right;font-variant-numeric:tabular-nums}
.foot{margin-top:34px;padding-top:18px;border-top:1px solid var(--border);color:var(--muted);font-size:14px;display:flex;justify-content:space-between;gap:24px}
</style></head><body><div class="wrap">
<div class="top"><img class="mark" src="${mark}"><span class="eyebrow">KODA CROSSFIT IRON VIEW</span></div>
<h1>HYROX CLASS TIMES <span class="a">${title}</span></h1>
<div class="sub">${esc(sub)}</div>
<div class="cards">
  <div class="card"><div class="l">Top morning time</div><div class="v">${am.v}</div><div class="s">${am.s}</div></div>
  <div class="card"><div class="l">Top evening time</div><div class="v">${pm.v}</div><div class="s">${pm.s}</div></div>
  <div class="card"><div class="l">Most popular day</div><div class="v">${day.v}</div><div class="s">${day.s}</div></div>
</div>
<div class="two">
  <div>
    <div class="sec">REQUESTS BY DAY &amp; TIME</div>
    <div class="secsub">How many people checked each slot</div>
    <table><thead><tr><th class="t"></th>${DAYS.map(d => '<th>' + d + '</th>').join('')}</tr></thead>
    <tbody>${rows(AM, 'MORNING')}${rows(PM, 'EVENING')}</tbody></table>
    <div class="legend">fewer ${legend} more</div>
  </div>
  <div class="bars">
    <div class="sec">PEOPLE PER TIME</div>
    <div class="secsub">Checked the time on at least one weekday</div>
    ${bars(AM, 'MORNING')}${bars(PM, 'EVENING')}
  </div>
</div>
<div class="foot"><span>${esc(note)}</span><span>Survey open Sept 9–20, 2026</span></div>
</div></body></html>`;
}

(async () => {
  const M = R.members, N = R.nonmembers;
  const jobs = [
    { file: 'Hyrox Class Times - Members', html: page(M, 'MEMBERS', `${M.people} current Koda members answered "What class times should we add to our Hyrox schedule?"`,
        `${M.morningOnly} want mornings only · ${M.eveningOnly} evenings only · ${M.both} both`) },
    { file: 'Hyrox Class Times - Non-Members', html: page(N, 'NON-MEMBERS', `${N.people} non-members (Hyrox Simulation athletes who don't train at Koda) answered the same question`,
        `${N.morningOnly} want mornings only · ${N.eveningOnly} evenings only · ${N.both} both`) },
  ];
  const browser = await puppeteer.launch({ headless: true });
  try {
    for (const j of jobs) {
      const p = await browser.newPage();
      await p.setViewport({ width: 1200, height: 900, deviceScaleFactor: 2 });
      await p.setContent(j.html, { waitUntil: 'networkidle0' });
      await p.evaluate(() => document.fonts.ready);
      const png = path.join(OUT, j.file + '.png'), jpg = path.join(OUT, j.file + '.jpg');
      await p.screenshot({ path: png, fullPage: true });
      await p.screenshot({ path: jpg, fullPage: true, type: 'jpeg', quality: 92 });
      const h = await p.evaluate(() => document.body.scrollHeight);
      console.log('wrote', png, '(1200x' + h + ' @2x) +', path.basename(jpg));
      await p.close();
    }
  } finally { await browser.close(); }
})().catch(e => { console.error('RENDER FAILED:', e); process.exit(1); });
