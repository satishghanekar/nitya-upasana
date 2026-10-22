# नित्य उपासना / Nitya Upasana

The texts our group recites at Sankathara (Sankashti) Chaturthi puja: Pooja, Bhajans (coming soon) and Aarti, in Marathi with English transliteration.

**Live site:** https://nitya-upasana.pages.dev

**Version:** 1.4 (shown as *v1.4* in Settings → About, on the line that checks for updates)

## What the site does

Everything runs on the phone or computer. Nothing is sent anywhere, and the site works offline once opened.

- **Home** (Home v2, Satish 2026-10-18; Home v3 option A, Satish 2026-10-20; see `docs/decisions.md`): what to chant now, in one column. The top bar has the name, who is reading, a **Library** button (book) and Settings (Language and Dhrupad join them while reading). Then the time-of-day picture with the day's star ringed, beside today's date in Marathi and English; the Vedic calendar line (`#pan`); on a festival day or a Sankashti day only, one line for it (`#fst`, `#skt`); then a **Morning | Afternoon | Evening** switch (tabs; arrow keys move between them, Enter or Space picks) that opens at the session for the time now (Morning before 12:00, Afternoon 12:00–17:00, Evening from 17:00). Tapping a session shows that session's texts for today in place, from the reading person's routine (their own, else `content/routines.json`) for today's weekday, each with its number, Marathi and English title (from `content/library.json`), language and a round tick, with the heading, "N of M done" and **Edit**. A session with nothing set today is greyed (dashed, muted, "Nothing set" under its name; still focusable, `aria-disabled`); picking it, or the clock's session when it is empty, shows "Nothing is planned … yet." with **Add texts**. Then **Start** / **Continue** (opens the first text not yet ticked; on phones, below 820px, pinned to the bottom of the screen with room for the home indicator, and the bottom bar gives way to it on the home page); **More**, one button that opens the App / Share / QR / Print / Help row (closed by default); and the quiet line "Another text? Open the Library". Home ends there: the reading page's pieces are not shown under Home (`data-hv` on `<html>`, `js/features/history.js`) and appear as soon as a text is opened (from the list, Start, the Library, search, the side menu or a link such as `#a5`); Back to the bare address, the Home buttons and the end of a session bring Home on its own back. While a session is being read, ‹ Prev and Next › in the bottom bar follow the session, and Next after its last text comes back Home; Next › on a session text (Satish, 2026-10-18) ticks that text as done for today, for the person reading, before moving on (‹ Prev never ticks, and a tick can still be taken off by hand); a jump from the Library or the side menu leaves the session. Ticks are kept on the phone for today only, per person, in that person's profile in IndexedDB, and start fresh the next day. On wide screens the home page is a centred column of 560px and the side menu waits until a text is reached. Code: `js/features/today-card.js`, `js/core/routine.js`, `js/core/ticks.js`, `css/10-today.css`.
- **Library** (Home v2): the book button opens a page under the top bar with every text, by category (Vedic Chant, Aarti, Ashtak, …), each with its language, and the search box above. A title opens the text; ‹ Back or the phone's Back returns (from a text, Back returns to Home). The bottom bar's search button and the one at the end of each piece open it too. Code: `#jump` in `index.html`, `js/features/contents-list.js`, `js/text/search.js`, `css/10-today.css` and `css/08-contents-book.css`.
- **People on one phone** (version 1.4, plan slice 2): a badge in the top bar (mockup A: the person's letters on their colour, with the name beside it from 600px up) shows who is reading; a tap opens the profile sheet (`#pfm`): switch person (the page changes in place, no reload), add (name, up to four badge letters, eight colours; up to eight people), rename, recolour, and delete with a confirm (never the last person). Each person keeps their own text size, languages, letters, English spelling, font, theme, high contrast, highlighted line, folds and today's ticks; location, Keep screen on, layout and print choices belong to the phone. Settings → **Profiles and backup** has Who is reading, Save a backup file and Restore from a file. The first visit after 1.3 moves the existing settings and ticks into one person called *Me*. Code: `js/store/` (`db.js`, `migrate.js`, `profiles.js`, `store.js`, `backup.js`), `js/features/profiles.js`, `css/11-profiles.css`.
- **Storage:** everything stays on the phone. People, their settings and ticks are in IndexedDB (database `nitya`); if it can't be opened within a second (tried twice; early iOS 15 can hang), the site keeps everything in memory for the visit and shows a note on the home page and in Settings. The active person's settings are also written at once to `localStorage["aarti2-prefs"]` (with `pid`, the person's id) so the page opens with them before IndexedDB answers. After a backup, a restore or adding a person the site asks the browser to keep its data (`navigator.storage.persist()`).
- **Backup** (`js/features/backup.js`, `js/store/backup.js`): *Save a backup file* writes `nitya-upasana-YYYY-MM-DD.nitya`, plain JSON (`format`, `schema`, `kind: "backup"`, `app`, `created`, `payload` with every person and the phone's settings, and a SHA-256 `sha256` of the payload); on a phone it goes to the share sheet (Save to Files), elsewhere it downloads. *Restore from a file* checks the file (ours, not newer, checksum, cleaned values), shows who will be added, replaced or removed and who reads next, and replaces everyone only after **Restore** is tapped. A dismissible reminder on the home page asks for a backup 14 days after the first visit, then 30 days after each one (*Not now*: 14 days).
- **Texts:** the Ganapati Atharvashirsha (with Vedic swara marks) and ten aartis, in Marathi, English, or both side by side (the अ/A button).
- **English style** (Settings): the everyday spelling (*Sukhkarta*) or the scholarly spelling, IAST (*sukhakartā*, *bha̱draṃ*). The scholarly lines are not typed. The script builds them from the Marathi/Sanskrit lines, along with the piece titles, the first time they are needed; switching style happens in place, without reloading (see *How the scholarly English is made*). In Settings the spelling is picked with the language: English is listed twice, *English · Sukhkarta* and *English · sukhakartā*.
- **Languages** (Settings, option A of the redesign, 2026-10-15): a **main language** (large text) and a **second language** (smaller, under each line, or *None*), each picked from the phone's own dropdown on the Settings page (an invisible `<select>` over the row), with every language named in its own script (`LANGS` in `js/core/apply.js`; today मराठी, English and ಕನ್ನಡ). English is listed twice, once per spelling (*English · Sukhkarta*, *English · sukhakartā*), so the English spelling is picked with it. The अ/A button cycles main → second → both; with no second language it opens Settings at the second list. **Menus and buttons** are in English or the main language (`P.ui`); with English as the main language they are English. Settings are saved as `lead` (main), `l2` (second) and `lang` (shown now); settings version 6 turned the old "In Both, show first" into the main language. The Library's list follows the text language. **Kannada** (2026-10-15) is the same words in Kannada letters, not a translation: the page has two places for text, the original (`.mr`) and English (`.en`), and `P.ind` says whether the original shows Marathi (`mr`, as written) or Kannada (`kn`). `SCR` in `js/render.js` rewrites the Devanagari into Kannada letters while the page loads (each letter is 0x380 further on in Unicode; dandas and Vedic accent marks stay, ॐ becomes ಓಂ), and switches back and forth in place (`SCR.set`, which keeps what it changed and puts it back exactly), with no reload; `SCR.from` turns it back for the English spelling (IAST) and search, which also finds lines typed in Kannada letters. The Kannada text uses Noto Sans Kannada (`fonts/`); with the other text fonts it uses Noto Serif Kannada (Classic), Baloo Tamma 2 (Bold) or Hubballi (Handwritten), and the Atharvashirsha keeps a font with the Vedic marks. In Kannada the poet links go to Kannada Wikipedia when it has a page (`wiki` in `content/library.json`), else to English. For now Kannada pairs only with English (it can't sit beside Marathi, which shares its place) and its menus are English. Another script would be one more entry in `SCRIPTS` (`js/render.js`) and `LANGS` (`js/core/apply.js`).
- **Dhrupad:** shown once at the top or after every stanza (the धृ button); in "once" mode, ↻ ध्रुपद under a stanza shows it until the next tap. The Print pop-up has its own Once / Every verse choice for the printout; it starts as the page shows it and leaves the page as it is.
- **Ganesha:** the home buttons (top bar, bottom bar, the side menu's Home) are a small line drawing of Ganesha.
- **Piece folds:** a tap anywhere on a piece's heading (or its round ⌃ button) folds that piece to its heading, for one-hand use; remembered on the phone, and going to a folded piece from the Library or search opens it (a reload keeps it folded). Printing always includes everything.
- **Reading order and numbers** (2026-10-21, v1.20.3): the old पूजा / आरती groups and their fold rows are gone; the Library's categories are the only grouping. The page, Previous / Next and the printed contents follow the categories in the order of `content/categories.json`, each numbered from 1 (Vedic Chant १–५, Aarti १–१८, Ashtak १–१३), the texts in their `content/library.json` order (which lists them by category). Every piece heading, open or folded, is one left-aligned row (number and name, ⌃/⌄ on the right), so folding never makes the heading jump; the language tag (मराठी, हिंदी) shows only in print. In Marathi + English the English name sits under the Marathi.
- **Texts built when opened** (2026-10-21, v1.20.4): the page shows one text at a time, so each is built the first time it is opened instead of all of them at start-up (`pieceEl` in `js/core/page.js`); Home is much lighter. Search builds its index from the texts the first time something is searched.
- **Print: preview and paper** (2026-10-22, v1.21.4): How shows a small preview of the printout's first page (the first text ticked, as it prints), beside the paper it is laid out for: Letter in the US and Canada, A4 elsewhere, and a button to switch (*Use A4* / *Use Letter*), kept on the device. In Safari, which keeps the paper picked in its own dialog, a line says to pick the same paper there.
- **Print: language and font tiles** (2026-10-22, v1.21.3): How now starts with **Language**: the original (Marathi or Kannada), English, or Both. Like the print font, it is the printout's own and leaves the reading page as it is; Both prints side by side on Landscape. The print fonts are tiles, each showing a word of the text in that font, Best across the top.
- **Fix: printing after reading a session** (2026-10-22, v1.21.2): once a session had been read (Start on Home), every printout came out with each text's title and author line only. The page's rule that shows just the session's texts also hid the copy the printout is built from; it now applies to the reading page only.
- **Print this text, Print this session, Today** (2026-10-22, v1.21.1): while a text is read, ⋯ More has *Print this text*; on Home, *Print this session* sits under the session's texts. Each opens the print builder at How with just those texts ticked. What has a second tab, **Today**: today's sessions from your routine and *All of today*, one tap each.
- **Print: pick what to print** (2026-10-22, v1.21.0): Print (under ⋯ More) opens the print builder. First **What**: the Library's categories, each text with a tick and the pages it takes, search, and *Select all* or *Clear* for a category or everything; everything is ticked at first. Then **How**: the dhrupad, the page and the print font, as before. The bar at the bottom keeps the total ("5 texts · ~8 pages") and Next or Print. On a phone the two steps come one after the other; on an iPad or a computer they sit side by side. The Home Screen app's Open in Safari carries the texts ticked. The browser's own Print menu still prints the whole Library.
- **Print font: Best for each text** (2026-10-22, v1.20.9): the printout's font now starts as *Best* (the first choice in the Print pop-up): Classic for the aartis and ashtaks, and Tiro Devanagari Sanskrit, which draws the svara marks, for Shree Rudra, the Atharvashirsha and the Purusha Suktam. The other four fonts are still there to pick. An aarti's lines, its dhrupad at the top and its "↻ ध्रुपद" notes also now start level inside its centred block, as agreed (they were each centred).
- **Vedic texts side by side** (2026-10-22, v1.20.8): with both languages, each paragraph of a Vedic text (Shree Rudra, the Atharvashirsha, the Purusha Suktam) prints beside its English paragraph, both running on, at the Vedic size (15pt, English 12.75pt), instead of line by line in a table. Shree Rudra's long lines no longer break mid-phrase; it takes 20 pages instead of 14 (it was set at about 11pt), the Purusha Suktam 4 instead of 6.
- **Print in two columns** (2026-10-21, v1.20.7): in one language, an aarti or ashtak prints centred on the page, its lines left-aligned. A long one that would need two pages goes into two columns when that gives it one page at a larger size (Thursday's ashtak, the Padukashtak, Anudin Anutapen), with a thin rule between them and the last page balanced. A line is never wrapped for it. The whole Library in Marathi takes about 5 pages fewer.
- **Print sizes** (2026-10-21, v1.20.6): each text prints as large as its pages allow, at one of a few sizes: aartis and ashtaks at 14, 16, 18 or 20pt, Vedic texts at 15, 16 or 17pt (English a little smaller), so most aartis print at 18 to 20pt on one page. Nothing prints smaller than 80% of its size, for any reason. Side by side, the long Vedic texts and the Lalita Sahasranama take a few pages more for that.
- **Print, text by text** (2026-10-21, v1.20.5): a print link can name the texts to print (`?print=…&t=<id>`); one text on its own prints without the contents page. Every text in the Library has its own print tests (`tests/print-items.spec.mjs`, tagged `@text:<id>`), so changing one text re-checks only its printout in the quick check.
- **Autoscroll and Tilt to scroll** were built and held back, then removed for now (Satish, 2026-10-21, v1.20.1); they are in git history up to v1.20. The `as`, `ason` and `asp` settings are still read and kept, so nothing saved is lost.
- **Text font** (Settings, Satish's pick of all four, 2026-10-14): Standard (default: Noto Sans Devanagari + Inter, precached), Classic (Noto Serif Devanagari + Noto Serif), Bold (Sura) or Handwritten (Kalam). Set as `data-font` on the root from `P.fnt`; the `SC Classic` / `SC Bold` / `SC Hand` families join each font's Devanagari and Latin files, which load only when picked and are then cached by the service worker. Applies to the texts (`.items`, `.rftop`); the Atharvashirsha's Marathi lines keep Tiro Devanagari Sanskrit. Printing uses the font picked in the Print pop-up (`P.pfn`; to begin with, the text font), and picking one there leaves the reading page as it is (`#pv .pvs` rules; headings keep theirs), and `pages()` lays out the contents page numbers with it (frame 16px narrower than the page for the optional fonts, 12px for Standard: tuned so all 32 font × language × layout PDFs give the right numbers). The print view is cached per font (`pkey`). Decorative fonts Martel, Amita and Yatra One were tried and rejected: they drew the reph wrongly (दर्शन as दरशन).
- **App picture** (Satish's round pictures, 2026-10-18: ॐ, a palm-leaf book and a rosary under seven stars, one per weekday, र सो मं बु गु शु श = Sunday to Saturday): it follows the time of day, sunrise before 12:00, midday 12:00–17:00 and sunset from 17:00 (`js/core/time-of-day.js` picks it, `js/features/day-picture.js` shows it and checks again at 12:00, 17:00, midnight and whenever the page comes back into view), with a glowing ring on today's weekday star (`#iconr`; it does not pulse with Reduce Motion). `picture-<sunrise|midday|sunset>-360.webp` is shown on the home page beside the date (76 px, Home v2); it follows the session picked there, while the tab icon follows the clock; a tap opens the full-resolution `picture-<…>.webp` (940 px) full screen (`#pzv`) where pinch, double-tap or the mouse wheel zooms 1x to 5x and a drag moves it. Back, ✕, Escape or a tap outside closes it. The text-size pinch is off while it is open.
- **App icon** comes from Satish's square **sunrise** picture (2026-10-18; phones copy the icon when the app is installed, so it does not change with the time of day): `icon-32/192/512.png` keep its rounded shape (white corners removed), `icon-180.png` and the `apple-touch-icon` files are the full-bleed inside of the tile (iPhone rounds them itself), and the maskable icons have the tile at 80% on a warm brown, inside Android's safe circle. The browser tab icon follows the time of day (`icon-32.png` in the morning, `favicon-midday-32.png`, `favicon-sunset-32.png`). `share.jpg` (1024 px) is the link-preview picture (`og:image`), still the Sankathara one.
- **Originals:** the pictures exactly as Satish supplied them are kept untouched in `originals/` (the Sankathara square and round ones from 2026-10-15 are `sankathara-*.jpg`; the time-of-day ones from 2026-10-18 are `sunrise-*.jpg`, `midday-*.jpg`, `sunset-*.jpg`) (not loaded by the site). The site's versions are cut from them: the round ones to the gold rim (transparent outside it), the square ones to the tile.
- **Sankashti** (Home v2: the date card, its date strip and calendar buttons are gone): on a Sankashti day only, one line on the home page gives tonight's moonrise and the place (Angaraki on a Tuesday). The place is the reader's own (Settings → About → **Place for moonrise**, which asks the phone once; the town is worked out from a built-in list of cities and Columbus suburbs, and only the rounded place is kept), else a city for the phone's time zone. The next Sankashti is still worked out on every visit for the Share message.
- **Share / QR / Print:** a ready reminder message for WhatsApp, a QR code of the site, and a printout or PDF in the chosen language and English style. The Print pop-up has one row for the page: Portrait or Landscape for one language (one column; the Atharvashirsha as running paragraphs), and with both languages side by side, on Landscape only. It also picks the font and the dhrupad for the printout only, shows a line of the text in that font, and has one Print button. On an iPhone, if the print window does not open, the pop-up offers *Print now*, then Share → Print or *Open in Safari* (with *Copy link*), carrying the choices across; the Home Screen app goes straight to *Open in Safari*. The printed contents page lists the page each piece starts on, worked out for Letter paper in the US, Canada, Mexico and the Philippines and A4 elsewhere, for the page as turned.
- **Wide screens (iPad landscape, desktop):** in the side menu the category names head their texts. Stanzas sit in pairs across two columns; a stanza much longer or shorter than its neighbour (Atharvashirsha verse 1 beside verse 2) spans both columns on its own instead. The page sits right beside the side menu and uses its whole width (up to 60rem): the home card and piece headings span it. The home card frames itself the same as on phones, and pieces are separated by their boxed heading rows and end ornament (no extra rule line).
- **Offline:** a small cloud with a line through it shows in the top bar (`#ofb`) only while there is no internet; it is not coloured, because everything still works from the saved copy. A short "Ready to use offline" note shows once, when the first visit has saved the site. Settings → About has one line with the version and the offline state (Offline ready / Saving for offline… / Saved copy in use); a tap on it checks for updates, loading a newer version or saying "Up to date".
- **Settings:** a page of its own over the reading page (`#panel.sp`; ‹ Back or the phone's Back closes it), in groups like phone settings: Languages (main, second, menus, a preview of the Ganapati aarti in your text size, font and spelling), Reading (text size, font, dhrupad, layout on wide screens), Screen (theme, high contrast, keep screen on), Profiles and backup (who is reading, save a backup file, restore from a file) and About (Help, Add to Home Screen, one version line that checks for updates when tapped, and who made the site). Centred at most 640px wide on large screens. Its styles are the "Settings page" block in `css/09-settings-page.css`.
- **Getting around:** the top bar shows the piece being read; the Library with search (forgiving spelling, matching words in bold, ↑ ↓ Enter on a computer); a bottom bar while reading (‹ Prev, Ganesha home, Library-and-search, Aa, Next ›; on the home page Start takes its place; the smallest phones show only the arrows of Prev and Next; fixed pixel sizes like the top bar, so text size and pinch leave it alone; hidden while Settings or the Library is open; the old Previous/Next cards stay in the HTML, hidden on screen, and the bar's buttons use their links); the phone's Back button closes menus and returns to where you were before a jump, and the address (#a5) follows the piece on screen.
- **Reading sheet (Aa in the bottom bar):** slides up over the bar with Language (main, second, both; the same as the अ/A button), Text size (A− / A+ and ↺, as in Settings) and Dhrupad (once, every verse), plus All settings, so these are within thumb reach; the reader's place is kept. A tap outside, ✕, Escape or Back closes it (`js/features/reading-sheet.js`).
- **Screen readers:** the page is marked as Marathi, and English parts as English, so VoiceOver and TalkBack read each in the right voice whatever the menu language.
- **Keyboard:** the first Tab shows "Skip to the texts". Settings and the Library take focus when opened; Escape or tabbing out closes them and returns focus to their button. Picking a piece moves focus to its heading. The page has banner, navigation and main landmarks. High contrast is black whichever theme is picked (2026-10-14 accessibility review).
- **Tap areas:** small controls (dhrupad markers, Settings segments and ✕, calendar and location links, the offline line, the top-bar title) have an invisible touch area of about 44 px, so they keep their look but are easier to hit ("Bigger tap areas" block at the end of the CSS).
- **Reading:** tap a line to highlight it, pinch or A−/A+ for text size (the home page keeps its normal size), themes (light, sepia, dark), high contrast, keep the screen on (on by default on phones and tablets, off on computers), and it reopens where you were reading (within 12 hours).
- **Help** (English): opened from the home page and from Settings. Update it when a feature changes (search for `id="hlpc"`, the `<template>` that holds its text until it is first opened).

## What is in this repository

| File | What it is |
|---|---|
| `index.html` | The page: top bar, Settings, home page and Help. |
| `css/` | All the styles, in numbered parts loaded in order (see `css/README.md`). |
| `js/parts.js` | The list of the site's style, script and font files, shared by the page and the service worker. |
| `js/main.js` and `js/core/`, `js/text/`, `js/store/`, `js/features/`, `js/print/` | All the behaviour (settings, people and backup, dates, search, print, offline…), one file per topic (see `js/README.md`). |
| `content/texts/` | The texts, one plain-text file each (`sukhkarta.txt`, …): each line in Marathi/Hindi/Sanskrit with its everyday English line under it, the title and the author line. **Edit the texts here** (see *How to add a text*). |
| `content/routines.json` | The home page's routine: which texts each session (morning, afternoon, evening) has, the same every day (`"mode": "fixed"`) or per weekday (`"mode": "weekday"`). Ids are those in `content/library.json`. |
| `content/library.json`, `content/categories.json` | The list of texts in reading order within each category, with the few words the app adds (language tags, the dhrupad label); the categories (Vedic Chant, Aarti, Stotra, Ashtak). |
| `js/text/format.js`, `js/text/content.js`, `js/text/load.js` | Read the text files, turn them into the pieces' data and put them into the page when it opens. |
| `js/render.js` | Builds each piece's HTML from that data. |
| `sw.js` | The service worker. It keeps a copy of the site on each phone so it opens without internet. |
| `picture-sunrise-360.webp`, `picture-midday-360.webp`, `picture-sunset-360.webp`, `picture-sunrise.webp`, `picture-midday.webp`, `picture-sunset.webp`, `favicon-midday-32.png`, `favicon-sunset-32.png` | The app's picture for each time of day: 360 px for the home card, 940 px for the full-screen view, and the browser tab icons for the afternoon and evening. |
| `manifest.json` | Name, colours and icons used when someone adds the site to their home screen. |
| `icon-180.png`, `icon-192.png`, `icon-512.png`, `icon-maskable-192.png`, `icon-maskable-512.png`, `icon-32.png`, `apple-touch-icon.png`, `apple-touch-icon-precomposed.png` | App icons (the sunrise picture): 180 for iPhone, 192/512 rounded tile, maskable versions with extra margin for Android, 32 for the browser tab. The two `apple-touch-icon` files are copies of `icon-180.png` at the site root, where iPhone also looks when it adds the site to the Home Screen. |
| `tests/` | The automated tests (see *Checking a change*). Not part of the site, though Cloudflare serves the folder too. |
| `.github/workflows/` | The test run GitHub does on every pull request and every push to `main`, and the job that refreshes its screenshots. |
| `_headers` | How long phones may keep each kind of file before asking again (Cloudflare Pages reads it). |
| `ARCHITECTURE.md` | How the page, styles and scripts fit together, for anyone changing the code. |
| `fonts/` | The site's fonts (the default ones, the optional text fonts and the Kannada ones), served from the site itself so nothing is fetched from Google and they work offline (see `fonts/README.md`). |

There is no build step. The files in this repository are exactly what the site serves.

## How publishing works

The site is hosted on **Cloudflare Pages**, connected to this repository. Every push (commit) to the `main` branch is published automatically, usually within a minute or two. Nothing else needs to be done.

To watch a publish: Cloudflare dashboard → **Workers & Pages** → **nitya-upasana** → **Deployments**. The newest deployment should show *Success*.

## Making a change by hand

### Option A: on the GitHub website (no software needed)

1. Open https://github.com/satishghanekar/nitya-upasana and open `content/texts/` and click a text's file to change its text, `css/` for styles (see `css/README.md` for which file), `js/` for behaviour (see `js/README.md` for which file), or `index.html` for the page itself.
2. Click the pencil icon (**Edit this file**).
3. Use the browser's find (Ctrl+F / ⌘F) to locate the text you want (see *Finding things in the files* below), and make the change.
4. If this is a new release, **change the version** (see below). This is a second small edit, in `index.html` and in `sw.js`.
5. Click **Commit changes…**, write a short message (for example *Fix typo in Devi Aarti verse 2*), keep **Commit directly to the `main` branch** selected, and click **Commit changes**.
6. Wait a minute or two, then check the live site (see *After publishing*).

When you edit two files (`index.html` and `sw.js`) on the website, each one is its own commit. That is fine; Cloudflare simply publishes twice.

### Option B: on your computer with git

One-time setup:

```sh
git clone https://github.com/satishghanekar/nitya-upasana.git
cd nitya-upasana
```

Every time:

```sh
git pull                      # get the latest version first
# edit index.html (and sw.js when the version changes) in any text editor
python3 -m http.server 8000   # optional: preview at http://localhost:8000, Ctrl+C to stop
git add -A
git commit -m "Describe the change"
git push                      # publishes to the live site
```

Use a plain-text editor that saves UTF-8 (VS Code, Sublime Text, TextEdit in plain-text mode, Notepad). Word processors will damage the file.

### The version

Phones keep a saved copy of the site, but the page and its style, script and text files are always fetched fresh when there is internet, so a published change reaches phones the next time the site is opened online. **Check for updates** (a tap on the version line in Settings → About) compares each of those files on the phone with the live one, so it finds changes even when the version stays the same.

The version is what Settings → About shows (v1.4). It appears in **two** places, and both must always be the **same**:

1. `sw.js`, near the top:
   ```js
   const V='aarti-v1.4';
   ```
2. `index.html`, near the top:
   ```html
   <meta name="version" content="aarti-v1.4">
   ```

Change it only for a new release, and change both together, using digits and dots only: `1.0` → `1.0.1` for fixes, `1.1` for new features, `2.0` for a redesign. Changing it also makes phones refresh the saved icons and fonts.

### After publishing

- Computer: open the site and reload (Ctrl+Shift+R / ⌘⇧R).
- Phone: open the site, wait a few seconds, then close it fully and open it again. The first open fetches the new version; the second shows it.

### Undoing a change

On GitHub, open **Commits** (the clock icon above the file list) and click the commit you want to undo: it shows exactly what changed, red for removed and green for added. Edit the file back the same way and commit again; it publishes like any other change. With git on a computer, `git revert <commit id>` followed by `git push` does the same in one step.

## Finding things in the files

`index.html` is laid out top to bottom as:

1. `<head>`: title, and preloading of the main font files.
2. Links to the style files in `css/`, in order (see `css/README.md`): labelled sections (`/* ==== … ==== */`), starting with the `@font-face` rules for `fonts/`. Then `js/parts.js`, the list of the site's files, and `modulepreload` links for the script parts.
3. `<body>`: the top bar, the settings panel, then the home page. The pieces themselves are in `content/texts/`; at the end of `<main>`, `#pieces` marks their place, and when the page opens `js/text/load.js` fetches the text files and has `js/render.js` build the pieces there before anything else starts, so the page is exactly as if they were written there.
4. `<script type="module" src="js/main.js">`: all behaviour. `main.js` starts each part in `js/core/`, `js/text/` and `js/features/` in order (see `js/README.md`).

Each piece is one file in `content/texts/`. Its `legacy-id` is the id of its `<section>` on the page (and the `#a5` in links):

| File in `content/texts/` | legacy-id | Piece |
|---|---|---|
| `atharvashirsha.txt` | `p1` | Pooja 1. गणपत्यथर्वशीर्षोपनिषत् (Ganapati Atharvashirsha) |
| `sukhkarta.txt` | `a1` | Aarti 1. गणपतीची आरती |
| `shendur-lal-chadhayo.txt` | `a2` | Aarti 2. गणपति जी की आरती |
| `durge-durghat-bhari.txt` | `a3` | Aarti 3. देवीची आरती |
| `lavathavati-vikrala.txt` | `a4` | Aarti 4. शंकराची आरती |
| `trigunatmak-traimurti.txt` | `a5` | Aarti 5. दत्ताची आरती |
| `aarti-dnyanaraja.txt` | `a6` | Aarti 6. ज्ञानेश्वरांची आरती |
| `yei-o-vitthale.txt` | `a7` | Aarti 7. विठ्ठलाची आरती |
| `ghalin-lotangan.txt` | `a8` | Aarti 8. घालीन लोटांगण |
| `jai-ganesh-deva.txt` | `a9` | Aarti 9. आरती जय गणेश देवा |
| `jai-jagdish-hare.txt` | `a10` | Aarti 10. आरती जय जगदीश हरे |
| `jaydeva-jaydeva-samartha.txt` | (none: `jaydeva-jaydeva-samartha`) | Aarti 11. श्रीमहाराजांची आरती |
| `jay-jay-aarti-shrigururaya.txt` | (none: `jay-jay-aarti-shrigururaya`) | Aarti 12. आरती श्रीमहाराजांची |
| `ovaloon-aarti-chaitanyabrahma.txt` | (none: `ovaloon-aarti-chaitanyabrahma`) | Aarti 13. ओवाळूं आरती सद्‌गुरु चैतन्यब्रह्मा |
| `aarti-kariton-guruvar.txt` | (none: `aarti-kariton-guruvar`) | Aarti 14. आरति करितों गुरुवर |
| `dhanya-jagin-guruvarya.txt` | (none: `dhanya-jagin-guruvarya`) | Aarti 15. धन्य जगीं या गुरुवर्य हे मारुतिअवतार |
| `aarti-belaguve.txt` | (none: `aarti-belaguve`) | Aarti 16. आरति बेळगुवे |
| `svastha-karin-shayan.txt` | (none: `svastha-karin-shayan`) | Aarti 17. स्वस्थ करीं शयन प्रभो मंचकावरी |
| `ovaloo-sapreme-aarti.txt` | (none: `ovaloo-sapreme-aarti`) | Aarti 18. आरती श्री नानामहाराजांची |

Or search for a few words of the line itself.

## How to add a text

A text is one plain-text file in `content/texts/`, named after its id (`sukhkarta.txt`). Use a plain-text editor that saves UTF-8 (see *Option B*) and never one that "fixes" spelling or Unicode: the words are kept exactly as typed, svara marks and all. The easiest start is a copy of a similar text.

### The file

```
id: sukhkarta
title: गणपतीची आरती
title-en: Ganapati Aarti
category: aarti
language: mr
legacy-id: a1
line-ids: s1l
refrain: every-verse
credit: रचना : [समर्थ रामदास](https://mr.wikipedia.org/wiki/सुखकर्ता_दुःखहर्ता) (१६०८–१६८२)
credit-en: By [Samarth Ramdas](https://en.wikipedia.org/wiki/Sukhakarta_Dukhaharta) (1608–1682)
---
[dhrupad]
जय देव जय देव, जय मंगल मूर्ती ।
Jai Dev Jai Dev, Jai Mangal Murti |
…

[1]
सुखकर्ता दुःखहर्ता, वार्ता विघ्नाची ।
Sukhkarta Dukhharta, Varta Vighnachi |
…
```

**The header** (one `name: value` per line, then a line `---`):

| Field | |
|---|---|
| `id` | Required. Lower case and hyphens, the same as the file name. |
| `title`, `title-en` | Required. The title in the original language and in English. |
| `category` | Required. One of the ids in `content/categories.json`: `vedic-chant`, `aarti`, `stotra`, `ashtak`. |
| `language` | Required. `mr` (Marathi), `hi` (Hindi), `sa` (Sanskrit); `te`, `kn`, `ta` later. The page shows the language name from `content/library.json`. |
| `legacy-id` | The piece's id on the page (`a1`) and in links. Without it, the `id`. |
| `line-ids` | What each line's id starts with (`s1l`: the lines are `s1l1`, `s1l2`, …, counted as the page shows them, repeated dhrupads included). Without it, the `id` and a dot (`sukhkarta.1`). |
| `line-id-exceptions` | Only for the old Vitthal Aarti, whose 4th line has always been `s7l4r`: `s7l4=s7l4r`. |
| `refrain` | `every-verse`: the `[dhrupad]` is shown once at the top, and after every stanza the app adds the "↻ ध्रुपद" note and the dhrupad again (for the धृ button). `always`: the refrain lines are written inside the stanzas and always shown (today's Dnyaneshwar Aarti). Leave it out for none. |
| `refrain-before-first` | `yes` when the dhrupad is also sung before the first stanza (Vitthal Aarti, Jai Ganesh Deva). |
| `stanza-numbers` | `as-written`: the stanza numbers (॥ १ ॥) are typed in the text, and the app adds none (some ashtaks, whose numbers restart or whose English number is written differently). |
| `layout` | `prose` prints the text as running paragraphs, like a booklet (the Atharvashirsha). |
| `credit`, `credit-en` | The author line in each language. `[name](address)` becomes a Wikipedia link that opens in a new tab, with its ↗. |
| `credit-note`, `credit-note-en` | A second, smaller author line (Vitthal Aarti: "also credited to Sant Namdev"). |

**The blocks**, after `---`, separated by one blank line. Each starts with its name in brackets, then its lines, **always in pairs: the original line, then its everyday English line**. An English line where the original belongs (or the other way round) stops the text from loading, and the test names the file and line.

| Block | |
|---|---|
| `[1]`, `[2]`, … | A stanza, numbered in order. The app adds ॥ १ ॥ at its end (after its last line that is not a refrain line); do not type it. (Not in a `layout: prose` text: the Atharvashirsha's numbers are part of its text, and its blocks are simply counted.) |
| `[para 3]` | A stanza that starts a new paragraph when printed as prose. |
| `[dhrupad]` | With `refrain: every-verse`: the dhrupad, first in the file. Otherwise: lines said once, where they stand. |
| `[dhrupad bold]` | The same, shown in bold (Ghalin Lotangan's closing mantra). |
| `[dhrupad repeated]` | Right after `[dhrupad]`, only when the repeats are written differently from the top (Vitthal Aarti breaks its repeated dhrupad in two). |
| `[refrain]` | Inside a block: the lines after it are refrain lines (shown as the refrain, or hidden with the dhrupad set to once). |
| `[note: ↻ ३ वेळा \| 3 times]` | The small note between blocks, in both languages. |

**Inside a line:**

- `¦` marks a place where a long line may break on a narrow phone (it shows as nothing). Put it after the space: `निढळावरी कर, ¦निढळावरी कर`, so the words keep their space when the line fits on one row. English lines need none: on a phone they break after a single `|` or a comma by themselves.
- ` // ` (a space, two slashes, a space) always breaks the line there. The spaces belong to the mark: `|  // ` (two spaces) keeps one real space before the break, as in Ghalin Lotangan's English.
- **Vedic svara marks** (॑ ॒ ᳚) must be kept exactly. A mark that belongs with a visarga goes **after** the ः, otherwise it shows as a dotted circle.
- **Only the original line and the everyday English line are typed.** The scholarly English (IAST) is made from the original line, so a spelling fix there fixes the scholarly English too.

### Adding it to the site

1. Write the file in `content/texts/`.
2. In `content/library.json`, add it to `"texts"` (its `id`, `file`, `title`, `titleEn`, `category`, `language` and `lines`, the number of line pairs in the file) at the place in its category where it should appear. The piece number (१. 1.) and Previous / Next come from the categories' order (`content/categories.json`) and then that order.
3. In `js/parts.js`, add `texts/<id>.txt` to the `content` list, so the text is kept for offline use.
4. Add a line for it in the home-page contents in `index.html` (`<ol class="toc">` under आरती), with its `legacy-id` (or `id`) in `href` and `data-go`.
5. Run the checks (`cd tests && npm run unit`): they read every text, check `library.json` and `js/parts.js` against the files and name any mistake with its line number. Then look at it on the site (see *Checking a change*), commit and push (change the version if this is a new release).

When **editing** a text, only the file changes, unless a title or the number of lines changes (then update `content/library.json` too; the checks say so). Line ids follow the order of the lines, so a fix within a line keeps them; adding or removing a line renumbers the lines after it (a highlighted line saved on a phone may then point at its neighbour).

## How the scholarly English is made

When English style is set to *sukhakartā*, `js/text/iast.js` (function `IA`) rewrites each English line from the Marathi/Sanskrit line beside it (function `trSet`, which keeps both spellings so the switch is instant). The rules:

- Standard IAST letters: ā ī ū ṛ, ṭ ṭh ḍ ḍh ṇ, ś ṣ, ṅ ñ, ḷ for ळ, ḥ for the visarga, `'` for ऽ, om̐ for ॐ.
- The inherent "a" is always written (*jaya deva*, *suravaravandanā*), as in strict IAST.
- Anusvara (ं): before k/g it is ṅ, before c/j ñ, before ṭ/ḍ ṇ, before t/d/n n, before p/b/m m (*sarvāṅgī*, *sundara*, *vakratuṇḍa*, *lambodara*). Otherwise, and in Marathi plural endings and nasal vowels, it stays ṃ (*muktāphaḷāṃcī*, *sumanāṃcyā*, *kaiṃcā*). Chandrabindu (ँ) is m̐.
- Swara marks in the Atharvashirsha: ॒ (anudatta) becomes a line under the vowel, ॑ (svarita) a tick above, ᳚ a double tick, matching the group's printed śivāñjali booklet.
- Hindi nukta letters: ड़ ṛ, ढ़ ṛh.

To change a rule, edit `IA` in `js/text/iast.js` and check the Atharvashirsha and Ganapati Aarti against the printed booklet afterwards.

## Checking a change

The texts are the point of the site, so after any edit:

- Open the changed piece on the live site in Marathi, English and Both (Language under Aa in the bottom bar), and in both English styles (Settings).
- Check it on a phone and on a computer, and try **Print** if the layout changed.
- If a line or a mark looks wrong, compare it with the source booklet before changing anything.

For larger changes there is an automated test suite in `tests/` (see `tests/README.md`). It checks every line of text, search, 42 screenshots, layouts from a small phone to a wide monitor, the main interactions, accessibility, every print layout as a PDF, offline use, and how much work the page does on load. It runs by itself on GitHub for every pull request and every push to `main`, in Chromium, Firefox, Safari's engine and phone emulation. Merge a pull request only when its checks are green.

How the code fits together is in `ARCHITECTURE.md`.
