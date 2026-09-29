// Oct 25 2026 sim — build the web gear images from the supplier originals.
//
//   node tools/gear_1_build_assets.js
//
// Inputs (untracked, see .gitignore):
//   gear-source/headbands-junk-proof.pdf  — JUNK Brands proof, 6 pages, one design each
//   gear-source/hats/Artboard 1 copy *.png — 12 trucker-hat mockups (3 patches x 4 colors)
// Outputs (committed):
//   assets/gear/headband-<id>-front.jpg   flat front view (picker card + preview)
//   assets/gear/headband-<id>-side.jpg    3/4 side view (preview)
//   assets/gear/hat-<patch>-<color>.jpg   full hat mockup (picker + preview)
//   assets/gear/patch-<patch>.jpg         close-up of the patch on the black hat
//   gear-source/contact.png               QA contact sheet (kept out of the published site)
//
// pdf.js runs inside Puppeteer (no Ghostscript/poppler on this machine).
const fs = require('fs');
const path = require('path');
const puppeteer = require('C:/Users/kevsc/Desktop/Claude/hyrox_pdf/node_modules/puppeteer');

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'gear-source');
const OUT = path.join(ROOT, 'assets', 'gear');
fs.mkdirSync(OUT, { recursive: true });

// PDF page order = design order in the proof.
const HEADBANDS = ['black-blue', 'black-pink', 'camo', 'mint', 'lilac', 'navy'];

// Regions on each proof page as fractions of the page (measured on an
// 819x1456 render): the two 3/4 views and the flat front view.
const REGIONS = {
  side:  [115 / 819, 150 / 1456, 740 / 819, 430 / 1456],
  front: [100 / 819, 825 / 1456, 735 / 819, 1150 / 1456]
};

const HATS = {
  script:   { black: '1.1', columbia: '2',   graphite: '3',   moss: '4' },
  sunset:   { black: '5',   columbia: '5-2', graphite: '5-3', moss: '5-4' },
  mountain: { black: '6',   columbia: '6-2', graphite: '6-3', moss: '6-4' }
};
// Patch close-up window on the hat frame (fractions), same for all three
// patches since the mockups share one template.
const PATCH_BOX = [0.195, 0.2, 0.635, 0.64];

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  await page.goto('about:blank');
  await page.addScriptTag({ url: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js' });

  // In-page helpers: crop a region, tighten to non-white content, export JPEG.
  await page.evaluate(() => {
    window.cropTight = (src, box, pad, maxW, quality, tighten) => {
      const W = src.width, H = src.height;
      let x0 = Math.round(box[0] * W), y0 = Math.round(box[1] * H);
      let x1 = Math.round(box[2] * W), y1 = Math.round(box[3] * H);
      if (tighten) {
        const d = src.getContext('2d').getImageData(x0, y0, x1 - x0, y1 - y0).data;
        const w = x1 - x0, h = y1 - y0;
        let a = w, b = h, c = 0, e = 0;
        for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
          const i = (y * w + x) * 4;
          if (d[i] < 236 || d[i + 1] < 236 || d[i + 2] < 236) {
            if (x < a) a = x; if (x > c) c = x; if (y < b) b = y; if (y > e) e = y;
          }
        }
        if (c > a && e > b) { x1 = x0 + c; y1 = y0 + e; x0 += a; y0 += b; }
      }
      x0 = Math.max(0, x0 - pad); y0 = Math.max(0, y0 - pad);
      x1 = Math.min(W, x1 + pad); y1 = Math.min(H, y1 + pad);
      const cw = x1 - x0, ch = y1 - y0;
      const scale = Math.min(1, maxW / cw);
      const out = document.createElement('canvas');
      out.width = Math.round(cw * scale); out.height = Math.round(ch * scale);
      const ox = out.getContext('2d');
      ox.fillStyle = '#ffffff'; ox.fillRect(0, 0, out.width, out.height);
      ox.imageSmoothingQuality = 'high';
      ox.drawImage(src, x0, y0, cw, ch, 0, 0, out.width, out.height);
      return { w: out.width, h: out.height, jpg: out.toDataURL('image/jpeg', quality) };
    };
    window.toCanvas = async (dataUrl) => {
      const im = new Image(); im.src = dataUrl; await im.decode();
      const c = document.createElement('canvas'); c.width = im.naturalWidth; c.height = im.naturalHeight;
      const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); x.drawImage(im, 0, 0);
      return c;
    };
  });

  const save = (dataUrl, file) => {
    fs.writeFileSync(path.join(OUT, file), Buffer.from(dataUrl.split(',')[1], 'base64'));
    return file;
  };
  const made = [];

  // ── Headbands ──
  const pdfB64 = fs.readFileSync(path.join(SRC, 'headbands-junk-proof.pdf')).toString('base64');
  const hb = await page.evaluate(async (b64, ids, REGIONS) => {
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    const bin = atob(b64); const u8 = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
    const doc = await pdfjsLib.getDocument({ data: u8 }).promise;
    const out = [];
    for (let p = 1; p <= Math.min(doc.numPages, ids.length); p++) {
      const pg = await doc.getPage(p);
      const vp0 = pg.getViewport({ scale: 1 });
      const vp = pg.getViewport({ scale: 2600 / vp0.width });
      const c = document.createElement('canvas');
      c.width = Math.round(vp.width); c.height = Math.round(vp.height);
      const ctx = c.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height);
      await pg.render({ canvasContext: ctx, viewport: vp }).promise;
      out.push({
        id: ids[p - 1],
        front: window.cropTight(c, REGIONS.front, 18, 1000, 0.86, true),
        side: window.cropTight(c, REGIONS.side, 18, 900, 0.86, true)
      });
    }
    return out;
  }, pdfB64, HEADBANDS, REGIONS);
  hb.forEach(h => {
    made.push(save(h.front.jpg, `headband-${h.id}-front.jpg`) + ` ${h.front.w}x${h.front.h}`);
    made.push(save(h.side.jpg, `headband-${h.id}-side.jpg`) + ` ${h.side.w}x${h.side.h}`);
  });

  // ── Hats ──
  for (const patch of Object.keys(HATS)) {
    for (const color of Object.keys(HATS[patch])) {
      const file = path.join(SRC, 'hats', `Artboard 1 copy ${HATS[patch][color]}.png`);
      const dataUrl = 'data:image/png;base64,' + fs.readFileSync(file).toString('base64');
      const r = await page.evaluate(async (dataUrl, box, wantPatch) => {
        const c = await window.toCanvas(dataUrl);
        const hat = window.cropTight(c, [0, 0, 1, 1], 0, 900, 0.86, false);
        const pt = wantPatch ? window.cropTight(c, box, 0, 520, 0.88, false) : null;
        return { hat, pt };
      }, dataUrl, PATCH_BOX, color === 'black');
      made.push(save(r.hat.jpg, `hat-${patch}-${color}.jpg`) + ` ${r.hat.w}x${r.hat.h}`);
      if (r.pt) made.push(save(r.pt.jpg, `patch-${patch}.jpg`) + ` ${r.pt.w}x${r.pt.h}`);
    }
  }

  // ── QA contact sheet ──
  const files = fs.readdirSync(OUT).filter(f => f.endsWith('.jpg')).sort();
  const html = '<body style="margin:0;background:#888;font:12px sans-serif;display:grid;grid-template-columns:repeat(6,1fr);gap:6px;padding:6px">' +
    files.map(f => `<div style="background:#fff"><img src="data:image/jpeg;base64,${fs.readFileSync(path.join(OUT, f)).toString('base64')}" style="width:100%;display:block"><div>${f}</div></div>`).join('') + '</body>';
  await page.setViewport({ width: 1600, height: 900 });
  await page.setContent(html, { waitUntil: 'load' });
  await page.screenshot({ path: path.join(SRC, 'contact.png'), fullPage: true });  // QA only — not published

  await browser.close();
  made.forEach(m => console.log(m));
  const total = files.reduce((s, f) => s + fs.statSync(path.join(OUT, f)).size, 0);
  console.log(files.length + ' jpgs, ' + Math.round(total / 1024) + ' KB total');
})();
