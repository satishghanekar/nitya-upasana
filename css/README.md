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
| `03-menus-print-view.css` | Top-bar title, Share / QR / Print, Add to Home Screen, the print view (`#pv`) built for the Print button, the piece header card, and the dhrupad at the top of a piece. |
| `04-columns-rail.css` | Wide screens: two stanza columns, piece and stanza numbers, button rows, both languages side by side, and the left contents menu (`#rail`). |
| `05-home-card.css` | The home page "paper sheet", the next Sankashti card, the offline cloud, the lotus ornament, fade-in, and the dhrupad markers. |
| `06-help-polish.css` | Help, the review rounds after 1.0, folding the Ganesha card, and folding the Pooja / Aarti sections. |
| `07-bottom-bar-folds.css` | Bottom bar, bars tucking away while reading, folding the contents and each piece, fold headings, and bigger tap areas. |
| `08-contents-book.css` | Home contents as a book index, author lines, and Both languages with English first. |
| `09-settings-page.css` | The Settings page and Kannada letters. |
| `99-fallbacks.css` | Plain colours for browsers without `color-mix()` (iOS 15). **Keep it last**, because it replaces colours set in every file above. |

## Switches the styles read

- **Themes** are sets of colour variables (`--bg`, `--ink`, `--accent`, …) on `:root`. Light is the default. Dark follows the device unless a theme is picked in Settings (`data-pref="light|sepia|dark"`). `data-hc="1"` turns on high contrast.
- **`data-lang`** (`mr|en|both`) is set on each region, not on `<html>`:
  - The pieces, section headings, printout and contents lists carry the text language.
  - The bar, Settings, date card, buttons and dialogs carry the menu language (`en|mr`).
- **Other switches on `<html>`:**
  - `data-ref`: the dhrupad, `1` = once, `0` = after every stanza.
  - `data-cols`: `1` or `2` columns.
  - `data-rail`: the left menu is shown.
  - `data-print`: the print layout being printed.
  - `data-font`: the text font.
  - `data-tuck`: the bars are tucked away.
  - `data-ready`: the site script has started. Until then the page is hidden, so it never shows half set up.

## Breakpoints

These are the only screen sizes the styles switch at. A test (`tests/edge.spec.mjs`) fails on any other, so a new one is added here first.

| Query | What changes |
|---|---|
| `(max-width: 359px)` | The smallest phones: the bottom bar drops the tilt label and narrows the autoscroll speed; Settings tightens |
| `(max-width: 379px)` | Narrow phones: Share, QR and Print show icons only |
| `(max-width: 420px)` | Phones: Prev / Next at the end of a piece take a narrower middle column |
| `(min-width: 600px)` | Large phones and tablets: a larger home-page text limit |
| `(min-width: 820px)` | Tablets and up: two-column contents, wider spacing |
| `(min-width: 1100px)` | Desktop: the left contents menu (`#rail`) |
| `(orientation: landscape) and (max-height: 520px)` | Phones held sideways: tighter line spacing and headers |

The same test keeps the number of `!important` (70) and `:root:root` (10) from growing: they only win over earlier rules, and each new one makes the next change harder.

## Checks

- `npm run lint` in `tests/` runs stylelint. It flags any CSS feature that the oldest supported browsers (`tests/.browserslistrc`, iOS 15.4 and up) lack.
- The screenshot and print tests catch visual changes.
- When files were split, every element's computed style was compared before and after the split in 34 page, dialog and print states.
