# Scripts

There is no build step: the browser loads these files as they are.

- `parts.js` and `render.js` are plain scripts. `render.js` turns the pieces' data into HTML (`renderPieces`) and holds the Kannada-letters switch (`SCR`).
- The texts are files (`../content/texts/`). `text/load.js` fetches them with `../content/library.json`, `text/content.js` turns them into the pieces' data (`CONTENT`, read with `text/format.js`), and `render.js` puts the pieces into the page. `main.js` waits for this before it starts the parts, so they find the page as if the pieces were written into it. These three are plain functions with no start-up work of their own; `text/format.js` and `text/content.js` touch no page at all, so the unit tests run them in Node.
- `text/load.js` also fetches `../content/routines.json` (the Today card's default routine) at the same time; without it the texts still load.
- `store/` keeps the people on this phone and their settings and ticks (version 1.4): `store/db.js` opens IndexedDB (database `nitya`, stores `meta` and `profiles`) with a one-second limit and one retry, falling back to memory; `store/migrate.js` upgrades settings saved by every older version and splits them into a person's part and the device's part; `store/profiles.js` is the profile model and the start-up plan; `store/store.js` holds them while the page is open and writes them back in order; `store/backup.js` writes and reads the `.nitya` backup file (with its SHA-256). `migrate.js`, `profiles.js` and `backup.js` touch no page; all five are unit-tested in Node (with fake-indexeddb). `main.js` waits for the texts and `openStore()` together before it starts the parts.
- `main.js` is the site script. It is an ES module (`<script type="module">`), and it imports one part per topic from `core/`, `text/`, `store/` and `features/` (`features/overlays.js` and the `print/` files are imported by the parts that use them). `print/` holds the print layout, used by `features/print.js`.

## How the parts fit together

- Loading a part only defines its functions and variables. Each part's `init()` does its start-up work (reads the page, adds listeners), and `main.js` calls the `init()`s in a fixed order. That is the order the code ran in when it was one file (`app.js`), so a part can rely on everything above it in `main.js` being ready.
- A part imports what it uses from other parts by name, for example `import { P, save } from "../core/state.js"`. Functions can be imported in any order. A variable belongs to the part that sets it, and other parts only read it.
- `shared` (in `core/state.js`) holds the few values that several parts change: `skCache`, `skKey`, `rmkPop`, `FSA`, `fontN`, `LEAD` and `wl`. They are read and written as `shared.LEAD` and so on.
- The settings are `P` (`core/state.js`): the person reading's settings joined with the device's. `save()` writes them at once to localStorage (`aarti2-prefs`, with `pid`, the person's id: the boot copy, read first at the next start and by `render.js` before the scripts run) and, a moment later, into that person's profile in IndexedDB (`store/store.js`). Switching person replaces `P` in place (`setAll()`, then `applyPrefs()` in `features/profiles.js`). `apply()` (`features/bars.js`) turns `P` into the `data-*` switches on `<html>` that the styles react to (see `../css/README.md`).
- A new file must also be added to `parts.js`, so it is kept for offline use. `tests/site-files.spec.mjs` checks this.

## Parts, in start-up order

| File | What it does |
|---|---|
| `core/page.js` | Page basics: the <html> element, the language button icons, the short message (flash) |
| `core/state.js` | Settings (P): the boot copy in localStorage and the person's profile (`store/store.js`, opened by `main.js` before the parts start) |
| `core/features.js` | Features held back for a later release |
| `features/day-picture.js` | The app's picture follows the time of day (sunrise, midday, sunset) with today's weekday star ringed; checks again at 12:00, 17:00, midnight and when the page comes back into view |
| `core/time-of-day.js` | Which picture and which star for a given moment (pure functions, unit-tested; no `init()`: used by `features/day-picture.js`) |
| `text/iast.js` | IAST transliteration (Devanagari → Latin with diacritics, Vedic accents as marks) |
| `text/layout.js` | Layout helpers that run once |
| `features/astronomy.js` | Astronomy: sun and moon positions, tithi, moonrise and the Sankashti rule (worked out on this device) |
| `features/sankashti.js` | Sankashti: the place (the reader's own from Settings → Place for moonrise, else the time zone's city), the next Sankashti (kept in `shared.skCache` for the Share message), and on a Sankashti day only one line on the home page (`#skt`) with moonrise and the place |
| `features/today-card.js` | Home (Home v2): the picture beside today's date in Marathi and English, the session for the time now with its texts and a tick each, "Not this time?" (the other sessions), Start / Continue; while a session is being read, ‹ Prev and Next › follow it (`sessionStep()`, read by `features/bottom-bar.js`), and Next ticks the text it leaves |
| `core/panchang.js` | The Vedic calendar (panchang), worked out on this device from `features/astronomy.js`: `dayPanchang(date, place)` (tithi, nakshatra, yoga, karana with their end times, sunrise, sunset, moonrise, amanta month with adhika, Shaka year and samvatsara, ritu, ayana, as at that day's sunrise) and `monthPanchang(year, month, place)` (each day's tithi at sunrise, kshaya and vriddhi, purnima, amavasya, Ekadashi, Sankashti). Lahiri ayanamsha, Kalnirnay / Drik convention; pure functions, unit-tested against the Swiss Ephemeris (`tests/unit/panchang.test.mjs`); no `init()` |
| `core/panchang-names.js` | The panchang's names in Marathi and plain English (IAST comes from the Marathi; tithis, months, nakshatras, yogas, karanas, weekdays, samvatsaras, ritus, ayanas); plain data |
| `features/vedic-calendar.js` | The Vedic calendar: the line on Home (`#pan`: month, paksha, tithi, nakshatra, Shaka year, samvatsara, sunrise, sunset, place; today only, worked out just after the page shows) and the calendar page it opens (`#cal`, like the Library: Back, the phone's Back, Escape): the day card and the month as a table of day buttons (arrow keys, Page Up / Down); a month is worked out only when shown. Place from `skLoc()` (`features/sankashti.js`) |
| `core/routine.js` | Which texts a session has on a weekday (`content/routines.json`), the week row's days, the first unticked text, the step to the next text of a session (pure functions, unit-tested; no `init()`) |
| `core/ticks.js` | The ticks, kept on this device for today only, per person (the storage passed in is the store's, which keeps them in each person's profile; `localStorage["nitya-ticks"]` from before 1.4 is moved into the first person; pure, unit-tested; no `init()`) |
| `text/dhrupad-markers.js` | Tappable dhrupad markers (Aartis 1–5, 7 and 9) |
| `text/stanza-numbers.js` | Stanza numbers |
| `text/line-breaks.js` | Preferred line breaks |
| `text/autofit.js` | Auto-fit text size |
| `core/apply.js` | Current piece, folds and menus |
| `features/bottom-bar.js` | Bottom bar (#asc) and autoscroll |
| `features/tilt.js` | Tilt to scroll (bottom bar, phones and tablets) |
| `features/bars.js` | Bars tuck away while reading (CSS: "Bars tuck away while reading"), and apply() |
| `features/settings-panel.js` | Settings panel |
| `features/dhrupad-button.js` | Dhrupad button: toggle once / after every stanza, keeping the reader's place |
| `features/reading-sheet.js` | Reading sheet: Aa in the bottom bar slides up language, text size and dhrupad, within thumb reach |
| `features/wake-lock.js` | Keep the screen on (Wake Lock). Browsers drop the lock when the page is hidden, so it is re-requested. |
| `features/overlays.js` | Overlays: settings panel (setP), the Library (setJ) and the Vedic calendar page (setC); opening one closes the others (no `init()`: used by bars, clicks, pinch, help and history) |
| `features/history.js` | Back button |
| `features/languages.js` | Settings page: languages |
| `features/contents-list.js` | The Library page (`#jump`): every text, grouped, with search; its Back button. The list is written in `index.html` and also feeds the side menu and the printout's contents |
| `features/clicks.js` | Clicks: Library and side-menu links (data-go) jump to a piece; tapping a verse line highlights it |
| `features/pinch.js` | Pinch with two fingers to change the text size (the page itself never zooms; on the home page a pinch does nothing) |
| `text/search.js` | Search: every Marathi line with its English line; matches ignore svara marks and punctuation |
| `core/startup.js` | Start-up |
| `features/picture-viewer.js` | Full-screen picture (#pzv): pinch or double-tap to zoom (1x to 5x), drag to move |
| `features/help.js` | Help: opens over the page; the phone's Back button closes it |
| `print/profiles.js` | Print typography: per script, how far print may adjust a line's size; the side-by-side column range; the pop-up's default page (`CHOICE`) (no `init()`: read by `print/fit.js`) |
| `print/fit.js` | Print layout: sets each stanza's size (and side by side, the column widths) so lines stay whole and in step (no `init()`: called by `features/print.js`) |
| `features/print.js` | Print |
| `features/share.js` | Share, QR code and the Add to Home Screen buttons |
| `features/offline.js` | Offline use: home-screen app details and the service worker (sw.js) |
| `features/profiles.js` | The badge in the top bar and the profile sheet (#pfm): switch, add, rename, colour and letters, delete with a confirm; `applyPrefs()` changes the page to another person's settings in place |
| `features/backup.js` | Save a backup file (share sheet on phones, else a download), Restore from a file (check, show what changes, confirm), the backup reminder, the "can't save here" note and `navigator.storage.persist()` |

`npm run lint` in `tests/` checks every file for mistakes, and for browser features that the oldest supported browsers (iOS 15.4) lack.
