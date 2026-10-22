// "Website > Publish now" menu for the OBL Website Content spreadsheet.
//
// REFERENCE COPY ONLY. This file is never deployed from the repo. Garry pastes
// it into the content spreadsheet's Apps Script editor. It needs a script
// property named GITHUB_TOKEN (Project Settings, Script properties) holding a
// fine-grained token for offbroadwaylive/obl with Actions: Read and
// write. The token never goes into the repo.
//
// It sends the Menus and Dates tabs to .github/workflows/publish-sheet.yml,
// which validates them (scripts/apply-sheet.mjs), commits the generated files
// and deploys the site.

const REPO = 'offbroadwaylive/obl';
const WORKFLOW = 'publish-sheet.yml';
const REF = 'main';
const STATUSES = ['on sale', 'few tickets remain', 'sold out'];

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Website')
    .addItem('Publish now', 'publishNow')
    .addToUi();
}

function publishNow() {
  const ui = SpreadsheetApp.getUi();
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const tz = ss.getSpreadsheetTimeZone();

  let menus, dates;
  try {
    menus = readTab(ss, 'Menus', tz);
    dates = readTab(ss, 'Dates', tz);
  } catch (err) {
    ui.alert('Not published', String(err.message || err), ui.ButtonSet.OK);
    return;
  }

  const problems = check(dates);
  if (problems.length) {
    ui.alert('Not published', 'Please fix:\n\n' + problems.slice(0, 10).join('\n'), ui.ButtonSet.OK);
    return;
  }

  const token = PropertiesService.getScriptProperties().getProperty('GITHUB_TOKEN');
  if (!token) {
    ui.alert('Not published', 'The publish key is missing. Please contact Garry.', ui.ButtonSet.OK);
    return;
  }

  const payload = JSON.stringify({ menus: menus, dates: dates, sentAt: new Date().toISOString() });
  if (payload.length > 60000) {
    ui.alert('Not published', 'The sheet is too large to send. Please contact Garry.', ui.ButtonSet.OK);
    return;
  }

  const res = UrlFetchApp.fetch(
    'https://api.github.com/repos/' + REPO + '/actions/workflows/' + WORKFLOW + '/dispatches',
    {
      method: 'post',
      contentType: 'application/json',
      headers: {
        Authorization: 'Bearer ' + token,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28'
      },
      payload: JSON.stringify({ ref: REF, inputs: { payload: payload } }),
      muteHttpExceptions: true
    }
  );

  const code = res.getResponseCode();
  if (code >= 200 && code < 300) {
    ui.alert('Sent', 'The website will update in about two minutes.', ui.ButtonSet.OK);
  } else {
    ui.alert('Not published', 'GitHub answered ' + code + '. Please contact Garry.', ui.ButtonSet.OK);
  }
}

// Rows as objects keyed by header text; dates become "yyyy-MM-dd HH:mm".
function readTab(ss, name, tz) {
  const sheet = ss.getSheetByName(name);
  if (!sheet) throw new Error('The "' + name + '" tab is missing.');
  const values = sheet.getDataRange().getValues();
  const headers = values[0].map(function (h) { return String(h).trim(); });
  const rows = [];
  for (let r = 1; r < values.length; r++) {
    const cells = values[r];
    if (cells.every(function (c) { return c === ''; })) continue;
    const row = { _row: r + 1 };
    headers.forEach(function (h, i) {
      if (!h) return;
      const v = cells[i];
      row[h] = v instanceof Date
        ? Utilities.formatDate(v, tz, 'yyyy-MM-dd HH:mm')
        : String(v).trim();
    });
    rows.push(row);
  }
  return rows;
}

// Friendly first pass; the workflow runs the full validation.
function check(dates) {
  const out = [];
  const seen = {};
  dates.forEach(function (d) {
    const where = 'Dates row ' + d._row + ': ';
    if (!d['Show']) out.push(where + 'Show is empty.');
    if (!/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(d['Date'] || '')) out.push(where + 'Date is not a date and time.');
    if (STATUSES.indexOf(String(d['Status'] || '').toLowerCase()) === -1) out.push(where + 'Status is not set.');
    const id = d['Performance ID'] || '';
    if (id && !/^\d+$/.test(id)) out.push(where + 'Performance ID must be numbers only.');
    if (id && seen[id]) out.push(where + 'Performance ID ' + id + ' is also on row ' + seen[id] + '.');
    if (id) seen[id] = d._row;
  });
  return out;
}
