# Scripts

There is no build step: the browser loads these files as they are.

- `parts.js`, `../content/pieces.js` and `render.js` are plain scripts. They run first and put the pieces into the page while it loads, so nothing moves when the rest starts.
- `main.js` is the site script. It is an ES module (`<script type="module">`), and it imports one part per topic from `core/`, `text/` and `features/`. `print/` holds the print layout, used by `features/print.js`.

## How the parts fit together

- Loading a part only defines its functions and variables. Each part's `init()` does its start-up work (reads the page, adds listeners), and `main.js` calls the `init()`s in a fixed order. That is the order the code ran in when it was one file (`app.js`), so a part can rely on everything above it in `main.js` being ready.
- A part imports what it uses from other parts by name, for example `import { P, save } from "../core/state.js"`. Functions can be imported in any order. A variable belongs to the part that sets it, and other parts only read it.
- `shared` (in `core/state.js`) holds the few values that several parts change: `skCache`, `skKey`, `rmkPop`, `FSA`, `fontN`, `LEAD` and `wl`. They are read and written as `shared.LEAD` and so on.
- The settings are `P` (`core/state.js`), saved on this device only (localStorage key `aarti2-prefs`). `apply()` (`core/apply.js`) turns `P` into the `data-*` switches on `<html>` that the styles react to (see `../css/README.md`).
- A new file must also be added to `parts.js`, so it is kept for offline use. `tests/site-files.spec.mjs` checks this.

## Parts, in start-up order

| File | What it does |
|---|---|
| `core/page.js` | Page basics: the <html> element, the language button icons, the short message (flash) |
| `core/state.js` | Settings (P), loaded from this device |
| `core/features.js` | Features held back for a later release |
| `text/iast.js` | IAST transliteration (Devanagari → Latin with diacritics, Vedic accents as marks) |
| `text/layout.js` | Layout helpers that run once |
| `features/astronomy.js` | Astronomy for the Next Sankathara Chaturthi card |
| `features/date-card.js` | Next Sankathara Chaturthi card (computed on this device; works offline) |
| `text/dhrupad-markers.js` | Tappable dhrupad markers (Aartis 1–5, 7 and 9) |
| `text/stanza-numbers.js` | Stanza numbers |
| `text/line-breaks.js` | Preferred line breaks |
| `text/autofit.js` | Auto-fit text size |
| `core/apply.js` | Current piece, menus and apply() |
| `features/bottom-bar.js` | Bottom bar (#asc) and autoscroll |
| `features/tilt.js` | Tilt to scroll (bottom bar, phones and tablets) |
| `features/bars.js` | Bars tuck away while reading (CSS: "Bars tuck away while reading") |
| `features/settings-panel.js` | Settings panel |
| `features/dhrupad-button.js` | Dhrupad button: toggle once / after every stanza, keeping the reader's place |
| `features/wake-lock.js` | Keep the screen on (Wake Lock). Browsers drop the lock when the page is hidden, so it is re-requested. |
| `features/overlays.js` | Overlays: settings panel (setP) and contents + search (setJ); opening one closes the other |
| `features/history.js` | Back button |
| `features/languages.js` | Settings page: languages |
| `features/contents-list.js` | Contents list inside the contents + search overlay (built from the home page contents) |
| `features/clicks.js` | Clicks: contents links (data-go) jump to a piece; tapping a verse line highlights it |
| `features/pinch.js` | Pinch with two fingers to change the text size (the page itself never zooms) |
| `text/search.js` | Search: every Marathi line with its English line; matches ignore svara marks and punctuation |
| `core/startup.js` | Start-up |
| `features/picture-viewer.js` | Full-screen picture (#pzv): pinch or double-tap to zoom (1x to 5x), drag to move |
| `features/help.js` | Help: opens over the page; the phone's Back button closes it |
| `features/print.js` | Print |
| `print/profiles.js` | Print typography: per script, how far print may adjust a line's size; the side-by-side column range (no `init()`: read by `print/fit.js`) |
| `print/fit.js` | Print layout: sets each stanza's size (and side by side, the column widths) so lines stay whole and in step (no `init()`: called by `features/print.js`) |
| `features/share.js` | Share, QR code and the Add to Home Screen buttons |
| `features/offline.js` | Offline use: home-screen app details and the service worker (sw.js) |

`npm run lint` in `tests/` checks every file for mistakes, and for browser features that the oldest supported browsers (iOS 15.4) lack.
