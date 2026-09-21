// match.js — classify survey respondents as member / non-member by name against members.txt,
// then tally each group. Writes results.json + prints a review list.
// Optional overrides.json: { "row:46": { "as": "Andy Conigliaro", "group": "member" },
//                           "row:32": { "group": "nonmember" }, "row:24": { "skip": true } }
const fs = require('fs');
const path = require('path');
const SP = process.argv[2] || __dirname;

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
const TIMES = ['5am', '5:30am', '6am', '6:30am', '7am', '4pm', '4:30pm', '5pm', '5:30pm', '6pm'];
const AM = TIMES.slice(0, 5), PM = TIMES.slice(5);

const members = fs.readFileSync(path.join(SP, 'members.txt'), 'utf8').split(/\r?\n/).map(s => s.trim()).filter(Boolean);
const roster = JSON.parse(fs.readFileSync(path.join(SP, 'survey-roster.json'), 'utf8')).rows;
const ovPath = path.join(SP, 'overrides.json');
const overrides = fs.existsSync(ovPath) ? JSON.parse(fs.readFileSync(ovPath, 'utf8')) : {};

const NICK = {
  chris: 'christopher', matt: 'matthew', andy: 'andrew', drew: 'andrew', mike: 'michael', jim: 'james', jimmy: 'james',
  dave: 'david', ben: 'benjamin', jen: 'jennifer', jenn: 'jennifer', jenny: 'jennifer', liz: 'elizabeth', beth: 'elizabeth',
  nick: 'nicholas', tom: 'thomas', bill: 'william', will: 'william', rob: 'robert', bob: 'robert', bobby: 'robert',
  joe: 'joseph', joey: 'joseph', dan: 'daniel', sam: 'samuel', steve: 'stephen', steph: 'stephanie', jess: 'jessica',
  becky: 'rebecca', meg: 'megan', kim: 'kimberly', greg: 'gregory', josh: 'joshua', jake: 'jacob', zach: 'zachary',
  ted: 'theodore', pat: 'patrick', kate: 'katherine', katie: 'katherine', kat: 'katherine', kathy: 'katherine',
  nate: 'nathan', nathaniel: 'nathan', jon: 'jonathan', john: 'jonathan', kristin: 'kristen', kristi: 'kristen',
  krissy: 'kristen', lyndsey: 'lindsay', lindsey: 'lindsay', alex: 'alexander', alexandra: 'alexander', tim: 'timothy'
};
const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/\([^)]*\)/g, ' ').replace(/[^a-z\s]/g, ' ').replace(/\s+/g, ' ').trim();
const canon = (first) => NICK[first] || first;

const M = members.map(m => { const n = norm(m); const t = n.split(' '); return { raw: m, n, first: t[0], last: t[t.length - 1], tokens: t }; });
const exactSet = new Map(M.map(m => [m.n, m]));

function classify(r) {
  const key = 'row:' + r.row;
  const ov = overrides[key];
  if (ov && ov.skip) return { group: 'skip', method: 'override-skip', as: null };
  const n = norm(r.name); const t = n.split(' ').filter(Boolean);
  if (ov && ov.group) return { group: ov.group, method: 'override', as: ov.as || r.name };
  if (!t.length) return { group: 'nonmember', method: 'blank', as: r.name };
  if (exactSet.has(n)) return { group: 'member', method: 'exact', as: exactSet.get(n).raw };
  if (t.length >= 2) {
    const first = t[0], last = t[t.length - 1];
    let hit = M.filter(m => m.first === first && m.last === last);
    if (hit.length) return { group: 'member', method: 'first+last', as: hit[0].raw };
    hit = M.filter(m => m.last === last && canon(m.first) === canon(first));
    if (hit.length) return { group: 'member', method: 'nickname', as: hit[0].raw, review: true };
    hit = M.filter(m => m.last === last && m.first[0] === first[0]);
    if (hit.length === 1) return { group: 'member', method: 'initial+last', as: hit[0].raw, review: true };
    return { group: 'nonmember', method: 'no-match', as: r.name, review: true };
  }
  // single token: first name or last name only
  const tok = t[0];
  let byFirst = M.filter(m => m.first === tok || canon(m.first) === canon(tok));
  let byLast = M.filter(m => m.last === tok);
  if (byFirst.length === 1) return { group: 'member', method: 'first-only-unique', as: byFirst[0].raw, review: true };
  if (byLast.length >= 1 && !byFirst.length) return { group: 'member', method: 'last-only(' + byLast.map(m => m.raw).join('/') + ')', as: byLast.length === 1 ? byLast[0].raw : r.name, review: true };
  if (byFirst.length > 1) return { group: 'member', method: 'first-only-ambiguous(' + byFirst.map(m => m.raw).join('/') + ')', as: r.name, review: true };
  return { group: 'nonmember', method: 'no-match-single', as: r.name, review: true };
}

const slots = (s) => String(s || '').split(',').map(x => x.trim()).filter(x => TIMES.some(t => x.endsWith(' ' + t)) && DAYS.some(d => x.startsWith(d + ' ')));

// classify + dedupe (same resolved name → merge slots)
const people = new Map(); const review = []; const log = [];
roster.forEach(r => {
  const c = classify(r); const rec = { row: r.row, name: r.name, ...c, n: slots(r.times).length };
  log.push(rec);
  if (c.group === 'skip') return;
  if (c.review) review.push(rec);
  const id = c.group + '|' + norm(c.as || r.name);
  if (!people.has(id)) people.set(id, { group: c.group, as: c.as || r.name, names: [r.name], rows: [r.row], set: new Set() });
  else { const p = people.get(id); p.names.push(r.name); p.rows.push(r.row); rec.dupOf = p.rows[0]; }
  slots(r.times).forEach(s => people.get(id).set.add(s));
});

function tally(group) {
  const P = [...people.values()].filter(p => p.group === group);
  const grid = {}; TIMES.forEach(t => { grid[t] = {}; DAYS.forEach(d => grid[t][d] = 0); });
  P.forEach(p => p.set.forEach(s => { const [d, t] = s.split(' '); grid[t][d]++; }));
  const uniq = (pred) => P.filter(p => [...p.set].some(pred)).length;
  const byTime = {}; TIMES.forEach(t => byTime[t] = uniq(s => s.endsWith(' ' + t)));
  const byDay = {}; DAYS.forEach(d => byDay[d] = uniq(s => s.startsWith(d + ' ')));
  const am = P.filter(p => [...p.set].some(s => AM.some(t => s.endsWith(' ' + t)))).length;
  const pm = P.filter(p => [...p.set].some(s => PM.some(t => s.endsWith(' ' + t)))).length;
  const both = P.filter(p => [...p.set].some(s => AM.some(t => s.endsWith(' ' + t))) && [...p.set].some(s => PM.some(t => s.endsWith(' ' + t)))).length;
  let best = null; AM.forEach(a => PM.forEach(b => { const n = uniq(s => s.endsWith(' ' + a) || s.endsWith(' ' + b)); if (!best || n > best.n) best = { am: a, pm: b, n }; }));
  const top = (list) => { const mx = Math.max(...list.map(t => byTime[t])); return { n: mx, times: list.filter(t => byTime[t] === mx) }; };
  const dayMax = Math.max(...DAYS.map(d => byDay[d]));
  return {
    people: P.length, checks: P.reduce((a, p) => a + p.set.size, 0), grid, byTime, byDay,
    topAM: top(AM), topPM: top(PM), topDay: { n: dayMax, days: DAYS.filter(d => byDay[d] === dayMax) },
    morningOnly: am - both, eveningOnly: pm - both, both, bestPair: best,
    names: P.map(p => p.as).sort()
  };
}

const peopleSets = [...people.values()].map(p => ({ group: p.group, as: p.as, slots: [...p.set] }));
const results = { generated: new Date().toISOString(), peopleSets, members: tally('member'), nonmembers: tally('nonmember'), log, review };
fs.writeFileSync(path.join(SP, 'results.json'), JSON.stringify(results, null, 2));

const pad = (s, n) => String(s).padEnd(n);
console.log('members.txt entries:', members.length, ' survey rows:', roster.length);
console.log('\nCLASSIFICATION (' + log.length + ' rows):');
log.forEach(r => console.log('  row ' + String(r.row).padStart(3) + '  ' + pad(r.name, 24) + pad(r.group, 10) + pad(r.method, 26) + (r.as && r.as !== r.name ? '-> ' + r.as : '') + (r.dupOf ? '  [DUPLICATE of row ' + r.dupOf + ']' : '') + (r.review ? '  *review*' : '')));
for (const g of ['members', 'nonmembers']) {
  const T = results[g];
  console.log('\n' + g.toUpperCase() + ': ' + T.people + ' people, ' + T.checks + ' checks');
  console.log('  by time: ' + TIMES.map(t => t + '=' + T.byTime[t]).join('  '));
  console.log('  by day:  ' + DAYS.map(d => d + '=' + T.byDay[d]).join('  '));
  console.log('  topAM ' + JSON.stringify(T.topAM) + '  topPM ' + JSON.stringify(T.topPM) + '  topDay ' + JSON.stringify(T.topDay));
  console.log('  morning-only ' + T.morningOnly + ' / evening-only ' + T.eveningOnly + ' / both ' + T.both + '   best pair ' + JSON.stringify(T.bestPair));
  console.log('  grid:'); TIMES.forEach(t => console.log('    ' + pad(t, 8) + DAYS.map(d => String(T.grid[t][d]).padStart(3)).join('')));
}
