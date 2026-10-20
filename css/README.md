# Styles

The site's styles are plain CSS files, with no build step. `index.html` loads them with one `<link>` tag each, in number order. The same list is in `js/parts.js`, which is used for the offline copy and for Check for updates. A test (`tests/site-files.spec.mjs`) checks that the two lists match.

## The one rule to know: order matters

Rules are in the order they were added, and a later rule for the same element refines an earlier one. To change a look:

1. Search all of `css/` for the selector, for example `.rftop` or `#home`.
2. Edit the **last** rule that sets the property. That is the match in the highest-numbered file, and the lowest one in that file.

The files are cut from what used to be one `site.css`, at its section boundaries and without reordering anything. Moving rules between files changes which one wins, so new rules go at the end of the file that fits them, or in a new numbered file.

Each file starts with a comment that lists its sections. Every section begins with `/* ==== Title ==== */`.

| File | What is in it |
|---|---|
| `00-fonts.css` | `@font-face` rules for `fonts/`. `unicode-range` makes the browser download only the parts a page uses. |
| `01-theme.css` | Colour and font variables on `:root` for the light, sepia and dark themes and high contrast. |
| `02-core.css` | The first full set of rules for the reading page: page, top bar, contents, pieces, language switching, search, phones held sideways, section headings. Also the first print rules. |
| `03-menus-print-view.css` | Top-bar title, Share / QR / Print, the Print pop-up (`#prm`), Add to Home Screen, the print view (`#pv`) built for the Print button, the piece header card, and the dhrupad at the top of a piece. |
| `04-columns-rail.css` | Wide screens: two stanza columns, piece and stanza numbers, button rows, both languages side by side, and the left contents menu (`#rail`). |
| `05-home-card.css` | The home page "paper sheet", the next Sankashti card, the offline cloud, the lotus ornament, fade-in, and the dhrupad markers. |
| `06-help-polish.css` | Help, the review rounds after 1.0, folding the Ganesha card, and folding the Pooja / Aarti sections. |
| `07-bottom-bar-folds.css` | Bottom bar, bars tucking away while reading, folding each piece, fold headings, bigger tap areas and the reading sheet (Aa). |
| `08-contents-book.css` | The Library's list of texts (`#jl`) as a book index, author lines, and Both languages with English first. |
| `09-settings-page.css` | The Settings page and Kannada letters. |
| `10-today.css` | Home (Home v2) and the Library page: the picture beside the date (`#tdy`), the Vedic calendar line's place (`#pan`), the festival-day line (`#fst`) and the Sankashti-day line (`#skt`), the Morning / Afternoon / Evening switch (`#tss`) and the session's texts with their ticks (`#tsc`), Start / Continue (`#tsb`, pinned on phones), More (`#tmb`, over `#shr`) and the Library line (`#tlib`), Home on its own (`data-hv`: no pieces under Home), the top bar and bottom bar on the home page (`data-home`), and the Library (`#jump`). |
| `11-profiles.css` | Profiles and backup: the profile chip in the top bar (`#who`, the badge alone below 600px; on phones up to 420px without its frame, and the title without its small Ganesha), the round badges, the profile sheet (`#pfm`: the people on this phone, Add / Edit / Delete, the colour swatches), the Restore dialog (`#bkm`) and the notes on the home page (`#pfnt`: this browser can't save here, the backup reminder). |
| `12-calendar.css` | The Vedic calendar: the line on Home (`#panb`), the calendar page (`#cal`, under the top bar like the Library), the day card (`#cald`), the month table (`#calm`: day buttons, shukla and krishna shading with `--ck`, full and new moon marks, Ekadashi and Sankashti labels, festival labels (`.fs`) and tags (`.tag.fest`), today and the day shown, the key), two columns from 820px. |
| `13-library.css` | The Library by category (version 1.8): the "Edit categories" button at the end of the list (`#lbr`, `#lbb`), the categories sheet (`#lbm`: the categories with their counts and Rename, Add, the form, Delete, the category of each text), the search results' groups (`#res li.rh`: Texts, then Lines). |
| `14-builder.css` | The routine builder: Edit beside the session on Home (`#tsed`) and an empty session's Add texts (`#tse`, `#tsea`); the builder page (`#rtb`, under the top bar like the Library), the session / which-days radio groups (`.rtseg`), the weekday row (`#rtwk`), Copy to other days… (`#rtcpf`), the list with grip, ↑ ↓ ✕ (`#rtl`, `.mv`), and Add texts (`#tpk`): a sheet from the bottom on phones and tablets, beside the list from 1100px. |
| `99-fallbacks.css` | Plain colours for browsers without `color-mix()` (iOS 15). **Keep it last**, because it replaces colours set in every file above. |

## Switches the styles read

- **Themes** are sets of colour variables (`--bg`, `--ink`, `--accent`, …) on `:root`. Light is the default. Dark follows the device unless a theme is picked in Settings (`data-pref="light|sepia|dark"`). `data-hc="1"` turns on high contrast.
- **`data-lang`** (`mr|en|both`) is set on each region, not on `<html>`:
  - The pieces, section headings, printout and contents lists carry the text language.
  - The bar, Settings, the home page, buttons and dialogs carry the menu language (`en|mr`).
- **Other switches on `<html>`:**
  - `data-ref`: the dhrupad, `1` = once, `0` = after every stanza.
  - `data-cols`: `1` or `2` columns.
  - `data-rail`: the left menu is shown.
  - `data-print`: `one` or `side`, only while printing; then `data-font` and `data-ref` take the Print pop-up's font and dhrupad.
  - `data-font`: the text font.
  - `data-tuck`: the bars are tucked away.
  - `data-lead="en"`: English is the main language; `data-scr`: Kannada letters.
  - `data-pf`, `data-xf`: the Pooja and Aarti folds.
  - `data-home`: the home page is on screen (no piece at the top yet): Language and Dhrupad step aside, the bottom bar gives way to Start.
  - `data-hv`: Home on its own (js/features/history.js): the pieces under Home are not shown (screen only) until a text is opened.
  - `data-menu`: Settings or the Library is open; the bottom bar steps aside.
  - `data-ready`: the site script has started. Until then the page is hidden, so it never shows half set up.

## Breakpoints

These are the only screen sizes the styles switch at. A test (`tests/edge.spec.mjs`) fails on any other, so a new one is added here first.

| Query | What changes |
|---|---|
| `(max-width: 359px)` | The smallest phones: the bottom bar drops the tilt label, the words of Prev and Next, and narrows the autoscroll speed; Settings tightens |
| `(max-width: 379px)` | Narrow phones: the home buttons put their word under the icon; the bottom bar closes its gaps |
| `(max-width: 420px)` | Phones: Prev / Next at the end of a piece take a narrower middle column; the profile chip shows the badge alone |
| `(min-width: 600px)` | Large phones and tablets: a larger home-page text limit |
| `(max-width: 819px)` | Phones and small tablets: Start / Continue is pinned to the bottom of the screen on the home page |
| `(min-width: 820px)` | Tablets and up: wider spacing; the Vedic calendar shows the day card beside the month |
| `(min-width: 1100px)` | Desktop: the left contents menu (`#rail`); the routine builder's Add texts picker sits beside its list |
| `(orientation: landscape) and (max-height: 520px)` | Phones held sideways: tighter line spacing and headers |

The same test keeps the number of `!important` (70) and `:root:root` (11) from growing: they only win over earlier rules, and each new one makes the next change harder.

## Checks

- `npm run lint` in `tests/` runs stylelint. It flags any CSS feature that the oldest supported browsers (`tests/.browserslistrc`, iOS 15.4 and up) lack.
- The screenshot and print tests catch visual changes.
- When files were split, every element's computed style was compared before and after the split in 34 page, dialog and print states.
