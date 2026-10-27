# Tests

Automated checks for the site. The site itself has no build step; everything here only **tests** the files at the repository root, served exactly as Cloudflare Pages serves them. All the tooling (including `package.json`) lives in this folder, so Cloudflare never installs or builds anything.

## Running

```sh
cd tests
npm ci                               # once
npx playwright install chromium      # once (add firefox webkit for the other engines)
npm run quick                        # the quick check: lint, types, logic tests, and the browser suites for what changed (about 2 min)
npm run full                         # the full run, before every merge: lint, types, logic tests and every browser suite
npm run release                      # the release check: the print audit and Lighthouse (before a version bump)
npm test                             # every browser suite (Chromium only, the default on a computer)
npm run lint                         # stylelint and eslint, as CI runs it
npm run unit                         # Vitest: the logic tests in unit/ (no browser, a second or two)
npm run types                        # TypeScript checks the JavaScript files that start with // @ts-check (nothing is compiled)
npm run pdfs                         # after adding or replacing a PDF: writes each book's pages and size into content/pdfs.json
PW_PROJECTS=chromium,firefox,webkit,iphone,ipad,pixel npm test   # every engine, as CI runs it
npx playwright test print.spec.mjs   # one suite
npx playwright test -g "kannada"     # tests whose name matches
SAVE_PDFS=1 npx playwright test print.spec.mjs   # also keep every printed PDF in tests/pdfs/ to look at
npm run lhci                         # Lighthouse CI: CLS fails the run; score, LCP and TBT targets warn until they are met
```

`npm test` starts a small static server (`serve.mjs`, port 4173) by itself. On a failure, `npx playwright show-report` opens the details, with a trace of every step.

GitHub Actions does not run at the moment (the account's Actions are blocked), so its checks show red within seconds on every pull request without having run. Instead every suite is run in a Claude session in the cloud before a pull request is merged (`PW_CHROMIUM_PATH=/opt/pw-browsers/chromium PW_PROJECTS=chromium npm run full`), and the results are posted on the pull request. Only Chromium is installed there, so the Firefox, WebKit, iPhone and iPad projects wait for GitHub. When it runs, every pull request and every push to `main` runs everything (`.github/workflows/tests.yml`, in the `mcr.microsoft.com/playwright:v1.64.1-noble` image, kept in step with `@playwright/test` in `package.json`): lint, Chromium, Firefox, WebKit (Safari's engine), iPhone, iPad and Pixel emulation, and Lighthouse.

## Three levels

| Level | When | Command | Time (cloud session) |
|---|---|---|---|
| Quick check | While working, after each edit | `npm run quick` | 10 s to about 2 min |
| Full run | Before every pull request is merged: every change is fully tested | `npm run full` | about 13 min (never run two at once: both then take about twice as long) |
| Release check | Before a version bump | `npm run release`, then every engine (`PW_PROJECTS=chromium,firefox,webkit,iphone,ipad,pixel npm test`) once GitHub Actions runs again | 5 to 10 min more |

The quick check (`quick.mjs`) compares the checkout with `origin/main` (commits, uncommitted edits and new files) and runs only the browser suites that test the changed files: `css/12-calendar.css` or `js/core/panchang.js` runs `calendar.spec.mjs`, a text in `content/texts/` runs `content.spec.mjs` and `print.spec.mjs`, a change to `tests/helpers.mjs` runs everything, and so on (the list is `SUITES` in `quick.mjs`). Smoke always runs, and a site file the list doesn't know runs interactions and the screenshots. `npm run quick -- --list` only prints what it would run. Lint, types and the logic tests come first and stop the run at the first failure, so most mistakes show in seconds. The quick check never replaces the full run.

## The suites

| File | What it protects |
|---|---|
| `unit/*.test.mjs` | Logic tests with Vitest, no browser: the text format and `content/library.json` (`format`, `content`), IAST (`iast`, 12 reference lines), the Vedic calendar against the Swiss Ephemeris (`panchang`) and festival days (`festivals`), the sessions and routines (`today`, `routine`, `time-of-day`), search (`search`), the Library's categories (`library`) and its PDFs (`pdfs`), settings from every older version (`migrate`), profiles, the store and backup files (`profiles`, `store`, `backup`), what a routine printout holds: each text once in routine order, its tag and the week at a glance (`print-select`) and the word helpers (`words`). |
| `smoke.spec.mjs` | The site opens with no script errors in every language set-up. |
| `content.spec.mjs` | Every line of every piece, exactly, in Marathi, English (both spellings), Kannada and Both; the home page text; every line has a unique id and a partner in the other language. |
| `print.spec.mjs` | **Print and PDF**: how a printout is put together (see below). |
| `layout.spec.mjs` | 13 screens from a 320 px phone to a 2560 px monitor, portrait and landscape, × 3 language set-ups: no sideways scroll, bars on screen, readable text, no line wider than the screen; 44 px tap targets. The Vedic chants (Rudra, Atharvashirsha, Purusha Suktam) in one language run on as indented paragraphs on phone, iPad and desktop, no row starts with a danda (also after switching to IAST), and with both languages their lines stay in pairs. |
| `visual.spec.mjs` | Screenshots compared pixel by pixel: Home, the Library, the calendar, texts, two columns, Home beside the text on wide screens, Settings, search, Help, the dialogs, every theme, font and language arrangement, on phones (upright and sideways), iPads, desktops and 2K / 4K monitors. |
| `interactions.spec.mjs` | Language and dhrupad (reading sheet and Settings), search (Marathi and English letters, forgiving spelling), Settings (its tabs, theme, contrast, font, size, languages, IAST), folds remembered, line highlight, Prev / Next, ⋯ More and its dialogs, Help, picture viewer, pinch, reopening where you were. |
| `a11y.spec.mjs` | axe-core (WCAG 2.2 A/AA + best practice) on 13 screen states, the main ones in every theme (a full scan in light, then the colour rules in dark, sepia and high contrast on the same page: `axeEveryTheme` in `helpers.mjs`, which the other suites use too); every dialog fully usable with Tab and Escape; skip link; accessible names contain the visible label (WCAG 2.5.3, by our own test; axe's rule is off because it counts letters drawn inside icons); reduced motion; languages marked for screen readers. |
| `offline.spec.mjs` | The site works with no internet after one visit; a PDF opened once is the PDF (not the page) and opens offline, and the Books tab then marks it saved on this phone; the version in `index.html` and `sw.js` match. |
| `edge.spec.mjs` | Edge cases: an iPhone 16 Pro notch upright and sideways; pressed and hovered text readable in all 5 themes; keyboard focus never hidden behind the bars; layout shift after the page appears; 360 to 7680 px wide; what screen readers are told (size, search results, notes); Windows High Contrast focus rings; WCAG text spacing; printing with the keyboard alone; limits on `!important` and breakpoints. |
| `compat.spec.mjs` | The oldest supported browsers (iOS 15.4): fallbacks for `color-mix()` and what a linter can't check. |
| `today.spec.mjs` | Home: the picture and date, the Morning / Afternoon / Evening switch, the session's texts, reading a session in one scroll in session order (also after a reload, but not the next day), ‹ Prev / Next › never leaving it, every session of the bundled routine for a week read through with Next on a phone, an upright iPad and a computer, Home ending the session, the bottom bar's Print, the festival and Sankashti lines (and the Vedic calendar line moving on at midnight, the page left open), ⋯ More on every width, Marathi menus, and the bundled default routine. |
| `reading.spec.mjs` | One text at a time from the Library and search, ‹ Prev / Next › in the bottom bar going through the Library, and no card at the end of a text. |
| `library.spec.mjs` | The Library: categories, numbers, search results, Edit categories (add, rename, delete, move a text), pinch on the list, Back; the Chants \| Books tabs (from a made-up `content/pdfs.json`) in every menu language and script, the books under the texts' categories (renamed ones too), their pages and size, a PDF opening in a tab of its own; the English style, Kannada letters and Marathi menus changed in Settings show the Library as a reload does. |
| `calendar.spec.mjs` | The Vedic calendar: the line on Home, the day card and the month, festivals, the reading languages, keyboard. |
| `builder.spec.mjs` | The routine builder and its Add texts picker; Home follows the routine; kept after a reload and in backups; on a computer the session being read follows a change too; on a 320px phone every button is on the screen. |
| `profiles.spec.mjs` | Profiles and backup: the badge and its sheet, each person's own settings and routine, old ticks left in storage not shown, moving old settings into the first person, Save a backup file and Restore, the storage warning and the backup reminder; on a 320px phone the sheet keeps the name and Reading now on the screen. |
| `site-files.spec.mjs` | `js/parts.js` matches the page's own `<link>` and `<script>` tags, and every listed file exists, so the offline copy is never missing a file. |
| `perf.spec.mjs` | How many times the page is laid out during load, for each language-button tap and when Settings closes (4× slowed CPU). Layout counts are the same on every machine, so this never fails because a computer was busy; the milliseconds and the tap response time are attached to the result for comparison. |

### Print tests

Printing is checked the way a reader does it: the site's own Print button (or a print link), then a choice in the pop-up. The test stops the real print dialog, prints the page to PDF in Chromium at the reader's paper size (Letter in the US, Canada, Mexico and the Philippines, A4 elsewhere), and reads the PDF back. Before printing it adds invisible markers at the start and end of every block, so it can see where each text and block landed.

The printout is laid out by the browser itself (nothing is measured), so there are no page counts to keep: the tests check what must hold in any printout. `print.spec.mjs` prints the whole Library in Marathi (Traditional, Letter), English (Modern, A4), Marathi on Landscape (Bold), both languages side by side (Traditional; and English first, Modern), Kannada letters alone and side by side (Bold), English in IAST, and the dhrupad after every verse alone and side by side. In each PDF:

- every text is printed, in reading order, and listed in the contents, and each starts on a new page;
- no block (a stanza with its dhrupad, marker or note, or a side-by-side stanza) is split across pages, and every block is printed (a Vedic paragraph may run on between lines);
- every page has its "N / total" footer, and screen-only controls never print;
- every English line is in the PDF: both the lines the print view shows and every line of each printed text as the text file has it (`sourceLines`), so a line lost where a page breaks is caught even though the print view no longer holds it (Devanagari and Kannada text can't be read back reliably from a PDF, so for those the block markers show nothing was lost).

On top of that: a few texts only (a print link naming three: their own contents, numbered in their own categories, and named as this phone's Library names them, a text moved there too), the same printout whatever the reading page shows, a session being read, printing from the browser's own menu (Ctrl/⌘ P), the print builder (What on a phone then How, side by side on a wide screen; ticks, search, Select all / Clear, only the texts ticked printed, Marathi menus, the ticks carried to Safari, Print in the bottom bar, the Today tab, the Routine tab, the printout's own language and the font tiles, the first-page preview following the ticks, and Letter / A4 kept and asked of the browser) and the iPhone's first-tap Print, Print now and Open in Safari. A routine printout: page 1 with the week at a glance and the tagged contents, then the texts in routine order numbered 1, 2, 3… with their tags, each on pages of its own; a Library printout has no tags. `fonts.spec.mjs` checks the printout's fonts, Kannada letters too. `SAVE_PDFS=1` keeps every PDF in `tests/pdfs/` to look at.

## Baselines

Text and screenshots are kept in `__snapshots__/`. They are the accepted look of the site. When you change something on purpose (a new line, a new colour), update them and check the diff in the pull request:

```sh
npx playwright test --update-snapshots
```

Screenshots depend a little on the machine (font smoothing), so each machine type keeps its own set in `__snapshots__/visual.spec.mjs/chromium/`. The text snapshots are the same everywhere and are shared.

- **`cloud/`** is the reference set. It is recorded in a Claude session in the cloud (Linux, the pre-installed Chromium: `PW_CHROMIUM_PATH=/opt/pw-browsers/chromium`), where every suite is run until GitHub Actions runs again. It is the default whenever `CI` is not set. Refresh it there with `--update-snapshots`, and look at the changed pictures before committing them.
- When GitHub Actions runs again, its first run records `ci/` (push a commit with `[update-snapshots]` in its message: the *Update CI snapshots* workflow, `.github/workflows/update-snapshots.yml`, commits them to that branch).
- `SNAPSHOT_ENV=cloud` or `SNAPSHOT_ENV=ci` picks a set by hand.

## What automation can't cover

Real devices and screen readers: see [MANUAL.md](MANUAL.md), a short checklist for each release.
