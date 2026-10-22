# Off Broadway Live — site rebuild build doc

Oct 7, 2026 · @Garry Hall

Build a static, data-driven replacement for offbroadwaylive.com on GitHub Pages, with one visual identity across every page and ticket sales still linking out to Arts People.

## 1. Goal and scope

The POC must let Steve compare the live Wix site with a rebuilt one and see three things: it looks like one brand on every page, it is easier to keep current, and it does things Wix does not.

**In scope**

- Every page in the current nav: Home, ENCORE Supper Club, each show page, A Big Band Christmas, Season Tickets, Dinner Menus, Media, Contact, FAQs.
- All existing copy, prices, dates and Arts People ticket links, carried over unchanged unless section 9 flags it.
- The new features in section 6.

**Out of scope**

- Any change to ticketing. Every purchase still opens `https://app.arts-people.com/index.php?performance=<id>` in a new tab.
- A CMS or login. Content is edited in data files in the repo.
- Pointing the real domain at the new site. The POC lives at the GitHub Pages URL.

**Hard rules for the POC**

- Add `<meta name="robots" content="noindex">` to every page and no sitemap, so the POC never competes with the live site in search. Control this with one config flag, `SITE_IS_LIVE=false`.
- Do not invent facts. Anything unknown gets a visible `TODO` marker in the data file and a neutral placeholder on the page.
- Do not use the names or likenesses of real artists beyond what the current site already uses in show titles and copy.

## 2. Stack and repo

Use Astro with no UI framework, built by GitHub Actions and served from GitHub Pages. Astro outputs plain HTML at build time, so show dates and prices are in the page source for search engines, and the header, footer and show layout are written once.

| Item | Decision |
| --- | --- |
| Repo | `dogmaticvox/offbroadwaylive` (public) |
| POC URL | `https://dogmaticvox.github.io/offbroadwaylive/` |
| Framework | Astro, static output, `base: '/offbroadwaylive'` |
| Styling | Plain CSS with custom properties in `src/styles/tokens.css`; no Tailwind |
| JavaScript | Vanilla, small inline modules only (countdown, seat map, lightbox, calendar filter) |
| Fonts | Self-hosted WOFF2 in `public/fonts`; no third-party font requests |
| Deploy | `.github/workflows/deploy.yml` using `withastro/action` on push to `main` |
| Nightly rebuild | Scheduled workflow at 08:00 UTC, so past performances drop off without anyone editing |

Every internal link and asset path must go through Astro's `import.meta.env.BASE_URL`, so the same build works at the project URL now and at the root domain later.

```
src/
  data/        shows.json  pricing.json  menus.json  faqs.json  season.json  site.json
  layouts/     Base.astro  Show.astro
  components/  Header  Footer  Marquee  ShowCard  DateList  PriceTable  SeatMap
               MenuCard  Ribbon  Banner  Gallery  FaqItem  Countdown
  pages/       index  shows/[slug]  encore-supper-club  season-tickets
               menus  media  contact  faqs  calendar  404
  styles/      tokens.css  base.css
public/
  images/      logo/  shows/  gallery/  venue/
  fonts/
scripts/
  fetch-assets.sh
README.md      how to add a show, change a price, post a banner
```

## 3. Design system

The identity is a theater marquee at night: black house, neon-red sign, warm bulb gold, cream paper. Every page uses the same header, the same dark background and the same components; a show changes only one accent color.

**What is wrong today, and the fix**

| Today on Wix | Rebuild |
| --- | --- |
| Page background changes per page: black, copper, red, navy, a poster image | One near-black background everywhere |
| White content panels on some pages, dark on others | Dark panels everywhere; cream is used only for small "paper" cards (menus, tickets) |
| Six or more typefaces | Three: display, serif, sans |
| Ribbons in green, gold, copper, silver, grey | One ribbon component, gold by default, accent color optional |
| Underlined text links as ticket buttons | One ticket button style |

**Color tokens**

| Token | Value | Use |
| --- | --- | --- |
| `--bg` | `#0a0a0b` | Page background |
| `--surface` | `#16161a` | Panels, cards |
| `--surface-2` | `#1f1f25` | Raised rows, hover |
| `--line` | `#2e2e36` | Borders, rules |
| `--text` | `#f4efe6` | Body text (cream, not pure white) |
| `--muted` | `#a8a29a` | Secondary text |
| `--neon` | `#e11d2a` | Brand red: "Live", primary buttons, key highlights |
| `--gold` | `#e6b422` | Marquee gold: ribbons, prices, rules, bulbs |
| `--paper` | `#f5ebdd` | Menu and ticket cards; text on it is `#1a1512` |
| `--accent` | per show, default `--gold` | Set from `shows.json`; tints the show hero, date chips and section rules only |

Suggested show accents, sampled from the poster art: Lionel `#c9742e` (copper), Best of 2026 `#d9822b` (sunset orange), Big Band Christmas `#1f8a4c` (green). Check each against `--surface` for 4.5:1 contrast on text; lighten if it fails.

**Type**

| Role | Font | Use |
| --- | --- | --- |
| Display | Anton | Nav, buttons, labels, "OFF BROADWAY" style caps. Matches the condensed heavy face the current nav uses |
| Serif | Playfair Display, regular and italic | Page and show titles, pull lines, prices |
| Sans | Inter | Body, dates, fine print, forms |

Body 17px/1.6. Titles use `clamp()` so they scale from phone to desktop. Never set body copy in italic serif, which the current site does for whole paragraphs.

**Signature elements**

- **Logo**: use the existing neon logo image on black, unchanged. The red glow is `text-shadow: 0 0 12px rgba(225,29,42,.8)` wherever "Live" is set in type.
- **Marquee bar**: one strip under the nav holding the award line: Voted "BEST LIVE THEATER GROUP" for 2025, Union-Tribune Readers Poll. Top and bottom edges are a row of small gold dots (CSS radial-gradient) that chase slowly. This replaces the two tagline rows.
- **Ribbon**: a CSS-only banner heading with notched ends, replacing the Wix ribbon graphics.
- **Ticket button**: Anton caps, `--neon` fill, 6px radius, glow on hover. Label is always "Get Tickets" or the performance date.
- **Paper card**: `--paper` panel with a thin gold border, used for menus and the pricing table.

**Motion**: marquee dot chase, a soft neon flicker on the logo once on load, cards lifting 4px on hover, sections fading up on scroll. All of it is disabled under `prefers-reduced-motion`.

**Layout**: max content width 1120px; 16px side gutter on phones; cards go to one column under 720px. Header collapses to logo plus a menu button under 900px; a "Get Tickets" button stays visible in the header at every width.

**Accessibility**: visible focus rings in gold, 44px minimum tap targets, alt text on every poster and photo, semantic headings in order, color never the only signal for seat tiers.

## 4. Data model

Six JSON files in `src/data` hold everything that changes; no page has a date, price or ticket link typed into its markup.

**`shows.json`**: one object per show.

```json
{
  "slug": "lionel-and-the-commodores",
  "title": "Lionel & The Commodores",
  "series": "encore",
  "kicker": "Encore Supper Club",
  "blurb": "From the \"Brick House\" funk of the Commodores to ...",
  "poster": "shows/lionel-poster.png",
  "hero": "shows/lionel-wide.jpg",
  "accent": "#c9742e",
  "pricing": "encore-standard",
  "menu": "lionel",
  "ageRule": "21+",
  "notes": [],
  "performances": [
    { "start": "2026-10-10T18:00", "id": 849899, "format": "dinner", "status": "on-sale" },
    { "start": "2026-10-11T15:00", "id": 849900, "format": "snack-board", "status": "on-sale" }
  ]
}
```

- `series`: `encore`, `holiday`, `theatrical`, `special`. Drives the kicker and grouping.
- `start` is local Pacific time and is the **doors** time, as the current site lists it.
- `id` is the Arts People performance number. The ticket URL is built in one helper: `https://app.arts-people.com/index.php?performance=${id}`.
- `status`: `on-sale`, `low`, `sold-out`. Set by hand; there is no live inventory feed. Default `on-sale`.
- `format`: `dinner`, `snack-board`, `dessert`. Drives the label and the price note on each date.

**`pricing.json`**: named price sets, so a price is typed once.

```json
{
  "encore-standard": {
    "feeNote": "plus $5 per seat food & beverage tax",
    "tiers": [
      { "key": "main",  "name": "Main Floor",        "seats": 1, "price": 99,  "unit": "per seat" },
      { "key": "bx1",   "name": "Bx1 table",         "seats": 2, "price": 214, "unit": "table for 2" },
      { "key": "bx",    "name": "Bx2-Bx9 tables",    "seats": 4, "price": 428, "unit": "table for 4" },
      { "key": "booth", "name": "Elevated Booth",    "seats": 4, "price": 436, "unit": "table for 4" }
    ],
    "adjustments": [ { "format": "snack-board", "perSeat": -15 } ]
  }
}
```

**Other files**

| File | Holds |
| --- | --- |
| `menus.json` | Keyed by menu id: chef, courses (course, dish, description), snack-board line |
| `faqs.json` | Ordered list of question, answer (markdown), optional category |
| `season.json` | Season year, on-sale date, headline, packages (name, shows, from price, footnote) |
| `site.json` | Name, address, phone, email, award line, map coordinates, social links, `banner` (text, link, start date, end date), `SITE_IS_LIVE` |

**Derived at build time** (a small `src/lib/shows.ts`)

- `upcoming(show)`: performances with `start` at or after today in `America/Los_Angeles`.
- `nextPerformance()`: the soonest upcoming performance across all shows.
- `currentShows()`: shows with at least one upcoming performance, ordered by first upcoming date. A show with none moves to a "Past shows" list and leaves the nav.
- The nav's show submenu is generated from `currentShows()`, which ends the mismatch between menus on different pages.

## 5. Pages

Every page shares `Base.astro`: header (logo, nav, Get Tickets button), marquee bar, optional site banner, content, footer.

| Page | Route | Contents, top to bottom |
| --- | --- | --- |
| Home | `/` | Hero for the next show (wide art, title, next date, countdown, Get Tickets). "Now playing and coming up" poster cards from `currentShows()`. "This weekend" strip of the next three performances. How a night works: three steps (doors and dinner, drinks and dessert, the show). Six-photo gallery teaser. Season tickets call-out. Email signup. |
| Show | `/shows/[slug]/` | Hero with wide art and `--accent`. Blurb. Date list (section 6). Pricing with seat map. That show's menu. Doors and age rules. Add-to-calendar. Other current shows. |
| ENCORE Supper Club | `/encore-supper-club/` | What it is. Current Encore shows as cards. Standard pricing with seat map. Friday/Saturday vs Sunday snack-board explanation. Policy line. |
| Season Tickets | `/season-tickets/` | On-sale headline. Four package cards in a row (Bronze, Silver, Gold, Platinum) using one card component with a metal-toned top edge. Benefits copy from `season.json`. Call the box office button (`tel:` link). |
| Dinner Menus | `/menus/` | Chef credit. One paper card per current show's menu, with anchors so show pages can link in. |
| Media | `/media/` | Responsive photo grid with lightbox, keyboard and swipe support, lazy loading. |
| Contact | `/contact/` | Address, phone, email, embedded map, directions link, free-parking note, email signup, About Us copy with venue photo. |
| FAQs | `/faqs/` | Accordion built on `<details>`, grouped by category, with FAQPage structured data. |
| Calendar | `/calendar/` | New page. Month grid and list of every upcoming performance, filterable by show. |
| 404 | `/404` | On-brand "this show has closed" page linking to current shows. |

**Header nav**: Shows (dropdown from `currentShows()`), ENCORE Supper Club, Calendar, Season Tickets, Menus, Media, FAQs, Contact, and the Get Tickets button, which links to the next upcoming show page.

**Footer**: address linked to maps, phone as a `tel:` link, email, doors times summary, award line, policy line, copyright year generated at build.

**Redirects**: add stub pages for the old Wix paths so links keep working after a cutover: `/encoresupperclub`, `/esc-lionel`, `/esc-bestof26`, `/bigbandchristmas`, `/dinner-menus`, `/escshows`.

## 6. Features

Build these in priority order; the first six are the demo for Steve.

| # | Feature | Behavior |
| --- | --- | --- |
| 1 | Self-updating dates | Past performances disappear at the nightly rebuild and client-side on load. A show with no dates left moves out of the nav. |
| 2 | Date list as ticket buttons | Each performance is a row: weekday, date, doors time, format tag (Dinner Show, Snack Board, Dessert Show), price-from, and a Get Tickets button. `low` shows a "Few seats left" tag; `sold-out` greys the row and disables the button. |
| 3 | Interactive seat map | Rebuild the seating chart as inline SVG: stage, main-floor tables 1A to 3E, Bx1 to Bx9, Elevated Booth. Hovering or tapping a price tier highlights its seats, and tapping a table highlights its tier. Informational only; seat selection still happens at Arts People. |
| 4 | Next-show countdown | Home hero counts down to the next performance's doors time, then switches to "Doors are open". |
| 5 | Scheduled site banner | The banner in `site.json` shows only between its start and end dates. Replaces the hand-built green Christmas ribbon. |
| 6 | Calendar page | All performances in one view, filterable by show, each linking to tickets. |
| 7 | Add to calendar | Per-performance `.ics` download generated at build, with venue address and doors time. |
| 8 | Search and share data | Per-page titles and descriptions, Open Graph images from show art, `Event` structured data per performance (name, start, venue, price-from, ticket URL), `FAQPage` on FAQs, `LocalBusiness` on Contact. Emit only when `SITE_IS_LIVE` is true. |
| 9 | Menu on the show page | The show's menu appears on its own page, pulled from `menus.json`. |
| 10 | Gallery lightbox | Full-screen viewer with arrows, swipe, Escape to close, captions when present. |
| 11 | Sticky mobile ticket bar | On show pages under 720px, a bottom bar shows the next date and a Get Tickets button. |
| 12 | Email signup | Name, phone, email form. Until a provider is confirmed, the form posts nowhere and shows "Signup coming soon" on submit. Build it so a single `action` URL in `site.json` turns it on. |

**Not building**: seat selection, checkout, accounts, live availability. Arts People owns all of it.

## 7. Content to load

This is the content read from offbroadwaylive.com on 7 Oct 2026; load it into the data files as written. Where the fetched text and the screenshots disagreed, the screenshot value is used and section 9 lists it.

**Site facts (`site.json`)**

- Name: Off Broadway Live
- Address: 9490 Cuyamaca Street, Santee, CA 92071
- Phone: 619-988-LIVE (5483), dial string `+16199885483`
- Email: info@offbroadwaylive.com
- Award line: Voted "BEST LIVE THEATER GROUP" for 2025 - Union-Tribune Readers Poll
- Tagline: Come See Why San Diego Audiences Are Raving About Off Broadway Live!
- Banner: "Christmas Dessert Show Tickets On Sale Now!" linking to the Big Band Christmas page, ending 13 Dec 2026

**Show 1: Lionel & The Commodores** (series `encore`, pricing `encore-standard`, menu `lionel`, 21+)

Blurb: From the "Brick House" funk of the Commodores to his unmatched solo career, this is a celebration of a music icon. Get ready for a night full of soulful ballads and chart-topping party anthems of the one and only Lionel Richie.

| Date (2026) | Doors | Format | Arts People id |
| --- | --- | --- | --- |
| Fri Oct 2 | 6:00pm | dinner | 849897 |
| Sat Oct 3 | 6:00pm | dinner | 849898 |
| Sat Oct 10 | 6:00pm | dinner | 849899 |
| Sun Oct 11 | 3:00pm | snack-board | 849900 |
| Fri Oct 16 | 6:00pm | dinner | 849901 |
| Sat Oct 17 | 6:00pm | dinner | 849902 |
| Sun Oct 18 | 3:00pm | snack-board | 859089 |
| Fri Oct 23 | 6:00pm | dinner | 849903 |
| Sat Oct 24 | 6:00pm | dinner | 849904 |

**Show 2: Best of 2026** (series `encore`, pricing `encore-best-of`, menu `best-of-2026`, 21+)

Blurb: The BEST of all Encore Supper Clubs from 2026! Note: This show is priced $10 higher than our regular ENCORE Supper Club shows, but, it's worth it!

| Date (2026) | Doors | Format | Arts People id |
| --- | --- | --- | --- |
| Fri Nov 6 | 6:00pm | dinner | 848434 |
| Sat Nov 7 | 6:00pm | dinner | 848435 |
| Sun Nov 8 | 3:00pm | snack-board | 848436 |
| Fri Nov 13 | 6:00pm | dinner | 848437 |
| Sat Nov 14 | 6:00pm | dinner | 848438 |
| Sun Nov 15 | 3:00pm | snack-board | 848439 |
| Fri Nov 20 | 6:00pm | dinner | 848440 |
| Sat Nov 21 | 6:00pm | dinner | 848441 |

**Show 3: A Big Band Christmas** (series `holiday`, pricing `christmas-dessert`, no dinner menu, ages over 10)

Copy: Your First Wine, Beer & Champagne is on us, additional available for purchase at our bar. Then, Decadent Holiday Dessert is Served with Complimentary Soft Drinks or Coffee. Then, Onto The Show! Notes: This show will be presented without an intermission. Due to the intimacy of our cabaret style theater, everyone over the age of 10 is welcome.

| Date (2026) | Doors | Format | Arts People id |
| --- | --- | --- | --- |
| Thu Dec 10 | 6:00pm | dessert | 927602 |
| Fri Dec 11 | 6:00pm | dessert | 927603 |
| Sat Dec 12 | 2:00pm | dessert | 927604 |
| Sat Dec 12 | 6:00pm | dessert | 927613 |
| Sun Dec 13 | 2:00pm | dessert | 927607 |

**Pricing sets (`pricing.json`)**

| Tier | `encore-standard` | `encore-best-of` | `christmas-dessert` |
| --- | --- | --- | --- |
| Main floor, per seat | $99 | $109 | $94 |
| Bx1, table for 2 | $214 | $224 | $204 (Bx1, BxA2, BxB2) |
| Bx2-Bx9, table for 4 | $428 | $438 | $408 |
| Elevated Booth, table for 4 | $436 | $446 | $416 |
| Fee note | plus $5 per seat food & beverage tax | same | plus $5 per seat food, beverage tax & fees |

Encore rules: Fridays and Saturdays doors open 6:00pm. Sunday Sweet & Salty Snack Board Shows doors open 3:00pm and are priced $15 per person less than the Dinner Show. Bx2-Bx9 tables include 4 tickets with double sized tables. Policy: All ticket purchases are final and nonrefundable to this 21+ age dinner event. Line to keep: There's not a bad seat in the house!

**Seat map layout** (from the seating chart image): stage across the top. Main floor is three rows of five 4-seat tables: 1A-1E, 2A-2E, 3A-3E. Down the right side, front to back: Bx1 (2 seats), Bx2, Bx3, then Elevated Booth 4. Across the back, left to right: Bx9, Bx8, Bx7, Bx6, Bx5. There is no Bx4; the booth takes that position.

**Menus (`menus.json`)**: Prepared & Presented by Chef Carson Neil.

| Menu | Course | Dish | Description |
| --- | --- | --- | --- |
| `lionel` | Salad | Blueberry Orchard Salad | Mixed greens with blueberries, mozzarella, and crunchy croutons with vinaigrette dressing. |
| `lionel` | Entree | Seasoned Chipotle Honey Chicken Breast | Creamy Gouda Mashed Potatoes, Asparagus and a dinner roll. |
| `lionel` | Dessert | Cheesecake with Raspberry Sauce | Rich silky cheesecake finished with a vibrant raspberry drizzle. |
| `lionel` | Sunday Snack Board | Mini Slice of Cheesecake, Savory Crunch Mix & Fresh Seasonal Fruit |  |
| `best-of-2026` | Entree | Oven-Roasted Turkey Breast | Tender roasted turkey served with creamy mashed potatoes smothered in savory turkey gravy, a side of sweet-tangy cranberry relish, and a dinner roll. |
| `best-of-2026` | Dessert | Pumpkin Pie with Fresh Whipped Cream | A slice of soft rich pumpkin pie with a generous topping of heavy whipped cream. |
| `best-of-2026` | Sunday Snack Board | Turkey Slider with Cranberry Delight Salad & Pumpkin Pie |  |

The live site spells it "cruncht croutons"; "crunchy" above is the correction.

**Season tickets (`season.json`)**: headline "All 2027 Show Tickets On Sale November 1st". Sub-line: Season Tickets saves you money and guarantees your seats to the shows you want to see! Heading: Choose From 4 Levels.

| Package | Shows | Line | From |
| --- | --- | --- | --- |
| Bronze | 4 | Your choice of FOUR Shows in our 2027 Season | $339\* |
| Silver | 5 or 6 | Your choice of FIVE Shows in our 2027 Season | $423\* |
| Gold | 7 | Your choice of SEVEN Shows in our 2027 Season | $588\* |
| Platinum | 8 or 9 | Your choice of EIGHT Shows in our 2027 Season | TODO |

**About Us (Contact page)**

Live Dinner Theater with cabaret seating (tables and chairs) adds a comfortable intimacy where you can enjoy an evening out with three of your friends at a table while experiencing the finest in musical entertainment.

Beginning our 15th Season, Off Broadway Live brings some of San Diego's finest singers and actors together on stage.

Our Live Band Dinner Show, ENCORE Supper Club, is a high powered show that you can not find anywhere else, and we have it at Off Broadway Live! "Dinner, Drinks, Dessert and a Live Band Show Unlike Any Other!"

DECADES: Flashback, A Musical Revue Dinner Show, features music from four years spread over four decades and a terrific "Slider & Salad" Dinner & Dessert.

Chicken Fried Gospel Dinner Show or Sunday Breakfast Brunch Show - Biscuits & Gravy and all the Egg & Bacon fixin's is back with new music, new performers & musicians.

**FAQs (`faqs.json`)**: lead line: Call the Box Office @ 619-988-LIVE (5483) anytime for personalized service and details. Age line: Due to the intimacy of our theater we do not admit children under the age of 10 for DECADES & THEATRICAL Shows. ENCORE Supper Club & Specialty Shows are 21+ Shows.

1. **Do you have a Box Office?** You may purchase tickets at our Online Box Office at any time. If you need to speak to someone, feel free to call 619-988-5483 and someone will be available to answer your questions or assist with a purchase. You may also email us at anytime from the Contact page.
2. **What days and times are your performances?** ENCORE Supper Club: Fridays & Saturdays doors @ 6:00pm; Sundays are a Snack Board Show @ 3:00pm. DECADES: Flashback, GRACELAND: Memphis Nights, Chicken Fried Gospel and Theatrical shows: Dinner Shows Friday & Saturday doors @ 6:00pm; Lunch Show Sunday doors @ 1:00pm. (This merges the live site's questions 2 and 3, which repeat each other.)
3. **Do you offer Season Tickets and what are the advantages?** Season Ticket holders receive a discount on tickets purchased, notification of advanced ticket sales for Speciality, Holiday and shows that typically sell out and special events such as our annual "Thank You" dinner. Call the Box Office for your Season Tickets.
4. **Do you offer gift certificates?** Yes! However, because we sell out many of our shows weeks in advance, we encourage you to purchase a specific show, guaranteeing your gift card recipient has a date and seats reserved for them. Call the Box Office for more information. 619-988-5483.
5. **Do you have a bar?** Yes! We offer Wine, Beer & Champagne.
6. **What is your parking availability?** Our parking availability is FREE, abundant and has very close proximity to the theater.
7. **Do you offer auditions for upcoming shows?** Our repertory troupe of 11 singers/actors is set for 2025. (Year is stale; see section 9.)

## 8. Assets

Write `scripts/fetch-assets.sh` to download every file below with `curl` into `public/images`, then commit the images so the build never depends on Wix. Run it from Garry's machine; the script is a one-time import.

All files live under `https://static.wixstatic.com/media/`. Request the bare media path (no `/v1/fill/...` suffix) to get the original size; if that fails, append `/v1/fill/w_1600,h_1600,al_c,q_90/file.jpg`.

| Save as | Wix media file | What it is |
| --- | --- | --- |
| `logo/obl-logo.png` | `f205a0_b8334bf8ee1641979894668a2cce2baf~mv2.png` | Neon logo on black |
| `shows/lionel-poster.png` | `f205a0_f2a604a5b4d24b2994bd282a3fce87d9~mv2.png` | Lionel square poster |
| `shows/lionel-wide.jpg` | `f205a0_01f34a1391fe44238cb53b30b80ff5a5~mv2.jpg` | Lionel wide art |
| `shows/bestof26-poster.png` | `f205a0_7292e3c2a8154167aac6b4ca474a9374~mv2.png` | Best of 2026 square poster |
| `shows/bestof26-wide.jpg` | `f205a0_c9d9c4c60b7b40b6a2afe802fcd1c6f6~mv2.jpg` | Best of 2026 wide art |
| `shows/christmas-wide.png` | `f205a0_2dc68d782dd6469d8c63c6748a73153d~mv2.png` | A Big Band Christmas art |
| `venue/seating-chart.png` | `f205a0_216a0e4a06de4137a8407adfae873048~mv2.png` | Seating chart, reference for the SVG rebuild only |
| `venue/end-of-show.jpg` | `f205a0_119053e64eb8410a8e3a1e41640d29c8~mv2_d_2016_1512_s_2.jpg` | About Us photo |
| `venue/jukebox.jpg` | `f205a0_b5f6ff6ddcb944e68edc8310a6a2c9c1~mv2.jpg` | Contact page background photo |
| `venue/rat-pack-stage.jpg` | `f205a0_b4a6ae98fee94bb2a43ad036feb8989f~mv2.jpg` | FAQ page photo |

**Gallery** (save as `gallery/01.jpg` onward, in this order; all prefixed `f205a0_`, all `~mv2`):

```
334f44fd1b6742639afccfa58a04aa41.jpeg   d59f117ef8ee45348c0c5a1678b86df5.jpeg
58147c7b5fad4051b453adff26f71cd0.jpg    5467076ffbd944e19a7c437de17d492f.jpg
e18a4be45d1d42538ab31dda580f6b7d.jpg    1984631f38e042b5bda330f1ed7e86fd.jpg
4a0bb5fb63da4f1fb3858cac6048c2b1.jpg    22525e0a110d471fbea1180f2633c2a4.jpg
a3d929c631b64fb6a9f0c339cb7c2999.jpg    6ab8c0b96e464ca7be59ea8dec2c5dad.jpg
3758c35f11fb4c24a4f0573cf5d36870.jpg    be0e966ff88149429e43b10c7e67076e.jpg
218513c8f7a04a3e8269e7e82d27749f.jpg    5ef8d2560d0f4039a0fbd10f6da9ac2b.jpg
852d8459dd054ff5b799ed641ed156ae.jpg    7fa2110d4dee4cb5872c9b9e453bbac6.jpeg
9399fd5ae2fd4377a77f51bdd34ea5f5.jpeg   01fac332a69a453ab860fae905bec8f8.jpg
f81ec759bc6346bd8f92029a4ef1f80a.jpg    261d4edf186d438eb8daa14d82c8c724.jpeg
42389872f891431eb381157a7669bf35.jpg    651998a4818243ec8507c8f1d47633ab.jpeg
dc29dde7618f49879e946d371b607b39.jpeg   c9b04dae082c464c9e5a09f9c64e07db.jpg
f7a1e45865414dab8d007d3b6deaaa7a.jpg
```

Full URL pattern: `https://static.wixstatic.com/media/f205a0_<hash>~mv2.<ext>`.

**After download**: convert photos to WebP at 1600px and 800px widths with Astro's image pipeline, keep posters as PNG source, and write real alt text for each (view the image first; do not guess from the file name).

**Placeholders to create** (dark `--surface` panel with a gold border and a label, so gaps are obvious in the demo)

| Placeholder | Where | Until |
| --- | --- | --- |
| Christmas square poster | Home card, show page | Steve supplies one, or crop from the wide art |
| Home hero background | Home | A wide, high-resolution stage photo is supplied; use the best gallery shot meanwhile |
| Open Graph share image, 1200x630 | All pages | Built from logo on black |
| Favicon set | All pages | Built from the red "Live" script, or an "OBL" monogram in Anton if the crop is unclear |
| Gallery captions | Media | Steve supplies show names per photo; leave blank otherwise |

If any download returns an error, keep going, list the failures at the end of the script's output, and use a placeholder for each.

## 9. Open items

None of these block the build; each has a default so Code can proceed.

| # | Question | Who | Default until answered |
| --- | --- | --- | --- |
| 1 | Platinum package "from" price for 2027, and whether it is 8 shows or 8 or 9 | Steve | Show "Call for pricing" |
| 2 | What the asterisk on the season prices refers to | Steve | Footnote reads "Plus applicable taxes and fees. Call the box office for details." marked TODO |
| 3 | Audition FAQ still says the troupe is set for 2025 | Steve | Keep text, flag in the data file |
| 4 | FAQ lists DECADES, GRACELAND and Chicken Fried Gospel times; none are on sale now | Steve | Keep, under a "Other shows" sub-heading |
| 5 | Where the email signup sends data today (Wix contacts or another list) | Steve | Form disabled with "Signup coming soon" |
| 6 | Christmas pricing names Bx1, BxA2 and BxB2 tables, which are not on the seating chart | Steve | Christmas page shows the price table without the interactive map |
| 7 | Whether each time listed is doors or curtain | Steve | Label every time "Doors" as the site does |
| 8 | Social media links; none appear on the current site | Garry | Omit the social row |
| 9 | Original, full-resolution logo and poster files | Garry | Use the Wix copies |
| 10 | 2027 season show list, for the calendar and season page | Steve | Season page shows packages only |
| 11 | Any pages under the Wix "More" menu that were not readable | Garry | Not built |

**Differences found between the fetched pages and the screenshots** (the fetch returned older cached copies of some pages):

- Season Tickets: the fetch showed 2026 and prices of $341, $430, $608, $697; the screenshot shows 2027 and $339, $423, $588. The screenshot values are used.
- About Us: the fetch said "Now offering shows for its 12th Season"; the screenshot says "Beginning our 15th Season". The screenshot wording is used.
- Nav: some fetched pages listed Cheyenne Frontier Days, Neil Diamond and Living Room Concerts; the screenshots show the current nav without them. Those pages are not built.

## 10. Build order and acceptance checks

Build in this order and commit after each step, so there is something to show at every stage.

1. Scaffold Astro, base path, deploy workflow; confirm a blank page is live at the POC URL.
2. Run `fetch-assets.sh`; commit images and fonts.
3. `tokens.css`, `base.css`, `Base.astro` with header, marquee bar and footer.
4. Data files from section 7 and `src/lib/shows.ts` with unit tests for `upcoming`, `nextPerformance` and `currentShows`.
5. Show layout: hero, date list, price table, menu card. Generate the three show pages.
6. Home page.
7. ENCORE Supper Club, Season Tickets, Menus, FAQs, Contact, Media.
8. Seat map SVG and tier highlighting.
9. Calendar page, `.ics` files, countdown, scheduled banner, sticky mobile bar.
10. Structured data and Open Graph (behind `SITE_IS_LIVE`), redirect stubs, 404, nightly rebuild workflow.
11. README for editors.

**Acceptance checks**

- [ ] Every page uses the same header, background, type and components; no page has its own background color.
- [ ] All 22 performances from section 7 are in `shows.json` with the correct Arts People id, and every ticket button opens the matching `app.arts-people.com` URL in a new tab.
- [ ] With the build date set to 7 Oct 2026, Lionel shows 7 upcoming dates and hides Oct 2 and Oct 3.
- [ ] With the build date set to 25 Oct 2026, Lionel is gone from the nav and home page, and Best of 2026 is the hero.
- [ ] Changing one price in `pricing.json` changes it on every page that shows it.
- [ ] Best of 2026 shows $109, $224, $438, $446; Sunday snack-board dates show $15 less per seat.
- [ ] The Christmas banner appears through 13 Dec 2026 and not after.
- [ ] Every page has `noindex` while `SITE_IS_LIVE` is false.
- [ ] Lighthouse on a phone profile: Performance 90+, Accessibility 95+, Best Practices 95+.
- [ ] No horizontal scroll at 360px wide; nav, date list, seat map and gallery all usable by touch and by keyboard.
- [ ] No requests to wixstatic.com, Google Fonts or any tracker from the built site. The map embed on Contact is the one allowed third-party request and loads only on click.
- [ ] README explains, in steps a non-developer can follow: add a show, add or remove a date, mark a date sold out, change a price, post a banner, add gallery photos.
- [ ] Every `TODO` from section 9 is listed in `TODO.md` with the file and line it lives in.
