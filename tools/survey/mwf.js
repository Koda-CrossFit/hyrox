// mwf.js — Mon/Wed/Fri vs Tue/Thu demand per time slot (people reached, consistent attendees, checks per class day)
// usage: node tools/survey/mwf.js survey-results   (after match.js)
const path = require('path');
const DIR = process.argv[2] || __dirname;
const R = require(path.join(DIR, 'results.json'));
const DAYS = ['Mon','Tue','Wed','Thu','Fri'], MWF = ['Mon','Wed','Fri'], TTH = ['Tue','Thu'];
const TIMES = ['5am','5:30am','6am','6:30am','7am','4pm','4:30pm','5pm','5:30pm','6pm'];
const has = (p, d, t) => p.slots.includes(d + ' ' + t);
function block(P, label) {
  const out = { label, people: P.length, rows: [] };
  TIMES.forEach(t => {
    const mwfAny = P.filter(p => MWF.some(d => has(p, d, t))).length;
    const tthAny = P.filter(p => TTH.some(d => has(p, d, t))).length;
    const mwfAll = P.filter(p => MWF.every(d => has(p, d, t))).length;
    const tthAll = P.filter(p => TTH.every(d => has(p, d, t))).length;
    const mwfChecks = P.reduce((a, p) => a + MWF.filter(d => has(p, d, t)).length, 0);
    const tthChecks = P.reduce((a, p) => a + TTH.filter(d => has(p, d, t)).length, 0);
    out.rows.push({ t, mwfAny, tthAny, mwfAll, tthAll, mwfChecks, tthChecks, mwfPerDay: +(mwfChecks / 3).toFixed(1), tthPerDay: +(tthChecks / 2).toFixed(1) });
  });
  const anyMWF = P.filter(p => p.slots.some(s => MWF.some(d => s.startsWith(d + ' ')))).length;
  const anyTTH = P.filter(p => p.slots.some(s => TTH.some(d => s.startsWith(d + ' ')))).length;
  const both = P.filter(p => p.slots.some(s => MWF.some(d => s.startsWith(d + ' '))) && p.slots.some(s => TTH.some(d => s.startsWith(d + ' ')))).length;
  out.blocks = { mwfOnly: anyMWF - both, tthOnly: anyTTH - both, both, anyMWF, anyTTH };
  const checks = { mwf: P.reduce((a, p) => a + p.slots.filter(s => MWF.some(d => s.startsWith(d + ' '))).length, 0), tth: P.reduce((a, p) => a + p.slots.filter(s => TTH.some(d => s.startsWith(d + ' '))).length, 0) };
  out.checks = { ...checks, mwfPerDay: +(checks.mwf / 3).toFixed(1), tthPerDay: +(checks.tth / 2).toFixed(1) };
  return out;
}
const all = R.peopleSets, mem = all.filter(p => p.group === 'member'), non = all.filter(p => p.group === 'nonmember');
const res = { all: block(all, 'Everyone'), members: block(mem, 'Members'), nonmembers: block(non, 'Non-members') };
require('fs').writeFileSync(path.join(DIR, 'mwf.json'), JSON.stringify(res, null, 2));
for (const k of ['members', 'nonmembers', 'all']) {
  const B = res[k];
  console.log('\n=== ' + B.label.toUpperCase() + ' (' + B.people + ' people) ===');
  console.log('people who checked any MWF day: ' + B.blocks.anyMWF + '  any TTh day: ' + B.blocks.anyTTH + '  | MWF-only ' + B.blocks.mwfOnly + ' / TTh-only ' + B.blocks.tthOnly + ' / both ' + B.blocks.both);
  console.log('checks: MWF ' + B.checks.mwf + ' (' + B.checks.mwfPerDay + '/day)  TTh ' + B.checks.tth + ' (' + B.checks.tthPerDay + '/day)');
  console.log('time     | people MWF | people TTh | all3 MWF | both TTh | checks MWF (per day) | checks TTh (per day)');
  B.rows.forEach(r => console.log(r.t.padEnd(8) + ' | ' + String(r.mwfAny).padStart(10) + ' | ' + String(r.tthAny).padStart(10) + ' | ' + String(r.mwfAll).padStart(8) + ' | ' + String(r.tthAll).padStart(8) + ' | ' + (r.mwfChecks + ' (' + r.mwfPerDay + ')').padStart(20) + ' | ' + (r.tthChecks + ' (' + r.tthPerDay + ')').padStart(20)));
}
