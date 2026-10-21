# Code health plan: from stacked patches to the planned design

Written 21 Oct 2026 against `main` at `6cf441c` (v1.19, after PR #42). **This is a plan only. No code changes until Satish approves.**
It follows `prompt-review/copilot-refactor/REVISED-PROMPT.md` (project files): measure first, then propose, then wait for approval, with one small PR per approved item.

## 1. Summary

The pieces that hold the data and do the hard work are in good shape: text files and the parser, the store and backup, the Vedic calendar engine, the print engine, search rules, and their unit tests. These parts follow the v2 plan (`docs/architecture.md`), and none of them needs rework.

The debt is in the layer between them and the screen. Two foundations in the v2 plan were never built:

- **§5.2 Routing**, where one text or one session is shown at a time (`#/read/<id>`). The plan's own "as built" note for slice 4 says "Routing is not built yet: the reading view is still today's one long page."
- **§5.1 One small store**, where every setting goes through `set()`, which saves the setting and tells whoever shows it.

Every slice since then has worked around those gaps instead of filling them:

- **The page holds the whole Library.** All 36 texts are built into the page at start-up. Home, a session being read and the desktop's single-text view are each a layer of hiding on top of that one long page: `data-hv`, `data-run`, `.solo`, and the older Pooja/Aarti folds `data-pf` and `data-xf`. Print has to undo all four, and search, the side menu and print read the texts back out of the page.
- **Settings are changed from 15 files.** There are 63 places that assign `P.something = …`, and each must remember to call `save()` and `apply()`. Values shared between parts sit in a loose `shared` bag, and parts tell each other about changes through five custom events.
- **Each new page has to know about every other page.** Settings, Library, Calendar and Builder each have their own open function in `features/overlays.js`, and each one closes the others by name.
- **Helpers are copied rather than shared.** `esc` appears 8 times, `words` 6, the Devanagari digits function `dv` 6, `scr` 4, and month and weekday names in 4 to 5 files.
- **The CSS only grows.** `css/README.md` says so outright: "a later rule refines an earlier one … Edit the last rule". The theme colours are spread over 7 files, 85 selectors are defined in more than one file, and some rules need `:root:root:root` to win.

Each of these is small, but together they mean every new feature costs more than the last. The slices still to come (Print the session, Recital mode, special-day additions, import) all need the one-text-at-a-time view. Building them on today's long page would add a fifth and sixth hiding layer.

**Recommendation:** do three low-risk tidy-ups first (stages 1 to 3), with no visible change. Then build the planned reading view (stage 4) as its own decision with a short mockup, before the remaining feature slices. Leave the CSS (stage 6) until after that.

## 2. Measurements

These numbers come from Chromium in the cloud session, at phone size (390×844) with the CPU slowed 4× (roughly an older iPhone), on a first visit to Home. The measuring script was not added to the repo. Runs vary by about ±20%.

| What | Number |
|---|---|
| Elements in the page on Home | **20,187**, with 6,022 verse lines (`.verse p`) from all 36 texts, while Home shows only a session list |
| First paint | about **2.0 to 2.3 s** (desktop, not slowed: 0.8 s) |
| Full-page layouts before the page shows | 15 to 16, about **2.4 s** of layout in total. Each layout costs 0.5 to 1.2 s at this size, because the page is so large |
| Print warm-up (3 s after load, and again 2.5 s after every tap) | one block of **2.8 s** in which the phone can't respond to a tap. It lays out a hidden copy of every piece and adds about 50,000 nodes |
| Longest single block in the first 8 s | 2.3 to 2.6 s |
| Files fetched at start | 129 (62 JS, 16 CSS, 40 content files), 1.6 MB uncompressed |

The page's size grows with every text added. The same measurement on main before Shree Rudra (33 texts) found 13,074 elements, against 20,187 now. Timings on this machine were too noisy to show a clean trend, but the cost of each layout depends on page size.

**`tests/perf.spec.mjs` fails on main** (and already failed at `7929518`). It waits for the reading sheet's language buttons (`#rsl button`), which it can no longer reach, so the layout budget hasn't been checked for a while. The [Faster testing approach] thread owns the tests, so this plan only reports it.

Baseline on `6cf441c`: `npm run lint` and `npm run types` are clean, and all 427 unit tests pass.

## 3. Findings

### A. One long page instead of a reading view (largest, plan §5.2)

- `js/text/load.js:99` puts every piece into the page at start-up. The start-up steps then walk every line of every text: `text/line-breaks.js:15-28`, `text/iast.js:95-107`, `text/stanza-numbers.js`, `text/autofit.js:102`, and `text/dhrupad-markers.js`.
- The views are layers of hiding over that page:
  - Home on its own: `data-hv`, `features/history.js:265`
  - reading a session: `data-run`, `features/today-card.js:360`
  - desktop single text: `.solo`, `features/history.js:281`
  - the old group folds: `data-pf` and `data-xf`
  - Print copies the pieces with all four turned off (`features/print.js:150`).
- Search builds its index from the page (`text/search.js:196 buildIX`). The side menu is built from the Library's list in the page (`text/layout.js buildRail`). Print copies the page.
- Effect: start-up and every layout get slower with each text. Every new view becomes another flag, and every flag is another case for print, search and Back to handle.

### B. Settings have no single write path (plan §5.1)

- `P` is changed directly in 15 files (63 assignments), for example `features/pinch.js`, `features/reading-sheet.js` and `features/languages.js`. Each change then calls `save()` and `apply()` by hand.
- `shared` (`core/state.js:8`) holds `LEAD`, `FSA`, `fontN`, `rmkPop`, `wl` and `skCache`, and is written from several parts.
- Five custom events (`nitya-routine`, `nitya-routine-edit`, `nitya-session`, `nitya-people`, `nitya-rail`) plus `rtb-closed` connect the parts by hand.

### C. Pages and overlays wired to each other (`features/overlays.js`)

- `setP` (Settings, :34), `setJ` (Library, :58), `setC` (Calendar, :100) and `setR` (Builder, :135) each repeat the same steps: Back step, focus return, placing below the top bar, `aria-expanded`. Each also closes the other three by name.
- The profile sheet and the categories sheet repeat `openSheet`, `closeSheet`, `confirmDelete`, `nameProblem` and `makeId` (`features/profiles.js` and `features/library.js`).
- Every planned page (Print the session, Recital, Import) would add another `setX` and another line in each of the others.

### D. Copied helpers and wording

- Copied word for word: `esc` in 8 files, `dv` in 6, and `words()`, the `W` wording tables and the `ui()`, `lead()`, `second()`, `langOf()` and `scr()` language helpers in 3 to 6 files: `backup`, `today-card`, `vedic-calendar`, `profiles`, `routine-builder`, `library`, `text-picker`, `sankashti`, `search`.
- Marathi month names appear in 4 files and weekday names in 5, although `core/panchang-names.js` already exists for this.
- Wording lives in two systems: bilingual `<span class="mr">/<span class="en">` pairs in `index.html`, and `W` tables in each JS file.

### E. Content facts in code

- Which texts get tappable dhrupad markers is the fixed list `["a1","a2","a3","a4","a5","a7","a9"]` (`text/dhrupad-markers.js:12`). These are old Sankathara ids, which 11 texts carry as `legacy-id`. A new aarti can't get tappable markers without a code change.
- `features/bottom-bar.js:417` and `features/languages.js:68` also name `p1` and `a1` directly.
- Two ways of grouping texts exist side by side. The old reading-book groups in `library.json` (`g-pooja`, `g-aarti`, each with a fold button) put Lalita Sahasranama and the ashtaks under "Aarti". The v2 categories in `categories.json` (Vedic Chant, Aarti, Stotra, Ashtak) are what the Library shows.

### F. Calendar and place code in the wrong layer

- `core/panchang.js` (pure and unit-tested) depends on `features/astronomy.js`, an `init()`-wrapped IIFE kept in a changing export `SK`. The panchang adds a ΔT time correction. The Sankashti card uses `SK` without it (`core/panchang.js:83` notes this), so two engines work out tithis.
- The place used for moonrise and the calendar (`skLoc()`, the city lists) lives in `features/sankashti.js`, and `features/vedic-calendar.js` imports it from there.

### G. Built but never released

- Autoscroll (`FEAT_AS`) and Tilt to scroll (`FEAT_TL`) are switched off in `core/features.js`. Their code ships on every page load: most of `features/bottom-bar.js` (431 lines), `features/tilt.js` (172 lines), and their CSS, Help entries and settings.

### H. CSS grows by appending (`css/`)

- 18 files in the order they were added, 8,933 lines. The light, sepia, dark and high-contrast themes are defined across 7 files.
- 85 selectors are set in more than one file (for example `#jl .tocg .gh` in 4). There are 67 `!important`s, `:root:root:root[data-hc]` to win specificity, and about 10 different width breakpoints.

### I. Smaller things

- `js/render.js` is a plain script that puts `SCR`, `renderPieces` and `PRQ` on `window`. It can become a module once stage 4 builds texts on demand.
- Some names still come from the Sankathara site: `aarti2-prefs`, the `aarti-v` version prefix, `features/contents-list.js` (now the Library's Back button), and `features/astronomy.js` ("for the Next Sankathara Chaturthi card"). Renaming saved keys needs a migration, so only names inside the code should change.
- There are 146 short element ids (`#asv`, `#pzv`, `#rtb` and so on). Renaming them would touch every test, so they should be listed in a glossary instead.

### What is healthy and stays as it is

`text/format.js` and `content.js` (the text files), `store/*` (profiles, migration, backup, all unit-tested), `core/panchang.js`, `festivals.js`, `routine.js`, `library.js`, `ticks.js`, `time-of-day.js`, `text/search-core.js`, `print/fit.js` and `features/print.js` (the most tuned code in the site, with the Safari path), `sw.js`, and the no-build, iOS 15.4 setup. Converting `var` to `let`/`const`, Prettier, a framework, TypeScript files and Web Workers stay out (see section 6).

## 4. Proposed stages

Every stage follows the same rules:

- its own branch and PR, and nothing visible changes unless the stage says so;
- the version bumped in `sw.js` and `index.html`;
- docs (`ARCHITECTURE.md`, `js/README.md`, `css/README.md`) updated in the same PR;
- lint, types, unit tests and the full Chromium suite run, with results posted on the PR;
- no devotional text touched.

How tests are added and run follows the [Faster testing approach] thread.

| # | Stage | Fixes | Size | Risk | Visible change |
|---|---|---|---|---|---|
| 1 | **Shared helpers.** One `js/core/words.js` (or `ui.js`): `esc`, digits, `ui()`, `lead()`, `second()`, `langOf()`, `scr()`, and date, month and weekday names taken from `panchang-names.js`. Delete the copies. One `features/sheet.js` for the profile and category sheets. Unit tests for the helpers. | D, part of C | S | Low | None |
| 2 | **One way to open a page.** `features/pages.js`: register a page once (element, opener button, Back step, focus return, below-the-bar placement), then `open(id)` and `close()`. Opening one closes the open one. `setP`, `setJ`, `setC` and `setR` become one-line calls, so the next pages plug in without touching the others. | C | M | Medium (focus and Back behaviour; the a11y and history tests cover it) | None |
| 3 | **One write path for settings.** `set(key, value)` in `core/state.js` saves, applies and notifies subscribers. The 63 direct assignments move to it. The custom events become subscriptions, and the `shared` values move to the part that owns each one, read through getters. | B | M | Medium | None |
| 4 | **The planned reading view** (plan §5.2). Build only the text or session being read, on demand. Search index, side menu and Print the whole Library are built from the parsed texts (`CONTENT`) instead of the page. Hash routes `#/read/<id>` and `#/session/...`, with old links `#a5` and `#p1` redirected. The `data-hv`, `data-run`, `.solo` and group-fold layers go away. `render.js` becomes a module (I). Measured target: Home under about 3,000 elements, and start-up time no longer growing with each text. | A, I | L (2 to 3 PRs) | **Highest.** Print, search, Back, the reading position, links and Kannada letters all touch it. The print suite is the gate. | **Some.** Scrolling past the end of one text no longer runs into the next. ‹ Prev / Next › do that. A short mockup comes first. |
| 5 | **Content facts into content.** A text header for tappable dhrupad markers instead of the `a1`… list. Retire `legacy-id` once stage 4 redirects old links. Decide groups vs categories. Move astronomy and place into `core/`, with one engine for tithis (Sankashti days checked unchanged against the current dates). | E, F | M | Low to medium | None, unless you choose differently for groups |
| 6 | **CSS by component** (after stage 4, since many layer rules disappear with it). Themes only in `01-theme.css`. One file per component, no rule needing `:root:root:root`, and a short list of breakpoints. Screenshot snapshots must not change. | H | L | Medium (visual; the snapshots guard it) | None |
| 7 | **Print warm-up**, measured again after stage 4. If it still blocks for more than about 200 ms on a slowed phone: warm only the printout the reader is likely to choose (today's session), in smaller steps. Print still has to start within the tap on Safari. | Measurement | S | Medium (print timing on Safari; check on your iPhone) | None |

**Recommended cut line: stages 1 to 4**, then the remaining feature slices on the new reading view. Stages 5 to 7 can follow, or be dropped.

## 5. Questions for Satish

1. **Approve stages 1 to 3** (no visible change)? They can start straight away.
2. **Stage 4: is one text (or one session) at a time what you want?** Today you can scroll from the end of one text into the next. After stage 4, ‹ Prev / Next › do that instead. A mockup comes before any code.
3. **Groups vs categories:** should the Pooja/Aarti reading-book groups go, so that the Library's categories (Vedic Chant, Aarti, Stotra, Ashtak) are the only grouping?
4. **Autoscroll and Tilt to scroll:** release them, or remove them (they can come back from git)?

## 6. Not doing, and why

- **`var` → `let`/`const` across the repo, Prettier, `no-var`, `prefer-template`.** About 1,200 lines in every file, with no gain for the reader and a large diff to check. New and changed code may use `let`/`const`.
- **Making `js/parts.js` a module.** The service worker loads it with `importScripts`, and module service workers are a risk on iOS 15.4.
- **Reordering the start-up `init()`s, or making print asynchronous, using `requestAnimationFrame` or a Worker.** The order is deliberate, and Safari opens the print dialog only straight from a tap.
- **A framework, a build step or TypeScript files.** The site deploys the repo as it is, and JSDoc with `tsc` already checks types.
- **Rewriting `features/print.js` or `print/fit.js`.** They are calibrated against your Chrome and Safari PDFs. Stage 4 only changes what they are given.
- **Renaming saved keys (`aarti2-prefs`) or the short element ids.** That needs a migration or touches every test, for little gain.

[Faster testing approach]: https://claude.ai/code/project/chan_01KLTgasBGYkqFikdmEx3qt3?thread=cmsg_01KLTgasBGYkqFikdmEx3qt35TC4CA4KrpRb5fF89rRULr
