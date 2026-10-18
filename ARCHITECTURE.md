# How the site is built

This is for anyone changing the code. To change a piece's text, see `README.md` instead.

The site is one page, `index.html`, plus plain CSS and JavaScript files. **There is no build step.** Cloudflare Pages serves the files exactly as they are in the repository, so an edit made on the GitHub website goes live as written.

## What happens when the page opens

1. **`<head>`** loads the 11 style files in `css/` in number order, then `js/parts.js`, the one list of the site's files. `modulepreload` links fetch the script parts in parallel.
2. **`<body>`** has the top bar, Settings, the home page and the dialogs, written in HTML. Help's text sits in a `<template>` and is only laid out when Help is first opened.
3. **At the end of `<main>`**, three plain scripts build the pieces:
   - `content/pieces.js` holds the text of every piece (`CONTENT`).
   - `js/render.js` turns it into HTML (`renderPieces`). When Kannada letters are chosen, it rewrites the Devanagari in place (`SCR`).
   - A short inline script puts the result into the page.

   The pieces are therefore in the page as it is parsed, as if they had been written in the HTML.
4. **`js/main.js`** (`<script type="module">`) starts the site script. It calls each part's `init()` in a fixed order (listed in `js/README.md`), then sets `data-ready` on `<html>`.
5. **Until `data-ready` is set, the page is hidden.** The reader's theme, languages and folds, the fitted text size and the date card all arrive in step 4. Showing the page before that made the home page jump down by about 90px on a phone (layout shift 0.13). If the script never runs, the page shows after 1.5 s anyway.
6. **After the page is shown:**
   - The service worker (`sw.js`) saves the site for offline use.
   - Fonts that arrive late trigger one refit of the text size.
   - The print view is warmed up in an idle moment.

## Where the state lives

- **`P`** (`js/core/state.js`) holds everything the reader chose: languages, theme, font, text size, folds, the highlighted line, and so on.
  - It is saved on the device only, in `localStorage["aarti2-prefs"]`. Nothing is ever sent anywhere.
  - `P.sv` is the settings version. The migrations below it in `state.js` upgrade settings saved by older versions of the site.
- **`apply()`** (`js/features/bars.js`) is the only place that turns `P` into the page.
  - It sets the `data-*` switches the styles react to: `data-lang` on each region, and `data-ref`, `data-cols`, `data-rail`, `data-font`, `data-pref` and `data-hc` on `<html>`.
  - It sets `--fs`, the text size.
  - Anything that changes a setting updates `P`, calls `save()`, then calls `apply()`.
- **Auto-fit** (`js/text/autofit.js`) works out the largest text size at which every verse line fits the screen on one row.
  - It measures all lines at once in a hidden copy, so the page is laid out only once.
  - It remembers each result per language, font, layout and window size.
  - It is skipped when the reader has chosen a size (`P.fsu`).
- **`shared`** (`js/core/state.js`) holds the seven values that more than one part changes. A JavaScript module can only change its own variables, so these live in one object everyone can write to.
- **The styles** read only those switches and variables. `css/README.md` lists them and explains the one rule for editing: a later rule for the same element wins, so change the last one.

## Printing

The Print button builds a separate print view (`#pv`, in `js/features/print.js`) for the chosen layout. Printing from the browser's own menu builds the same view.

- **Layouts:** the Print pop-up offers two choices, Portrait and Landscape. One language prints in a column on either; the original with its English prints side by side, on Landscape only (stacked, one above the other, took a third more paper and is no longer offered). A piece marked `prose` in `content/pieces.js` (the Atharvashirsha) prints in one language as a booklet does: running paragraphs with a first-line indent and the verse numbers inline (`prose()` in `print.js`). A paragraph starts at a stanza marked `para`, and a dhrupad stanza is a paragraph of its own (centred when it is one line, like the closing peace chant). A danda stays with the word before it and a verse number stays whole (`glue()`). Paragraphs run on from page to page; side by side keeps the piece as stanzas.

- **Fitting the text** (`js/print/`): before the pages are planned, `fit.js` measures every printed line in the page-sized frame and sets each piece's size per language, and side by side the share of the width each column gets, so that lines stay whole and the two columns stay in step. Side by side, a row stays in step by line breaks too: a line written in two lines in one language is broken in the other at its preferred break nearest the same place; a row whose one side would wrap where the other fits has the other broken to match (between two words only when the first side has no better place either); and every planned wrap is written into the line as a `<br class="pvfb">`, because a line within 2% of its column may or may not wrap on paper, and a written break always does. `profiles.js` holds every number it works with: per script and text font, the size that makes the script look as large as the others, and how much smaller it may go to fit (never more than 15%).
- **New languages:** the fitting works out each column's script from its letters (`scriptOf` in `profiles.js`: Devanagari, Bengali, Gurmukhi, Gujarati, Odia, Tamil, Telugu, Kannada, Malayalam or Latin), so a new script needs nothing in the print code. Give it an entry in `SCRIPTS` only if `npm run print:audit` shows it looks larger or smaller than the others. The printed cells carry the page's own `lang`, and the Print pop-up's sample takes its first words from the page, so a new language needs nothing there either.
- **Page planning:** the view measures every unbroken block (stanza, verse group) in a frame the size of the printed page, then packs the blocks onto pages and forces a page break before each block that starts one. That is how no block is split across pages and the contents page gets real page numbers. The plan is then checked by laying the view out as a row of page-sized columns, which Chrome breaks the way it breaks pages: a block that lands on another page there gets its own break. A paragraph of prose never gets a forced break: it runs on from the page before, and a prose piece that spills up to 45% of a page onto a further page, or only just fills one, is set slightly smaller so it ends well inside a page and the contents numbers after it hold. A block taller than a page even at the smallest size (possible on a sideways page) may break between its lines, and starts below the block before it when a quarter of the page is still free, rather than on a page of its own.
- **The pop-up:** three rows. Dhrupad: Once or Every verse, for the printout only (`P.pref`). Page: for one language, Portrait or Landscape, shown pressed as last chosen (`P.por` "up" or "land"), or until then `CHOICE` in `js/print/profiles.js` (from the print audit): Portrait; for both languages it just says Landscape, side by side. Print font, with the first words of the first verse in each printed language. Then Cancel or Print (which takes the focus). Printing from the browser's own menu prints the same: one language in a column, both side by side (`dm()`).
- **Portrait or Landscape:** everything above works from the sheet as turned for the printout (`sheet(mode)` in `print.js`), and `@page { size: landscape }`, set as each printout is made, tells Chrome, Edge and Firefox. Safari keeps the sheet picked in its own dialog, so when Landscape is chosen the pop-up tells Safari readers to pick it there too. Released 2026-10-17 (`FEAT_SW` in `js/core/features.js`; set it to false to hide Landscape again, and every printout is then upright).
- **Printing on an iPhone:** Safari opens the print dialog only in answer to a tap. The printout for the layout last chosen is laid out ahead (`warm()`), so Print can print at once; otherwise the pop-up asks for one more tap (Print now). Printing never steps back in history (`ovDrop()`). The Home Screen app cannot print at all (checked on Satish's iPhone), so tapping Print there goes straight to Open in Safari, with the print choices in the address (read by `js/render.js`).
- **Slow phones:** the fitting and planning wait for the fonts for at most 2.5 s, then run with the fonts there are, so a slow phone still prints fitted text with page numbers.
- **Paper size:** Letter in the US, Canada, Mexico and the Philippines, A4 elsewhere (`LTR`).
- **Safari and every iPhone or iPad browser** (class `wk` on `<html>`) keep the page plan worked out from the heights; the check in page-sized columns is Chrome's. In Satish's Safari PDFs a printed page held up to a tenth less than that plan, so Safari's pages are packed to 90% (Chrome's to 96%), and prose that spills up to 45% of a page onto a further page is set at the largest size that takes a page fewer. Safari prints no page border or page-number footer: a fixed box is drawn once down the whole printout there, not once per page (Satish's Safari PDFs showed a box open at the bottom), so the border is Chrome's only; Safari's own headers and footers come from its print dialog. On a Mac, the print pop-up suggests Chrome, which turns the page itself and prints the border and page numbers.
- **Print font:** the pop-up's font picker sets `P.pfn`, the printout's font only (empty: the text font). The page takes it as `data-font` just while it prints (`pon()`/`poff()` in `print.js`), and the hidden copy the plan is measured in gets it too. Print dhrupad: `P.pref` (empty: as the page shows it) works the same way, through `data-ref`. Both are remembered for the next printout.
- **Safari on a Mac** prints about 16/15 larger than Chrome, and the page plan allows for that.
- **Tests:** `tests/print.spec.mjs` prints every layout × font to PDF, Portrait on Letter and A4, Landscape on Letter or A4 by turns, and checks where every block and every line landed. `npm run print:audit` prints every combination a reader can choose (208 PDFs), into `tests/pdfs/`, with a report of anything that came out badly (see `tests/README.md`).

## Offline use and updates

- `sw.js` keeps the page, every file in `js/parts.js` and the main fonts in a cache named after the version (`aarti-v1.0`).
  - The page and its parts are always fetched fresh when possible, with a 3 s limit before the saved copy is used, so the page never mixes old and new parts.
  - Everything else comes from the saved copy and is refreshed in the background.
  - If the saved copy cannot be read within 2 s, the request goes to the network. Safari's storage can stall, and a Mac once sat on a blank page because of it.
- **The version is written twice on purpose:** in `sw.js` (`V`) and in `<meta name="version">` in `index.html`.
  - Browsers install a new service worker when `sw.js` itself changes. Not every browser re-checks the files it imports, so the version must sit in `sw.js`.
  - The page needs the version at start-up too.
  - `tests/offline.spec.mjs` fails if the two differ.
- **`_headers`** lets phones keep font files for a year and pictures for a week without asking again. The page, styles and scripts are always re-checked (`no-cache`), so an update reaches readers on their next visit.

## Oldest supported browsers, and the fallbacks they need

The floor is **iOS 15.4** (iPhone 6s / 7, iPad Air 2 / mini 4 run up to iOS 15.8). The list is in `tests/.browserslistrc`. `npm run lint` fails on any CSS or JavaScript feature those browsers lack, unless the code checks for it first.

| Fallback | Why |
|---|---|
| `css/99-fallbacks.css` | `color-mix()` needs iOS 16.2. Without these plain colours, buttons and cards on iOS 15 lose their colours. The file must stay last. |
| `vh` before `dvh` / `svh` | Older Safari has no dynamic viewport units. |
| `setTimeout` when there is no `requestIdleCallback` | Safari has no `requestIdleCallback`, so the print warm-up just waits a moment. |
| Class `wk` on `<html>` | WebKit's print layout (see Printing). |
| `meta[name="version"]` read with a default | The page still runs if the tag is missing. |
| 1.5 s reveal | The page shows even if the site script fails to start. It also works when the phone asks for reduced motion, which turns off every other animation. |

## Things tried and rejected

- **`content-visibility: auto`** on the pieces, to skip laying out pieces off screen. It changes how margins collapse, which moved pieces 10–22px, and text inside skipped content reads back empty.
- **Reordering the CSS by topic.** The cascade depends on the order rules were added, and moving rules caused about 12,000 conflicts. The CSS was split where it stood instead.
- **An SVG sprite for repeated icons.** The page has 41 icons, of which 28 are different. Compression already makes the repeats almost free, and `<use>` inside buttons behaves differently in older Safari.
- **Moving the version into `js/parts.js` only.** See *Offline use and updates*.

## Checking a change

- `cd tests && npm run lint && npm test` runs the checks on a computer.
- GitHub runs every browser on each pull request.
- `tests/README.md` says what each suite protects and how to refresh screenshots.
- `tests/MANUAL.md` is the short checklist for real phones and screen readers.
