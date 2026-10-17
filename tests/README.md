# Tests

Automated checks for the site. The site itself has no build step; everything here only **tests** the files at the repository root, served exactly as Cloudflare Pages serves them. All the tooling (including `package.json`) lives in this folder, so Cloudflare never installs or builds anything.

## Running

```sh
cd tests
npm ci                               # once
npx playwright install chromium      # once (add firefox webkit for the other engines)
npm test                             # Chromium only, the default on a computer
PW_PROJECTS=chromium,firefox,webkit,iphone,ipad,pixel npm test   # every engine, as CI runs it
npx playwright test print.spec.mjs   # one suite
npx playwright test -g "kannada"     # tests whose name matches
SAVE_PDFS=1 npx playwright test print.spec.mjs   # also keep every printed PDF in tests/pdfs/ to look at
npm run print:audit                  # every printout a reader can make, as PDFs in tests/pdfs/, with a report
npm run lhci                         # Lighthouse CI: CLS fails the run; score, LCP and TBT targets warn until they are met
```

`npm test` starts a small static server (`serve.mjs`, port 4173) by itself. On a failure, `npx playwright show-report` opens the details, with a trace of every step.

On GitHub every pull request runs everything (`.github/workflows/tests.yml`): Chromium, Firefox, WebKit (Safari's engine), iPhone, iPad and Pixel emulation, and Lighthouse.

## The suites

| File | What it protects |
|---|---|
| `smoke.spec.mjs` | The site opens with no script errors in every language set-up. |
| `content.spec.mjs` | Every line of every piece, exactly, in Marathi, English (both spellings), Kannada and Both; the home page text; every line has a unique id and a partner in the other language. |
| `print.spec.mjs` | **Print and PDF** (see below). |
| `layout.spec.mjs` | 13 screens from a 320 px phone to a 2560 px monitor, portrait and landscape, × 3 language set-ups: no sideways scroll, bars on screen, readable text, no line wider than the screen; 44 px tap targets. |
| `visual.spec.mjs` | 45 screenshots compared pixel by pixel: home, pieces, two columns, side menu, Settings, search, Help, dialogs, every theme, font and language arrangement, and the print layouts. |
| `interactions.spec.mjs` | Language button, dhrupad, contents, search (Marathi and English letters, forgiving spelling), Settings (theme, contrast, font, size, languages, IAST), folds remembered, line highlight, Prev / Next, dialogs, picture viewer, date card, reopening where you were. |
| `a11y.spec.mjs` | axe-core (WCAG 2.2 A/AA + best practice) on 16 screen states; every dialog fully usable with Tab and Escape; skip link; accessible names contain the visible label (WCAG 2.5.3); reduced motion; languages marked for screen readers. |
| `offline.spec.mjs` | The site works with no internet after one visit; the version in `index.html` and `sw.js` match. |
| `edge.spec.mjs` | The Phase 3 audit's edge cases: an iPhone 16 Pro notch upright and sideways; pressed and hovered text readable in all 5 themes; keyboard focus never hidden behind the bars; layout shift after the page appears; 360 to 7680 px wide; what screen readers are told (size, search results, notes); Windows High Contrast focus rings; WCAG text spacing; printing with the keyboard alone; limits on `!important` and breakpoints. |
| `perf.spec.mjs` | How many times the page is laid out during load, for each language-button tap and when Settings closes (4× slowed CPU). Layout counts are the same on every machine, so this never fails because a computer was busy; the milliseconds and the tap response time are attached to the result for comparison. |

### Print tests

Printing is checked the way a reader does it: the site's own Print button, then a choice in the pop-up. The test stops the real print dialog, prints the page to PDF in Chromium at the reader's paper size (Letter for the US and Canada, A4 elsewhere), and reads the PDF back. Before printing it adds invisible markers at the start and end of every unbroken block, so it can see exactly where each piece and block landed.

The grid is every **layout** (Marathi two columns, Marathi single column, English two columns, English single column, Both side by side, Both stacked, Kannada and English side by side) × every **text font** (Standard, Classic, Bold, Handwritten) × **Letter and A4**: 56 PDFs. Sideways (landscape): every layout × every text font again, on Letter or A4 by turns, with the same checks. On top of that: the scholarly spelling (IAST), English as the main language, Kannada (two more layouts, and on A4), dhrupad after every verse, Marathi menus, everything folded on screen, printing from the browser's own menu (Ctrl/⌘ P), and Safari's table-based two-column layout. In each PDF:

- the contents page gives the page each piece really starts on;
- no block (a heading with its dhrupad and first stanza, or a stanza) is split across pages, unless it is taller than a page even at its smallest (the print view marks it, and it breaks between lines);
- every block of every piece is printed, even when folded on screen;
- every page has its "N / total" footer;
- screen-only controls (Open all, Settings, …) never print;
- every English line is in the PDF (Devanagari and Kannada text can't be read back reliably from a PDF, so for those the block markers show nothing was lost);
- the page count and contents numbers match the recorded baseline;
- in the layout × font grid, upright and sideways: no line runs past its column, no text is missing, and side by side at most a few rows are out of step or lines broken mid-phrase.

### Print audit

`npm run print:audit` prints every combination a reader can choose, exactly as they would: what is printed (Marathi, Kannada, English, English in IAST, and each original with English, either one first) × the two layouts the Print pop-up offers for it × the four text fonts × the dhrupad once or after every verse × Letter and A4 × upright and sideways pages. That is 576 PDFs, kept as `tests/pdfs/<upright|sideways>/<what>/<layout>/<font>-<dhrupad>-<paper>.pdf` (for example `tests/pdfs/sideways/marathi-english/side-by-side/handwritten-dhrupad-once-letter.pdf`), each with a `.json` of what was found. It takes about four minutes.

Every printout must pass the print checks above. On top of that, every printed line is marked, invisibly, at the start and end of each of its parts (`print-audit-helpers.mjs`), and the PDF shows where each landed. `tests/pdfs/REPORT.md` then lists, worst first, with totals for upright and sideways: text missing; lines running past their column (past the page's margin, past the middle of the page in two columns, or into the cell beside them side by side); side-by-side rows where one side takes more lines than the other; lines broken in the middle of a phrase rather than at a preferred break (including a break the fitting wrote in between two words, `br.pvmid`); pages left mostly empty before a page break; and how many lines were set smaller to fit. `tests/pdfs/FONT-SIZES.md` gives how large each script looks in each text font, the numbers behind `js/print/profiles.js`.

The PDFs and reports are not committed (`tests/pdfs/` is in `.gitignore`). To look at the PDFs inside VS Code, install a PDF viewer extension such as vscode-pdf.

## Baselines

Text, screenshots and print summaries are kept in `__snapshots__/`. They were recorded from the site **before** the 2026-10 refactor, so the refactor is proven to change nothing a reader can see. When you change something on purpose (a new line, a new colour), update them and check the diff in the pull request:

```sh
npx playwright test --update-snapshots
```

Screenshots and print summaries depend a little on the machine (font smoothing, and the odd line that lands one page later in a PDF), so there are two sets, `local/` and `ci/`, in `__snapshots__/visual.spec.mjs/chromium/` and `__snapshots__/print.spec.mjs/chromium/`. The text snapshots are the same everywhere and are shared.

- **`local/`** is used on a computer. `--update-snapshots` above refreshes it. It is recorded on the maintainer's Mac, so record it only there.
- **Claude sessions in the cloud** (started from the Claude mobile app or claude.ai/code) run on Linux, where `local/` screenshots won't match. There, run the tests with `SNAPSHOT_ENV=ci` (or skip the screenshots with `--grep-invert screenshot`), and never run `--update-snapshots`: it would replace the Mac's pictures with Linux ones.
- **`ci/`** is used by the GitHub test run, which runs in Playwright's Docker image. To refresh it, push a commit to a branch with `[update-snapshots]` in its message. The *Update CI snapshots* workflow (`.github/workflows/update-snapshots.yml`) then takes new screenshots on GitHub and commits them to that branch. Look at the changed pictures in the pull request before merging.
- The print tests check page numbers against the PDF on every machine, so a summary that differs between the two sets is still a correct printout.
- `SNAPSHOT_ENV=ci` or `SNAPSHOT_ENV=local` picks a set by hand.

## What automation can't cover

Real devices and screen readers: see [MANUAL.md](MANUAL.md), a short checklist for each release.
