# नित्य उपासना / Nitya Upasana

A small web app for daily upasana (worship): Vedic chants, aartis and ashtaks in Marathi, Hindi and Sanskrit, with English transliteration, and a Home page that shows what to chant now from each person's own routine.

**Live site:** https://nitya-upasana.pages.dev

Everything runs on the phone or computer. Nothing is sent anywhere, there is no account or server, and the site works offline once opened. It can be added to a phone's Home Screen and then opens like an app.

## What the site does

What a reader sees and can do is described in the site's own **Help** (⋯ More → Help, or Settings → About). Its text is in `index.html`, in the `<template id="hlpc">`; keep it up to date with every change a reader can see. In short:

- **Home** is what to chant now: the picture for the time of day (sunrise, midday, sunset) with the weekday's star ringed, today's date, the Vedic calendar line, and a Morning / Afternoon / Evening switch that opens at the session for the time now (Morning before 12:00, Afternoon 12:00 to 17:00, Evening from 17:00). The session's texts come from the reading person's routine for today's weekday. A title starts the session there: its texts follow one another in one scroll, in session order, and ‹ Prev and Next › jump between them and never leave the session. A festival day or a Sankashti day adds one line (with tonight's moonrise on a Sankashti). On wide screens (from 1024px) Home's column stays on the left while a text is read on the right.
- **Library** (the open-book button): every text by category (Vedic Chant, Aarti, Ashtak, and any the family adds), numbered from 1 in each, with search across every title and line. Categories can be added, renamed and texts moved on each phone. When the site has PDFs, a **Books** (पोथी) tab beside **Chants** (पाठ) lists them under the same categories; each opens in the phone's own PDF viewer and is kept for offline use once opened.
- **Reading:** a session in one scroll, or one text at a time from the Library or search, in the main language, the second language or both; everyday English (*Sukhkarta*) or scholarly IAST (*sukhakartā*, with the Vedic swara marks); Marathi letters or the same words in Kannada letters; four text fonts, text size, themes and high contrast; dhrupad once or after every verse. The Vedic chants run on as paragraphs in one language. The bottom bar has ‹ Prev, Home, Library, Print, Reading (Aa) and Next ›; Print prints the session being read, else the text.
- **Vedic calendar** (panchang): tithi, nakshatra, yoga, sunrise, sunset, moonrise, month and samvatsara for the reader's place, a month view, 31 festivals (Maharashtrian festivals and the days of Shri Gondavalekar Maharaj, Shri Swami Samarth and Shri Nana Maharaj Taranekar), and the public holidays of the US, India, Maharashtra and Karnataka, all worked out on the phone.
- **Routine builder:** each person's texts for each session, the same every day or by weekday. A new person follows `content/routines.json`, a starting routine that each person changes for themselves.
- **People on one phone:** up to eight profiles, each with their own settings and routine, and `.nitya` backup files to save and restore them.
- **Print:** a print builder (what to print, then how: language, dhrupad, page, font, paper, with a preview of the first page) that makes a printout or PDF of any texts, a session, a person's routine (the whole week or one day) or the whole Library. Every text starts on a new page, with a list of contents when more than one text is printed. A routine prints each text once, in routine order, with a week-at-a-glance page and a tag on each text saying when it is said ("Daily · Morning, Evening").
- **Share** (a ready message with the link and the next Sankashti), a **QR** code of the site, and **Add to Home Screen** help for every phone and browser.

## What is in this repository

There is no build step. The files in this repository are exactly what the site serves.

| File or folder | What it is |
|---|---|
| `index.html` | The page: the top bar, Settings, Home, the Library, the dialogs and Help. |
| `content/texts/` | The texts, one plain-text file each (`aarti-sukhkarta.txt`, …). **Edit the texts here** (see *How to add a text*). |
| `content/library.json` | The list of texts in reading order within each category, with the few words the app adds (language names, the dhrupad label, Kannada Wikipedia links). |
| `content/categories.json` | The built-in categories and their order: Vedic Chant, Aarti, Stotra, Ashtak. A category with no texts is not shown. |
| `content/pdfs.json`, `content/pdfs/` | The Library's PDFs: the files in `content/pdfs/`, listed by category with their titles in `content/pdfs.json` (see `content/pdfs/README.md` for how to add one). |
| `content/routines.json` | The default routine: the texts for each session (`morning`, `afternoon`, `evening`), the same every day (`"mode": "fixed"`) or per weekday (`"mode": "weekday"`). Ids are those in `library.json`. |
| `content/festivals.json` | The festivals the Vedic calendar marks, each with its names and the rule that finds its day. |
| `content/holidays.json` | The public holidays it marks (US, India, Maharashtra, Karnataka): a date, the nth weekday of a month, days from Easter, or a tithi. |
| `css/` | The styles, in numbered files loaded in order (see `css/README.md`). |
| `js/` | The behaviour, one file per topic (see `js/README.md`). `js/parts.js` lists every file the site is made of. |
| `sw.js` | The service worker: keeps a copy of the site on each phone so it opens without internet. |
| `fonts/` | The fonts, served from the site itself (see `fonts/README.md`). |
| `picture-sunrise.webp`, `picture-midday.webp`, `picture-sunset.webp` and their `-360` versions | The app's picture for each time of day: 360px for Home, 940px for the full-screen view. |
| `icon-*.png`, `apple-touch-icon*.png`, `favicon-midday-32.png`, `favicon-sunset-32.png` | The app icon (the sunrise picture; phones copy it when the app is installed, so it does not change with the time of day) and the browser tab icons for the afternoon and evening. |
| `share.jpg` | The picture shown in link previews (WhatsApp and others). |
| `originals/` | The pictures exactly as Satish supplied them. Not loaded by the site; the site's pictures are cut from them. |
| `manifest.json` | Name, colours and icons used when the site is added to a Home Screen. |
| `_headers` | How long phones may keep each kind of file before asking again (read by Cloudflare Pages). |
| `tests/` | The automated tests (see `tests/README.md`). Not part of the site. |
| `.github/workflows/` | The test run on every pull request and push to `main`, and the job that refreshes its screenshots. |
| `ARCHITECTURE.md` | How the page, styles and scripts fit together, for anyone changing the code. |

## How publishing works

The site is hosted on **Cloudflare Pages** (project *nitya-upasana*), connected to this repository. Every push to `main` is published automatically, usually within a minute or two. To watch a publish: Cloudflare dashboard → **Workers & Pages** → **nitya-upasana** → **Deployments**. A pull request also gets its own preview address there.

Because every merge goes live, changes are made on a branch, checked (see *Checking a change*) and merged by pull request.

### The version

The version is what Settings → About shows. It is written in **two** places, which must always be the same (here as an example):

1. `sw.js`, near the top: `const V='aarti-v1.22';`
2. `index.html`, near the top: `<meta name="version" content="aarti-v1.22">`

Change both together for every release, digits and dots only: the last number for fixes (`1.22` → `1.22.1`), the middle one for new features (`1.23`). `tests/offline.spec.mjs` fails if the two differ.

Phones keep a saved copy of the site, but the page and its style, script and text files are fetched fresh whenever there is internet, so a published change reaches phones the next time the site is opened online. Changing the version also makes phones refresh the saved icons and fonts. A tap on the version line in Settings → About checks for updates straight away.

### After publishing

- Computer: open the site and reload (Ctrl+Shift+R / ⌘⇧R).
- Phone: open the site, wait a few seconds, then close it fully and open it again. The first open fetches the new version; the second shows it.

### Making a small change by hand

On the GitHub website: open the file (a text in `content/texts/`, or `index.html`), click the pencil icon, make the change, and choose **Create a new branch** and **Propose changes** to open a pull request. With git on a computer:

```sh
git clone https://github.com/satishghanekar/nitya-upasana.git
cd nitya-upasana
git switch -c my-change
# edit the files in a plain-text editor that saves UTF-8 (VS Code, Sublime Text, TextEdit in plain-text mode)
python3 -m http.server 8000   # optional: preview at http://localhost:8000
git commit -am "Describe the change"
git push -u origin my-change   # then open a pull request on GitHub
```

Never use a word processor or an editor that "fixes" spelling or Unicode: the texts are kept exactly as typed, svara marks and all. To undo a published change, revert its commit (on GitHub, or `git revert <commit>`) and merge that like any other change.

## How to add a text

A text is one plain-text file in `content/texts/`, named after its id, which starts with its category (`aarti-sukhkarta.txt`, `vedic-chant-shree-rudra.txt`). The easiest start is a copy of a similar text.

### The file

```
id: aarti-sukhkarta
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
| `id` | Required. Lower case and hyphens, starting with its category (`aarti-`, `ashtak-`, `vedic-chant-`), the same as the file name. A link to the text is `#<id>`. |
| `title`, `title-en` | Required. The title in the original language and in English. |
| `category` | Required. One of the ids in `content/categories.json`: `vedic-chant`, `aarti`, `stotra`, `ashtak`. |
| `language` | Required. `mr` (Marathi), `hi` (Hindi) or `sa` (Sanskrit). The page shows the language name from `content/library.json`. |
| `legacy-id` | Only the first eleven texts have one (`a1`, `p1`, …): their id on the page and in old links. New texts leave it out. |
| `line-ids` | What each line's id starts with, for the same eleven texts (`s1l`: the lines are `s1l1`, `s1l2`, …). Without it, the `id` and a dot (`ashtak-monday.1`). |
| `line-id-exceptions` | Only the Vitthal Aarti, whose 4th line has always been `s7l4r`: `s7l4=s7l4r`. |
| `refrain` | `every-verse`: the `[dhrupad]` is shown once at the top, and after every stanza the app adds the "↻ ध्रुपद" note and the dhrupad again (when the reader picks "after every verse"; with "once", a tap on the note shows the dhrupad). Every aarti and ashtak with a dhrupad uses it. `always`: the refrain lines are written inside the stanzas and always shown (no text uses it now). Leave it out for none. |
| `refrain-before-first` | `yes` when the dhrupad is also sung before the first stanza (Vitthal Aarti, Jai Ganesh Deva). |
| `stanza-numbers` | `as-written`: the stanza numbers (॥ १ ॥) are typed in the text and the app adds none (ashtaks whose numbers restart, or are written differently in English). |
| `layout` | `prose`: a Vedic chant (Shree Rudra, the Atharvashirsha, the Purusha Suktam). In one language it runs on as paragraphs, on screen and in print, and the Best print font uses Tiro Devanagari Sanskrit for it. |
| `credit`, `credit-en` | The author or source line in each language. `[name](address)` becomes a link that opens in a new tab. |
| `credit-note`, `credit-note-en` | A second, smaller author line (Vitthal Aarti: "also credited to Sant Namdev"). |

**The blocks**, after `---`, separated by one blank line. Each starts with its name in brackets, then its lines, **always in pairs: the original line, then its everyday English line**. An English line where the original belongs (or the other way round) stops the text from loading, and the checks name the file and line.

| Block | |
|---|---|
| `[1]`, `[2]`, … | A stanza, numbered in order. The app adds ॥ १ ॥ at its end (after its last line that is not a refrain line); do not type it. In a `layout: prose` text the numbers are part of the text, and the blocks are simply counted. |
| `[para 3]` | A stanza that starts a new paragraph in a `layout: prose` text. |
| `[dhrupad]` | With `refrain: every-verse`: the dhrupad, first in the file (only `[once]` lines and `[note]`s may come before it). Otherwise: lines said once, where they stand (in a Vedic chant, the opening and closing peace chants). |
| `[once]` | With `refrain: every-verse`: lines said once, where they stand, with no dhrupad after them: an invocation before the dhrupad (Aarti Belaguve's ॥ श्रीराम समर्थ ॥, shown above it) or a closing line (Nana Maharaj's aarti). In other texts, use `[dhrupad]` for this. |
| `[dhrupad bold]` | The same, shown in bold (Ghalin Lotangan's closing mantra). |
| `[dhrupad repeated]` | Right after `[dhrupad]`, only when the repeats are written differently from the top (the Vitthal Aarti). |
| `[refrain]` | Inside a block: the lines after it are refrain lines (shown as the refrain, or hidden with the dhrupad set to once). |
| `[note: ↻ ३ वेळा \| 3 times]` | A small note between blocks, in both languages, always shown (whatever the dhrupad setting). One that starts with ↻ is about the lines before it ("repeat 3 times") and prints with them; any other note (`[note: फलश्रुति \| Phalashruti]`) is a heading for what follows and prints with it. Only a note that starts with ↻ shows the ↻ in English too. |

**Inside a line:**

- `¦` marks a place where a long line may break on a narrow phone (it shows as nothing). Put it after the space: `निढळावरी कर, ¦निढळावरी कर`. English lines need none: on a phone they break after a single `|` or a comma by themselves.
- ` // ` (a space, two slashes, a space) always breaks the line there. The spaces belong to the mark: `|  // ` (two spaces) keeps one real space before the break.
- **Verse numbers typed in a line** (`॥ १० ॥` in the original, `|| 10 ||` in English) must be the same number in both; the checks name any line where they differ.
- **Vedic svara marks** (॑ ॒ ᳚) must be kept exactly. A mark that belongs with a visarga goes **after** the ः, otherwise it shows as a dotted circle.
- **Only the original line and the everyday English line are typed.** The scholarly English (IAST) is made from the original line, so a spelling fix there fixes the scholarly English too.

### Adding it to the site

1. Write the file in `content/texts/`.
2. In `content/library.json`, add it to `"texts"` (its `id`, `file`, `title`, `titleEn`, `category`, `language` and `lines`, the number of line pairs in the file) at the place in its category where it should appear. Its number in the Library and Previous / Next come from that order.
3. In `js/parts.js`, add `texts/<id>.txt` to the `content` list, so the text is kept for offline use.
4. To put it in the default routine, add its id to `content/routines.json`.
5. Run the checks (`cd tests && npm run unit`): they read every text, check `library.json` and `js/parts.js` against the files and name any mistake with its line number.

Nothing in the print code names a text: a new text prints by the rules in `ARCHITECTURE.md` ("The rules every printout follows") as soon as its file exists: stanzas are never split between pages, the dhrupad follows the printout's choice, an aarti or ashtak is centred, a Vedic chant (`layout: prose`) runs on as paragraphs, and with both languages each line sits beside its English.

When **editing** a text, only the file changes, unless a title or the number of lines changes (then update `content/library.json` too; the checks say so). Line ids follow the order of the lines, so a fix within a line keeps them; adding or removing a line renumbers the lines after it (a highlighted line saved on a phone may then point at its neighbour).

## How the scholarly English is made

When the English spelling is *sukhakartā*, `js/text/iast.js` writes each English line from the original line beside it, along with the titles, the first time they are needed; switching spelling happens in place. The rules:

- Standard IAST letters: ā ī ū ṛ, ṭ ṭh ḍ ḍh ṇ, ś ṣ, ṅ ñ, ḷ for ळ, ḥ for the visarga, `'` for ऽ, om̐ for ॐ.
- The inherent "a" is always written (*jaya deva*, *suravaravandanā*), as in strict IAST.
- Anusvara (ं): before k/g it is ṅ, before c/j ñ, before ṭ/ḍ ṇ, before t/d/n n, before p/b/m m (*sarvāṅgī*, *sundara*, *vakratuṇḍa*, *lambodara*). Otherwise, and in Marathi plural endings and nasal vowels, it stays ṃ (*muktāphaḷāṃcī*, *sumanāṃcyā*, *kaiṃcā*). Chandrabindu (ँ) is m̐.
- Swara marks in the Vedic chants: ॒ (anudatta) becomes a line under the vowel, ॑ (svarita) a tick above, ᳚ a double tick, matching the group's printed śivāñjali booklet.
- Hindi nukta letters: ड़ ṛ, ढ़ ṛh.

To change a rule, edit `js/text/iast.js`; `tests/unit/iast.test.mjs` checks the reference lines.

## Checking a change

The texts are the point of the site, so after any edit:

- Open the changed text in Marathi, English and Both (Language under Aa in the bottom bar), and in both English spellings (Settings).
- Check it on a phone and on a computer, and try **Print** if the layout changed.
- If a line or a mark looks wrong, compare it with the source booklet before changing anything.

The automated tests in `tests/` check every line of every text, every text's printout, search, screenshots, layouts from a small phone to a large monitor, the main interactions, accessibility, offline use and how much work the page does on load. `tests/README.md` says how to run them; `tests/MANUAL.md` is the short checklist for real phones and screen readers.
