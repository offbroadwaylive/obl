// Signup endpoint for the OBL Mailing List Signups spreadsheet.
//
// REFERENCE COPY ONLY. This file is never deployed from the repo. Garry pastes
// it into the spreadsheet's Apps Script editor (Extensions, Apps Script) and
// deploys it as a web app: Execute as Me, Who has access Anyone. After any
// change, use Deploy, Manage deployments, edit, "New version" so the /exec URL
// in src/data/site.json (signup.action) stays the same.
//
// Writes one row per signup to the "Signups" tab, columns:
//   Submission Time | Email | Phone | Name (First & Last) | Source

const SHEET_NAME = 'Signups';
const MAX = { name: 100, email: 254, phone: 30, source: 20 };

function doPost(e) {
  try {
    const p = (e && e.parameter) || {};

    // Honeypot: pretend success, write nothing.
    if (p.website) return reply(true);

    const name = clean(p.name, MAX.name);
    const email = clean(p.email, MAX.email).toLowerCase();
    const phone = clean(p.phone, MAX.phone);
    const source = clean(p.source, MAX.source);

    if (name.length < 2) return reply(false, 'name');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return reply(false, 'email');

    const lock = LockService.getScriptLock();
    lock.waitLock(10000);
    try {
      const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
      sheet.appendRow([new Date(), safe(email), safe(phone), safe(name), safe(source)]);
    } finally {
      lock.releaseLock();
    }
    return reply(true);
  } catch (err) {
    console.error(err);
    return reply(false, 'server');
  }
}

// Trim, collapse whitespace, strip control characters, cap length.
function clean(value, max) {
  return String(value || '')
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);
}

// Stop a value being read as a formula when the sheet or its CSV is opened.
function safe(value) {
  return /^[=+\-@]/.test(value) ? "'" + value : value;
}

function reply(ok, error) {
  const body = ok ? { ok: true } : { ok: false, error: error };
  return ContentService.createTextOutput(JSON.stringify(body))
    .setMimeType(ContentService.MimeType.JSON);
}
