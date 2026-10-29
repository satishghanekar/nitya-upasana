# Styles

The site's styles are plain CSS files, with no build step. `index.html` loads them with one `<link>` tag each, in number order. The same list is in `js/parts.js`, which is used for the offline copy and for Check for updates. A test (`tests/site-files.spec.mjs`) checks that the two lists match.

## The one rule to know: order matters

Rules are in the order they were added, and a later rule for the same element refines an earlier one. To change a look:

1. Search all of `css/` for the selector, for example `.rftop` or `#home`.
2. Edit the **last** rule that sets the property. That is the match in the highest-numbered file, and the lowest one in that file.

Moving rules between files changes which one wins, so new rules go at the end of the file that fits them, or in a new numbered file. A new file is added to `index.html` and `js/parts.js` together.

Each file starts with a comment that lists its sections. Every section begins with `/* ==== Title ==== */`.

| File | What is in it |
|---|---|
| `00-fonts.css` | `@font-face` rules for `fonts/`. `unicode-range` makes the browser download only the parts a page uses. |
| `01-theme.css` | Colour and font variables on `:root` for the light, sepia and dark themes and high contrast. |
| `02-core.css` | The first full set of rules for the reading page: page, top bar, contents, pieces, language switching, search, phones held sideways, section headings, and the splash shown while the page starts (`#spl`). Also the first print rules. |
| `03-menus-print-view.css` | Top-bar title, the ⋯ More menu (`#shr`: App, Share, QR, Help), the QR pop-up, Add to Home Screen and its steps (`#inm`), the print builder (`#prm`: What, then How), the piece header card, and the dhrupad at the top of a piece. |
| `04-columns-rail.css` | Two stanza columns (`data-cols`), piece and stanza numbers, both languages side by side on wide screens, the wide layout (`data-rail`), the reading progress line and the dhrupad markers as pills. |
| `05-home-card.css` | The "paper sheet" under Home, the offline cloud in the top bar (`#ofb`), the lotus ornament at the end of each piece, quieter piece numbers, the fade-in, the tappable dhrupad markers and the repeated dhrupad. |
| `06-help-polish.css` | Help (`#help`), the final rules for the Settings rows, and general polish rules that refine the earlier files. |
| `07-bottom-bar-folds.css` | The bottom bar (`#asc`), the bars tucking away while reading (`data-tuck`), folding each piece and its heading row, bigger tap areas, the reading sheet (`#rsh`) and the text fonts. |
| `08-contents-book.css` | The Library's list of texts (`#jl`) as a book index, author lines, and Both languages with English first. |
| `09-settings-page.css` | The Settings page (Back and the tabs Reading \| Screen \| More in one row, the look of the Library's, one tab's cards at a time) and Kannada letters. |
| `10-today.css` | Home and the Library page: the picture beside the date (`#tdy`), the Vedic calendar line's place (`#pan`), the festival-day line (`#fst`) and the Sankashti-day line (`#skt`), the Morning / Afternoon / Evening switch (`#tss`) and the session's texts (`#tsc`), a session in one scroll (`data-run`: `#main` a flex column, no scroll anchoring, each `.inrun` piece in session order), Home's column beside the text being read on wide screens (`li.now` marks that text), Home on its own (`data-hv`: no pieces under Home), one text at a time (`.solo`), the top bar and bottom bar on Home (`data-home`), the Library (`#jump`), and the layouts for desktops, large monitors and tablets held upright. |
| `11-profiles.css` | Profiles and backup: the profile chip in the top bar (`#who`, the badge alone below 600px; on phones up to 420px without its frame, and the title without its small Ganesha), the round badges, the profile sheet (`#pfm`: the people on this phone, Add / Edit / Delete, the colour swatches), the Restore dialog (`#bkm`) and the notes on the home page (`#pfnt`: this browser can't save here, the backup reminder). |
| `12-calendar.css` | The Vedic calendar: the line on Home (`#panb`), the calendar page (`#cal`, under the top bar like the Library), the day card (`#cald`), the month table (`#calm`: day buttons, shukla and krishna shading with `--ck`, full and new moon marks, Ekadashi and Sankashti labels, festival labels (`.fs`) and tags (`.tag.fest`), today and the day shown, the key), two columns from 820px. |
| `13-library.css` | The Library by category: the "Edit categories" button at the end of the list (`#lbr`, `#lbb`), the categories sheet (`#lbm`: the categories with their counts and Rename, Add, the form, Delete, the category of each text), the search results' groups (`#res li.rh`: Texts, then Lines); the tabs Chants \| Books (`#jtb`) beside Back and the books' clouds (`.pst`: online only, or saved on this phone); the search box at the foot of the Library on phones (`#qbar`, under the list's own scroll `.libsc`, never fixed or stuck inside a scroll (an iPhone clips a fixed box there and scrolls the list back to a stuck one), the Library's contents lifted by the keyboard's `--kb` while it still covers the page; at the top beside Home on wide screens, where `.libsc` takes no box of its own) and Recent (`#rcn`, `#rcl`). |
| `14-builder.css` | The routine builder: Edit beside the session on Home (`#tsed`) and an empty session's Add texts (`#tse`, `#tsea`); the builder page (`#rtb`, under the top bar like the Library), the session / which-days radio groups (`.rtseg`), the weekday row (`#rtwk`), Copy to other days… (`#rtcpf`), the list with grip, ↑ ↓ ✕ (`#rtl`, `.mv`), and Add texts (`#tpk`): a sheet from the bottom on phones and tablets, beside the list from 1024px. |
| `15-print.css` | The printout, all of it: the print view (`#pv`, written by `js/features/print.js` in `pv…` classes of its own), its fixed sizes for each kind of text (an aarti or ashtak's centred stanzas, a Vedic chant's running paragraphs, both languages side by side), the fonts for each text font, the page rules (every text on a new page, a stanza never split, a Vedic paragraph never leaving one line alone), the contents, a routine's page 1 and the page footer (no frame round the page: Safari cannot repeat one). |
| `99-fallbacks.css` | Plain colours for browsers without `color-mix()` (iOS 15). **Keep it last**, because it replaces colours set in every file above. |

## Switches the styles read

- **Themes** are sets of colour variables (`--bg`, `--ink`, `--accent`, …) on `:root`. Light is the default. Dark follows the device unless a theme is picked in Settings (`data-pref="light|sepia|dark"`). `data-hc="1"` turns on high contrast.
- **`data-lang`** (`mr|en|both`) is set on each region, not on `<html>`:
  - The pieces, section headings, printout and contents lists carry the text language.
  - The bar, Settings, the home page, buttons and dialogs carry the menu language (`en|mr`).
- **Other switches on `<html>`:**
  - `data-ref`: the dhrupad, `1` = once, `0` = after every stanza.
  - `data-cols`: `1` or `2` columns.
  - `data-rail`: the wide layout (1024px and wider): Home's column on the left, the page beside it.
  - `data-print`: `one` or `side`, only while printing; then `data-font` and `data-ref` take the printout's font and dhrupad (Modern, Traditional or Bold, as in Settings).
  - `data-font`: the text font: `classic` (Traditional, the default), `std` (Modern) or `bold` (Bold).
  - `data-tuck`: the bars are tucked away.
  - `data-lead="en"`: English is the main language; `data-scr`: Kannada letters.
  - `data-home`: Home is on screen (no text open): the reading-only controls (bottom bar, Print this text) step aside.
  - `data-hv`: Home on its own (`js/features/history.js`): the reading page under Home is not shown (screen only) until a text is opened.
  - `data-run`: a session from Home is being read.
  - `data-menu`: the page that is open (`panel`, `jump`, `cal`, `rtb`); the bottom bar steps aside, except beside the Library and the calendar on wide screens.
  - `data-ready`: the site script has started. Until then the page is hidden, so it never shows half set up.

## Breakpoints

These are the only screen sizes the styles switch at. A test (`tests/edge.spec.mjs`) fails on any other, so a new one is added here first.

| Query | What changes |
|---|---|
| `(max-width: 359px)` | The smallest phones: Settings tightens |
| `(max-width: 379px)` | Narrow phones: the home buttons put their word under the icon |
| `(max-width: 399px)` | Phones up to 399px: the bottom bar's five buttons fit by showing only the arrows of Prev and Next |
| `(max-width: 439px)` | Phones: the bottom bar's five buttons (Prev, Home, Library, Reading, Next) close their gaps and slim the icon buttons |
| `(max-width: 420px)` | Phones: Prev / Next at the end of a piece take a narrower middle column; the profile chip shows the badge alone |
| `(min-width: 600px)` | Large phones and tablets: a larger home-page text limit |
| `(min-width: 760px)`, `(max-width: 759.98px)` | The print builder: below, What and How one step at a time (Next and back); from 760px (iPads upright too) side by side, the list scrolling on its own; Settings: below, the Reading tab tightened to fit one iPhone screen; from 760px a tab's groups in two columns, the preview beside the reading choices |
| `(max-width: 819px)` | Phones and small tablets: English names in the Vedic calendar's days a step smaller |
| `(min-width: 820px)` | Tablets and up: wider spacing; the Vedic calendar shows the day card beside the month |
| `(min-width: 600px) and (max-width: 1023px) and (orientation: portrait)` | Tablets held upright: Home with the picture large on top, the calendar's month above the day card, the Library in two columns |
| `(min-width: 1024px)` | iPads held sideways and desktops: Home's column on the left (on Home, and fixed beside the text being read) and the page beside it across the whole width; the calendar, Settings (across the width, a tab's groups in two columns) and Library open beside it; the routine builder's Add texts picker sits beside its list |
| `(min-width: 1400px)` | Desktops: a wider left column and 32px edges; the layout stops growing at 2200px, centred |
| `(min-width: 2200px)`, `(min-width: 3000px)` | Large monitors (2K at 100%, 4K at low scaling): the left column, the bars and the pages beside it drawn 1.25× / 1.6× larger (`zoom`) |
| `(orientation: landscape) and (max-height: 520px)` | Phones held sideways: tighter line spacing and headers; Home in two columns (the day left, the session right); the bottom bar's words under Home, Library and Reading are left out |

The same test keeps the number of `!important` (40) and `:root:root` (11) from growing: they only win over earlier rules, and each new one makes the next change harder.

Hover colours go inside `@media (hover: hover)`, so they show with a mouse and never stick after a tap on a phone or iPad.

## Checks

- `npm run lint` in `tests/` runs stylelint. It flags any CSS feature that the oldest supported browsers (`tests/.browserslistrc`, iOS 15.4 and up) lack.
- The screenshot and print tests catch visual changes.
