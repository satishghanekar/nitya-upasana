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
- Match the code around you: `var` and `function` in the parts. Layout is Prettier's (`cd tests && npm run format`;
  `npm run lint` fails on anything else): double quotes, 2-space indent, semicolons, lines up to 160 characters.
  Comments are wrapped by hand at about 120. Anything written into HTML goes
  through `esc()` (`js/core/words.js`).
- No inline `<script>` and no `on…=` attributes: the Content-Security-Policy in `_headers` blocks them (the tests run
  under it, `tests/serve.mjs`). Anything the page loads comes from this site.
- No `console.log`. `console.warn` / `console.error` only where a failure is caught and the site carries on (the tests
  fail on any console error).
- Comments say why, in plain English, as the existing ones do.

## Words and languages
- Every menu word is in the catalog, one file per language (`js/strings/en.js`, `js/strings/mr.js`, under the part's
  name). A script reads them with `menuWords("part")` (`js/core/strings.js`); `index.html` writes
  `<span data-w="page.key">English</span>`, filled by `fillWords()`. Never write a menu word in a part or in
  `index.html` in one language. A sentence with a value in it is a function, so each language puts the words in its
  own order. `ui()` is the menu language's code; `nameLang()` picks a two-language name (places, panchang names).
  Adding a menu language: `ARCHITECTURE.md`, "Adding a menu language". `tests/unit/strings.test.mjs` checks it all.
- Digits and names: `num()` from `js/core/words.js`; day and month names `menuWords("dates")`.
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
