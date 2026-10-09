# Sheet publishing and email signups

This is for Garry. It covers the two Google Sheets behind the website, how Publish now reaches GitHub, the token it uses, what to do when a publish fails, and how to roll one back. Steve's page is [Updating menus and sold-out dates](updating-menus-and-sold-out-dates.md).

## How it fits together

| Spreadsheet | Holds | How it reaches the site |
| --- | --- | --- |
| **OBL Website Content** (private) | `Menus` and `Dates` tabs | **Website → Publish now** sends both tabs to the `publish-sheet.yml` workflow, which validates them, commits `src/data/generated/menus.json` and `dates.json`, then builds and deploys. |
| **OBL Mailing List Signups** (private) | One row per signup | The site's forms post to a Google Apps Script web app on this sheet. Nothing to publish. |

They are separate on purpose: menu editors never see the customer list, and the GitHub token never sits beside it.

Nothing polls the sheet. The only scheduled workflow is the nightly rebuild, which reads committed data.

**What the sheet can and can't change.** The sheet changes menu text, date status and Arts People ids. It can't add a show or a date. Shows, titles, artwork, dates and times, prices and the chef credit stay in the repo (`src/data`).

## One-time setup

Do A and B in any order. Do C after `publish-sheet.yml` is on `main`. The full click-by-click steps are in section 7 of the signup and sheet sync doc; the files they need are in [`google/`](../google).

**A. Content sheet.** Create **OBL Website Content** in your own account (owners aren't restricted by protected ranges, so you must be the owner). Set File → Settings → time zone to Pacific Time (Los Angeles) *before* importing. Then:

- Import [`obl-sheet-menus.csv`](../google/obl-sheet-menus.csv) into a tab named `Menus` and [`obl-sheet-dates.csv`](../google/obl-sheet-dates.csv) into a tab named `Dates`.
- On `Dates`, format column B as custom date-time `yyyy-mm-dd hh:mm` and column D as plain text, and add a dropdown to column C with `On Sale`, `Few Tickets Remain`, `Sold Out` ("Reject the input" for anything else).
- Protect row 1 and column A on `Menus`, and row 1 plus columns A, B and D on `Dates` ("Only you").
- Freeze row 1 on both tabs.
- Share with Steve as Editor. Don't publish to the web.

**B. Signup sheet.** Create **OBL Mailing List Signups**, rename its tab `Signups`, and put `Submission Time`, `Email`, `Phone`, `Name (First & Last)`, `Source` in row 1 (column C as plain text). Paste [`google/signup.gs`](../google/signup.gs) into Extensions → Apps Script and deploy it as a web app: Execute as **Me**, access **Anyone**. The `/exec` URL goes in `signup.action` in `src/data/site.json` (already set). After any later script change, use **Deploy → Manage deployments → edit → New version**; a new deployment would get a different URL.

**C. Publish now button.**

1. On GitHub as `dogmaticvox`, create a **fine-grained** personal access token. Repository access: only `offbroadwaylive`. Repository permissions: **Actions: Read and write**, nothing else. That is the permission GitHub requires to start a workflow with the `workflow_dispatch` API, and it's enough here: the workflow itself commits and deploys with its own built-in token, not yours.
2. Set an expiry, and put a reminder in your calendar a week before it.
3. Paste [`google/publish.gs`](../google/publish.gs) into the content sheet's Apps Script editor. In **Project Settings → Script properties**, add `GITHUB_TOKEN` with the token as its value.
4. Reload the sheet. Click **Website → Publish now** yourself first and approve Google's permission prompt (Advanced → continue → Allow). Walk Steve through the same prompt once.

The token goes only into the script properties. Never put it in the repo, the site, or a doc.

## The token

- Any editor of the content sheet can read the script properties, so anyone you share the sheet with can see the token. That's why it's limited to starting workflows in this one repository.
- **When it expires**, Publish now says "GitHub answered 401". Create a new token the same way and replace the `GITHUB_TOKEN` script property. Nothing else changes.
- **If it leaks**, revoke it on GitHub (Settings → Developer settings → Fine-grained tokens) and make a new one. Someone holding it can start the publish workflow, and nothing else. The workflow still validates everything it receives.

## Reading a failed publish

"Sent" in the sheet means GitHub accepted the request, not that the site updated. If the workflow's own checks fail:

- The site keeps its last good data, nothing is committed, and GitHub emails the repo owner.
- Open **Actions → Publish sheet**, then the red run. The summary lists each problem with its tab and row, for example `Dates row 7: Status "" must be On Sale, Few Tickets Remain or Sold Out.` The same lines are in the **Validate and apply the sheet** step's log.
- Fix the sheet and click Publish now again.

The checks: every required column is present; every Show matches a show title in `shows.json`; every Date reads `yyyy-mm-dd hh:mm` and matches a performance of that show; Status is one of the three values; a Performance ID is digits only and isn't used twice; and no menu description is filled in without its title. Rows for past dates are ignored. A performance with no row only produces a warning, and the website keeps its status and id.

To test a payload without the sheet, save it as a file and run `npm run apply-sheet -- path/to/payload.json`. Fixtures are in `tests/fixtures/sheet/`. Revert the generated files afterwards with `git checkout -- src/data/generated`.

To rebuild and deploy without any sheet data, run **Actions → Publish sheet → Run workflow** with the payload left empty.

## Rolling back

Each successful publish that changes something makes one commit by `github-actions[bot]` named `Sheet publish: …`, listing what changed. To undo one:

1. Revert that commit (`git revert <sha>` and push to `main`, or revert it in GitHub Desktop). The push deploys the previous menus and statuses in about two minutes.
2. Put the sheet back the way it was too. Otherwise the next Publish now sends the same change again.

Publishing an unchanged sheet makes no commit; it just redeploys.

## New shows and moved dates

Edit the repo first, then the sheet:

- **New show.** Add it to `src/data/shows.json`, then add its row to `Menus` and its performances to `Dates`, then publish. A sheet row for a show the repo doesn't know fails the publish.
- **New or moved performance.** Change `shows.json` first, then add or fix the `Dates` row.
- **Arts People id.** Can be set in the sheet's Performance ID column. If that cell is blank, the id in `shows.json` is used.

## Email signups

- Each submission adds a row: Submission Time, Email, Phone, Name (First & Last), Source (`slide-in`, `footer` or `contact`).
- The Apps Script drops honeypot hits, rejects short names and malformed emails, caps lengths, and stores values that start with `=`, `+`, `-` or `@` as text, so they can't run as formulas in Sheets or Excel.
- It doesn't rate-limit or de-duplicate. The endpoint URL is public in the site's source, so junk rows are possible. If that becomes a problem, add a Cloudflare Turnstile check. Steve de-duplicates when he imports, as before.
- **Reading the reply (`signup.mode` in `site.json`).** The form posts normally and reads the script's `{ "ok": true }` reply (`"mode": "cors"`). This couldn't be tested against the live script from the build environment, so test it once after deploying: sign up from the footer.
  - **Success message, and a row with Source `footer`:** this setting works. Leave it.
  - **"That didn't go through", but the row still appears:** the browser is blocking the reply. Set `"mode": "no-cors"`. The form then counts a sent request as success.
  - **No row at all:** check the web app deployment ("Anyone" access, latest version).
- **Known limit of `no-cors`.** The browser can't confirm the row was written, only that the request was sent, so a script error would still show the success message.
- To switch to a paid email tool later, only `signup.action` and the `send()` function in `src/components/SignupForm.astro` change.
