// ═══════════════════════════════════════════════════════════════
// FREE CLASSES FOR HYROX SIM ATHLETES — Oct 26 – Nov 30, 2026
// (posted from classes.html with type:"trial1025")
// Each athlete picks up to 3 classes (HYROX first; the page can show the
// full schedule). Own spreadsheet:
//   "Signups"  — one row per email. Picking again replaces that athlete's
//                UPCOMING picks; classes already past stay on the row and
//                still count toward the 3. Class 1–3 hold readable labels
//                ("Mon, Nov 2 · 6:00 AM · HYROX") — Kevin can edit them by
//                hand in that same format, and Status "Cancelled" drops a row.
//   "By Class" — rebuilt on every save: who is coming to each class, for the
//                coaches. Don't edit it — edit Signups instead.
// Emails: a confirmation to the athlete (Google Calendar links + an .ics
// file) and a heads-up to NOTIFY_EMAIL. "Hyrox Sim" says whether the email
// (or name) is on the Oct 25 or Sept 13 roster.
//
// The page owns the class lineup. The backend checks each pick's shape
// (a real date inside the window, still upcoming, a known program) instead
// of keeping a second copy of the schedule.
//
// Admin GETs need &key=<admin key> (the sim1025 key):
//   ?action=trial1025Info | trial1025Roster | trial1025ByClass | trial1025ClearTests
//
// Shared helpers: sim0913HeaderMap, sim0913Col, sim1025Json, sim1025Norm,
// sim1025IsTest, sim1025IsCancelled, sim1025Cell, sim1025Authorized,
// SIM1025_EMAIL_RE, SIM1025_SHEET_PROP, escapeHtml, row, NOTIFY_EMAIL.
// ═══════════════════════════════════════════════════════════════

var TRIAL1025_SHEET_TITLE = "Koda Free Classes — Hyrox Sim Athletes (Oct–Nov 2026)";
var TRIAL1025_SHEET_PROP = "TRIAL1025_SHEET_ID";
var TRIAL1025_MAX = 3;
var TRIAL1025_FIRST_DAY = "2026-10-26";
var TRIAL1025_LAST_DAY = "2026-11-30";
// Program ids MUST match PROGRAMS in classes.html.
var TRIAL1025_PROGRAMS = {
  "HYROX": "HYROX", "CF": "CrossFit", "KF": "KodaFit", "WS": "Women's Strength", "COMP": "Competitor", "OLY": "Kratos Oly"
};
var TRIAL1025_MINUTES = { "COMP": 120 };  // class length for calendar invites (default 60)
var TRIAL1025_PAGE = "https://koda-crossfit.github.io/hyrox/classes.html";
var TRIAL1025_WAIVER = "https://kevschuetz3-lgtm.github.io/koda-waiver/";
var TRIAL1025_GYM = "Koda CrossFit Iron View";
var TRIAL1025_ADDRESS = "740 S Pierce Ave, Louisville, CO 80027";
var TRIAL1025_MAPS = "https://maps.google.com/?q=740+S+Pierce+Ave,+Louisville,+CO+80027";
var TRIAL1025_HEADERS = [
  "Timestamp", "Name", "Email", "Class 1", "Class 2", "Class 3", "Classes", "Hyrox Sim",
  "Emailed", "Last Change", "Changes", "Status", "Notes"
];
var TRIAL1025_BYCLASS_HEADERS = ["Date", "Time", "Program", "Count", "Who"];
var TRIAL1025_CLASS_COLS = ["class 1", "class 2", "class 3"];
var TRIAL1025_ID_RE = /^(\d{4})-(\d{2})-(\d{2})\|(\d{2}):(\d{2})\|([A-Z]+)$/;
// "Mon, Nov 2 · 6:00 AM · HYROX" — also forgiving of hand edits: weekday
// optional, any case, "·" / "-" / "|" or just spaces between the parts.
var TRIAL1025_LABEL_RE = /^(?:[a-z]{3,9},?\s+)?([a-z]{3})[a-z]*\.?\s+(\d{1,2})(?:st|nd|rd|th)?,?\s*[·•|–—-]?\s*(\d{1,2}):(\d{2})\s*([ap])\.?\s*m\.?\s*[·•|–—-]?\s*(.+?)\s*$/i;
var TRIAL1025_DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
var TRIAL1025_DOW_LONG = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
var TRIAL1025_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
// MailApp allows ~100 recipients a day on a gmail.com account. Athlete
// confirmations come first; Kevin's heads-up is skipped once the quota runs
// this low (the sheet still has everything).
var TRIAL1025_NOTIFY_RESERVE = 25;
var TRIAL1025_ROSTER_CACHE = "trial1025_roster_v1";
var TRIAL1025_BUSY = { status: "error", error: "The sign-up system is busy right now — please try again in a moment." };

function trial1025Pad(n) { return (n < 10 ? "0" : "") + n; }

// "2026-11-02|06:00|HYROX" → a class, or null if it isn't a real class time
// inside the window. Mountain time: MDT (UTC−6) until 2 AM Sun Nov 1, 2026,
// MST (UTC−7) after — the same rule as the page.
function trial1025Parse(id) {
  var m = TRIAL1025_ID_RE.exec(String(id == null ? "" : id).trim());
  if (!m || !TRIAL1025_PROGRAMS.hasOwnProperty(m[6])) return null;
  var y = +m[1], mo = +m[2], d = +m[3], h = +m[4], mi = +m[5];
  var day = new Date(Date.UTC(y, mo - 1, d));
  if (day.getUTCMonth() !== mo - 1 || day.getUTCDate() !== d || h > 23 || mi > 59) return null;
  var iso = m[1] + "-" + m[2] + "-" + m[3];
  if (iso < TRIAL1025_FIRST_DAY || iso > TRIAL1025_LAST_DAY) return null;
  var start = new Date(Date.UTC(y, mo - 1, d, h + (iso < "2026-11-01" ? 6 : 7), mi));
  var program = TRIAL1025_PROGRAMS[m[6]];
  var dayLabel = TRIAL1025_DOW[day.getUTCDay()] + ", " + TRIAL1025_MONTHS[mo - 1] + " " + d;
  var time = (h % 12 || 12) + ":" + trial1025Pad(mi) + (h < 12 ? " AM" : " PM");
  return {
    id: m[0], code: m[6], program: program, start: start,
    end: new Date(start.getTime() + (TRIAL1025_MINUTES[m[6]] || 60) * 60000),
    month: TRIAL1025_MONTHS[mo - 1], date: d, weekday: TRIAL1025_DOW_LONG[day.getUTCDay()], day: dayLabel, time: time,
    label: dayLabel + " · " + time + " · " + program
  };
}

// A Class 1–3 cell back into a class (labels are what the sheet stores).
function trial1025ParseLabel(s) {
  var m = TRIAL1025_LABEL_RE.exec(String(s == null ? "" : s).trim());
  if (!m) return null;
  var mon = m[1].charAt(0).toUpperCase() + m[1].slice(1, 3).toLowerCase();
  var mo = TRIAL1025_MONTHS.indexOf(mon) + 1;
  var want = sim1025Norm(m[6]), code = "";
  for (var k in TRIAL1025_PROGRAMS) if (sim1025Norm(TRIAL1025_PROGRAMS[k]) === want || sim1025Norm(k) === want) code = k;
  if (!mo || !code) return null;
  var h = (+m[3] % 12) + (/p/i.test(m[5]) ? 12 : 0);
  return trial1025Parse(TRIAL1025_FIRST_DAY.slice(0, 4) + "-" + trial1025Pad(mo) + "-" + trial1025Pad(+m[2]) + "|" +
                        trial1025Pad(h) + ":" + m[4] + "|" + code);
}

function trial1025ByStart(a, b) { return a.start.getTime() - b.start.getTime(); }

function trial1025Validate(data, now) {
  var name = String(data.name || "").trim().replace(/\s+/g, " ");
  var email = String(data.email || "").trim();
  if (!name || name.length > 80) return { error: "Please add your name." };
  if (!SIM1025_EMAIL_RE.test(email) || email.length > 120) return { error: "Please enter a valid email address." };
  var raw = Array.isArray(data.classes) ? data.classes : [];
  var picks = [], seen = {};
  for (var i = 0; i < raw.length; i++) {
    var c = trial1025Parse(raw[i] && typeof raw[i] === "object" ? raw[i].id : raw[i]);
    if (!c) return { error: "One of those classes isn't on our schedule — please refresh the page and pick again." };
    if (seen[c.id]) continue;
    seen[c.id] = true;
    if (c.start.getTime() <= now.getTime()) {
      return { code: "class_past", id: c.id, error: c.label + " has already started — please pick another class." };
    }
    picks.push(c);
  }
  if (!picks.length) return { error: "Pick at least one class — up to " + TRIAL1025_MAX + "." };
  if (picks.length > TRIAL1025_MAX) return { error: "You can pick up to " + TRIAL1025_MAX + " classes." };
  return { name: name, email: email, picks: picks.sort(trial1025ByStart) };
}

// ── Spreadsheet ──
// Once the sheet exists its id is authoritative: an open error fails the
// request (the page says "try again") and never creates a second sheet.
function getOrCreateTrial1025Spreadsheet() {
  var props = PropertiesService.getScriptProperties();
  var id = props.getProperty(TRIAL1025_SHEET_PROP);
  if (id) return trial1025OpenById(id);

  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    id = props.getProperty(TRIAL1025_SHEET_PROP);  // another execution may have created it meanwhile
    if (id) return trial1025OpenById(id);
    var ss = SpreadsheetApp.create(TRIAL1025_SHEET_TITLE);
    var signups = ss.getActiveSheet();
    signups.setName("Signups");
    trial1025StyleHeader(signups, TRIAL1025_HEADERS, [160, 170, 220, 230, 230, 230, 70, 140, 150, 160, 75, 120, 240]);
    signups.getRange("D:F").setNumberFormat("@");  // class labels stay text
    var byClass = ss.insertSheet("By Class");
    trial1025StyleHeader(byClass, TRIAL1025_BYCLASS_HEADERS, [130, 90, 150, 70, 560]);
    props.setProperty(TRIAL1025_SHEET_PROP, ss.getId());
    return ss;
  } finally {
    lock.releaseLock();
  }
}

function trial1025StyleHeader(sheet, headers, widths) {
  sheet.getRange(1, 1, 1, headers.length).setValues([headers])
    .setFontWeight("bold").setBackground("#1A1818").setFontColor("#FFFF33");
  sheet.setFrozenRows(1);
  for (var i = 0; i < widths.length; i++) if (widths[i]) sheet.setColumnWidth(i + 1, widths[i]);
}

function trial1025OpenById(id) {
  var lastErr;
  for (var attempt = 0; attempt < 3; attempt++) {
    try { return SpreadsheetApp.openById(id); }
    catch (e) { lastErr = e; if (attempt < 2) Utilities.sleep(300 * (attempt + 1)); }
  }
  Logger.log("Trial1025 openById failed 3x: " + lastErr);
  throw new Error("TRIAL1025_SHEET_UNAVAILABLE");
}

function trial1025Rows(sheet) {
  var last = sheet.getLastRow();
  return last < 2 ? [] : sheet.getRange(2, 1, last - 1, sheet.getLastColumn()).getValues();
}

// The classes on one Signups row (from the Class 1–3 labels).
function trial1025RowClasses(r, hm) {
  var out = [];
  TRIAL1025_CLASS_COLS.forEach(function(k) {
    var i = sim0913Col(hm, k, -1);
    var c = i >= 0 ? trial1025ParseLabel(r[i]) : null;
    if (c && !out.some(function(o) { return o.id === c.id; })) out.push(c);
  });
  return out.sort(trial1025ByStart);
}

// The athlete's active row (newest first; cancelled rows don't count).
function trial1025FindByEmail(sheet, hm, email) {
  var rows = trial1025Rows(sheet), want = sim1025Norm(email);
  var iEmail = sim0913Col(hm, "email", 2), iStatus = sim0913Col(hm, "status", -1), iChanges = sim0913Col(hm, "changes", -1);
  for (var r = rows.length - 1; r >= 0; r--) {
    if (sim1025Norm(rows[r][iEmail]) !== want) continue;
    if (iStatus >= 0 && sim1025IsCancelled(rows[r][iStatus])) continue;
    return { row: r + 2, classes: trial1025RowClasses(rows[r], hm), changes: iChanges >= 0 ? (+rows[r][iChanges] || 0) : 0 };
  }
  return null;
}

// One past the last row with a timestamp, name or email, then forward past
// any row that already has content (a walk-in typed without a Timestamp), so
// a new signup never overwrites anything.
function trial1025NextRow(sheet, hm) {
  var rows = trial1025Rows(sheet);
  var keys = ["timestamp", "name", "email"].map(function(k) { return sim0913Col(hm, k, -1); })
    .filter(function(i) { return i >= 0; });
  var target = 2;
  for (var r = rows.length - 1; r >= 0; r--) {
    if (keys.some(function(i) { return String(rows[r][i]).trim() !== ""; })) { target = r + 3; break; }
  }
  while (target - 2 < rows.length && rows[target - 2].some(function(v) { return v !== "" && v !== null && String(v).trim() !== ""; })) target++;
  return target;
}

// Header-aligned write into one row: columns we don't set keep what's there
// (Status, Notes, a filled-down formula).
function trial1025WriteRow(sheet, hm, rowNum, record) {
  var width = sheet.getLastColumn();
  if (rowNum > sheet.getMaxRows()) sheet.insertRowsAfter(sheet.getMaxRows(), rowNum - sheet.getMaxRows() + 50);
  var range = sheet.getRange(rowNum, 1, 1, width);
  var out = range.getValues()[0], f = range.getFormulas()[0];
  for (var i = 0; i < width; i++) if (f[i]) out[i] = f[i];
  for (var key in record) {
    var idx = hm[key];
    if (idx !== undefined && idx < width) out[idx] = record[key];
  }
  range.setValues([out]);
}

// ── Sim roster match (Oct 25 + Sept 13), cached for 6 hours ──
// Opens the existing event sheets by id only — never through their
// getOrCreate helpers, which can create a fresh sheet on an open error.
function trial1025SimRoster() {
  var cache = CacheService.getScriptCache();
  var hit = cache.get(TRIAL1025_ROSTER_CACHE);
  if (hit) return JSON.parse(hit);
  var props = PropertiesService.getScriptProperties();
  var events = [
    { label: "Oct 25", prop: SIM1025_SHEET_PROP, tabs: [["Signups", "registrant"], ["Gear", "athlete"]] },
    { label: "Sept 13", prop: "SIM0913_SHEET_ID", tabs: [["Signups", "registrant"], ["Shirts", "athlete"]] }
  ];
  var roster = events.map(function(ev) {
    var o = { label: ev.label, names: {}, emails: {} };
    var id = props.getProperty(ev.prop);
    if (!id) return o;
    var ss = SpreadsheetApp.openById(id);
    ev.tabs.forEach(function(t) {
      var sh = ss.getSheetByName(t[0]);
      if (!sh) return;
      var hm = sim0913HeaderMap(sh);
      var iN = sim0913Col(hm, t[1], -1), iE = sim0913Col(hm, "email", -1), iS = sim0913Col(hm, "status", -1);
      trial1025Rows(sh).forEach(function(r) {
        if (iS >= 0 && sim1025IsCancelled(r[iS])) return;
        if (iN >= 0 && String(r[iN]).trim()) o.names[sim1025Norm(r[iN])] = 1;
        if (iE >= 0 && String(r[iE]).trim()) o.emails[sim1025Norm(r[iE])] = 1;
      });
    });
    return o;
  });
  try { cache.put(TRIAL1025_ROSTER_CACHE, JSON.stringify(roster), 21600); } catch (e) { /* too big to cache — fine */ }
  return roster;
}

function trial1025SimMatch(name, email) {
  try {
    var em = sim1025Norm(email), nm = sim1025Norm(name), found = [];
    trial1025SimRoster().forEach(function(ev) {
      if (ev.emails[em]) found.push(ev.label);
      else if (ev.names[nm]) found.push(ev.label + " (name match)");
    });
    return found.length ? found.join(" + ") : "Not found";
  } catch (e) {
    Logger.log("Trial1025 roster match failed: " + e);
    return "?";
  }
}

// ── POST ──
function handleTrial1025(data) {
  var now = new Date();
  var v = trial1025Validate(data, now);
  if (v.error) return sim1025Json({ status: "error", code: v.code || "invalid", id: v.id || "", error: v.error });

  var isTest = sim1025IsTest(v.name) || sim1025IsTest(v.email);
  var simMatch = isTest ? "Test" : trial1025SimMatch(v.name, v.email);  // before the lock — it can read two sheets

  var ss, sheet;
  try {
    ss = getOrCreateTrial1025Spreadsheet();
    sheet = ss.getSheetByName("Signups");
    if (!sheet) throw new Error("Signups tab is missing (renamed?)");
  } catch (openErr) {
    Logger.log("Trial1025 sheet open failed: " + openErr);
    return sim1025Json(TRIAL1025_BUSY);
  }

  var lock = LockService.getScriptLock();
  try { lock.waitLock(25000); }
  catch (lockErr) { return sim1025Json(TRIAL1025_BUSY); }

  var rowNum, existing, final, previous = [];
  try {
    var hm = sim0913HeaderMap(sheet);
    existing = trial1025FindByEmail(sheet, hm, v.email);
    // Classes already past stay (and count); the new picks replace the rest.
    var kept = existing ? existing.classes.filter(function(c) { return c.start.getTime() <= now.getTime(); }) : [];
    final = kept.slice();
    v.picks.forEach(function(c) {
      if (!final.some(function(k) { return k.id === c.id; })) final.push(c);
    });
    final.sort(trial1025ByStart);
    if (final.length > TRIAL1025_MAX) {
      var left = TRIAL1025_MAX - kept.length;
      return sim1025Json({ status: "error", code: "over_limit", error: left > 0
        ? "You've already used " + kept.length + " of your " + TRIAL1025_MAX + " free classes (" +
          kept.map(function(c) { return c.label; }).join("; ") + "), so you can pick " + left + " more."
        : "You've already used all " + TRIAL1025_MAX + " of your free classes — thanks for training with us! " +
          "Want to keep going? Email kevschuetz3@gmail.com." });
    }
    var ids = function(list) { return list.map(function(c) { return c.id; }).join(","); };
    if (existing && ids(existing.classes) === ids(final)) {
      // A retry (or the same picks again): nothing to change, no new emails.
      return sim1025Json({ status: "ok", saved: true, duplicate: true, row: existing.row, classes: trial1025Public(final, now) });
    }
    if (existing) previous = existing.classes;

    var record = {
      "name": sim1025Cell(v.name),
      "email": sim1025Cell(v.email),
      "class 1": final[0] ? final[0].label : "",
      "class 2": final[1] ? final[1].label : "",
      "class 3": final[2] ? final[2].label : "",
      "classes": final.length,
      "hyrox sim": simMatch,
      "emailed": ""
    };
    if (existing) {
      rowNum = existing.row;
      record["last change"] = now;
      record["changes"] = existing.changes + 1;
    } else {
      rowNum = trial1025NextRow(sheet, hm);
      record["timestamp"] = now;
    }
    trial1025WriteRow(sheet, hm, rowNum, record);
    SpreadsheetApp.flush();
    // The booking is committed — a By Class hiccup must not fail it (the next save rebuilds it).
    try { trial1025RebuildByClass(ss); }
    catch (byErr) { Logger.log("Trial1025 By Class rebuild failed: " + byErr); }
  } catch (unexpected) {
    Logger.log("Trial1025 POST failed: " + unexpected);
    return sim1025Json(TRIAL1025_BUSY);
  } finally {
    lock.releaseLock();
  }

  var emailed = trial1025SendEmails(ss, v, final, previous, !!existing, simMatch, isTest, now);
  try {
    var hm2 = sim0913HeaderMap(sheet);
    if (hm2["emailed"] !== undefined) sheet.getRange(rowNum, hm2["emailed"] + 1).setValue(emailed);
  } catch (markErr) { Logger.log("Trial1025 could not mark Emailed: " + markErr); }

  return sim1025Json({ status: "ok", saved: true, row: rowNum, updated: !!existing,
                       emailed: emailed === "Yes", classes: trial1025Public(final, now) });
}

function trial1025Public(list, now) {
  return list.map(function(c) { return { id: c.id, label: c.label, past: c.start.getTime() <= now.getTime() }; });
}

// ── By Class (rebuilt from Signups on every save) ──
function trial1025RebuildByClass(ss) {
  var sheet = ss.getSheetByName("Signups");
  var by = ss.getSheetByName("By Class") || ss.insertSheet("By Class");
  var hm = sim0913HeaderMap(sheet);
  var iName = sim0913Col(hm, "name", 1), iEmail = sim0913Col(hm, "email", 2), iStatus = sim0913Col(hm, "status", -1);
  var groups = {};
  trial1025Rows(sheet).forEach(function(r) {
    var name = String(r[iName] || "").trim();
    if (!name || sim1025IsTest(name) || sim1025IsTest(r[iEmail])) return;
    if (iStatus >= 0 && sim1025IsCancelled(r[iStatus])) return;
    trial1025RowClasses(r, hm).forEach(function(c) {
      if (!groups[c.id]) groups[c.id] = { c: c, who: [] };
      groups[c.id].who.push(name);
    });
  });
  var list = Object.keys(groups).map(function(k) { return groups[k]; })
    .sort(function(a, b) { return trial1025ByStart(a.c, b.c); });

  var width = TRIAL1025_BYCLASS_HEADERS.length;
  by.getRange(1, 1, 1, width).setValues([TRIAL1025_BYCLASS_HEADERS]);
  if (by.getMaxRows() > 1) by.getRange(2, 1, by.getMaxRows() - 1, width).clearContent().setFontColor(null);
  if (!list.length) return [];
  var now = Date.now();
  var values = list.map(function(g) { return [g.c.day, g.c.time, g.c.program, g.who.length, g.who.join(", ")]; });
  if (values.length + 1 > by.getMaxRows()) by.insertRowsAfter(by.getMaxRows(), values.length + 1 - by.getMaxRows());
  var range = by.getRange(2, 1, values.length, width);
  by.getRange(2, 1, values.length, 3).setNumberFormat("@");  // "Mon, Nov 2" / "6:00 AM" stay text
  range.setValues(values);
  // Classes already over turn gray (kept as the record of who came).
  range.setFontColors(list.map(function(g) {
    var color = g.c.end.getTime() <= now ? "#9A948C" : "#1A1818";
    return [color, color, color, color, color];
  }));
  return values;
}

// ── Emails ──
// Returns what lands in the Emailed column.
function trial1025SendEmails(ss, v, classes, previous, updated, simMatch, isTest, now) {
  var first = v.name.split(" ")[0];
  var upcoming = classes.filter(function(c) { return c.start.getTime() > now.getTime(); });
  var status = "Yes";

  try {
    if (MailApp.getRemainingDailyQuota() < 1) {
      status = "No — daily email limit";
    } else {
      var mail = {
        to: v.email,
        replyTo: NOTIFY_EMAIL,
        name: TRIAL1025_GYM,
        subject: (updated ? "Updated: your free classes at Koda" : "You're booked: your free classes at Koda"),
        htmlBody: trial1025ConfirmHtml(first, classes, updated, now)
      };
      if (upcoming.length) mail.attachments = [Utilities.newBlob(trial1025Ics(upcoming, v.email), "text/calendar", "koda-free-classes.ics")];
      MailApp.sendEmail(mail);
    }
  } catch (mailErr) {
    Logger.log("Trial1025 confirmation email failed: " + mailErr);
    status = "No — error";
  }

  if (NOTIFY_EMAIL && !isTest) {
    try {
      if (MailApp.getRemainingDailyQuota() > TRIAL1025_NOTIFY_RESERVE || status !== "Yes") {
        var list = function(cs) {
          return cs.length ? "<ol style='margin:4px 0 12px;padding-left:20px'>" + cs.map(function(c) { return "<li>" + escapeHtml(c.label) + "</li>"; }).join("") + "</ol>" : "<p>(none)</p>";
        };
        MailApp.sendEmail({
          to: NOTIFY_EMAIL,
          subject: "Free classes: " + v.name + (updated ? " changed their picks" : " booked " + classes.length) +
                   " (" + simMatch + ")" + (status === "Yes" ? "" : " — CONFIRMATION NOT SENT"),
          htmlBody:
            "<div style='font-family:Arial,Helvetica,sans-serif;color:#1A1818'>" +
            "<h3 style='margin:0 0 8px'>" + escapeHtml(v.name) + (updated ? " changed their free classes" : " booked free classes") + "</h3>" +
            "<table style='border-collapse:collapse;font-family:Arial,sans-serif;font-size:14px'>" +
            row("Name", v.name) + row("Email", v.email) + row("Hyrox Sim", simMatch) + row("Confirmation", status) + "</table>" +
            "<h4 style='margin:14px 0 0'>Classes</h4>" + list(classes) +
            (updated ? "<h4 style='margin:4px 0 0'>Before</h4>" + list(previous) : "") +
            "<p><a href='" + ss.getUrl() + "'>Open the sheet</a> (the By Class tab shows who's coming to each class).</p></div>"
        });
      }
    } catch (notifyErr) {
      Logger.log("Trial1025 notify email failed: " + notifyErr);
    }
  }
  return status;
}

function trial1025ConfirmHtml(first, classes, updated, now) {
  var rows = classes.map(function(c) {
    var past = c.start.getTime() <= now.getTime();
    return "<tr><td style='padding:10px 12px 10px 0;vertical-align:middle;width:56px'>" +
        "<div style='border:2px solid #1A1818;text-align:center;width:52px;font-family:Arial,sans-serif'>" +
          "<div style='background:#1A1818;color:#FFFF33;font-size:11px;letter-spacing:0.08em;padding:2px 0'>" + c.month.toUpperCase() + "</div>" +
          "<div style='font-size:22px;font-weight:900;line-height:1.3;color:#1A1818'>" + c.date + "</div></div></td>" +
      "<td style='padding:10px 0;vertical-align:middle'>" +
        "<div style='font-size:16px;font-weight:bold;text-transform:uppercase;color:#1A1818'>" + c.weekday + ", " + c.month + " " + c.date + "</div>" +
        "<div style='font-size:15px;color:#5E5954'>" + escapeHtml(c.time) + " · " + escapeHtml(c.program) + (past ? " · done" : "") + "</div>" +
        (past ? "" : "<a href='" + trial1025GcalUrl(c) + "' style='font-size:13px;color:#1A1818;font-weight:bold'>+ Add to Google Calendar</a>") +
      "</td></tr>";
  }).join("");
  return "<div style='font-family:Arial,Helvetica,sans-serif;max-width:620px;color:#1A1818'>" +
    "<div style='background:#1A1818;color:#fff;padding:22px 24px'>" +
      "<div style='font-size:11px;letter-spacing:0.1em;text-transform:uppercase;color:#E5DDCF'>Koda CrossFit Iron View · For our Hyrox Sim athletes</div>" +
      "<div style='font-size:34px;line-height:1;font-weight:900;text-transform:uppercase;margin-top:10px'>3 Free<br>" +
        "<span style='background:#FFFF33;color:#1A1818;padding:0 6px'>Classes</span></div>" +
      "<div style='font-size:16px;font-weight:bold;text-transform:uppercase;margin-top:12px'>Now through Monday, Nov 30</div>" +
    "</div>" +
    "<div style='padding:20px 4px 0'>" +
      "<h2 style='margin:0 0 6px'>" + (updated ? "Your classes are updated, " : "You're in, ") + escapeHtml(first) + "!</h2>" +
      "<p style='margin:0 0 6px'>Here " + (classes.length === 1 ? "is your free class" : "are your free classes") + " at Koda CrossFit Iron View:</p>" +
      "<table style='border-collapse:collapse;margin:0 0 6px'>" + rows + "</table>" +
      "<p style='margin:0 0 16px;color:#5E5954;font-size:13px'>The attached calendar file (koda-free-classes.ics) adds them all at once.</p>" +
      "<div style='background:#EDEBE7;border-left:4px solid #FFFF33;padding:14px 16px;margin:0 0 16px'>" +
        "<div style='font-weight:900;text-transform:uppercase;margin-bottom:6px'>Good to know</div>" +
        "<div style='margin:4px 0'>→ Get there <strong>10 minutes early</strong> so your coach can get you set up.</div>" +
        "<div style='margin:4px 0'>→ We're at <a href='" + TRIAL1025_MAPS + "' style='color:#1A1818'>" + TRIAL1025_ADDRESS + "</a>.</div>" +
        "<div style='margin:4px 0'>→ Didn't race in the Sim? Please <a href='" + TRIAL1025_WAIVER + "' style='color:#1A1818'>sign our waiver</a> before your first class.</div>" +
        "<div style='margin:4px 0'>→ Plans change? <a href='" + TRIAL1025_PAGE + "' style='color:#1A1818'>Pick again</a> with this email — your new picks replace your upcoming ones.</div>" +
      "</div>" +
      "<p style='color:#777;font-size:13px;margin-top:14px'>Questions? Just reply to this email. See you at Koda!</p>" +
    "</div></div>";
}

function trial1025Stamp(d) { return Utilities.formatDate(d, "UTC", "yyyyMMdd'T'HHmmss'Z'"); }

function trial1025GcalUrl(c) {
  return "https://calendar.google.com/calendar/render?action=TEMPLATE" +
    "&text=" + encodeURIComponent(c.program + " at Koda (free class)") +
    "&dates=" + trial1025Stamp(c.start) + "/" + trial1025Stamp(c.end) +
    "&location=" + encodeURIComponent(TRIAL1025_GYM + ", " + TRIAL1025_ADDRESS) +
    "&details=" + encodeURIComponent("Your free class for Hyrox Simulation athletes. Get there 10 minutes early. Questions? kevschuetz3@gmail.com");
}

function trial1025Ics(classes, email) {
  var text = function(s) { return String(s).replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n"); };
  var fold = function(line) {  // RFC 5545: lines over 75 octets continue with a leading space
    var out = "";
    while (line.length > 73) { out += line.slice(0, 73) + "\r\n "; line = line.slice(73); }
    return out + line;
  };
  var who = String(email || "").toLowerCase().replace(/[^a-z0-9]/g, "");
  var lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Koda CrossFit Iron View//Free Classes//EN", "CALSCALE:GREGORIAN", "METHOD:PUBLISH"];
  classes.forEach(function(c) {
    lines.push("BEGIN:VEVENT",
      "UID:" + c.id.replace(/[^0-9A-Za-z]/g, "") + "-" + who + "@koda-crossfit.github.io",
      "DTSTAMP:" + trial1025Stamp(new Date()),
      "DTSTART:" + trial1025Stamp(c.start),
      "DTEND:" + trial1025Stamp(c.end),
      fold("SUMMARY:" + text(c.program + " at Koda (free class)")),
      fold("LOCATION:" + text(TRIAL1025_GYM + ", " + TRIAL1025_ADDRESS)),
      fold("DESCRIPTION:" + text("Your free class for Hyrox Simulation athletes. Get there 10 minutes early.")),
      "END:VEVENT");
  });
  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}

// ── Admin GETs (doGet routes every ?action=trial1025* here) ──
function trial1025Get(action, e) {
  var p = (e && e.parameter) || {};
  if (!sim1025Authorized(p.key)) return sim1025Json({ status: "error", error: "forbidden" });
  try {
    var ss = getOrCreateTrial1025Spreadsheet();
    var sheet = ss.getSheetByName("Signups");
    switch (action) {
      case "trial1025Info": {
        var hm = sim0913HeaderMap(sheet), iStatus = sim0913Col(hm, "status", -1), iName = sim0913Col(hm, "name", 1);
        var active = trial1025Rows(sheet).filter(function(r) {
          return String(r[iName]).trim() && !sim1025IsTest(r[iName]) && !(iStatus >= 0 && sim1025IsCancelled(r[iStatus]));
        });
        var picks = active.reduce(function(n, r) { return n + trial1025RowClasses(r, hm).length; }, 0);
        return sim1025Json({ status: "ok", name: ss.getName(), url: ss.getUrl(), id: ss.getId(),
                             athletes: active.length, classesBooked: picks, mailQuotaLeft: MailApp.getRemainingDailyQuota() });
      }
      case "trial1025Roster": {
        var hmR = sim0913HeaderMap(sheet);
        var col = function(r, k) { var i = sim0913Col(hmR, k, -1); return i >= 0 ? r[i] : ""; };
        return sim1025Json({ status: "ok", signups: trial1025Rows(sheet).map(function(r, i) {
          return { row: i + 2, name: String(col(r, "name")), email: String(col(r, "email")), sim: String(col(r, "hyrox sim")),
                   emailed: String(col(r, "emailed")), status: String(col(r, "status")),
                   classes: trial1025RowClasses(r, hmR).map(function(c) { return c.label; }) };
        }).filter(function(s) { return s.name || s.email; }) });
      }
      case "trial1025ByClass":
        return sim1025Json({ status: "ok", byClass: trial1025RebuildByClass(ss) });
      case "trial1025ClearTests": {
        // Deletes QA rows (a name/email matching the test pattern), bottom-up.
        var hmT = sim0913HeaderMap(sheet), iN = sim0913Col(hmT, "name", 1), iE = sim0913Col(hmT, "email", 2);
        var rows = trial1025Rows(sheet), removed = [];
        for (var r = rows.length - 1; r >= 0; r--) {
          if (sim1025IsTest(rows[r][iN]) || sim1025IsTest(rows[r][iE])) { sheet.deleteRow(r + 2); removed.push(String(rows[r][iN])); }
        }
        trial1025RebuildByClass(ss);
        return sim1025Json({ status: "ok", removed: removed });
      }
    }
    return sim1025Json({ status: "error", error: "unknown action: " + action });
  } catch (err) {
    Logger.log("Trial1025 GET " + action + " failed: " + err);
    return sim1025Json({ status: "error", error: String(err && err.message || err) });
  }
}
