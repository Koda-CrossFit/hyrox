// ═══════════════════════════════════════════════════════════════
// OCTOBER 25, 2026 SIMULATION  (posted from index.html with type:"sim1025")
// Presented by Centr Equipment + Box Basics. $25/athlete, and every athlete
// picks a custom HEADBAND (6 JUNK Brands designs) or a HAT (3 patches
// x 4 hat colors). Own spreadsheet: "Signups" (one row per submission),
// "Gear" (one row per athlete, for the order) + on-demand "Gear Tally".
//
// Same lanes as Sept 13: 8 per heat — 1 Red (Men's Pro), 3 Green (Men's
// Open / Women's Pro / Mixed), 3 Blue (Women's Open), 1 Scaled. NEW (Kevin
// 9/29): Men's Pro only opens EVERY OTHER heat (9:00, 9:20 … 11:40 — 20 min
// apart); once all nine of those Red lanes are booked, the in-between heats
// open automatically (latched, Kevin emailed). Overflow heats 12:00 / 12:10
// cascade open when Green or Blue sells out, exactly like Sept.
//
// Gates (Men's Pro, each overflow heat) are three-state script properties:
// "1" = open, "0" = held closed by hand, absent = automatic.
//
// Every GET action except sim1025Slots needs &key=<admin key>. Only the
// key's SHA-256 lives here (this file is public on GitHub); the key itself is
// in Desktop\Claude\Credentials - SENSITIVE Do Not Share\hyrox-sim-oct25-admin-key.txt.
//
// Shared helpers from Code.js: sim0913HeaderMap, sim0913Col,
// sim0913NormalizeHeat, row, escapeHtml, NOTIFY_EMAIL.
// ═══════════════════════════════════════════════════════════════

var SIM1025_EVENT = "Hyrox Simulation — October 25, 2026";
var SIM1025_SHORT = "Hyrox Sim 10/25";
var SIM1025_SHEET_TITLE = "Koda Hyrox Simulation Signups — Oct 25 2026";
var SIM1025_SHEET_PROP = "SIM1025_SHEET_ID";
var SIM1025_ADMIN_KEY_SHA256 = "97775fe6ca6665b0aa2d1278a84c0411df28bf57cc91b4dc1caadd8bf04380d4";
var SIM1025_PRICE = 25;
var SIM1025_VENMO = "kevin-schuetz-5";
var SIM1025_ZELLE = "kodaironview@gmail.com";
var SIM1025_ZP_URL = "https://kodaironview.sites.zenplanner.com/retail-product.cfm?ProductId=5F4A8380-AC28-409B-A664-E088BB910ED0";
var SIM1025_SITE = "https://koda-crossfit.github.io/hyrox/";

var SIM1025_SLOTS = [
  "9:00", "9:10", "9:20", "9:30", "9:40", "9:50",
  "10:00", "10:10", "10:20", "10:30", "10:40", "10:50",
  "11:00", "11:10", "11:20", "11:30", "11:40", "11:50"
];
var SIM1025_GROUP_CAPS = { "Red": 1, "Green": 3, "Blue": 3, "Scaled": 1 };

// Men's Pro every-other-heat gate.
var SIM1025_PRO_PROP = "SIM1025_PRO_ALL_OPEN";
var SIM1025_PRO_EVERY_MIN = 20;

// Overflow heats, opened in order (see sim1025OpenOverflowSlots).
var SIM1025_OVERFLOW = [
  { slot: "12:00", prop: "SIM1025_NOON_OPEN", label: "12:00 noon" },
  { slot: "12:10", prop: "SIM1025_1210_OPEN", label: "12:10 PM" }
];

var SIM1025_DIVISIONS = { "Singles": 1, "Doubles": 2, "Team of 4 Relay": 4 };

// Gear catalogue — ids + names MUST match HEADBANDS / PATCHES / HAT_COLORS
// in index.html (the backend stores its own canonical names).
var SIM1025_HEADBANDS = {
  "black-blue": "Black / Blue", "black-pink": "Black / Pink", "camo": "Black Ops Camo",
  "mint": "Jelly Mint", "lilac": "Lilac", "navy": "Navy"
};
var SIM1025_PATCHES = { "script": "Koda Script", "sunset": "Sunset Peak", "mountain": "Koda Mountains" };
var SIM1025_HAT_COLORS = {
  "black": "Black", "graphite": "Graphite/White", "columbia": "Columbia Blue/White", "moss": "Moss Green/Charcoal"
};

var SIM1025_SIGNUP_HEADERS = [
  "Timestamp", "Registrant", "Email", "Division", "Sex", "Weights", "Weights Setup",
  "Home Gym", "Heat", "Athletes", "Gear", "Payment Method", "Total Due", "Paid?", "Comments", "Status", "Ref"
];
var SIM1025_GEAR_HEADERS = [
  "Timestamp", "Athlete", "Item", "Headband Design", "Hat Patch", "Hat Color",
  "Registrant", "Division", "Heat", "Payment Method", "Email", "Status", "Ref"
];
// Columns that mark a row as "taken" when looking for the next free row.
var SIM1025_ROW_KEYS = {
  "Signups": ["timestamp", "registrant", "email", "heat"],
  "Gear": ["timestamp", "athlete", "registrant"]
};

var SIM1025_CANCELLED_RE = /^\s*cancel/i;
// QA rows are excluded from lane counts, tallies and rosters.
var SIM1025_TEST_RE = /\btest\b|canary|delete ?me|please.?ignore/i;
var SIM1025_EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// A resubmit of the SAME registration (same email, name, division, category,
// weights and crew) inside this window returns the existing booking instead
// of taking a second lane — Sept saw 4 lost-response retries.
var SIM1025_DUP_WINDOW_MIN = 20;

function sim1025Json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function sim1025Norm(s) { return String(s == null ? "" : s).trim().replace(/\s+/g, " ").toLowerCase(); }
function sim1025IsTest(s) { return SIM1025_TEST_RE.test(String(s || "")); }
function sim1025IsCancelled(s) { return SIM1025_CANCELLED_RE.test(String(s || "")); }

// User text headed for a cell: a leading = + - @ would be parsed as a formula.
function sim1025Cell(s) {
  s = String(s == null ? "" : s);
  return /^[=+\-@]/.test(s) ? "'" + s : s;
}

// "9:00", "09:00", "9:00 AM", "Noon", a time-of-day Date → "9:00" / "12:00".
function sim1025Heat(v) {
  var s = sim0913NormalizeHeat(v).trim();
  if (/^(12(:00)?\s*)?noon$/i.test(s)) return "12:00";
  return s.replace(/\s*(a\.?m\.?|p\.?m\.?|noon)\s*$/i, "").replace(/^0(\d:)/, "$1").trim();
}

// Athlete names are stored in "Name — gear" lines, so an em dash inside a
// name would break the parsing (and the duplicate check) — keep it a hyphen.
function sim1025CleanName(s) {
  return String(s || "").trim().replace(/^—\s*|\s*—$/g, "").replace(/\s+—\s+/g, " - ").trim();
}

// open= is required on the gate switches (a bare call must not open anything).
function sim1025OpenParam(v) {
  if (v == null || String(v).trim() === "") return null;
  var s = String(v).trim().toLowerCase();
  if (/^(1|true|yes|on|open)$/.test(s)) return "1";
  if (/^(0|false|no|off|close|closed)$/.test(s)) return "0";
  if (s === "auto") return "auto";
  return null;
}

// ── Spreadsheet ──
// Once the sheet exists its id is authoritative: a transient openById error
// retries and then FAILS (the client says "try again") — it must never fall
// through to creating a second, empty sheet (that would reset every lane).
function getOrCreateSim1025Spreadsheet() {
  var props = PropertiesService.getScriptProperties();
  var id = props.getProperty(SIM1025_SHEET_PROP);
  if (id) return sim1025OpenById(id);

  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    id = props.getProperty(SIM1025_SHEET_PROP);  // another execution may have created it meanwhile
    if (id) return sim1025OpenById(id);
    var ss = SpreadsheetApp.create(SIM1025_SHEET_TITLE);
    var styleHeader = function(sheet, headers, widths) {
      sheet.getRange(1, 1, 1, headers.length).setValues([headers])
        .setFontWeight("bold").setBackground("#1A1818").setFontColor("#FFFF33");
      sheet.setFrozenRows(1);
      for (var i = 0; i < widths.length; i++) if (widths[i]) sheet.setColumnWidth(i + 1, widths[i]);
    };
    var signups = ss.getActiveSheet();
    signups.setName("Signups");
    styleHeader(signups, SIM1025_SIGNUP_HEADERS,
      [165, 170, 220, 130, 80, 75, 230, 180, 65, 75, 380, 125, 85, 65, 280, 150, 90]);
    // Heat stays text so Sheets never turns "11:50" into a time-of-day value.
    signups.getRange("I:I").setNumberFormat("@");
    signups.getRange("Q:Q").setNumberFormat("@");  // Ref
    var gear = ss.insertSheet("Gear");
    styleHeader(gear, SIM1025_GEAR_HEADERS, [165, 170, 100, 140, 130, 160, 170, 130, 65, 125, 220, 150, 90]);
    gear.getRange("I:I").setNumberFormat("@");
    gear.getRange("M:M").setNumberFormat("@");  // Ref
    props.setProperty(SIM1025_SHEET_PROP, ss.getId());
    return ss;
  } finally {
    lock.releaseLock();
  }
}

function sim1025OpenById(id) {
  var lastErr;
  for (var attempt = 0; attempt < 3; attempt++) {
    try { return SpreadsheetApp.openById(id); }
    catch (e) { lastErr = e; if (attempt < 2) Utilities.sleep(300 * (attempt + 1)); }
  }
  Logger.log("Sim1025 openById failed 3x: " + lastErr);
  throw new Error("SIM1025_SHEET_UNAVAILABLE");
}

// The row a new record should occupy: one past the last row with data in any
// of the sheet's key columns (a stray cell elsewhere can't divert it — the
// Sept appendRow bug), then forward past any row that already has content
// (e.g. a walk-in Kevin typed without a Timestamp) so nothing is overwritten.
function sim1025NextRow(sheet) {
  var last = sheet.getLastRow();
  if (last < 2) return 2;
  var width = sheet.getLastColumn();
  var map = sim0913HeaderMap(sheet);
  var keys = SIM1025_ROW_KEYS[sheet.getName()] || ["timestamp"];
  var idx = keys.map(function(k) { return sim0913Col(map, k, -1); }).filter(function(i) { return i >= 0; });
  var block = sheet.getRange(2, 1, last - 1, width);
  var vals = block.getValues();
  var formulas = block.getFormulas();  // a filled-down formula column isn't "content"
  var target = 2;
  for (var r = vals.length - 1; r >= 0; r--) {
    if (idx.some(function(i) { return String(vals[r][i]).trim() !== ""; })) { target = r + 3; break; }
  }
  var hasContent = function(k) {
    return vals[k].some(function(v, c) {
      return !formulas[k][c] && v !== "" && v !== false && v !== null && String(v).trim() !== "";
    });
  };
  while (target - 2 < vals.length && hasContent(target - 2)) target++;
  return target;
}

// Header-aligned write (Kevin can drag/resize columns; renaming a header is
// what breaks it). Merges into the target row so columns we don't set keep
// what's there — a Paid? checkbox value, or a filled-down formula (re-written
// as the formula, not frozen to its value). Returns the row written.
function sim1025Append(sheet, record) {
  var map = sim0913HeaderMap(sheet);
  var width = sheet.getLastColumn();
  var target = sim1025NextRow(sheet);
  var maxRows = sheet.getMaxRows();
  if (target > maxRows) sheet.insertRowsAfter(maxRows, target - maxRows + 50);
  var range = sheet.getRange(target, 1, 1, width);
  var out = range.getValues()[0];
  var f = range.getFormulas()[0];
  for (var i = 0; i < width; i++) {
    if (out[i] === undefined) out[i] = "";
    if (f && f[i]) out[i] = f[i];
  }
  for (var key in record) {
    var idx = map[key];
    if (idx !== undefined && idx < width) out[idx] = record[key];
  }
  range.setValues([out]);
  return target;
}

// ── Heats, lanes, gates ──
function sim1025Minutes(slot) {
  var p = String(slot).split(":");
  return (+p[0]) * 60 + (+p[1]);
}

function sim1025ProOnPattern(slot) {
  var m = sim1025Minutes(slot) - 9 * 60;
  return m >= 0 && m % SIM1025_PRO_EVERY_MIN === 0;
}

function sim1025Caps(slot, proAll) {
  return {
    "Red": (proAll || sim1025ProOnPattern(slot)) ? SIM1025_GROUP_CAPS.Red : 0,
    "Green": SIM1025_GROUP_CAPS.Green,
    "Blue": SIM1025_GROUP_CAPS.Blue,
    "Scaled": SIM1025_GROUP_CAPS.Scaled
  };
}

function sim1025HeatLabel(slot) {
  for (var i = 0; i < SIM1025_OVERFLOW.length; i++) {
    if (SIM1025_OVERFLOW[i].slot === slot) return SIM1025_OVERFLOW[i].label;
  }
  return slot + " AM";
}

// Lane type (first word = Red/Green/Blue/Scaled, used for lane caps) + the
// loads, in the same terms as the site's weights chart (Kevin 9/30): sled push
// and pull are plates ADDED to a 110 lb sled; farmers per hand; target by sex.
function sim1025WeightSetup(sex, weights) {
  var tgt = sex === "Women's" ? "9 ft" : sex === "Men's" ? "10 ft" : "10 ft men / 9 ft women";
  if (weights === "Scaled") {
    return "Scaled — sled push 25 lbs added · sled pull sled only · farmers 2×26 lbs · sandbag 12 lbs · wall ball 4 lbs @ 9 ft";
  }
  if (weights === "Pro" && sex === "Men's") {
    return "Red — sled push 335 / pull 227 lbs added · farmers 2×70 lbs · sandbag 66 lbs · wall ball 20 lbs @ 10 ft";
  }
  if (weights === "Open" && sex === "Women's") {
    return "Blue — sled push 115 / pull 62 lbs added · farmers 2×35 lbs · sandbag 22 lbs · wall ball 9 lbs @ 9 ft";
  }
  if (weights === "Pro" || weights === "Open") {
    return "Green — sled push 225 / pull 117 lbs added · farmers 2×53 lbs · sandbag 44 lbs · wall ball 14 lbs @ " + tgt;
  }
  return "";
}

function sim1025EmptyCounts() { return { "Red": 0, "Green": 0, "Blue": 0, "Scaled": 0 }; }

// One pass over Signups: active (non-test, non-cancelled) crews per heat per
// lane type. Buckets every base slot plus any other heat present in the data.
function sim1025CountsAllHeats(signups) {
  var sheet = signups || getOrCreateSim1025Spreadsheet().getSheetByName("Signups");
  var counts = {};
  SIM1025_SLOTS.forEach(function(s) { counts[s] = sim1025EmptyCounts(); });
  var map = sim0913HeaderMap(sheet);
  var iReg = sim0913Col(map, "registrant", 1), iSetup = sim0913Col(map, "weights setup", 6);
  var iHeat = sim0913Col(map, "heat", 8), iStatus = sim0913Col(map, "status", -1);
  sheet.getDataRange().getValues().slice(1).forEach(function(r) {
    var heat = sim1025Heat(r[iHeat]);
    var g = String(r[iSetup] || "").split(" ")[0];
    if (!heat || sim1025IsTest(r[iReg])) return;
    if (iStatus >= 0 && sim1025IsCancelled(r[iStatus])) return;
    if (!SIM1025_GROUP_CAPS.hasOwnProperty(g)) return;
    if (!counts.hasOwnProperty(heat)) counts[heat] = sim1025EmptyCounts();
    counts[heat][g]++;
  });
  return counts;
}

function sim1025Notify(subject, html) {
  if (!NOTIFY_EMAIL) return;
  try { MailApp.sendEmail({ to: NOTIFY_EMAIL, subject: subject, htmlBody: html }); }
  catch (e) { /* a latch must never fail on a mail error */ }
}

// Overflow chain: each extra heat opens (and latches) once Green OR Blue is
// fully booked across the base heats plus every earlier overflow heat already
// open. Never opens a later heat before an earlier one; a heat held closed by
// hand ("0") stops the chain.
function sim1025OpenOverflowSlots(counts, props) {
  props = props || PropertiesService.getScriptProperties();
  var open = [];
  var active = SIM1025_SLOTS.slice();
  for (var i = 0; i < SIM1025_OVERFLOW.length; i++) {
    var ov = SIM1025_OVERFLOW[i];
    var state = props.getProperty(ov.prop);
    var isOpen = state === "1";
    if (!isOpen && state !== "0") {
      var g = 0, b = 0;
      active.forEach(function(s) { g += ((counts[s] || {}).Green) || 0; b += ((counts[s] || {}).Blue) || 0; });
      var full = [];
      if (g >= active.length * SIM1025_GROUP_CAPS.Green) full.push("Men's Open / Women's Pro / Mixed (Green)");
      if (b >= active.length * SIM1025_GROUP_CAPS.Blue) full.push("Women's Open (Blue)");
      if (full.length) {
        props.setProperty(ov.prop, "1");
        isOpen = true;
        sim1025Notify(SIM1025_SHORT + " — " + ov.label + " heat auto-opened",
          full.join(" and ") + " filled up across every open heat, so the signup site just published the extra <strong>" +
          ov.label + "</strong> heat (1 Red / 3 Green / 3 Blue / 1 Scaled lanes). No action needed.");
      }
    }
    if (isOpen) { open.push(ov.slot); active.push(ov.slot); }
    else break;
  }
  return open;
}

// Men's Pro gate: true once the in-between heats are open. Latches (and emails
// Kevin) the moment all nine every-other-heat Red lanes 9:00–11:40 are booked.
// Stays open even if a Pro lane frees up later; "0" holds it closed by hand.
function sim1025ProAllOpen(counts, props) {
  props = props || PropertiesService.getScriptProperties();
  var state = props.getProperty(SIM1025_PRO_PROP);
  if (state === "1") return true;
  if (state === "0") return false;
  var on = SIM1025_SLOTS.filter(sim1025ProOnPattern);
  var used = on.filter(function(s) { return (((counts[s] || {}).Red) || 0) >= 1; }).length;
  if (used < on.length) return false;
  props.setProperty(SIM1025_PRO_PROP, "1");
  var off = SIM1025_SLOTS.filter(function(s) { return !sim1025ProOnPattern(s); });
  sim1025Notify(SIM1025_SHORT + " — Men's Pro in-between heats are now open",
    "All " + on.length + " every-other-heat Men's Pro lanes (" + on.join(", ") + ") are booked, so the signup site just opened " +
    "Men's Pro in the in-between heats too (" + off.join(", ") + "). No action needed.<br><br>" +
    "Want them closed again? Ask Claude to run <code>sim1025SetPro&amp;open=0</code>.");
  return true;
}

// Everything the picker and the POST need, in one pass.
function sim1025State(counts) {
  counts = counts || sim1025CountsAllHeats();
  var props = PropertiesService.getScriptProperties();
  var overflow = sim1025OpenOverflowSlots(counts, props);
  var slots = SIM1025_SLOTS.concat(overflow);
  var proAll = sim1025ProAllOpen(counts, props);
  var slotCaps = {};
  slots.forEach(function(s) { slotCaps[s] = sim1025Caps(s, proAll); });
  return { counts: counts, slots: slots, overflow: overflow, proAllOpen: proAll, slotCaps: slotCaps };
}

function sim1025SlotCounts() {
  var st = sim1025State();
  var counts = {};
  st.slots.forEach(function(s) { counts[s] = st.counts[s] || sim1025EmptyCounts(); });
  return { status: "ok", caps: SIM1025_GROUP_CAPS, slotCaps: st.slotCaps, counts: counts,
           proAllOpen: st.proAllOpen, overflow: st.overflow };
}

// ── Gear ──
function sim1025Lookup(map, v) {
  var s = String(v || "").trim().toLowerCase();
  if (!s) return null;
  for (var id in map) {
    if (id.toLowerCase() === s || map[id].toLowerCase() === s) return { id: id, name: map[id] };
  }
  return null;
}

// Normalize one athlete's gear pick against the catalogue. Returns
// {item, headband, patch, hatColor} with canonical names, or {error}.
function sim1025NormalizeGear(a) {
  var item = String(a.itemId || a.item || "").trim().toLowerCase();
  if (item === "headband") {
    var hb = sim1025Lookup(SIM1025_HEADBANDS, a.headbandId || a.headband);
    if (!hb) return { error: "unknown headband design" };
    return { item: "Headband", headband: hb.name, patch: "", hatColor: "" };
  }
  if (item === "hat" || item === "trucker hat") {
    var p = sim1025Lookup(SIM1025_PATCHES, a.patchId || a.patch);
    var c = sim1025Lookup(SIM1025_HAT_COLORS, a.hatColorId || a.hatColor);
    if (!p) return { error: "unknown hat patch" };
    if (!c) return { error: "unknown hat color" };
    return { item: "Hat", headband: "", patch: p.name, hatColor: c.name };
  }
  return { error: "pick a headband or a hat" };
}

function sim1025GearText(g) {
  return g.item === "Headband" ? "Headband · " + g.headband : "Hat · " + g.patch + " patch · " + g.hatColor;
}

function sim1025GearLine(name, g) { return name + " — " + sim1025GearText(g); }

// ── Payment block (email) ──
function sim1025PayHtml(data, n) {
  var total = n * SIM1025_PRICE;
  var note = SIM1025_SHORT + " — " + (data.firstName || "") + " " + (data.lastName || "");
  var each = n > 1
    ? "<p style='margin:0 0 8px'><strong>Each athlete pays their own $" + SIM1025_PRICE + "</strong> (total for your crew: $" + total + "). Please share these instructions with your teammates.</p>"
    : "";
  var btn = function(href, label) {
    return "<p style='margin:12px 0 0'><a href=\"" + escapeHtml(href) + "\" style=\"display:inline-block;background:#0E0C0C;color:#FFFF33;font-weight:bold;" +
      "text-transform:uppercase;letter-spacing:0.03em;padding:12px 24px;border-radius:2px;text-decoration:none\">" + label + "</a></p>";
  };
  if (data.payment === "Venmo") {
    var venmoUrl = "https://venmo.com/?txn=pay&audience=public&recipients=" + SIM1025_VENMO +
      "&amount=" + SIM1025_PRICE + "&note=" + encodeURIComponent(note).replace(/'/g, "%27");
    return "<h3 style='margin:0 0 6px;text-transform:uppercase'>Pay with Venmo</h3>" + each +
      "<p style='margin:0'>Send <strong>$" + SIM1025_PRICE + "</strong> to <strong>@" + SIM1025_VENMO + "</strong> with the note \"" + escapeHtml(note) + "\"" +
      (n > 1 ? " (teammates: use your own name in the note)" : "") + ".</p>" +
      btn(venmoUrl, "Pay $" + SIM1025_PRICE + " on Venmo →");
  }
  if (data.payment === "Zelle") {
    return "<h3 style='margin:0 0 6px;text-transform:uppercase'>Pay with Zelle</h3>" + each +
      "<p style='margin:0'>Send <strong>$" + SIM1025_PRICE + "</strong> via Zelle to <strong>" + SIM1025_ZELLE + "</strong> with \"" + escapeHtml(note) + "\" in the memo" +
      (n > 1 ? " (teammates: use your own name)" : "") + ".</p>";
  }
  return "<h3 style='margin:0 0 6px;text-transform:uppercase'>Pay by credit card</h3>" + each +
    "<p style='margin:0'>Complete a <strong>$" + SIM1025_PRICE + "</strong> checkout on our secure Zen Planner store" +
    (n > 1 ? " — one checkout per athlete" : "") + ".</p>" +
    btn(SIM1025_ZP_URL, "Pay $" + SIM1025_PRICE + " on Zen Planner →");
}

function sim1025SponsorHtml() {
  return "<div style='text-align:center;padding:18px 0 4px;border-top:1px solid #DFD5C3;margin-top:20px'>" +
    "<div style='font-size:11px;letter-spacing:0.08em;text-transform:uppercase;color:#5E5954;margin-bottom:10px'>Presented by</div>" +
    "<a href='https://centr.com/'><img src='" + SIM1025_SITE + "assets/sponsors/centr-logo-black.png' alt='Centr' height='24' style='height:24px;margin:0 14px;vertical-align:middle'></a>" +
    "<a href='https://www.shopboxbasics.com/'><img src='" + SIM1025_SITE + "assets/sponsors/boxbasics-logo.png' alt='Box Basics' height='24' style='height:24px;margin:0 14px;vertical-align:middle'></a>" +
    "</div>";
}

// ── Validation ──
function sim1025Validate(data) {
  var first = String(data.firstName || "").trim(), last = String(data.lastName || "").trim();
  if (!first || !last) return "Missing name.";
  if (!SIM1025_EMAIL_RE.test(String(data.email || "").trim())) return "Invalid email.";
  var need = SIM1025_DIVISIONS[data.division];
  if (!need) return "Invalid division.";
  if (["Men's", "Women's", "Mixed"].indexOf(data.sex) === -1) return "Invalid category.";
  if (data.sex === "Mixed" && data.division === "Singles") return "Mixed is for doubles and relay teams only.";
  if (["Pro", "Open", "Scaled"].indexOf(data.weights) === -1) return "Invalid weight category.";
  if (["Venmo", "Zelle", "Credit Card"].indexOf(data.payment) === -1) return "Invalid payment method.";
  if (!String(data.homeGym || "").trim()) return "Missing home gym.";
  var athletes = data.athletes || [];
  if (athletes.length !== need) return "Expected " + need + " athlete(s) for " + data.division + ".";
  for (var i = 0; i < athletes.length; i++) {
    if (!String(athletes[i].name || "").trim()) return "Missing name for athlete " + (i + 1) + ".";
    // Every teammate needs their own email (Kevin 9/30) — they're cc'd on the confirmation.
    if (i > 0 && !SIM1025_EMAIL_RE.test(String(athletes[i].email || "").trim())) return "Missing or invalid email for athlete " + (i + 1) + ".";
    var g = sim1025NormalizeGear(athletes[i]);
    if (g.error) return "Athlete " + (i + 1) + ": " + g.error + ".";
  }
  return "";
}

function sim1025CrewKey(names) {
  return names.map(sim1025Norm).sort().join("|");
}

// Gear row ↔ Signups row. Every online registration writes the same unique
// Ref to its Signups row and all its Gear rows — that's the link, and it
// survives Kevin hand-editing the heat, a name or a timestamp. Hand-typed rows
// without a Ref fall back to: same timestamp (tolerating one edited field),
// else same registrant AND heat. Records are {reg, heat, ts, ref}.
function sim1025SameReg(a, b) {
  var ra = String(a.ref || "").trim(), rb = String(b.ref || "").trim();
  if (ra && rb) return ra === rb;
  if (a.ts instanceof Date && b.ts instanceof Date) {
    if (a.ts.getTime() !== b.ts.getTime()) return false;
    return sim1025Norm(a.reg) === sim1025Norm(b.reg) || sim1025Heat(a.heat) === sim1025Heat(b.heat);
  }
  return sim1025Norm(a.reg) === sim1025Norm(b.reg) && sim1025Heat(a.heat) === sim1025Heat(b.heat);
}

// A still-active registration that is the SAME submission: same email, name,
// division, category, weights and crew, booked within the window. The heat is
// deliberately NOT part of the key — a retrier often re-picks a different heat
// because their own lost booking already filled the first one.
function sim1025FindRecentDuplicate(signups, sub, now) {
  var map = sim0913HeaderMap(signups);
  var C = { ts: sim0913Col(map, "timestamp", 0), reg: sim0913Col(map, "registrant", 1), email: sim0913Col(map, "email", 2),
            div: sim0913Col(map, "division", 3), sex: sim0913Col(map, "sex", 4), wts: sim0913Col(map, "weights", 5),
            heat: sim0913Col(map, "heat", 8), n: sim0913Col(map, "athletes", 9), gear: sim0913Col(map, "gear", 10),
            pay: sim0913Col(map, "payment method", 11), status: sim0913Col(map, "status", -1), ref: sim0913Col(map, "ref", -1) };
  var rows = signups.getDataRange().getValues();
  for (var i = rows.length - 1; i >= 1; i--) {
    var r = rows[i];
    if (sim1025Norm(r[C.email]) !== sim1025Norm(sub.email)) continue;
    if (sim1025Norm(r[C.reg]) !== sim1025Norm(sub.registrant)) continue;
    if (String(r[C.div]) !== sub.division || String(r[C.sex]) !== sub.sex || String(r[C.wts]) !== sub.weights) continue;
    if (C.status >= 0 && sim1025IsCancelled(r[C.status])) continue;
    var lines = String(r[C.gear] || "").split(/\r?\n/).filter(function(x) { return x.trim(); });
    var names = lines.map(function(ln) { return ln.split(" — ")[0]; });
    if (sim1025CrewKey(names) !== sim1025CrewKey(sub.names)) continue;
    var ts = r[C.ts];
    if (!(ts instanceof Date)) continue;
    if (now.getTime() - ts.getTime() > SIM1025_DUP_WINDOW_MIN * 60000) continue;
    var n = parseInt(r[C.n], 10) || lines.length || 1;
    var heat = sim1025Heat(r[C.heat]);
    return {
      row: i + 1, heat: heat, ts: ts, registrant: String(r[C.reg]), athletes: n, ref: C.ref >= 0 ? String(r[C.ref] || "") : "",
      kept: { division: String(r[C.div]), sex: String(r[C.sex]), weights: String(r[C.wts]),
              heat: heat, heatLabel: sim1025HeatLabel(heat),
              payment: String(r[C.pay]), total: "$" + (n * SIM1025_PRICE), gear: lines }
    };
  }
  return null;
}

// "Name — Headband · X" / "Name — Hat · P patch · C" → {name, gear} (inverse of sim1025GearLine).
function sim1025ParseGearLine(line) {
  var sep = String(line).indexOf(" — ");
  if (sep === -1) return null;
  var name = line.slice(0, sep).trim(), parts = line.slice(sep + 3).split(" · ");
  var g = null;
  if (parts[0] === "Headband" && parts.length >= 2) g = sim1025NormalizeGear({ itemId: "headband", headbandId: parts[1] });
  if (parts[0] === "Hat" && parts.length >= 3) g = sim1025NormalizeGear({ itemId: "hat", patchId: parts[1].replace(/ patch$/, ""), hatColorId: parts[2] });
  return g && !g.error ? { name: name, gear: g } : null;
}

// The KEPT registration's crew (names + gear from its Signups Gear lines);
// emails come from the resubmission, and any line that won't parse falls back
// to the resubmitted pick for that name.
function sim1025KeptAthletes(lines, submitted) {
  return submitted.map(function(a, i) {
    var hit = null;
    (lines || []).forEach(function(ln) {
      var p = sim1025ParseGearLine(ln);
      if (!hit && p && sim1025Norm(p.name) === sim1025Norm(a.name)) hit = p;
    });
    return { name: a.name, email: a.email, gear: hit ? hit.gear : a.gear };
  });
}

// Clear every row carrying this Ref (catches a write that landed but threw).
function sim1025ClearByRef(sheet, ref) {
  var iRef = sim0913Col(sim0913HeaderMap(sheet), "ref", -1);
  if (iRef < 0 || !ref) return;
  sim1025Rows(sheet).forEach(function(r, i) {
    if (String(r[iRef]) === String(ref)) sheet.getRange(i + 2, 1, 1, sheet.getLastColumn()).clearContent();
  });
}

// Gear rows (active) belonging to one Signups registration.
function sim1025GearRowsFor(gearSheet, rec) {
  var m = sim0913HeaderMap(gearSheet);
  var C = { ts: sim0913Col(m, "timestamp", 0), ath: sim0913Col(m, "athlete", 1), reg: sim0913Col(m, "registrant", 6),
            heat: sim0913Col(m, "heat", 8), st: sim0913Col(m, "status", -1), ref: sim0913Col(m, "ref", -1) };
  var out = [];
  sim1025Rows(gearSheet).forEach(function(r, i) {
    if (!String(r[C.ath] || "").trim()) return;
    if (C.st >= 0 && sim1025IsCancelled(r[C.st])) return;
    var g = { reg: r[C.reg], heat: r[C.heat], ts: r[C.ts], ref: C.ref >= 0 ? r[C.ref] : "" };
    if (sim1025SameReg(rec, g)) out.push({ row: i + 2, athlete: String(r[C.ath]).trim() });
  });
  return out;
}

// Appends one Gear row per athlete; every row written is pushed onto `written`
// as it lands, so a failure part-way still leaves the caller a list to roll back.
function sim1025WriteGearRows(gearSheet, athletes, registrant, data, slot, ts, ref, written) {
  athletes.forEach(function(a) {
    written.push(sim1025Append(gearSheet, {
      "ref": ref,
      "timestamp": ts,
      "athlete": sim1025Cell(a.name),
      "item": a.gear.item,
      "headband design": a.gear.headband,
      "hat patch": a.gear.patch,
      "hat color": a.gear.hatColor,
      "registrant": sim1025Cell(registrant),
      "division": data.division,
      "heat": slot,
      "payment method": data.payment,
      "email": sim1025Cell(a.email)
    }));
  });
}

var SIM1025_BUSY = { status: "error", error: "The signup system is busy right now — please try again in a moment." };

// ── POST ──
function handleSim1025(data) {
  var err = sim1025Validate(data);
  if (err) return sim1025Json({ status: "error", error: err });

  var now = new Date();
  var first = String(data.firstName).trim(), last = String(data.lastName).trim();
  var registrant = sim1025CleanName(first + " " + last);
  var email = String(data.email).trim();
  var athletes = (data.athletes || []).map(function(a, i) {
    return {
      name: i === 0 ? registrant : sim1025CleanName(a.name),
      email: i === 0 ? email : String(a.email || "").trim(),
      gear: sim1025NormalizeGear(a)
    };
  });
  var setup = sim1025WeightSetup(data.sex, data.weights);
  var group = setup.split(" ")[0];
  var slot = sim1025Heat(data.heat);
  var total = athletes.length * SIM1025_PRICE;
  var gearLines = athletes.map(function(a) { return sim1025GearLine(a.name, a.gear); }).join("\n");

  var ss, signups, gearSheet;
  try {
    ss = getOrCreateSim1025Spreadsheet();
    signups = ss.getSheetByName("Signups");
    gearSheet = ss.getSheetByName("Gear");
    if (!signups || !gearSheet) throw new Error("Signups or Gear tab is missing (renamed?)");
  } catch (openErr) {
    Logger.log("Sim1025 sheet open failed: " + openErr);
    return sim1025Json(SIM1025_BUSY);
  }

  var lock = LockService.getScriptLock();
  try { lock.waitLock(25000); }
  catch (lockErr) { return sim1025Json(SIM1025_BUSY); }

  var savedRow = 0, healed = null;
  try {
    var dup = sim1025FindRecentDuplicate(signups, {
      email: email, registrant: registrant, division: data.division, sex: data.sex, weights: data.weights,
      names: athletes.map(function(a) { return a.name; })
    }, now);
    if (dup) {
      // Self-heal a half-saved earlier attempt (Signups row written, Gear rows
      // or the confirmation email lost to a transient error): top up the
      // missing Gear rows from this identical-crew resubmission and send the
      // confirmation for the KEPT heat.
      // The KEPT registration wins: heat, payment and each athlete's gear come
      // from the saved row, not from this resubmission.
      var have = sim1025GearRowsFor(gearSheet, { reg: dup.registrant, heat: dup.heat, ts: dup.ts, ref: dup.ref });
      if (have.length < dup.athletes) {
        var keptAthletes = sim1025KeptAthletes(dup.kept.gear, athletes);
        var keptData = Object.assign({}, data, { payment: dup.kept.payment || data.payment });
        if (dup.kept.gear.join("\n") !== gearLines) keptData.gearImages = [];  // pictures showed the new picks
        var haveNames = have.map(function(h) { return sim1025Norm(h.athlete); });
        var missing = keptAthletes.filter(function(a) { return haveNames.indexOf(sim1025Norm(a.name)) === -1; });
        if (missing.length) {
          sim1025WriteGearRows(gearSheet, missing, dup.registrant, keptData, dup.heat, dup.ts, dup.ref, []);
          SpreadsheetApp.flush();
          healed = { dup: dup, data: keptData, athletes: keptAthletes };
        }
      }
      if (!healed) return sim1025Json({ status: "ok", saved: true, duplicate: true, row: dup.row, heat: dup.heat, kept: dup.kept });
    } else {
      var st = sim1025State(sim1025CountsAllHeats(signups));
      if (st.slots.indexOf(slot) === -1) {
        var isOverflow = SIM1025_OVERFLOW.some(function(o) { return o.slot === slot; });
        if (isOverflow) return sim1025Json({ status: "slot_full", reason: "heat_closed", slot: slot, group: group });
        return sim1025Json({ status: "error", error: "Invalid heat time." });
      }
      var cap = (st.slotCaps[slot] || {})[group] || 0;
      if (!cap) return sim1025Json({ status: "slot_full", reason: group === "Red" ? "pro_locked" : "closed", slot: slot, group: group });
      var taken = ((st.counts[slot] || {})[group]) || 0;
      if (taken >= cap) return sim1025Json({ status: "slot_full", slot: slot, group: group });

      var ref = Utilities.getUuid().slice(0, 8);
      savedRow = sim1025Append(signups, {
        "ref": ref,
        "timestamp": now,
        "registrant": sim1025Cell(registrant),
        "email": sim1025Cell(email),
        "division": data.division,
        "sex": data.sex,
        "weights": data.weights,
        "weights setup": setup,
        "home gym": sim1025Cell(String(data.homeGym || "").trim()),
        "heat": slot,
        "athletes": athletes.length,
        "gear": sim1025Cell(gearLines),
        "payment method": data.payment,
        "total due": "$" + total,
        "comments": sim1025Cell(String(data.comments || "").trim())
      });
      // All-or-nothing: if a Gear row fails to write, take the registration
      // back out so a retry books cleanly. (If even the rollback fails, the
      // duplicate path above heals it on the retry.)
      var gearRows = [];
      try {
        sim1025WriteGearRows(gearSheet, athletes, registrant, data, slot, now, ref, gearRows);
        SpreadsheetApp.flush();
      } catch (writeErr) {
        var rollback = function() {
          sim1025ClearByRef(signups, ref);
          gearRows.forEach(function(rw) { gearSheet.getRange(rw, 1, 1, gearSheet.getLastColumn()).clearContent(); });
          sim1025ClearByRef(gearSheet, ref);
          SpreadsheetApp.flush();
        };
        try { rollback(); }
        catch (rb1) {
          try { Utilities.sleep(1000); rollback(); }
          catch (rb2) {
            Logger.log("Sim1025 rollback failed: " + rb2);
            sim1025Notify(SIM1025_SHORT + " — a signup may be half-saved (" + registrant + ")",
              "A Google Sheets error interrupted " + escapeHtml(registrant) + "'s signup (" + sim1025HeatLabel(slot) + ", Ref " + ref +
              ") and the automatic undo also failed, so the sheet may hold a partial row. If they re-submit within " +
              SIM1025_DUP_WINDOW_MIN + " minutes it repairs itself; otherwise ask Claude to run sim1025Audit.");
          }
        }
        Logger.log("Sim1025 gear write failed: " + writeErr);
        return sim1025Json(SIM1025_BUSY);
      }
      // Re-evaluate the gates with this booking included — fires the Men's Pro
      // and overflow latches (and their emails) the moment they trip. The
      // booking is already committed, so a hiccup here must not fail it (the
      // next page load re-evaluates anyway).
      try { sim1025State(sim1025CountsAllHeats(signups)); }
      catch (gateErr) { Logger.log("Sim1025 post-write gate check failed: " + gateErr); }
    }
  } catch (unexpected) {
    Logger.log("Sim1025 POST failed: " + unexpected);
    return sim1025Json(SIM1025_BUSY);
  } finally {
    lock.releaseLock();
  }

  if (healed) {
    sim1025SendEmails(healed.data, ss, registrant, email, healed.athletes, setup, healed.dup.heat, total);
    return sim1025Json({ status: "ok", saved: true, duplicate: true, healed: true, row: healed.dup.row, heat: healed.dup.heat, kept: healed.dup.kept });
  }
  sim1025SendEmails(data, ss, registrant, email, athletes, setup, slot, total);
  return sim1025Json({ status: "ok", saved: true, row: savedRow, heat: slot });
}

function sim1025SendEmails(data, ss, registrant, email, athletes, setup, slot, total) {
  var teammateEmails = athletes.slice(1).map(function(a) { return a.email; })
    .filter(function(e) { return SIM1025_EMAIL_RE.test(e); });

  // Gear pictures (client-rendered small JPEGs) as inline images.
  var inlineImages = {}, gearHtml = "";
  (data.gearImages || []).slice(0, 4).forEach(function(m, i) {
    try {
      if (!m || !m.jpeg) return;
      var key = "gear" + i;
      inlineImages[key] = Utilities.newBlob(Utilities.base64Decode(m.jpeg), "image/jpeg", key + ".jpg");
      gearHtml += "<div style='display:inline-block;margin:6px;text-align:center;vertical-align:top'>" +
        "<img src='cid:" + key + "' width='220' style='border:1px solid #DFD5C3;display:block'>" +
        "<span style='font-size:12px;color:#5E5954'>" + escapeHtml(m.name || "") + "</span></div>";
    } catch (imgErr) { /* skip a bad image */ }
  });

  var detailsTable =
    "<table style='border-collapse:collapse;font-family:Arial,sans-serif;font-size:14px'>" +
    row("Event", SIM1025_EVENT) +
    row("Heat Time", sim1025HeatLabel(slot)) +
    row("Division", data.sex + " " + data.division) +
    row("Weights", data.weights + " (" + setup + ")") +
    row("Home Gym", data.homeGym || "") +
    row("Payment", data.payment + " — $" + total + (athletes.length > 1 ? " ($" + SIM1025_PRICE + " each)" : "")) +
    athletes.map(function(a, i) {
      return row("Athlete " + (i + 1), a.name + " · " + sim1025GearText(a.gear) + (a.email ? " · " + a.email : ""));
    }).join("") +
    (data.comments ? row("Comments", data.comments) : "") +
    "</table>";

  if (email) {
    try {
      var mail = {
        to: email,
        replyTo: NOTIFY_EMAIL,
        subject: "You're in! " + SIM1025_EVENT + " — Koda CrossFit Iron View",
        htmlBody:
          "<div style='font-family:Arial,Helvetica,sans-serif;max-width:620px;color:#1A1818'>" +
          "<div style='background:#1A1818;color:#fff;padding:22px 24px'>" +
            "<div style='font-size:11px;letter-spacing:0.1em;text-transform:uppercase;color:#E5DDCF'>Koda CrossFit Iron View · Presented by Centr &amp; Box Basics</div>" +
            "<div style='font-size:34px;line-height:1;font-weight:900;text-transform:uppercase;margin-top:10px'>Hyrox<br>" +
              "<span style='background:#FFFF33;color:#1A1818;padding:0 6px'>Simulation</span></div>" +
            "<div style='font-size:16px;font-weight:bold;text-transform:uppercase;margin-top:12px'>Sunday, October 25</div>" +
          "</div>" +
          "<div style='padding:20px 4px 0'>" +
          "<h2 style='margin:0 0 6px'>You're in, " + escapeHtml(data.firstName || "") + "!</h2>" +
          "<p style='margin:0 0 12px'>You're signed up for the <strong>" + SIM1025_EVENT + "</strong> at Koda CrossFit Iron View, 740 S Pierce Ave, Louisville, CO.</p>" +
          "<div style='background:#FFFF33;padding:12px 16px;font-size:18px;font-weight:bold;text-transform:uppercase'>Your heat: " + sim1025HeatLabel(slot) + "</div>" +
          "<p style='margin:10px 0 0;color:#5E5954'>Plan to arrive early to check in and warm up.</p>" +
          (teammateEmails.length
            ? "<p style='color:#5E5954'>" + (teammateEmails.length === 1 ? "Your teammate is" : "Your teammates are") +
              " copied on this email, so everyone has the heat time and payment details.</p>"
            : "") +
          "<div style='background:#EDEBE7;border-left:4px solid #FFFF33;padding:14px 16px;margin:16px 0'>" + sim1025PayHtml(data, athletes.length) + "</div>" +
          detailsTable +
          (gearHtml ? "<h3 style='margin:18px 0 6px;text-transform:uppercase'>Your gear</h3>" + gearHtml : "") +
          sim1025SponsorHtml() +
          "<p style='color:#777;font-size:13px;margin-top:14px'>Questions? Just reply to this email.</p>" +
          "</div></div>",
        inlineImages: inlineImages
      };
      if (teammateEmails.length) mail.cc = teammateEmails.join(",");
      MailApp.sendEmail(mail);
    } catch (mailErr) {
      Logger.log("Sim1025 confirmation email failed: " + mailErr);
    }
  }

  if (NOTIFY_EMAIL) {
    try {
      var hats = athletes.filter(function(a) { return a.gear.item !== "Headband"; }).length;
      var bands = athletes.length - hats;
      var gearCount = [bands ? bands + (bands === 1 ? " headband" : " headbands") : "", hats ? hats + (hats === 1 ? " hat" : " hats") : ""]
        .filter(function(x) { return x; }).join(" + ");
      MailApp.sendEmail({
        to: NOTIFY_EMAIL,
        subject: "New " + SIM1025_SHORT + " signup — " + registrant + " (" + sim1025HeatLabel(slot) + ", " +
                 data.sex + " " + data.division + ", " + gearCount + ", " + data.payment + ")",
        htmlBody:
          "<h3>New signup for " + SIM1025_EVENT + "</h3>" +
          "<table style='border-collapse:collapse;font-family:Arial,sans-serif;font-size:14px'>" +
          row("Registrant", registrant) + row("Email", email) + "</table>" + detailsTable +
          (gearHtml ? "<h3 style='margin-top:16px'>Gear</h3>" + gearHtml : "") +
          "<p><a href='" + ss.getUrl() + "'>View all signups in the spreadsheet</a></p>",
        inlineImages: inlineImages
      });
    } catch (mailErr2) {
      Logger.log("Sim1025 notify email failed: " + mailErr2);
    }
  }
}

function sim1025Rows(sheet) { return sheet.getDataRange().getValues().slice(1); }

// ── Read-only reports ──
function sim1025GearTally() {
  var ss = getOrCreateSim1025Spreadsheet();
  var gear = ss.getSheetByName("Gear");
  var m = sim0913HeaderMap(gear);
  var C = { ath: sim0913Col(m, "athlete", 1), item: sim0913Col(m, "item", 2), hb: sim0913Col(m, "headband design", 3),
            patch: sim0913Col(m, "hat patch", 4), color: sim0913Col(m, "hat color", 5), reg: sim0913Col(m, "registrant", 6),
            status: sim0913Col(m, "status", -1) };
  var hbNames = Object.keys(SIM1025_HEADBANDS).map(function(k) { return SIM1025_HEADBANDS[k]; });
  var patchNames = Object.keys(SIM1025_PATCHES).map(function(k) { return SIM1025_PATCHES[k]; });
  var colorNames = Object.keys(SIM1025_HAT_COLORS).map(function(k) { return SIM1025_HAT_COLORS[k]; });
  var hb = {}, hat = {}, nHb = 0, nHat = 0, unknown = [];
  sim1025Rows(gear).forEach(function(r, i) {
    var ath = String(r[C.ath] || "").trim();
    if (!ath || sim1025IsTest(ath) || sim1025IsTest(r[C.reg])) return;
    if (C.status >= 0 && sim1025IsCancelled(r[C.status])) return;
    var item = String(r[C.item] || "").trim();
    if (item === "Headband") {
      var d = String(r[C.hb] || "").trim();
      if (hbNames.indexOf(d) === -1) { unknown.push({ row: i + 2, athlete: ath, value: d }); return; }
      hb[d] = (hb[d] || 0) + 1; nHb++;
    } else if (item === "Hat" || item === "Trucker Hat") {
      var p = String(r[C.patch] || "").trim(), c = String(r[C.color] || "").trim();
      if (patchNames.indexOf(p) === -1 || colorNames.indexOf(c) === -1) { unknown.push({ row: i + 2, athlete: ath, value: p + " / " + c }); return; }
      hat[p + "|" + c] = (hat[p + "|" + c] || 0) + 1; nHat++;
    } else {
      unknown.push({ row: i + 2, athlete: ath, value: item });
    }
  });

  var width = colorNames.length + 2;
  var pad = function(a) { while (a.length < width) a.push(""); return a; };
  var out = [pad(["HEADBANDS (JUNK Brands)", "Qty"])];
  hbNames.forEach(function(d) { out.push(pad([d, hb[d] || 0])); });
  out.push(pad(["Total headbands", nHb]));
  out.push(pad([]));
  var hatHeadRow = out.length + 1;
  out.push(["HATS — patch \\ hat color"].concat(colorNames).concat(["Total"]));
  patchNames.forEach(function(p) {
    var line = [p], sum = 0;
    colorNames.forEach(function(c) { var n = hat[p + "|" + c] || 0; line.push(n); sum += n; });
    line.push(sum);
    out.push(line);
  });
  var colTotals = ["Total hats"], hatSum = 0;
  colorNames.forEach(function(c) {
    var n = 0; patchNames.forEach(function(p) { n += hat[p + "|" + c] || 0; });
    colTotals.push(n); hatSum += n;
  });
  colTotals.push(hatSum);
  out.push(colTotals);
  out.push(pad([]));
  out.push(pad(["GRAND TOTAL (headbands + hats)", nHb + nHat]));

  var old = ss.getSheetByName("Gear Tally");
  if (old) ss.deleteSheet(old);
  var tally = ss.insertSheet("Gear Tally");
  tally.getRange(1, 1, out.length, width).setValues(out);
  [1, hatHeadRow].forEach(function(r) {
    tally.getRange(r, 1, 1, width).setFontWeight("bold").setBackground("#1A1818").setFontColor("#FFFF33");
  });
  tally.setColumnWidth(1, 250);
  for (var ci = 2; ci <= width; ci++) tally.setColumnWidth(ci, 150);
  return { status: "ok", headbands: nHb, hats: nHat, byHeadband: hb, byHat: hat, unrecognised: unknown };
}

// A heat that exists on the event schedule at all (base or overflow),
// whether or not it's currently open to new signups.
function sim1025KnownHeat(h) {
  return SIM1025_SLOTS.indexOf(h) !== -1 || SIM1025_OVERFLOW.some(function(o) { return o.slot === h; });
}

// Lane map per heat: who holds each lane type. Cancelled + test rows excluded.
// Includes crews in a heat that has since been closed to new signups (e.g.
// 12:00 held closed by hand) — they're still racing; see closedSlots.
function sim1025Grid() {
  var ss = getOrCreateSim1025Spreadsheet();
  var sg = ss.getSheetByName("Signups");
  var m = sim0913HeaderMap(sg);
  var C = { reg: sim0913Col(m, "registrant", 1), div: sim0913Col(m, "division", 3), sex: sim0913Col(m, "sex", 4),
            wts: sim0913Col(m, "weights", 5), setup: sim0913Col(m, "weights setup", 6), heat: sim0913Col(m, "heat", 8),
            n: sim0913Col(m, "athletes", 9), gear: sim0913Col(m, "gear", 10), paid: sim0913Col(m, "paid?", 13),
            status: sim0913Col(m, "status", -1) };
  var st = sim1025State();
  var grid = {}, slots = st.slots.slice(), slotCaps = {}, closedSlots = [];
  Object.keys(st.counts).forEach(function(h) {
    var c = st.counts[h];
    if (slots.indexOf(h) === -1 && sim1025KnownHeat(h) && (c.Red || c.Green || c.Blue || c.Scaled)) { slots.push(h); closedSlots.push(h); }
  });
  slots.sort(function(a, b) { return sim1025Minutes(a) - sim1025Minutes(b); });
  slots.forEach(function(t) {
    grid[t] = { Red: [], Green: [], Blue: [], Scaled: [] };
    slotCaps[t] = sim1025Caps(t, true);  // physical lanes
  });
  var totalAthletes = 0, totalCrews = 0;
  sim1025Rows(sg).forEach(function(r) {
    var reg = String(r[C.reg] || "").trim();
    if (!reg || sim1025IsTest(reg)) return;
    if (C.status >= 0 && sim1025IsCancelled(r[C.status])) return;
    var heat = sim1025Heat(r[C.heat]);
    var grp = String(r[C.setup] || "").split(" ")[0];
    if (!grid[heat] || !grid[heat][grp]) return;
    var n = parseInt(r[C.n], 10); if (isNaN(n)) n = 1;
    var names = String(r[C.gear] || "").split(/\r?\n/).map(function(ln) { return ln.split(" — ")[0].trim(); })
      .filter(function(x) { return x; });
    if (!names.length) names = [reg];
    var paid = r[C.paid];
    grid[heat][grp].push({ name: reg, names: names, division: String(r[C.div] || ""), sex: String(r[C.sex] || ""),
                           weights: String(r[C.wts] || ""), athletes: n,
                           paid: paid === true || (paid !== false && String(paid || "").trim() !== "") });
    totalAthletes += n; totalCrews++;
  });
  return { status: "ok", slots: slots, closedSlots: closedSlots, slotCaps: slotCaps, proAllOpen: st.proAllOpen, grid: grid,
           totalCrews: totalCrews, totalAthletes: totalAthletes };
}

// Everyone signed up (registrants + every athlete on the Gear tab).
function sim1025Roster() {
  var ss = getOrCreateSim1025Spreadsheet();
  var out = { status: "ok", registrants: [], athletes: [] };
  var sg = ss.getSheetByName("Signups"), gm = sim0913HeaderMap(sg);
  var iReg = sim0913Col(gm, "registrant", 1), iEmail = sim0913Col(gm, "email", 2), iSt = sim0913Col(gm, "status", -1);
  sim1025Rows(sg).forEach(function(r) {
    var name = String(r[iReg] || "").trim();
    if (!name || sim1025IsTest(name) || (iSt >= 0 && sim1025IsCancelled(r[iSt]))) return;
    out.registrants.push({ name: name, email: String(r[iEmail] || "").trim() });
  });
  var gs = ss.getSheetByName("Gear"), mm = sim0913HeaderMap(gs);
  var iAth = sim0913Col(mm, "athlete", 1), iAE = sim0913Col(mm, "email", 10), iGR = sim0913Col(mm, "registrant", 6), iGS = sim0913Col(mm, "status", -1);
  sim1025Rows(gs).forEach(function(r) {
    var name = String(r[iAth] || "").trim();
    if (!name || sim1025IsTest(name) || sim1025IsTest(r[iGR]) || (iGS >= 0 && sim1025IsCancelled(r[iGS]))) return;
    out.athletes.push({ name: name, email: String(r[iAE] || "").trim() });
  });
  return out;
}

// Read-only: find an athlete/registrant on both tabs.
function sim1025FindAthlete(q) {
  var needle = String(q || "").trim().toLowerCase();
  if (!needle) return { status: "error", error: "no query" };
  var ss = getOrCreateSim1025Spreadsheet();
  var out = { status: "ok", query: q, gear: [], signups: [] };
  [["Gear", "gear"], ["Signups", "signups"]].forEach(function(pair) {
    var sh = ss.getSheetByName(pair[0]);
    var head = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
    sim1025Rows(sh).forEach(function(r, i) {
      var hay = r.map(function(v) { return String(v); }).join(" | ").toLowerCase();
      if (hay.indexOf(needle) === -1) return;
      var o = { row: i + 2 };
      head.forEach(function(h, ci) { if (h) o[h] = h === "Heat" ? sim1025Heat(r[ci]) : String(r[ci]); });
      out[pair[1]].push(o);
    });
  });
  return out;
}

// Cancel WITHOUT deleting: stamps Status on ONE Signups row and on that
// registration's Gear rows. Frees the lane, drops the gear from the tally,
// keeps the payment trail. Reverse by clearing the Status cells.
// Matches the registrant's full name exactly (case/space-insensitive); if two
// active registrations share it, nothing changes and the matches come back —
// re-run with &row=<Signups row>.
function sim1025Cancel(q, note, rowParam) {
  var needle = sim1025Norm(q);
  var wantRow = parseInt(rowParam, 10);
  if (!needle && !wantRow) return { status: "error", error: "no registrant (or row)" };
  var ss = getOrCreateSim1025Spreadsheet();
  var sg = ss.getSheetByName("Signups"), gm = sim0913HeaderMap(sg);
  var gs = ss.getSheetByName("Gear"), mm = sim0913HeaderMap(gs);
  var G = { ref: sim0913Col(gm, "ref", -1), ts: sim0913Col(gm, "timestamp", 0), reg: sim0913Col(gm, "registrant", 1), email: sim0913Col(gm, "email", 2),
            div: sim0913Col(gm, "division", 3), heat: sim0913Col(gm, "heat", 8), st: sim0913Col(gm, "status", -1) };
  var M = { ref: sim0913Col(mm, "ref", -1), ts: sim0913Col(mm, "timestamp", 0), ath: sim0913Col(mm, "athlete", 1), reg: sim0913Col(mm, "registrant", 6),
            heat: sim0913Col(mm, "heat", 8), st: sim0913Col(mm, "status", -1) };
  if (G.st < 0 || M.st < 0) return { status: "error", error: "Signups or Gear tab has no Status column" };

  var matches = [], already = [];
  sim1025Rows(sg).forEach(function(r, i) {
    var row = i + 2;
    if (wantRow && row !== wantRow) return;
    if (needle && sim1025Norm(r[G.reg]) !== needle) return;
    if (!String(r[G.reg] || "").trim()) return;
    var info = { row: row, registrant: String(r[G.reg]), email: String(r[G.email] || ""), division: String(r[G.div] || ""),
                 heat: sim1025Heat(r[G.heat]), ts: r[G.ts], ref: r[G.ref] };
    if (sim1025IsCancelled(r[G.st])) already.push(info); else matches.push(info);
  });
  var strip = function(m) { return { row: m.row, registrant: m.registrant, email: m.email, division: m.division, heat: m.heat }; };
  if (!matches.length) {
    return already.length ? { status: "already_cancelled", signups: already.map(strip) } : { status: "not_found" };
  }
  if (matches.length > 1) return { status: "ambiguous", matches: matches.map(strip), hint: "re-run with &row=<Signups row>" };

  var hit = matches[0];
  var stamp = "CANCELLED " + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd") + (note ? " — " + note : "");
  sg.getRange(hit.row, G.st + 1).setValue(stamp);
  var gearDone = [];
  sim1025Rows(gs).forEach(function(r, i) {
    if (!sim1025SameReg({ reg: hit.registrant, heat: hit.heat, ts: hit.ts, ref: hit.ref }, { reg: r[M.reg], heat: r[M.heat], ts: r[M.ts], ref: r[M.ref] })) return;
    if (sim1025IsCancelled(r[M.st])) return;
    gs.getRange(i + 2, M.st + 1).setValue(stamp);
    gearDone.push({ row: i + 2, athlete: String(r[M.ath] || "") });
  });
  var res = { status: "ok", stamp: stamp, signups: [strip(hit)], gear: gearDone };
  if (!gearDone.length) res.warning = "No Gear rows were linked to this registration — check the Gear tab by hand.";
  return res;
}

// Change one athlete's gear pick (e.g. "switch Sarah to a Lilac headband").
// Updates the Gear row AND that athlete's line in the Signups "Gear" column so
// the order and the registration can never disagree. An exact full-name match
// wins over partial ones; still ambiguous → nothing changes (use &row=<Gear row>).
//   ?action=sim1025SetGear&athlete=<name>&item=headband&design=lilac
//   ?action=sim1025SetGear&athlete=<name>&item=hat&patch=sunset&color=moss
function sim1025SetGear(q, p) {
  var needle = sim1025Norm(q);
  var wantRow = parseInt(p.row, 10);
  if (!needle && !wantRow) return { status: "error", error: "no athlete (or row)" };
  var ss = getOrCreateSim1025Spreadsheet();
  var gs = ss.getSheetByName("Gear"), mm = sim0913HeaderMap(gs);
  var C = { ref: sim0913Col(mm, "ref", -1), ts: sim0913Col(mm, "timestamp", 0), ath: sim0913Col(mm, "athlete", 1), item: sim0913Col(mm, "item", 2),
            hb: sim0913Col(mm, "headband design", 3), patch: sim0913Col(mm, "hat patch", 4), color: sim0913Col(mm, "hat color", 5),
            reg: sim0913Col(mm, "registrant", 6), heat: sim0913Col(mm, "heat", 8), status: sim0913Col(mm, "status", -1) };
  var hits = [];
  sim1025Rows(gs).forEach(function(r, i) {
    var row = i + 2, ath = String(r[C.ath] || "").trim();
    if (!ath) return;
    if (wantRow && row !== wantRow) return;
    if (needle && sim1025Norm(ath).indexOf(needle) === -1) return;
    if (C.status >= 0 && sim1025IsCancelled(r[C.status])) return;
    hits.push({ row: row, athlete: ath, registrant: String(r[C.reg] || "").trim(), heat: sim1025Heat(r[C.heat]), ts: r[C.ts], ref: r[C.ref],
                current: { item: String(r[C.item] || ""), headband: String(r[C.hb] || ""), patch: String(r[C.patch] || ""), hatColor: String(r[C.color] || "") } });
  });
  if (hits.length > 1 && needle) {
    var exact = hits.filter(function(h) { return sim1025Norm(h.athlete) === needle; });
    if (exact.length >= 1) hits = exact;
  }
  var strip = function(h) { return { row: h.row, athlete: h.athlete, registrant: h.registrant, heat: h.heat, current: h.current }; };
  if (!hits.length) return { status: "not_found" };
  if (hits.length > 1) return { status: "ambiguous", matches: hits.map(strip), hint: "re-run with &row=<Gear row>" };
  var h = hits[0];

  // Start from the current pick so a partial change (just the color) works.
  var cur = h.current;
  var itemIn = String(p.item || "").trim().toLowerCase() || (cur.item === "Headband" ? "headband" : "hat");
  var next = sim1025NormalizeGear({
    itemId: itemIn,
    headbandId: p.design || (itemIn === "headband" ? cur.headband : ""),
    patchId: p.patch || (itemIn !== "headband" ? cur.patch : ""),
    hatColorId: p.color || (itemIn !== "headband" ? cur.hatColor : "")
  });
  if (next.error) return { status: "error", error: next.error, athlete: h.athlete,
    valid: { headbands: SIM1025_HEADBANDS, patches: SIM1025_PATCHES, colors: SIM1025_HAT_COLORS } };

  gs.getRange(h.row, C.item + 1).setValue(next.item);
  gs.getRange(h.row, C.hb + 1).setValue(next.headband);
  gs.getRange(h.row, C.patch + 1).setValue(next.patch);
  gs.getRange(h.row, C.color + 1).setValue(next.hatColor);

  var sg = ss.getSheetByName("Signups"), gm = sim0913HeaderMap(sg);
  var G = { ref: sim0913Col(gm, "ref", -1), ts: sim0913Col(gm, "timestamp", 0), reg: sim0913Col(gm, "registrant", 1), heat: sim0913Col(gm, "heat", 8),
            gear: sim0913Col(gm, "gear", 10), st: sim0913Col(gm, "status", -1) };
  var signupChange = null;
  sim1025Rows(sg).forEach(function(r, i) {
    if (signupChange) return;
    if (!sim1025SameReg({ reg: r[G.reg], heat: r[G.heat], ts: r[G.ts], ref: r[G.ref] }, { reg: h.registrant, heat: h.heat, ts: h.ts, ref: h.ref })) return;
    if (G.st >= 0 && sim1025IsCancelled(r[G.st])) return;
    var lines = String(r[G.gear] || "").split("\n");
    var touched = false;
    var out = lines.map(function(line) {
      var nm = line.split(" — ")[0].trim();
      if (touched || sim1025Norm(nm) !== sim1025Norm(h.athlete)) return line;
      touched = true;
      return sim1025GearLine(nm, next);
    });
    if (touched) {
      sg.getRange(i + 2, G.gear + 1).setValue(sim1025Cell(out.join("\n")));
      signupChange = { row: i + 2, before: lines.join(" | "), after: out.join(" | ") };
    }
  });
  var out2 = { status: "ok", athlete: h.athlete, gearRow: h.row, before: cur, after: next, signups: signupChange };
  if (!signupChange) out2.warning = "Gear row updated, but the matching line in the Signups Gear column wasn't found — update it by hand.";
  return out2;
}

// Integrity report (read-only).
function sim1025Audit() {
  var ss = getOrCreateSim1025Spreadsheet();
  var sg = ss.getSheetByName("Signups"), gs = ss.getSheetByName("Gear");
  var gm = sim0913HeaderMap(sg), mm = sim0913HeaderMap(gs);
  var G = { ref: sim0913Col(gm, "ref", -1), ts: sim0913Col(gm, "timestamp", 0), reg: sim0913Col(gm, "registrant", 1), email: sim0913Col(gm, "email", 2),
            setup: sim0913Col(gm, "weights setup", 6), heat: sim0913Col(gm, "heat", 8), n: sim0913Col(gm, "athletes", 9),
            status: sim0913Col(gm, "status", -1) };
  var M = { ref: sim0913Col(mm, "ref", -1), ts: sim0913Col(mm, "timestamp", 0), ath: sim0913Col(mm, "athlete", 1), item: sim0913Col(mm, "item", 2),
            reg: sim0913Col(mm, "registrant", 6), heat: sim0913Col(mm, "heat", 8), status: sim0913Col(mm, "status", -1) };
  var st = sim1025State();
  var issues = [];
  var add = function(sev, type, msg, where) { issues.push({ severity: sev, type: type, detail: msg, where: where }); };
  var gRows = sim1025Rows(sg), mRows = sim1025Rows(gs);
  var gF = sg.getDataRange().getFormulas().slice(1), mF = gs.getDataRange().getFormulas().slice(1);
  var hasData = function(r, f) {
    return r.some(function(v, c) { return !(f && f[c]) && v !== "" && v !== false && v !== null && String(v).trim() !== ""; });
  };
  var byName = {}, byEmail = {}, use = {}, active = 0, activeRegs = [];
  gRows.forEach(function(r, i) {
    var row = i + 2, reg = String(r[G.reg] || "").trim();
    if (!reg) { if (hasData(r, gF[i])) add("warn", "no-registrant", "Signups row has data but no registrant", row); return; }
    if (sim1025IsTest(reg) || (G.status >= 0 && sim1025IsCancelled(r[G.status]))) return;
    active++;
    var heat = sim1025Heat(r[G.heat]), grp = String(r[G.setup] || "").split(" ")[0];
    activeRegs.push({ reg: sim1025Norm(reg), heat: heat, ts: r[G.ts], ref: r[G.ref] });
    var em = sim1025Norm(r[G.email]);
    if (em) (byEmail[em] = byEmail[em] || []).push(row);
    (byName[sim1025Norm(reg)] = byName[sim1025Norm(reg)] || []).push(row);
    if (st.slots.indexOf(heat) === -1) {
      if (sim1025KnownHeat(heat)) add("warn", "closed-heat-booked", "Booked in the " + sim1025HeatLabel(heat) + " heat, which is currently closed to new signups: " + reg, row);
      else add("error", "bad-heat", "Heat \"" + heat + "\" is not a valid heat: " + reg, row);
    }
    if (!SIM1025_GROUP_CAPS[grp]) add("error", "bad-group", "Unknown weight setup (" + grp + "): " + reg, row);
    else (use[heat + "|" + grp] = use[heat + "|" + grp] || []).push(reg);
    var declared = parseInt(r[G.n], 10), actual = 0;
    mRows.forEach(function(m) {
      if (sim1025SameReg({ reg: reg, heat: heat, ts: r[G.ts], ref: r[G.ref] }, { reg: m[M.reg], heat: m[M.heat], ts: m[M.ts], ref: m[M.ref] }) &&
          !(M.status >= 0 && sim1025IsCancelled(m[M.status]))) actual++;
    });
    if (!isNaN(declared) && declared !== actual) add("error", "gear-count", "Says " + declared + " athlete(s) but has " + actual + " gear row(s): " + reg, row);
  });
  Object.keys(byName).forEach(function(k) { if (byName[k].length > 1) add("warn", "duplicate-name", "Same registrant on rows " + byName[k].join(", ") + " — check it isn't a double submit", byName[k][0]); });
  Object.keys(byEmail).forEach(function(k) { if (byEmail[k].length > 1) add("warn", "duplicate-email", "Same email (" + k + ") on rows " + byEmail[k].join(", "), byEmail[k][0]); });
  Object.keys(use).forEach(function(k) {
    var p = k.split("|"), cap = sim1025Caps(p[0], true)[p[1]] || 0;  // physical lanes, not the current gate
    if (use[k].length > cap) add("error", "over-capacity", p[0] + " " + p[1] + ": " + use[k].length + " booked, " + cap + " lane(s) open (" + use[k].join(", ") + ")", 0);
  });
  var gearCount = 0;
  mRows.forEach(function(r, i) {
    var ath = String(r[M.ath] || "").trim(), reg = String(r[M.reg] || "").trim();
    if (!ath && !reg) { if (hasData(r, mF[i])) add("warn", "no-athlete", "Gear row has data but no athlete/registrant", i + 2); return; }
    if (sim1025IsTest(ath) || sim1025IsTest(reg)) { add("info", "test-row", "Leftover test row: " + (ath || reg), i + 2); return; }
    if (M.status >= 0 && sim1025IsCancelled(r[M.status])) return;
    gearCount++;
    var owner = activeRegs.some(function(a) { return sim1025SameReg(a, { reg: reg, heat: r[M.heat], ts: r[M.ts], ref: r[M.ref] }); });
    if (!owner) add("error", "orphan-gear", "Gear row has no active registration (" + reg + " / " + ath + ")", i + 2);
    var item = String(r[M.item] || "").trim();
    if (item !== "Headband" && item !== "Hat" && item !== "Trucker Hat") add("error", "bad-item", "Unrecognised item \"" + item + "\": " + ath, i + 2);
  });
  return { status: "ok", activeRegistrations: active, activeGear: gearCount, proAllOpen: st.proAllOpen,
           openOverflow: st.overflow, issueCount: issues.length, issues: issues };
}

// Gate status: Men's Pro every-other-heat fill + overflow chain.
function sim1025Status() {
  var st = sim1025State();
  var props = PropertiesService.getScriptProperties();
  var on = SIM1025_SLOTS.filter(sim1025ProOnPattern);
  var proUsed = on.filter(function(s) { return (((st.counts[s] || {}).Red) || 0) >= 1; }).length;
  var chain = [], active = SIM1025_SLOTS.slice();
  SIM1025_OVERFLOW.forEach(function(ov) {
    var g = 0, b = 0;
    active.forEach(function(s) { g += ((st.counts[s] || {}).Green) || 0; b += ((st.counts[s] || {}).Blue) || 0; });
    var isOpen = st.overflow.indexOf(ov.slot) !== -1;
    chain.push({ slot: ov.slot, label: ov.label, greenUsed: g, blueUsed: b, cap: active.length * SIM1025_GROUP_CAPS.Green,
                 mode: props.getProperty(ov.prop) === "1" ? "open" : props.getProperty(ov.prop) === "0" ? "held closed" : "auto",
                 open: isOpen });
    if (isOpen) active.push(ov.slot);
  });
  var proState = props.getProperty(SIM1025_PRO_PROP);
  return { status: "ok",
           pro: { everyMinutes: SIM1025_PRO_EVERY_MIN, onPatternSlots: on, booked: proUsed, of: on.length, allOpen: st.proAllOpen,
                  mode: proState === "1" ? "open" : proState === "0" ? "held closed" : "auto" },
           overflow: chain, openOverflow: st.overflow };
}

function sim1025Leftovers() {
  var ss = getOrCreateSim1025Spreadsheet();
  var found = [];
  [["Signups", "registrant", 1, 1], ["Gear", "athlete", 1, 6]].forEach(function(t) {
    var sh = ss.getSheetByName(t[0]), m = sim0913HeaderMap(sh);
    var iA = sim0913Col(m, t[1], t[2]), iR = sim0913Col(m, "registrant", t[3]);
    sim1025Rows(sh).forEach(function(r, i) {
      if (sim1025IsTest(r[iA]) || sim1025IsTest(r[iR])) found.push({ tab: t[0], row: i + 2, who: String(r[iA]), registrant: String(r[iR]) });
    });
  });
  return { status: "ok", leftovers: found };
}

// ── Admin key ──
function sim1025Authorized(key) {
  if (!key) return false;
  var digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(key), Utilities.Charset.UTF_8);
  var hex = digest.map(function(b) { var v = (b < 0 ? b + 256 : b).toString(16); return v.length === 1 ? "0" + v : v; }).join("");
  return hex === SIM1025_ADMIN_KEY_SHA256;
}

// ── GET router (called from doGet for any action starting with "sim1025") ──
function sim1025Get(action, e) {
  try { return sim1025GetInner(action, e); }
  catch (err) {
    Logger.log("Sim1025 GET " + action + " failed: " + err);
    var p0 = (e && e.parameter) || {};
    var detail = String(err && err.message || err) === "SIM1025_SHEET_UNAVAILABLE" ? "sheet temporarily unavailable — try again"
      : sim1025Authorized(p0.key) ? String(err) : "temporarily unavailable — try again";
    return sim1025Json({ status: "error", error: detail });
  }
}

function sim1025GetInner(action, e) {
  var p = (e && e.parameter) || {};
  if (action === "sim1025Slots") return sim1025Json(sim1025SlotCounts());
  if (!sim1025Authorized(p.key)) return sim1025Json({ status: "error", error: "forbidden" });
  switch (action) {
    case "sim1025Info": {
      var ss = getOrCreateSim1025Spreadsheet();
      return sim1025Json({ status: "ok", name: ss.getName(), url: ss.getUrl(), id: ss.getId() });
    }
    case "sim1025Health": {
      var ssH = getOrCreateSim1025Spreadsheet();
      return sim1025Json({ status: "ok", signupsNextRow: sim1025NextRow(ssH.getSheetByName("Signups")),
                           gearNextRow: sim1025NextRow(ssH.getSheetByName("Gear")) });
    }
    case "sim1025Status": return sim1025Json(sim1025Status());
    case "sim1025SetPro": {
      // open=1 opens every Men's Pro heat now; open=0 holds the in-between heats
      // closed (even if the nine fill); open=auto returns to automatic.
      var props = PropertiesService.getScriptProperties();
      var mode = sim1025OpenParam(p.open);
      if (!mode) return sim1025Json({ status: "error", error: "open must be 1, 0 or auto" });
      if (mode === "auto") props.deleteProperty(SIM1025_PRO_PROP); else props.setProperty(SIM1025_PRO_PROP, mode);
      return sim1025Json({ status: "ok", mode: mode, proAllOpen: sim1025State().proAllOpen });
    }
    case "sim1025SetOverflow": {
      var propsO = PropertiesService.getScriptProperties();
      var slotO = sim1025Heat(p.slot || SIM1025_OVERFLOW[0].slot);
      var idx = -1;
      SIM1025_OVERFLOW.forEach(function(o, i) { if (o.slot === slotO) idx = i; });
      if (idx < 0) return sim1025Json({ status: "error", error: "unknown overflow slot: " + slotO, validSlots: SIM1025_OVERFLOW.map(function(o) { return o.slot; }) });
      var modeO = sim1025OpenParam(p.open);
      if (!modeO) return sim1025Json({ status: "error", error: "open must be 1, 0 or auto" });
      if (modeO === "1") {
        for (var k = 0; k <= idx; k++) propsO.setProperty(SIM1025_OVERFLOW[k].prop, "1");  // the chain opens in order
      } else if (modeO === "0") {
        propsO.setProperty(SIM1025_OVERFLOW[idx].prop, "0");
      } else {
        propsO.deleteProperty(SIM1025_OVERFLOW[idx].prop);
      }
      return sim1025Json({ status: "ok", slot: slotO, mode: modeO, openOverflow: sim1025State().overflow });
    }
    case "sim1025Roster": return sim1025Json(sim1025Roster());
    case "sim1025FindAthlete": return sim1025Json(sim1025FindAthlete(p.q));
    case "sim1025Cancel": return sim1025Json(sim1025Cancel(p.registrant, p.note, p.row));
    case "sim1025SetGear": return sim1025Json(sim1025SetGear(p.athlete, p));
    case "sim1025GearTally": return sim1025Json(sim1025GearTally());
    case "sim1025Grid": return sim1025Json(sim1025Grid());
    case "sim1025Audit": return sim1025Json(sim1025Audit());
    case "sim1025Leftovers": return sim1025Json(sim1025Leftovers());
  }
  return sim1025Json({ status: "error", error: "unknown action: " + action });
}
