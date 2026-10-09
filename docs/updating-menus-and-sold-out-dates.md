# Updating menus and sold-out dates

This is for Steve. It explains how to change the dinner menus and mark dates as sold out on the website, using the **OBL Website Content** Google Sheet.

## The short version

1. Open **OBL Website Content** in Google Sheets.
2. Make your changes on the **Menus** tab or the **Dates** tab.
3. Click **Website → Publish now** in the menu bar.
4. Wait about two minutes. The website now shows your changes.

**Nothing changes on the website until you click Publish now.** You can make as many edits as you like first, then publish once.

## The Menus tab

One row per show. You can type in the white cells:

| Column | What it is |
| --- | --- |
| Salad Title / Salad Description | The salad course |
| Entree Title / Entree Description | The main course |
| Dessert Title / Dessert Description | The dessert |
| Snack Board Description | What's on the Sunday Snack Board |

- The **Show** column (column A) is locked. You can't change show names here.
- **To leave a course off**, clear both its Title and its Description. For example, Best of 2026 has no salad.
- **A description needs a title.** If you fill in a description but leave its title blank, the sheet won't publish.
- **For a show with no dinner menu** (like A Big Band Christmas), leave the whole row blank.
- Type plain text. Line breaks are turned into spaces. Titles can be up to 80 characters and descriptions up to 300; anything longer is cut off.

The menu appears on that show's page and on the Dinner Menus page.

## The Dates tab

One row per performance. You can only change the **Status** column. Click a Status cell and pick from the dropdown:

| Status | What the website shows |
| --- | --- |
| **On Sale** | The date with a red **Get Tickets** button. |
| **Few Tickets Remain** | The same, plus a gold **Few Tickets Remain** tag on the show page, the calendar and the phone ticket bar. |
| **Sold Out** | The date stays listed but greyed out, with a **Sold Out** tag instead of the button. The home page countdown skips to the next date that is still on sale. If every date of a show is sold out, its poster gets a **Sold Out** ribbon. |

- **Show**, **Date** and **Performance ID** are locked. Garry sets them up.
- A Status cell can't be left blank. If one is, Publish now tells you which row to fix and sends nothing.
- Dates that have passed are ignored, and they disappear from the website by themselves overnight.

## When you click Publish now

- **"Sent: The website will update in about two minutes."** The website received your changes. Check the site after two minutes.
- **"Not published: Please fix: …"** Something on the sheet needs fixing first. The message names the tab and row. Fix it and click Publish now again.
- **"Not published: GitHub answered 401…"** or **"The publish key is missing"**: the sheet's publishing key needs renewing. Call Garry. Your edits are safe in the sheet; publish again once he's fixed it.

If you clicked Publish now, saw **Sent**, and the website still hasn't changed after five minutes, call Garry. The website sometimes catches a problem the sheet's own check misses. When that happens it keeps showing the last good version and emails Garry with the details.

## The first time

The first time you click Publish now, Google asks for permission and may warn that the app isn't verified. Garry will walk you through it once. Choose **Advanced**, then continue, then **Allow**.
