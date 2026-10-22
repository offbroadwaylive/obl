# Off Broadway Live website

The rebuilt offbroadwaylive.com: a static site that rebuilds itself from a few data files. Tickets are still sold through Arts People; every **Get Tickets** button opens the matching Arts People page in a new tab.

**Preview:** https://offbroadwaylive.github.io/obl/ (hidden from search engines until launch)

---

## For editors: how to change the site

**Menus and sold-out dates are edited in a Google Sheet**, not here: see [Updating menus and sold-out dates](docs/updating-menus-and-sold-out-dates.md). How that sheet, the Publish now button and the email signup are set up is in [Sheet publishing and email signups](docs/sheet-publishing-and-signups.md).

Everything else that changes — shows, dates, prices, FAQs, the banner — lives in the files in [`src/data`](src/data). You never edit a page directly.

### How to edit a file

1. On GitHub, open the file (for example `src/data/shows.json`).
2. Click the **pencil** icon (Edit this file).
3. Make your change. Keep the quotes, commas and brackets exactly as they are around your change.
4. Click **Commit changes…**, write a short note such as "Mark Oct 17 sold out", and choose **Commit directly to the `main` branch**.
5. Wait about two minutes. The site rebuilds and your change is live. You can watch progress on the **Actions** tab; a green tick means it worked, a red cross means something in the file is not quite right (usually a missing comma or quote). Open the red run to see which file and line.

> **Tip:** the most common mistake is a missing or extra comma. Every item in a list is followed by a comma **except the last one**.

The site also rebuilds by itself every night, so dates that have passed disappear without anyone editing, and a show with no dates left drops out of the menu on its own.

### Add or remove a date

Open `src/data/shows.json` and find the show. Each date is one line in its `performances` list:

```json
{ "start": "2026-10-10T18:00", "id": 849899, "format": "dinner", "status": "on-sale" },
```

| Field | What to type |
| --- | --- |
| `start` | Date and **doors** time in San Diego time, as `YYYY-MM-DDTHH:MM` with a 24-hour clock. 6:00pm is `18:00`, 3:00pm is `15:00`, 2:00pm is `14:00`. |
| `id` | The Arts People performance number: the digits after `performance=` in the Arts People link. |
| `format` | `dinner`, `lunch`, `snack-board` or `dessert`. This sets the label and the price on that date. |
| `status` | `on-sale`, `low` (shows "Few Tickets Remain") or `sold-out`. Once the content sheet is in use, its **Dates** tab sets this instead. |

- **To add a date**, copy an existing line, paste it below, and change the date and id. Keep the dates in order.
- **To remove a date**, delete its whole line. If it was the last line in the list, remove the comma from the end of the line above it.

You do not need to remove dates that have passed; they disappear on their own.

### Mark a date sold out (or nearly)

Use the **Status** column on the **Dates** tab of the content sheet, then **Website → Publish now**. See [Updating menus and sold-out dates](docs/updating-menus-and-sold-out-dates.md).

A status set in the sheet wins over the `status` in `src/data/shows.json`. The `status` field there is only used for a date with no row in the sheet.

### Change a price

Prices live in `src/data/pricing.json`, in named price sets. Each show uses one set (its `"pricing"` field in `shows.json`), so changing a number here changes it on every page that shows that price: show pages, the ENCORE page, the calendar and the "from $" on every date.

```json
{ "key": "main", "name": "Main Floor", "seats": 1, "price": 99, "unit": "per seat" },
```

Change only the number after `"price":` — no dollar sign. A price set with `"layout": "2026"` draws the 2026 seating chart (Bx2 as one table for 4); every other set draws the 2027 chart, where Bx2 is split into Bx2A and Bx2B tables for 2 and the Elevated Booth is Bx4. The Sunday Snack Board price is worked out automatically from `"adjustments"` (`"perSeat": -15` means $15 less per person). Change the `feeNote` text to change the line under the price table.

### Post a banner

The red banner under the award bar is in `src/data/site.json`:

```json
"banner": {
  "text": "Christmas Dessert Show Tickets On Sale Now!",
  "link": "shows/a-big-band-christmas/",
  "start": null,
  "end": "2026-12-13"
},
```

- `text`: what the banner says.
- `link`: the page it opens, written without the website address (for example `season-tickets/` or `shows/best-of-2026/`). Use `null` for no link.
- `start` and `end`: the first and last day it shows, as `"YYYY-MM-DD"`. Use `null` for "starting now" or "no end date". It turns itself on and off on those days.

To remove the banner, set `"text": ""`.

### Add a show

1. Add the poster (square) and wide art to `src/assets/images/shows/` (see *Add photos* below).
2. Open `src/data/shows.json`, copy a whole show — from its `{` to its matching `},` — and paste it as a new show.
3. Change: `slug` (the page address, lowercase with dashes, e.g. `"neil-diamond"`), `title`, `kicker`, `blurb`, `poster`, `hero`, the alt text, `accent` (a color like `"#c9742e"`), `pricing`, `menu` (or `null`), `ageRule` (`"21+"` or `"over-10"`), `notes` and the `performances`.
4. Add the show's row to the **Menus** tab and its dates to the **Dates** tab of the content sheet, then publish. (Without a sheet row, a menu in `src/data/menus.json` under the name in `menu` is used.)

The show gets its own page, appears on the home page, in the **Shows** menu and on the calendar automatically.

### Add gallery photos

1. On GitHub, open `src/assets/images/gallery/`, click **Add file → Upload files**, and upload JPEG photos named in sequence after the last one (for example `26.jpg`, `27.jpg`).
2. In `src/data/gallery.json`, add one entry per photo:

   ```json
   { "file": "gallery/26.jpg", "alt": "Describe what is in the photo", "caption": "Show name" }
   ```

   `alt` describes the photo for people using screen readers — write what you see. `caption` can be `""`.

Photos are resized and converted for the web automatically; upload the largest version you have. Any image the site cannot find shows a gold dashed "coming soon" box instead, so a missing photo is easy to spot.

### Other content

| To change… | Edit |
| --- | --- |
| FAQs | `src/data/faqs.json` |
| Dinner menus | The **Menus** tab of the content sheet (chef credit: `src/data/menus.json`) |
| Season ticket packages | `src/data/season.json` |
| Address, phone, email, award line, About Us | `src/data/site.json` |

Open questions waiting on an answer are listed in [`TODO.md`](TODO.md).

---

## For developers

Astro (static output, no UI framework), plain CSS with custom properties, vanilla JS in small inline modules. Built and deployed to GitHub Pages by `.github/workflows/build-deploy.yml`, a reusable workflow called by `deploy.yml` (every push to `main`, manual runs and nightly at 08:00 UTC) and by `publish-sheet.yml` (the content sheet's Publish now button). Unit tests run before every build.

```sh
npm install
npm run dev          # http://localhost:4321/obl/
npm test             # unit tests: dates, prices, menus, sheet validator
npm run apply-sheet -- payload.json   # apply a sheet payload locally (see docs/)
npm run build        # outputs dist/
npm run check:todo   # regenerates TODO.md from TODO markers
```

**Preview any date.** `BUILD_DATE=2026-10-25 npm run build` builds the site as it will look on that day (Los Angeles time). The browser also hides past dates on load, so a page is never more than a day stale.

**Layout.**

```
src/data/        shows, pricing, menus, faqs, season, gallery, site (all content)
src/data/generated/  menus.json, dates.json: written only by scripts/apply-sheet.mjs from the sheet
src/lib/         shows.ts (dates, prices, ticket URLs, sheet date overlay), menus.ts (sheet menus
                 with fallback), url.ts (base path), structured.ts (schema.org)
src/layouts/     Base.astro (header, marquee, banner, footer), Show.astro
src/components/  Header, Footer, Marquee, Banner, ShowCard, DateList, PriceTable, SeatMap,
                 MenuCard, Ribbon, Gallery, FaqItem, Countdown, StickyTicketBar, SignupForm,
                 SignupSlideIn
src/pages/       index, shows/[slug], encore-supper-club, season-tickets, menus, media,
                 contact, faqs, calendar, 404, ics/[id].ics, and redirect stubs for old Wix paths
src/styles/      tokens.css (colors, type, spacing), base.css (shared building blocks)
public/fonts/    self-hosted Anton, Playfair Display, Inter (OFL)
scripts/         apply-sheet.mjs (validates and applies a sheet payload), fetch-assets.sh, list-todos.mjs
google/          reference copies of the Apps Scripts (never deployed from here) and the sheet CSVs
docs/            pages for Steve (sheet editing) and Garry (sheet, token, signups)
```

**Email signup.** The footer and the one-time slide-in both use `SignupForm.astro`, which posts to the Apps Script web app in `site.json` `signup.action`. See [Sheet publishing and email signups](docs/sheet-publishing-and-signups.md#email-signups) for the `mode` setting and the one live test still to do.

**Images.** `scripts/fetch-assets.sh` is a one-time import of the logo, show art, venue photos and gallery from Wix. Run it from a machine that can reach `static.wixstatic.com`, then commit `src/assets/images`. Images live in `src/assets` rather than `public/` so Astro's image pipeline can resize them to 800/1600px WebP. Anything missing renders as a labelled placeholder.

**Links.** Every internal link and asset path goes through `url()` in `src/lib/url.ts`, which prefixes Astro's `BASE_URL`, so the same build works at `/obl/` now and at the domain root later.

**Hidden from search.** While `SITE_IS_LIVE` in `src/data/site.json` is `false`, every page has `<meta name="robots" content="noindex">`, there is no sitemap, and structured data, Open Graph and canonical tags are not emitted.

### First deploy

In the repository's **Settings → Pages**, set **Source** to **GitHub Actions**. The next push to `main` (or **Actions → Deploy to GitHub Pages → Run workflow**) publishes the site.

GitHub pauses scheduled workflows in repositories with no activity for about 60 days. If past dates stop dropping off, open **Actions → Deploy to GitHub Pages** and click **Enable workflow**.

If `main` gets branch protection, allow `github-actions[bot]` to push, or sheet publishes will fail at the commit step.

### Cutover to offbroadwaylive.com

1. In `astro.config.mjs`, set `site: 'https://offbroadwaylive.com'` and `base: '/'`.
2. In `src/data/site.json`, set `"SITE_IS_LIVE": true`.
3. Add `public/CNAME` containing `offbroadwaylive.com`, and point the domain's DNS at GitHub Pages.
4. The stub pages at the old Wix paths (`/encoresupperclub`, `/esc-lionel`, `/esc-bestof26`, `/bigbandchristmas`, `/dinner-menus`, `/escshows`) forward visitors to the new pages.
