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
PW_PROJECTS=chromium,firefox,webkit,iphone,ipad,pixel npm test   # every engine, as CI runs it
npx playwright test print.spec.mjs   # one suite
npx playwright test -g "kannada"     # tests whose name matches
SAVE_PDFS=1 npx playwright test print.spec.mjs   # also keep every printed PDF in tests/pdfs/ to look at
npm run print:audit                  # every printout a reader can make, as PDFs in tests/pdfs/, with a report
npm run lhci                         # Lighthouse CI: CLS fails the run; score, LCP and TBT targets warn until they are met
```

`npm test` starts a small static server (`serve.mjs`, port 4173) by itself. On a failure, `npx playwright show-report` opens the details, with a trace of every step.

Until GitHub Actions runs again (Satish, 2026-10-21), every suite is run in a Claude session in the cloud before a pull request is merged, and the results are posted on the pull request. Only Chromium is installed there, so the Firefox, WebKit, iPhone and iPad projects wait for GitHub. On GitHub every pull request and every push to `main` runs everything (`.github/workflows/tests.yml`, in the `mcr.microsoft.com/playwright:v1.64.1-noble` image, kept in step with `@playwright/test` in `package.json`): lint, Chromium, Firefox, WebKit (Safari's engine), iPhone, iPad and Pixel emulation, and Lighthouse.

## Three levels

| Level | When | Command | Time (cloud session) |
|---|---|---|---|
| Quick check | While working, after each edit | `npm run quick` | 10 s to about 2 min |
| Full run | Before every pull request is merged: every change is fully tested | `npm run full` | about 23 min |
| Release check | Before a version bump | `npm run release`, then every engine (`PW_PROJECTS=chromium,firefox,webkit,iphone,ipad,pixel npm test`) once GitHub Actions runs again | 5 to 10 min more |

The quick check (`quick.mjs`) compares the checkout with `origin/main` (commits, uncommitted edits and new files) and runs only the browser suites that test the changed files: `css/12-calendar.css` or `js/core/panchang.js` runs `calendar.spec.mjs`, a text in `content/texts/` runs `content.spec.mjs`, a change to `tests/helpers.mjs` runs everything, and so on (the list is `SUITES` in `quick.mjs`). Smoke always runs, and a site file the list doesn't know runs interactions and the screenshots. `npm run quick -- --list` only prints what it would run. Lint, types and the logic tests come first and stop the run at the first failure, so most mistakes show in seconds. The quick check never replaces the full run.

## The suites

| File | What it protects |
|---|---|
| `unit/*.test.mjs` | Logic tests with Vitest, no browser: the 12 IAST reference lines from TRANSLITERATION.md against `js/text/iast.js`. New v2 code (text format, storage, search) gets its tests here. |
| `smoke.spec.mjs` | The site opens with no script errors in every language set-up. |
| `content.spec.mjs` | Every line of every piece, exactly, in Marathi, English (both spellings), Kannada and Both; the home page text; every line has a unique id and a partner in the other language. |
| `print.spec.mjs` | **Print and PDF** (see below). |
| `layout.spec.mjs` | 13 screens from a 320 px phone to a 2560 px monitor, portrait and landscape, × 3 language set-ups: no sideways scroll, bars on screen, readable text, no line wider than the screen; 44 px tap targets. The Vedic chants (Rudra, Atharvashirsha, Purusha Suktam) in one language run on as indented paragraphs on phone, iPad and desktop, no row starts with a danda (also after switching to IAST), and with both languages their lines stay in pairs. |
| `visual.spec.mjs` | 42 screenshots compared pixel by pixel: home, pieces, two columns on wide screens, side menu, Settings, search, Help, dialogs, every theme, font and language arrangement, and the print layouts. |
| `interactions.spec.mjs` | Language button, dhrupad, contents, search (Marathi and English letters, forgiving spelling), Settings (theme, contrast, font, size, languages, IAST), folds remembered, line highlight, Prev / Next, dialogs, picture viewer, date card, reopening where you were. |
| `a11y.spec.mjs` | axe-core (WCAG 2.2 A/AA + best practice) on 13 screen states, the main ones in every theme (a full scan in light, then the colour rules in dark, sepia and high contrast on the same page: `axeEveryTheme` in `helpers.mjs`, which the other suites use too); every dialog fully usable with Tab and Escape; skip link; accessible names contain the visible label (WCAG 2.5.3, by our own test; axe's rule is off because it counts letters drawn inside icons); reduced motion; languages marked for screen readers. |
| `offline.spec.mjs` | The site works with no internet after one visit; the version in `index.html` and `sw.js` match. |
| `edge.spec.mjs` | The Phase 3 audit's edge cases: an iPhone 16 Pro notch upright and sideways; pressed and hovered text readable in all 5 themes; keyboard focus never hidden behind the bars; layout shift after the page appears; 360 to 7680 px wide; what screen readers are told (size, search results, notes); Windows High Contrast focus rings; WCAG text spacing; printing with the keyboard alone; limits on `!important` and breakpoints. |
| `compat.spec.mjs` | The oldest supported browsers (iOS 15.4): fallbacks for `color-mix()` and what a linter can't check. |
| `site-files.spec.mjs` | `js/parts.js` matches the page's own `<link>` and `<script>` tags, and every listed file exists, so the offline copy is never missing a file. |
| `perf.spec.mjs` | How many times the page is laid out during load, for each language-button tap and when Settings closes (4× slowed CPU). Layout counts are the same on every machine, so this never fails because a computer was busy; the milliseconds and the tap response time are attached to the result for comparison. |

### Print tests

Printing is checked the way a reader does it: the site's own Print button, then a choice in the pop-up. The test stops the real print dialog, prints the page to PDF in Chromium at the reader's paper size (Letter in the US, Canada, Mexico and the Philippines, A4 elsewhere), and reads the PDF back. Before printing it adds invisible markers at the start and end of every unbroken block, so it can see exactly where each piece and block landed.

The grid is every **Portrait** printout (Marathi, English) × every **text font** (Standard, Classic, Bold, Handwritten) × **Letter and A4**: 16 PDFs. **Landscape** (Marathi, English, Marathi and English side by side, Kannada and English side by side) × every text font, on Letter or A4 by turns, with the same checks. On top of that: the scholarly spelling (IAST), English as the main language, Kannada (single column, also on A4 and sideways), dhrupad after every verse, Marathi menus, everything folded on screen, printing from the browser's own menu (Ctrl/⌘ P), and Safari's page plan. In each PDF:

- the contents page gives the page each piece really starts on;
- no block (a heading with its dhrupad and first stanza, or a stanza) is split across pages, unless it is taller than a page even at its smallest (the print view marks it, and it breaks between lines);
- every block of every piece is printed, even when folded on screen;
- every page has its "N / total" footer;
- screen-only controls (Open all, Settings, …) never print;
- every English line is in the PDF (Devanagari and Kannada text can't be read back reliably from a PDF, so for those the block markers show nothing was lost);
- the page count and contents numbers match the recorded baseline;
- in the layout × font grid, upright and sideways: no line runs past its column, no text is missing, and side by side at most a few rows are out of step or lines broken mid-phrase.

### Print audit

`npm run print:audit` prints every combination a reader can choose, exactly as they would: what is printed (Marathi, Kannada, English, English in IAST, each original with English, either one first, and Marathi with IAST English) × the choices the Print pop-up offers (Portrait and Landscape for one language; Landscape, side by side, for both) × the four text fonts × the dhrupad once or after every verse × Letter and A4. That is 208 PDFs, kept as `tests/pdfs/<what>/<portrait|landscape>/<font>-<dhrupad>-<paper>.pdf` (for example `tests/pdfs/marathi-english/landscape/handwritten-dhrupad-once-letter.pdf`), each with a `.json` of what was found. It takes about four minutes.

Every printout must pass the print checks above. On top of that, every printed line is marked, invisibly, at the start and end of each of its parts (`print-audit-helpers.mjs`), and the PDF shows where each landed. `tests/pdfs/REPORT.md` then lists, worst first, with totals for upright and sideways: text missing; lines running past their column (past the page's margin, or into the cell beside them side by side); side-by-side rows where one side takes more lines than the other; lines broken in the middle of a phrase rather than at a preferred break (including a break the fitting wrote in between two words, `br.pvmid`); pages left mostly empty before a page break; and how many lines were set smaller to fit. `tests/pdfs/FONT-SIZES.md` gives how large each script looks in each text font, the numbers behind `js/print/profiles.js`.

The PDFs and reports are not committed (`tests/pdfs/` is in `.gitignore`). To look at the PDFs inside VS Code, install a PDF viewer extension such as vscode-pdf.

## Baselines

Text, screenshots and print summaries are kept in `__snapshots__/`. They are the accepted look of the site (first recorded before the 2026-10 refactor, to prove it changed nothing a reader can see). When you change something on purpose (a new line, a new colour), update them and check the diff in the pull request:

```sh
npx playwright test --update-snapshots
```

Screenshots and print summaries depend a little on the machine (font smoothing, and the odd line that lands one page later in a PDF), so each machine type keeps its own set in `__snapshots__/visual.spec.mjs/chromium/` and `__snapshots__/print.spec.mjs/chromium/`. The text snapshots are the same everywhere and are shared.

- **`cloud/`** is the reference set (Satish, 2026-10-21). It is recorded in a Claude session in the cloud (Linux, the pre-installed Chromium: `PW_CHROMIUM_PATH=/opt/pw-browsers/chromium`), where every suite is run until GitHub Actions runs again. It is the default whenever `CI` is not set. Refresh it there with `--update-snapshots`, and look at the changed pictures before committing them.
- The sets once recorded on Satish's Mac (`local/`) and by GitHub (`ci/`) were removed on 2026-10-21 as out of date. When GitHub Actions runs again, the first run records `ci/` (push a commit with `[update-snapshots]` in its message: the *Update CI snapshots* workflow, `.github/workflows/update-snapshots.yml`, commits them to that branch).
- The print tests check page numbers against the PDF on every machine, so a summary that differs between sets is still a correct printout.
- `SNAPSHOT_ENV=cloud` or `SNAPSHOT_ENV=ci` picks a set by hand.

## What automation can't cover

Real devices and screen readers: see [MANUAL.md](MANUAL.md), a short checklist for each release.
