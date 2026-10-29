# Rules for changing this site (for people and for AI assistants)

Read `ARCHITECTURE.md` first, then `js/README.md` or `css/README.md` for the part you change. Texts: `README.md`,
"How to add a text". Tests: `tests/README.md`. This file is the short list of rules; those files say why.

Everything at the repository root is served as it is (Cloudflare Pages), this file included: never commit anything
private.

## The stack: keep it
- No build step, no framework, no bundler, no runtime npm packages. `index.html`, plain CSS and ES modules are served
  exactly as they are in the repository.
- All tooling lives in `tests/` (its own `package.json`: eslint, stylelint, tsc, Vitest, Playwright, Lighthouse). Never
  add a `package.json` at the root.
- Oldest browsers supported: `tests/.browserslistrc` (iOS / Safari 15.4, Chrome and Firefox 100). `npm run lint` fails
  on anything newer; a fallback goes in `css/99-fallbacks.css`.

## JavaScript
- One part per topic in `js/core`, `js/text`, `js/store`, `js/features`, `js/print`. A part exports `init()`, which
  does its start-up work; loading a module does nothing else. A new `init()` goes into `js/main.js` (`run(…)`) at the
  right place in the order.
- A new file goes into `js/parts.js` too (the offline copy); `tests/site-files.spec.mjs` checks this.
- Logic that needs no page goes in `js/core` or `js/text` as pure functions, unit-tested in `tests/unit` (Vitest).
- New files start with `// @ts-check`, typed with JSDoc; `npm run types` must pass.
- Settings change only through `change({ key: value }, then)` (`js/core/state.js`). A variable belongs to the part
  that sets it; the others import it and only read it.
- A new page, dialog or sheet goes into `PAGES` / `LAYERS` in `js/features/overlays.js` (Back, focus kept inside,
  Escape).
- Match the code around you: `var` and `function` in the parts, double quotes (single around HTML that holds double
  quotes), 2-space indent, semicolons, trailing commas in lists that span lines. Anything written into HTML goes
  through `esc()` (`js/core/words.js`).
- No `console.log`. `console.warn` / `console.error` only where a failure is caught and the site carries on (the tests
  fail on any console error).
- Comments say why, in plain English, as the existing ones do.

## Words and languages
- The menus are in Marathi and English. In `index.html`: `<span class="mr">…</span><span class="en" lang="en">…</span>`.
  In scripts: `ui()`, `num()`, `MONTHS`, `DAYS` from `js/core/words.js`. Never write a menu word in one language only.
- The reading languages: `lead()`, `second()`; Marathi in another script through `scr()` and `SCR` (`js/render.js`,
  `SCRIPTS`). Put `lang` on every element whose language differs from its parent's.
- A text's words live only in its file in `content/texts/`, never in code.

## CSS
- The files load in number order and a later rule wins. To change a look, edit the last rule that sets the property
  (the highest-numbered file, the lowest rule in it). New rules go at the end of the file that fits.
- Only the breakpoints listed in `css/README.md`; a new one is added there first (`tests/edge.spec.mjs` checks).
- No new `!important` or `:root:root`: the same test caps both at today's count.
- Colours come from the theme variables (`css/01-theme.css`); check light, sepia, dark and high contrast.
- Hover colours go inside `@media (hover: hover)`.
- The printout's look is `css/15-print.css` only (the print view, `#pv`). While printing, everything else on the page
  is hidden, so no other file needs print rules for screen-only parts.

## Accessibility (WCAG 2.2 AA)
- Real `<button>` and `<a>` elements, never clickable `<div>`s. Tap targets at least 44 × 44 px.
- An icon-only control has an `aria-label`; a control with a visible word is named by it (WCAG 2.5.3).
- Keep the `:focus-visible` outlines. Take an outline away only on containers the scripts focus (`tabindex="-1"`).
- Dialogs: `role="dialog"`, `aria-modal`, a labelled heading, focus moved in and given back, Tab kept inside, Escape
  and the phone's Back close them.
- Changes the page makes by itself (counts, saved, moved) are announced through a live region.
- Respect `prefers-reduced-motion`.

## Tests, the sister app and releases
- While working: `cd tests && npm run quick`. Before a merge: `npm run full`. Every change comes with a test, new or
  updated.
- Sankathara Chaturthi (the folder beside this one) shares most scripts, styles and tests. After changing a shared
  file: `npm run sister`, then bring the same change to the other app.
- A release changes the version in `index.html` (`<meta name="version">`) and `sw.js` together.
- When a part or a file changes, update `js/README.md` or `css/README.md` in the same change.
