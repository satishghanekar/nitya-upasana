# Nitya Upasana v2: architecture plan

Step 1 of the v2 work (plan only, no code). Written 18 Oct 2026 from `prompt-review/REVISED-PROMPT.md`, `PROJECT-BRIEF.md`, `TRANSLITERATION.md` and the code on `main` at `22b6702`.

**Status: approved by Satish on 18 Oct 2026, with the recommended answer to every question (Q1–Q12).** Next is Step 2 (mockups), then Step 3 (one slice at a time). Decisions are logged in `docs/decisions.md`.

One finding up front: `PROJECT-BRIEF.md` describes an older shape of the site (one `index.html` with everything inline). The repository has moved on: it already has `content/pieces.js` (the texts as data), 11 CSS files, 35 small JavaScript modules, a Kannada-letters option, a redesigned print engine (Portrait / Landscape, prose layout for the Atharvashirsha) and 12 Playwright suites. This plan builds on the repository as it is, which makes v2 much less work than a rewrite.

---

## 1. Open questions and assumptions

Each question has the recommended answer in **bold**. Satish answered "yes to all" on 18 Oct 2026, so every bold answer is now a decision.

| # | Question | Recommended |
|---|---|---|
| Q1 | Give the texts readable ids (`atharvashirsha`, `sukhkarta`, `jai-dev-jai-dev`…) instead of today's `p1`, `a1`…`a10`? Old links like `#a5` would still open the right text. | **Yes** |
| Q2 | Categories for today's texts: Atharvashirsha → **Vedic Chant**; the ten aartis, including Ghalin Lotangan → **Aarti**. Stotra and Ashtak start empty. | **Yes** |
| Q3 | In the text files, write today's invisible line-break hints as visible marks: `¦` for "may break here" (today's hidden ZWSP, 42 of them) and ` // ` for "always break here" (today's `<br>`, 53 of them)? The app turns them back into exactly what the site shows now. | **Yes** |
| Q4 | Besides text size, language and English style, should **theme and high contrast** also be per person? (Eyesight differs; the screen-on setting and location stay per device.) | **Yes** |
| Q5 | A new profile starts with: Evening = the ten aartis in today's order, Morning = Atharvashirsha, Afternoon empty. This only mirrors today's site; it is not a recommendation of mine, and you can change it in `content/routines.json`. | **Yes**, or send the list you want |
| Q6 | Session times for the default switch: Morning until 12:00, Afternoon 12:00–17:00, Evening after 17:00. | **Yes** |
| Q7 | Special days: until you send the rules table, the only rule is the one the current site already computes (Sankashti, with Angaraki on a Tuesday), shown on the card and **adding no texts**. Almanac convention: Kalnirnay / Drik Panchang, amanta months (Marathi). | **Yes** |
| Q8 | Keep "show the same words in Kannada letters" and add Telugu letters the same way (both are one-for-one with Devanagari)? Tamil letters can't be shown this way (see §4.8). | **Yes** |
| Q9 | Tamil originals: the everyday English line is typed by hand as now, and no scholarly line is generated (Tamil script doesn't show voicing, so it would guess). | **Yes** |
| Q10 | `.nitya` files: plain JSON with a checksum in Phase 1; an optional passphrase (AES-GCM) after the cut line. | **Yes** |
| Q11 | ~~The preview shows "v2.0 preview" with cache `nitya-v2.0-pre`.~~ Superseded 18 Oct 2026: v2 is built on `main`, so the version follows the release rules (bumped only when you ask; the cache name matches it). | **Yes** (superseded) |
| Q12 | Everything the site does today carries over unless you say so, including the bottom bar, autoscroll, tilt-to-scroll, the reading sheet (Aa), the picture viewer, QR code, four text fonts and the Sankashti date card. | **Yes** |

Assumptions (no answer needed unless one is wrong):

- **A1.** (Changed 18 Oct 2026.) v2 is built on `main`, which goes live at `https://nitya-upasana.pages.dev` on every merge. Today's code is kept on the branch `sankathara-chaturthi-base`. Each slice reaches `main` only after its tests pass and you approve it, so the live site always shows the last finished slice. The move of today's settings (§3.8) runs on the first visit after slice 2.
- **A2.** Profiles are a convenience, not security: no PINs. Anyone holding the phone can switch profiles.
- **A3.** No new texts in Telugu, Kannada or Tamil script exist yet. Their support is planned now (format, fonts, transliteration) and built when the first such text arrives. Until then, such a text already works if added, just without a generated scholarly line.
- **A4.** The week row runs Monday to Sunday, as the prompt says.
- **A5.** Recordings: none yet. Audio is planned (data and UI) and built when you have recordings.
- **A6.** (Changed 18 Oct 2026.) `main` no longer receives syncs from sankathara-chaturthi. Nitya Upasana is its own app from here; its texts live only in `content/texts/`.

## 2. Inventory of the current code

How each part carries over. "Port" = moves over with small edits, "Wrap" = kept inside, with a new layer around it, "Rewrite" = replaced.

### Content and rendering

| Part | Today | v2 | Why |
|---|---|---|---|
| `content/pieces.js` | All 11 texts as one JS object, 307 line pairs, with markup flags (`kind`, `rf`, `rmk`, `para`, `bold`, `refrain`, `cls: norf`, `prose`) and credits as HTML | **Rewrite** as `content/texts/*.txt` (one file per text) via the migration script | The prompt's plain-text format. Every flag maps to a marker in the file (§3.1). |
| `js/render.js` | Builds the HTML of every piece while the page loads; Kannada letters (`SCR`); the Safari print handover | **Wrap**: the HTML it produces becomes the "reading markup contract" (§4.1). A new renderer builds the same markup from parsed text files, for any list of texts | Autofit, stanza numbers, dhrupad markers, line breaks, search, highlights and print all read this markup. Keeping it identical lets them all port unchanged. |
| `text/stanza-numbers.js`, `text/dhrupad-markers.js`, `text/line-breaks.js` | Run once on the page | **Port**, called after each render instead of once | Same markup |
| `text/autofit.js` | Largest size where every line fits | **Port**, re-run when the reading view shows a new set of texts; cache keys gain the text set | Same algorithm |
| `text/iast.js` | Devanagari → IAST, Vedic accents | **Port as-is**, plus the 12 checks as Vitest tests | Works, tested |
| `text/search.js` | Forgiving search over every line, both spellings | **Port and extend**: whole library (bundled + family texts), titles and categories, typo tolerance by edit distance, built in an idle moment | Prompt asks for fuzzy search across scripts and both styles |
| `text/layout.js` | One-off layout helpers | **Port** | |

### State and page

| Part | Today | v2 | Why |
|---|---|---|---|
| `core/state.js` (`P`, `aarti2-prefs`, migrations v0→v6) | One settings object in `localStorage` | **Rewrite** as a small store: device settings + the active profile's settings, saved in IndexedDB, with today's migration chain kept for the one-time move (§3.8) | Profiles, routines and family texts outgrow `localStorage`. |
| `core/apply.js`, `features/bars.js` `apply()` | Turns `P` into `data-*` switches on `<html>` | **Port**: `apply()` stays the only place that writes the switches; it now reads the store | The CSS depends on these switches. |
| `core/page.js`, `core/startup.js` | Page basics, start-up, reopen where you were | **Port**; start-up adds the router and profile load | |
| `features/history.js` | Back button closes overlays, returns from jumps | **Wrap** inside the router (§5.2) | Same behaviour, more views |
| `features/overlays.js`, `settings-panel.js`, `languages.js`, `help.js` | Settings, contents/search, Help overlays | **Port**; Settings gains Profiles and Backup groups; Help gains "What's new" | |
| `features/contents-list.js`, `clicks.js` | Contents from the home page | **Rewrite** as the Library view (by category) | Content is no longer a fixed page |
| Home card (`index.html`, `css/05-home-card.css`) | Paper card, picture, date card, App/Share/QR/Print/Help row, offline line | **Rewrite** as the Today card (§5.4), keeping its look, the special-day line and the button row | The prompt frees the home card |
| `features/date-card.js` + `astronomy.js` | Next Sankashti, moonrise, past/future strip, calendar files | **Wrap**: astronomy and the Sankashti rule move into the special-days engine (§4.7); the calendar code moves into `calendar.js`; the card UI becomes the special-day line and a detail sheet | One engine for every observance |
| `features/bottom-bar.js`, `tilt.js`, `reading-sheet.js`, `dhrupad-button.js`, `pinch.js`, `picture-viewer.js` | Reading controls | **Port** | Unchanged behaviour |
| `features/wake-lock.js` | Keep screen on, re-requested when the page returns | **Port**, also held by Recital mode | |
| `features/share.js` | Share link, QR, Add to Home Screen steps | **Port**, plus `.nitya` file sharing (§4.4) | |
| `features/offline.js`, `sw.js`, `js/parts.js` | Offline copy, update check, cache rules | **Port**; `parts.js` gains the text files and the lazily loaded modules; the robustness rules stay word for word | Proven against the Safari hang |
| `core/features.js` | Release switches (`FEAT_SW`) | **Port** | |

### Print

| Part | v2 | Why |
|---|---|---|
| `features/print.js`, `print/fit.js`, `print/profiles.js` | **Wrap.** The engine clones the visible reading markup into `#pv`. v2 renders the texts to print (one text, a session, a category or the whole library) into the same markup, then hands it over. The engine's planning, fitting, WebKit path (`.wk`), contents page numbers and Home Screen → Safari handover stay as they are. It stays a plain module with its own stylesheet (`css/print.css`, today's final print rules moved, not changed), loaded only when printing, never in Shadow DOM. | The prompt: keep its behaviour. It is the most tested and most tuned code in the site. |

### Styles and tests

| Part | v2 | Why |
|---|---|---|
| `css/00`–`09`, `99-fallbacks.css` | **Port**; new views get new numbered files (`10-today.css`, `11-library.css`, `12-builder.css`…); print rules move into `print.css`. The order rule ("a later rule wins") stays. | Reordering was tried and rejected (ARCHITECTURE.md). |
| `tests/*.spec.mjs` (12 suites), print audit, Lighthouse, lint, iOS 15.4 floor | **Port as regression tests.** `content`, `print`, `print-audit`, `offline`, `site-files`, `layout`, `a11y`, `edge`, `compat`, `perf` keep their checks and are pointed at v2's views. Visual screenshots of the reading view and print should match; the home and new views get new baselines (the home is redesigned on purpose). | §4.10 |

## 3. Data model

All types are JSDoc `@typedef`s in `js/types.js` (no runtime code), checked by `tsc --noEmit` with `checkJs`. Shown here in short form.

### 3.1 Text files (`content/texts/<id>.txt`)

The prompt's format, refined so every flag in today's data has a plain-text form:

```
id: sukhkarta
title: सुखकर्ता दुःखहर्ता
title-en: Sukhkarta Dukhaharta
category: aarti
language: mr
credit: रचना : [समर्थ रामदास](https://mr.wikipedia.org/wiki/सुखकर्ता_दुःखहर्ता) (१६०८–१६८२)
credit-en: By [Samarth Ramdas](https://en.wikipedia.org/wiki/Sukhakarta_Dukhaharta) (1608–1682)
source: ‹book, page›
refrain: every-verse
---
[dhrupad]
‹Devanagari line›
‹everyday English line›

[1]
‹Devanagari line 1›
‹everyday English line 1›
```

- **Header fields:** `id`, `title`, `title-en`, `category` and `language` (`mr | hi | sa | te | kn | ta`) are required. `script` is optional (from the language by default: Devanagari for mr/hi/sa). `credit` / `credit-en` use `[text](link)`; the app adds today's "opens in a new tab" label and ↗. `source` is for the fidelity check. `refrain` is `every-verse` (today's dhrupad pattern), `always` (today's `norf`) or `none`. `layout: prose` marks the Atharvashirsha's booklet-style print.
- **Blocks:** `[dhrupad]` (said once at the top, today's `dh`), `[1]`, `[2]`… (numbered stanzas; the ॥ १ ॥ is still added by the app), `[para 3]` (a stanza that starts a printed paragraph), `[bold 4]`, `[note: ↻ ३ वेळा | 3 times]` (today's small repeat notes that the pattern doesn't produce), `[refrain]` for a one-line refrain written inside each stanza.
- **Repeats are derived, not typed:** with `refrain: every-verse`, the "↻ ध्रुपद" note and the repeated dhrupad after each stanza are produced by the app, as `content/pieces.js` spells them out today. The migration (§7, slice 1) proves the result is identical to today's markup for all 11 texts; any text where it can't be derived keeps explicit blocks.
- **Lines:** strictly alternating: original line, then its everyday English line. The checker knows which is which by script, so a missing or swapped line is caught. `¦` = may break here, ` // ` = always break here (Q3). The IAST line is never stored.
- **Exactness:** files are UTF-8, stored and compared byte for byte, **never Unicode-normalised** (normalising would change some Devanagari sequences, e.g. क़). `.editorconfig` and the checker guard this.
- **Stable line ids:** `<text id>.<n>`, counted in file order (`sukhkarta.12`). Texts don't change, so position is stable; any approved spelling fix keeps the line count. Audio timing (§3.6) refers to these ids.
- **As built in slice 1** (README "How to add a text" is the reference): the index is `content/library.json` (texts in library order with the fields above, plus today's reading-page groups Pooja / Aarti, the language tags, the dhrupad label and note, the Previous / Next labels and the Kannada Wikipedia map). Extra header fields keep today's 11 texts identical: `legacy-id` (the section id, `a1`), `line-ids` (today's prefix, `s1l`; new texts default to `<id>.`), `line-id-exceptions` (only `s7l4=s7l4r`), `refrain-before-first: yes` (Vitthal Aarti, Jai Ganesh Deva), `credit-note` / `credit-note-en` (Vitthal Aarti's second author line). Blocks: `[dhrupad bold]` instead of `[bold n]` (the bold block is Ghalin Lotangan's closing mantra, a dhrupad), `[dhrupad repeated]` for the Vitthal Aarti, whose repeats are written with a forced break where the top one has a soft break, and `[refrain]` inside a block marks the rest of its lines as refrain lines. Piece numbers come from the order in `library.json`. The old `content/pieces.js` is kept unchanged as the test fixture `tests/unit/fixtures/pieces.js`, which `tests/unit/content.test.mjs` proves the files rebuild exactly.

### 3.2 Index and categories

A static host can't list a folder, so the app needs a list of the text files:

- **`content/index.json`**: `[{ id, file, title, titleEn, category, language, lines }]`, one entry per text, in library order. **Written by `npm run content`**, the same command that checks every file (§4.9). It is a check that also writes the list, not a build: the site still runs exactly as the files sit in the repository, and CI fails if the list is out of date. Adding a text = write the file, run `npm run content`, push.
- **`content/categories.json`**: `[{ id: "vedic-chant", name: { mr, en }, order }]`. Family additions and renames live in IndexedDB on top of it.

```js
/** @typedef {{ id: string, name: {mr: string, en: string}, order: number, origin: "bundled"|"family" }} Category */
```

### 3.3 Text (in memory, after parsing)

```js
/** @typedef {{
 *   id: string, title: string, titleEn: string, category: string,
 *   language: "mr"|"hi"|"sa"|"te"|"kn"|"ta", script: "deva"|"telu"|"knda"|"taml",
 *   credit?: string, creditEn?: string, source?: string,
 *   refrain: "every-verse"|"always"|"none", layout?: "prose",
 *   blocks: Block[],
 *   origin: "bundled"|"family", raw: string   // raw = the file exactly as stored
 * }} Text
 * @typedef {{ kind: "dhrupad"|"stanza"|"refrain"|"note", n?: number, para?: boolean, bold?: boolean,
 *   note?: {mr: string, en: string}, lines: Line[] }} Block
 * @typedef {{ id: string, orig: string, en: string, rf?: boolean,
 *   breaks: number[], hard: number[] }} Line   // break positions from ¦ and //
 */
```

Search keys and IAST are computed when needed and cached (`Map<lineId, …>`), never stored with the text.

### 3.4 Profile and settings

```js
/** @typedef {{ id: string, name: string, initial: string, colour: string,
 *   settings: ProfileSettings, routine: Routine, checklist: { date: string, done: string[] },
 *   created: string, updated: string }} Profile
 * @typedef {{ lang, lead, l2, ui, ind, tr, fs, fsu, fnt, ref, th, hc, as, ason, asp, af }} ProfileSettings
 *   // today's P keys, same meanings (js/core/state.js); th and hc per Q4
 * @typedef {{ activeProfile: string, wake, cols, loc, por, pfn, pref, fold, lastBackup?: string,
 *   lastSeenVersion: string, schema: number }} DeviceSettings
 */
```

### 3.5 Routine and sessions

```js
/** @typedef {{ morning: SessionPlan, afternoon: SessionPlan, evening: SessionPlan }} Routine
 * @typedef {{ mode: "fixed", texts: string[] }
 *         | { mode: "weekday", days: { mon: string[], tue: string[], …, sun: string[] } }} SessionPlan
 */
```

`content/routines.json` holds the default routine for a new profile (Q5). A session's list for a day is: the weekday list (or the fixed list), **then** any texts special days add, with no duplicates (special days add, never replace).

### 3.6 Special-day rules (`content/special-days.json`)

```js
/** @typedef {{ id: string, name: {mr: string, en: string},
 *   when: When, adds?: { morning?: string[], afternoon?: string[], evening?: string[] },
 *   profiles?: "all"|string[], note?: string }} SpecialDay
 * @typedef {{ tithi: number, paksha: "shukla"|"krishna", at: "sunrise"|"moonrise", month?: string }
 *         | { weekday: "mon"|…|"sun" }
 *         | { date: "MM-DD" }
 *         | { all: When[] } } When        // all: e.g. Angaraki = Sankashti on a Tuesday
 */
```

The table is yours to fill (Q7). The engine only evaluates it; it ships with the Sankashti / Angaraki rule from today's card and empty `adds`.

### 3.7 `.nitya` file

```json
{
  "format": "nitya", "schema": 1, "kind": "backup | profile | routine | text",
  "app": "v2.0", "created": "2026-…", "device": "‹optional name›",
  "payload": { "profiles": [], "routines": [], "categories": [], "specialDays": [],
               "texts": [{ "id": "…", "file": "‹the text file, exactly›" }], "settings": {} },
  "sha256": "‹of payload›"
}
```

- Texts travel as their plain-text file, unchanged, inside the JSON.
- On restore, the checksum is verified first; a mismatch stops the restore with a plain message.
- Encrypted (after the cut line, Q10): `{ format, schema, kind, enc: { alg: "AES-GCM", kdf: "PBKDF2-SHA256", iter, salt, iv }, data }`.

### 3.8 Storage, schema version and migration

- **IndexedDB** database `nitya`, version 1, stores: `meta` (device settings, schema), `profiles`, `texts` (family texts only; bundled texts are never copied in), `categories` (family additions and renames), `specialDays` (family rules), `audio` (later). A small in-house wrapper (`js/store/db.js`, ~100 lines) with promise helpers; no library.
- **Schema version** `meta.schema = 1`; each later change gets an ordered migration function, as `state.js` does today.
- **Fast first paint:** the active profile's theme and language are also copied to `localStorage["nitya-boot"]`, read synchronously before first paint (as today), so the page doesn't flash while IndexedDB opens.
- **Moving today's settings (switch day):** on first start, if `localStorage["aarti2-prefs"]` exists, run today's migration chain up to v6, create the first profile ("Me", renameable) from it, move the device-level keys to `meta`, and keep the old key untouched (so going back to v1 still works). Tested with saved settings from each old version.

## 4. Modules and boundaries

Each module is a plain ES module with a small public interface, no DOM work at import time (so Vitest can load it in Node), and feature detection, never device detection, except the existing WebKit print path (`.wk`).

### 4.1 Reading markup contract (`js/read/render.js`)

`renderTexts(texts: Text[], into: HTMLElement, opts)` produces today's markup exactly (`section.ash > header, .rftop, .items > .item > .verse > .mr/.en > p[data-l]`, `.rmk`, `.fin`, `.cr`, `nav.pn`). Class names stay (`.mr` means "the original", whatever the script). The contract is written down in `js/read/README.md` and enforced by the content test comparing v2's rendering with today's for all 11 texts.

### 4.2 Storage (`js/store/`)

| Interface | Degrades |
|---|---|
| `db.open()`, `get/put/del/all(store, …)`, `tx(stores, fn)` | No IndexedDB (rare: some private modes): keep data in memory, show "This browser can't save here. Use Save a backup file before closing." |
| `store.get()`, `store.set(path, value)`, `store.on(path, fn)`, `store.switchProfile(id)` | |
| `backup.save()` → `.nitya` Blob; `backup.restore(file)` → report of what will change, then apply | No `navigator.share`: download link. |
| `backup.persist()` (`navigator.storage.persist()`), `backup.needsReminder()` (no backup in 30 days, or never and data exists) | No `persist`: the reminder carries the weight. |

Tests: Vitest with `fake-indexeddb` (dev only) for the wrapper, migrations and round-trip backup → restore → identical data; Playwright for the buttons on a real browser.

### 4.3 Wake Lock (`js/features/wake-lock.js`)

`hold(reason)`, `release(reason)`; held while reading if the setting is on, and always in Recital mode; re-requested on `visibilitychange`. No `navigator.wakeLock` (iOS before 16.4): the switch says "Not available on this device". Test: stubbed API in Playwright.

### 4.4 Share and import (`js/io/`)

| Interface | Degrades |
|---|---|
| `share.file(blob, name, title)` after a short copyright notice for texts | `navigator.canShare({files})` false: download. iPhone: the share sheet offers AirDrop, Messages and Files. |
| `importer.read(files)` → items `{ kind: "nitya"|"text"|"html"|"json", preview, problems }` | Drop zone only where drag-and-drop exists; the file picker everywhere (iOS PWAs can't open files by type). |
| `importer.save(item, { category })` | Text stored exactly as given. HTML: text lines taken from block elements, shown for checking before saving. A suggested category from the title words ("आरती" → Aarti). Nothing is corrected silently: problems (unpaired line, unknown script) are listed for you. |

### 4.5 Audio (`js/audio/`, after the cut line)

- `drone.start({ sa, volume })`, `drone.stop()`: a tanpura-like drone synthesised with Web Audio oscillators (no file to download).
- `player.load(textId)`, `player.play()`, `on("line"|"word", fn)`: an `<audio>` element; the highlight follows `currentTime` read every animation frame (not `timeupdate`), with auto-scroll.
- `tapAlong(textId)`: play the recording, tap at each line (or word); saves `{ lineId: [start, end] }`.
- Data: `audio` store `{ textId, blob, mime, timings: { [lineId]: [t0, t1], words?: … } }`.
- Limits to state in Help: iOS stops web audio when the screen locks or the app goes to the background; a 10-minute recording is ~5–10 MB, so recordings are downloaded per text on request, not precached.

### 4.6 Calendar (`js/features/calendar.js`)

`ics(events)` → text; `offer(events)`: iPhone opens a `text/calendar` blob URL, Android tries the calendar intent then downloads, desktop downloads (today's code, moved). "Add Morning / Evening reminders to my calendar" makes a daily repeating event (`RRULE:FREQ=DAILY`) at the times you pick, on the device only.

### 4.7 Special days (`js/days/`)

- `astronomy.js` (today's, ported): sun/moon positions, sunrise, moonrise.
- `panchang.js`: `tithiAt(date, place, "sunrise"|"moonrise")`, `lunarMonth(date)` (amanta, with adhik months), `observances(date, place, rules)` → matching rules.
- Tested against published dates (Kalnirnay / Drik) for 2025–2027: every Sankashti (as today), plus every rule you add, before it ships.

### 4.8 Scripts and fonts (`js/text/scripts.js`)

- **Showing Devanagari texts in another script (today's Kannada option):** Kannada and Telugu letters sit at a fixed distance from Devanagari in Unicode, so the existing one-for-one move works for both (Telugu 0x300 on). Tamil lacks letters for voiced and aspirated sounds, so it can't be shown this way; Tamil is not offered as a display script.
- **Texts written in Telugu or Kannada:** for the scholarly line, move the letters to Devanagari, then use `iast.js`, giving ISO 15919 output: short ĕ/ŏ (ಎ ಒ, ఎ ఒ) become e/o and the long ones ē/ō, as ISO 15919 does for Dravidian scripts. The 12 IAST checks plus new Kannada/Telugu checks (from a printed reference you supply).
- **Texts written in Tamil:** everyday English only (Q9).
- **Fonts:** self-hosted woff2 split by `unicode-range`: Noto Sans/Serif Telugu, Noto Sans/Serif Tamil (Kannada is already there). A browser downloads a script's font only when that script is on screen, and the service worker keeps fonts once fetched instead of precaching every script.

### 4.9 Content checks (`tests/content/`, `npm run content`)

Parses every file and fails if: a header field is missing; a category isn't in `categories.json`; an id repeats or doesn't match the file name; an original line has no English partner or the order is swapped; a file is not valid UTF-8 or would change under normalisation; a line has characters outside its script and the allowed punctuation; `index.json` is out of date (then it rewrites it). The fidelity check against your scans and PDFs stays a reading by you or a reciter, guided by a per-text line count report.

### 4.10 Search (`js/text/search.js`)

`search.build(texts)` in an idle moment; `search.query(q)` → `[{ textId, lineId, score, marks }]`. Keys per line: the original without svara marks and punctuation, the everyday English, and the IAST with diacritics folded. Typo-tolerant by edit distance (1 typo per 4 letters). Titles and categories rank first. Vitest for the scoring, Playwright for the keyboard (↑ ↓ Enter) and screen reader announcements.

### 4.11 Print (`js/features/print.js` + `js/print/`)

`print.open({ texts, title })` opens today's pop-up for any set of texts. "Print" on the Today card prints the session; in the reading view, the text; in the Library, a category or everything. Loaded only when Print is tapped or `beforeprint` fires (the browser menu prints what's on screen). Tests: today's print suite and the 208-PDF audit, run on "everything" (must match today's page counts and contents numbers) and on a session.

## 5. UI and state

### 5.1 State

One small store (`js/store/store.js`, ~80 lines): a plain object, `set()` saves to IndexedDB (debounced) and notifies subscribers by path. `apply()` stays the single place that turns state into `data-*` switches and `--fs`. Views subscribe to the paths they show. No framework: the views are lists and cards, and today's code shows plain modules handle that well.

### 5.2 Routing

Hash routes, because the service worker answers every navigation with `./`:
`#/` Today · `#/read/<id>` one text · `#/session/<day>/<session>` a session's texts in order · `#/library` (`?c=aarti`) · `#/routine` builder · `#/import` · overlays (Settings, Help, search, Print) as today.
Old links (`#a5`, `#p1`) redirect to `#/read/<new id>`. The Back button walks routes and closes overlays (today's `history.js` behaviour). Reopen where you were within 12 hours, per profile.

### 5.3 Layout

- CSS media queries for the page, container queries for cards that sit in different places (Today card, library cards), `@media (pointer: coarse)` for touch sizes. No device detection.
- Today's breakpoints stay: one column on phones, the Layout setting from 900 px, two columns from 1000 px, the fixed left menu from 1100 px (now Today / Library / the session's texts).
- iOS 15.4 floor: container queries need iOS 16, so cards also get a sensible media-query layout first (`@supports` on top), and `npm run lint` keeps checking.

### 5.4 Today card

- Profile chip (initial + name; tap for the list), weekday row Mon–Sun (today selected; another day previews it), Morning / Afternoon / Evening switch (current time of day by default), the special-day line, then the session's texts as a list with a tick each (today's checklist) and a Start button that opens the session.
- Changing day, session or profile updates the list in place (no reload) and announces it to screen readers (`aria-live`).
- The App, Share, Print and Help buttons and the offline line stay, laid out for the new card (mockups in Step 2).
- Folds to one line as today, remembered per profile.

### 5.5 Routine builder (accessible)

- Each session's list: each text has ↑ and ↓ buttons and a remove button, with an "Add texts" picker (search + category tabs + checkboxes). Mode switch: "Same every day" or "Different each weekday" (then a weekday row picks which day's list you edit, with "Copy to other days").
- Drag-and-drop on top, with pointer events (works with touch, mouse and pen; HTML5 drag doesn't work on iOS): long-press or the grip handle starts the drag.
- Keyboard: Tab to a text, Alt+↑/↓ moves it, Delete removes; each move is announced ("Sukhkarta moved to 3 of 8"). Meets WCAG 2.5.7 because every drag has a button.

### 5.6 Import flow

Pick files (or drop on a computer) → each file shows a preview card: detected title, script, line pairs, any problems → choose a category (suggested one preselected) → Save. Saved texts show "Added by family" in the library and can be exported or deleted; they're never editable in a way that changes their words without showing you a before/after.

### 5.7 Recital mode

Full screen, the current stanza large and centred, tap or swipe left/right (and ← → keys, buttons for screen readers) to move, screen kept on, Back to leave. Opened from a session or a text.

## 6. Folder structure

Building on today's layout. New items marked ✚.

```
index.html               shell: bars, overlays, view containers, boot script
sw.js, manifest.json, _headers, icons, picture.webp
content/
  texts/ ✚              one .txt per text (11 to start)
  index.json ✚          written by `npm run content`
  categories.json ✚  routines.json ✚  special-days.json ✚
css/                     00–09, 99 as today; ✚ 10-today, 11-library, 12-builder, 13-recital; ✚ print.css
js/
  parts.js               the file list (offline copy, update check)
  main.js                start-up order
  types.js ✚            JSDoc typedefs only
  core/                  page, state → store bridge, apply, startup, features
  store/ ✚              db, store, backup, migrate
  content/ ✚            format (parse/serialise), library (load, merge bundled + family)
  read/ ✚               render (the markup contract), reading view, recital
  views/ ✚              today, library, routine builder, import
  text/                  iast, scripts ✚, search, autofit, stanza numbers, dhrupad markers, line breaks
  days/ ✚               astronomy (moved), panchang, rules
  io/ ✚                 share files, importer, nitya format
  audio/ ✚ (later)      drone, player, tap-along
  features/              bars, bottom bar, tilt, pinch, wake lock, settings, help, history, offline, share, calendar ✚, print
  print/                 fit, profiles
docs/ ✚                 architecture.md (this file), decisions.md (decision log)
tests/                   today's suites + ✚ unit/ (Vitest), content/ (format checks), tsconfig.json
```

All tooling stays in `tests/` as now (`npm` there: Playwright, Vitest, TypeScript for `tsc --noEmit`, lint), so Cloudflare serves the repository as it is, with no build step.

## 7. Phase 1 slices

Each slice: tests first, then code, then every suite (including today's regression tests); done = tests pass, phone and desktop screenshots (one dark), README and Help updated. Work happens on a branch per slice and merges to `main` (which goes live) after your OK.

| # | Slice | Tests | What you can check on your phone (live site after merge) |
|---|---|---|---|
| 0 | **Checks.** Vitest and `tsc --noEmit` set up in CI, `docs/decisions.md` kept up to date. | CI green on the unchanged site | The site looks exactly as today. |
| 1 | **Texts become files.** The 11 text files, the format parser, `npm run content`, the migration script, and the new renderer producing today's markup. | Per text, every line identical to today's (count reported); today's content test passes unchanged; format checks; IAST checks | Nothing looks different: same texts, same print. README explains how to add a text. |
| 2 | **Storage, profiles, backup.** IndexedDB, store, per-profile settings, settings move from v1, Save a backup file / Restore, storage persistence, backup reminder. | Migration from each old settings version; backup → restore round trip; profile switch; a11y | Create two profiles with different text sizes and languages, switch between them, save a backup, restore it. |
| 3 | **Library and categories.** Library view by category, add or rename a category, search across the library. | Search scoring; a11y; layout matrix | Browse Vedic Chant / Aarti; find "sukhkarta" and "सुखकर्ता". |
| 4 | **Today and sessions.** Today card (weekday row, session switch, profile chip, special-day line), default routines, reading a session in order, Print the session. | Day/session/profile changes update in place; print suite on a session and on everything | Open Today, flip days and sessions, read the evening session, print it. |
| 5 | **Routine builder.** Buttons and keyboard first, then drag. | Keyboard-only and screen reader passes; drag on touch | Build your morning routine, different on Monday and Thursday. |
| 6 | **Checklist and Recital mode.** | Checklist clears next day; Recital keys/swipes; wake lock | Tick texts as you finish; recite one stanza at a time. |
| 7 | **Special days engine.** Panchang, rules table with the Sankashti rule, "adds" merged into sessions. | Published dates 2025–2027 | The special-day line; on a rule day, the extra texts appear. Needs your table to be useful. |
| 8 | **Import and share.** Import text/HTML/JSON files, share and open `.nitya` files (profile, routine, text). | Round trips; copyright notice; problems listed | Share your routine to another phone with AirDrop or Messages, open it there. |
| — | **Recommended cut line: Phase 1 done after slice 8.** | | |
| 9 | Calendar reminders ("Add Morning / Evening reminders to my calendar") | | |
| 10 | What's new in Help | | |
| 11 | Drone | | |
| 12 | Recitation playback, highlighting and the tap-along tool (when recordings exist) | | |
| 13 | Telugu / Tamil texts, scripts and fonts (when the first such text arrives) | | |
| 14 | Passphrase-protected `.nitya` files | | |

Slices 9 and 10 are small and could move above the line if you want them in Phase 1.

## 8. Risks

| # | Risk | Handling |
|---|---|---|
| R1 | **A text changes by accident** during migration or later editing (an editor normalising Unicode, a lost svara mark, a swapped line). | The migration proves every line identical; files are never normalised and the checker refuses a file that would change under normalisation; today's content test stays; per-text line counts reported each time. |
| R2 | **Print regresses**, since it is the most tuned part. | Wrap, don't rewrite: same markup, same engine. The print suite and 208-PDF audit must reproduce today's page counts and contents numbers for "everything". You check Safari PDFs after slices 1 and 4 (I can't run real Safari). |
| R3 | ~~Two copies of the texts drifting apart while v2 is built.~~ Gone since 18 Oct 2026: v2 is built on `main` and syncs from sankathara-chaturthi have stopped. New risk instead: **every merge goes live**. | Slices merge only with all tests green and your OK; slice 1 changes nothing visible; `sankathara-chaturthi-base` keeps today's code to go back to. |
| R4 | **iPhone wipes site data** (common for sites not added to the home screen). | Backup and restore in slice 2, `persist()`, the reminder, and Help explaining "Add to Home Screen" keeps data safer. |
| R5 | **Safari's IndexedDB quirks** (early iOS 15 had a bug where the first open could hang). | Open with a timeout and one retry, fall back to memory with a warning (§4.2), tested on WebKit in CI; your iPhone check after slice 2. |
| R6 | **Special-day dates wrong** (adhik months, a tithi that skips a sunrise). | Only rules you supply; each tested against published dates before it ships; the existing ±1 minute moonrise accuracy kept. |
| R7 | **Slower start** as the app grows. | Only the Today modules load at start; print, builder, import, share and audio load when used. Budget: app shell (HTML + CSS + JS, fonts and texts excluded) ≤ 170 KB gzipped (today ≈ 138 KB), first screen within 2 s on a mid-range phone on 4G (Lighthouse mobile in CI: LCP ≤ 2.0 s, CLS < 0.1 fails the run as today). |
| R8 | **Accessibility gaps in new views** (builder, import, recital). | axe on every new view in light/dark/sepia/high contrast, keyboard-only tests, and your VoiceOver pass after slices 4 and 5 (I can't run VoiceOver). |
| R9 | **Scope creep.** | The cut line; anything new goes into `docs/decisions.md` as a proposed slice for your OK. |
| R10 | **Preview address reachable by anyone who has the link.** | Same as the live site today: no personal data is sent anywhere; everything stays on the device. |

## Later: how Phase 2 would attach

On-device OCR of book photos, live chant recognition and pronunciation feedback are out of scope. They would attach to what Phase 1 builds anyway: OCR would feed the import preview (so its output still goes through the same "check before saving, never correct silently" step); chant recognition and svara feedback would follow the stable line ids and the audio timing data (§3.1, §4.5), comparing what the microphone hears with the timed lines while the app is in the foreground. Nothing else is designed for them now.
