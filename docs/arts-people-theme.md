# Arts People theme

Makes the Arts People ticketing pages (app.arts-people.com, theatre 1078 / bspro) match the site. The design is a dark marquee frame (site header and footer) around a light "ticket" card that holds everything Arts People renders. Purchase-flow markup is restyled, never hidden or moved.

## How it fits together

| Piece | Lives in | Goes where |
|---|---|---|
| Theme CSS | `src/ap/ap.css` (source) → `public/ap/ap-theme.css` (built) | Deployed with the site. Arts People loads it from the head snippet. |
| Head snippet | `src/ap/head.html` → `ap-out/head.html` | Arts People admin → Headers, top section, and footer → **HTML headers** |
| Header | `src/ap/top.html` → `ap-out/top.html` | → **Top section** |
| Footer | `src/ap/footer.html` → `ap-out/footer.html` | → **Footer** |
| Logo | `src/ap/obl-logo.png` → `ap-out/obl-logo.png` | Upload to Arts People so it is served at `/uploads/1078/obl-logo.png` |
| ENCORE 2027 copy | `src/ap/content/*.html` | Show setup → Long Description / Pricing Description, **HTML Editor** tab |

`npm run build:ap` rebuilds the CSS and the `ap-out/` snippets. It also runs at the start of every `npm run build`, so a deploy always ships CSS that matches `tokens.css`.

The site address in the snippets comes from `astro.config.mjs` (`site` + `base`). Today that is `https://offbroadwaylive.github.io/obl`.

## What needs re-pasting, and when

- **CSS changes:** nothing to re-paste. Deploy the site; GitHub Pages caches for about 10 minutes.
- **Header/footer/head changes:** run `npm run build:ap` and paste the changed `ap-out/` file.
- **Domain cutover:** after `astro.config.mjs` changes, run `npm run build:ap` and re-paste all three snippets (every link and the stylesheet URL change).

## The top section / footer pairing

The top section opens `<main class="obl-main"><div class="obl-card">` and the footer closes it. Arts People's content sits between them on every page. Always paste both together, or every Arts People page breaks.

The whole page is inside Arts People's `<form>`. Never put a `<button>` or `<input>` in the header or footer: it would submit the purchase form.

## Install (first time)

1. Deploy the site with `public/ap/` in it. Check `https://offbroadwaylive.github.io/obl/ap/ap-theme.css` opens.
2. Upload `ap-out/obl-logo.png` in Arts People. Open `https://app.arts-people.com/uploads/1078/obl-logo.png` to check the path.
3. Copy the current HTML headers, Top section and Footer boxes into a text file as the rollback copy.
4. At a quiet time (no shows that evening), paste `ap-out/head.html`, `ap-out/top.html` and `ap-out/footer.html` into those three boxes and Save. These are live on every Arts People page as soon as you save.
5. Walk the purchase path on a phone and a desktop: show page → pick a performance → seat map → cart → login → payment page (stop before paying). Also open a season-ticket (subscription) page.
6. Paste the ENCORE 2027 Long Description and Pricing Description from `src/ap/content/` using the **HTML Editor** tab (not Visual). Save, then reopen the HTML tab and confirm the `class="obl-..."` attributes survived.

**Rollback:** paste the saved copies from step 3 back in. Removing just the stylesheet `<link>` from HTML headers also restores Arts People's styling, but the new header and footer would then be unstyled.

## Older show descriptions

Descriptions typed in the visual editor carry inline fonts, colors and point sizes. The "legacy normalizer" at the end of `ap.css` maps them onto the brand: Impact → Anton, Georgia → Playfair, Arial → Inter, black → ink, maroon/red → brand red, and pt sizes capped for phones. Existing shows look on-theme with no rewrite. For a new show, write the description with the `obl-` classes (see `src/ap/content/`) instead of the visual editor's fonts.

## Description classes

| Class | Use |
|---|---|
| `obl-kicker`, `obl-live` | "Off Broadway *Live* presents" line |
| `obl-title`, `obl-anton`, `em` | Show title: Anton word + red italic Playfair |
| `obl-tagline` | Italic tagline |
| `obl-nights` > `obl-night` | Side-by-side cards; `obl-label` small caps line, `obl-doors` doors time |
| `obl-notes` | List with red marquee dots |
| `obl-callout` | Dark box with a gold `strong` lead |
| `obl-section` | Anton heading with a gold rule |
| `obl-season` | `ol` of shows: `obl-dates`, `h4` title, `obl-sub` tagline |
| `obl-group`, `obl-prices`, `obl-fine`, `obl-policy` | Pricing: group heading, price table (`th` label, `td` price, `small` unit), fine print, refund policy |

## Testing locally

Tests use saved copies of Arts People's real stylesheets (`public.min.css` = Bootstrap 3.4.1 plus Arts People rules, `1078-fbl-2019-mk.css`, `1078OffBroadwayLiive_CART.css`) loaded in the live order. Re-save them if Arts People changes its base CSS.

Things in those sheets the theme has to work around:

- Bootstrap sets `html { font-size: 10px }`. The theme resets it to 100% so `rem` sizes are correct; Bootstrap 3 itself sizes in px.
- `1078-fbl-2019-mk.css` styles every `.table` black/white/10px for the seat-map table labels. The theme only touches `table.table` (cart and data tables).
- The seat map contains plain `button`/`input`/`select` elements. The theme never styles bare form elements, and pins `.seatmap-div` to Arial 18px black. A seat-map guard test confirms zero computed-style changes on stand-in seat-map markup.
- Buy buttons on listing pages are styled by ID (`#Abuy_tickets`, `#Aitem_select`, `#mem_select a`, `#Apass_select`); the theme overrides those IDs to the red ticket button.
- Arts People's mobile seat picker pins the map 88px from the top; the site header stops being sticky on any page containing the seat map.

## Seat map

Tested on the real seat-selection page (page 148). A guard test compares every element inside the seat map and legend (595 elements) with the theme on and off: computed styles and rendered sizes are identical at desktop width.

On phones and small tablets (800px and narrower) the map is scaled with CSS `zoom` so the whole room fits the card, with a "Pinch to zoom in on the seats" hint; patrons pinch-zoom for detail, as they do today. Breakpoints in `ap.css` set `--map-zoom` from the narrowest screen in each range: (screen − 2 gutters − 2 card paddings) / 670px, where 657px is the widest seat-map row. Seats come out about 9–10px on a typical phone, larger than today's zoomed-out desktop page (about 6–7px). If a future map is wider, it scrolls sideways inside its box rather than widening the page. `zoom` (not `transform`) is used so the layout shrinks with it and taps land on the right seat.

A sweep of every width from 320 to 1400px in 2px steps on the show, seat and checkout pages finds no sideways page scroll, and the seat map fits its box at every width.

The "STAGE" label renders as a single 20px cell in the local test copy only; on the live page Arts People's script sizes it correctly (confirmed on a phone, Oct 29 2026).

Today the live pages have no viewport tag, so phones show the desktop layout zoomed out to fit (Arts People has no separate mobile layout on this path). The head snippet's viewport tag switches phones to the real mobile layout. Pinch-zoom stays enabled.

**Check live on a phone:** tap a seat on the scaled map and confirm the right seat highlights, and that any seat pop-up (ticket-type dropdown, hover tooltip) is usable. Arts People's script positions those, and the test copy can't run it.

## Not covered yet

Pages not yet captured and tested: the performance (date) list where the Buy Tickets buttons appear, the payment step, and season-ticket (subscription) pages.
