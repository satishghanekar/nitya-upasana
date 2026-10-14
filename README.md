# संकष्टी चतुर्थी / Sankashti Chaturthi

The texts our group recites at Sankashti Chaturthi puja: Pooja, Bhajans (coming soon) and Aarti, in Marathi with English transliteration.

**Live site:** https://sankashti-chaturthi.pages.dev

**Version:** 1.0 (shown as **v1.0** on the home card and as *Version 1.0* at the bottom of Settings)

## What the site does

Everything runs on the phone or computer. Nothing is sent anywhere, and the site works offline once opened.

- **Texts:** the Ganapati Atharvashirsha (with Vedic swara marks) and ten aartis, in Marathi, English, or both side by side (the अ/A button).
- **English style** (Settings): the everyday spelling (*Sukhkarta*) or the scholarly spelling, IAST (*sukhakartā*, *bha̱draṃ*). The scholarly lines are not typed. The script builds them from the Marathi/Sanskrit lines, along with the piece titles, the first time they are needed; switching style happens in place, without reloading (see *How the scholarly English is made*).
- **Menu language** (Settings): English (default) or मराठी for the date card, buttons and settings, independent of the text language.
- **Dhrupad:** shown once at the top or after every stanza (the धृ button); in "once" mode, ↻ ध्रुपद under a stanza shows it for a few seconds.
- **Ganesha:** the home card shows Ganesha (cut from the app icon, `ganesha.webp`) where ॐ used to be, and the home buttons (top bar, Contents, between Previous and Next) are a small line drawing of Ganesha.
- **Contents and piece folds:** a Contents button on the home page folds the list of pieces, and a round button in each piece's heading folds that piece to its heading; both are remembered on the phone, and going to a folded piece from Contents or search opens it (a reload keeps it folded). Printing always includes everything.
- **Pooja fold:** the पूजा heading in the reading page folds the Pooja section (Atharvashirsha) away for people who come only for the aartis; remembered on the phone, and opened again when someone goes to it from Contents, search, Previous or a link. Printing always includes it.
- **Aarti fold:** the आरती heading folds the whole Aarti section the same way, and going to an aarti opens it again. Folded single aartis line up as one tidy left-aligned row each (number and name, ⌄ on the right).
- **Next Sankashti card** (home page): a round button folds it to one line (Ganesha, next date, moonrise), hiding the buttons until it is opened; the phone remembers it, and on Sankashti day it opens by itself. today's date, the next Sankashti and its moonrise for the reader's location (worked out from a built-in list of cities and Columbus suburbs), a strip of past and future dates, an on-the-day countdown, and calendar buttons. The calendar event is the group's 7:00–8:30 pm program at Bharatiya Hindu Temple, Powell (within 120 km of it), with moonrise in the notes and a 2-hour reminder; "Add all upcoming dates to calendar" adds every coming date.
- **Share / QR / Print:** a ready reminder message for WhatsApp, a QR code of the site, and a printout or PDF (one column, two columns reading down each column, or Marathi and English side by side) in the chosen language and English style. The printed contents page lists the page each piece starts on, worked out for Letter paper in the US and Canada and A4 elsewhere, upright.
- **Saved for offline** (home card, under the buttons): "✓ Saved offline · v1.0 · Check for updates". Tapping it checks for a newer version and loads it, or shows "Up to date"; with no internet it turns amber.
- **Settings:** menu language, English style, text size, theme, high contrast and keep screen on, styled like phone settings (two cards, small sliding controls, switches).
- **Getting around:** the top bar shows the piece being read; Contents and search (forgiving spelling, matching words in bold, ↑ ↓ Enter on a computer); Previous/Next at the end of each piece; the phone's Back button closes menus and returns to where you were before a jump, and the address (#a5) follows the piece on screen.
- **Screen readers:** the page is marked as Marathi, and English parts as English, so VoiceOver and TalkBack read each in the right voice whatever the menu language.
- **Reading:** tap a line to highlight it, pinch or A−/A+ for text size (the home page keeps its normal size), themes (light, sepia, dark), high contrast, keep the screen on, and it reopens where you were reading (within 12 hours).
- **Help** (English): opened from the home page and from Settings. Update it when a feature changes (search for `id="help"`).

## What is in this repository

| File | What it is |
|---|---|
| `index.html` | The whole site: page text, styles (`<style>`) and script (`<script>`) in one file. |
| `sw.js` | The service worker. It keeps a copy of the site on each phone so it opens without internet. |
| `manifest.json` | Name, colours and icons used when someone adds the site to their home screen. |
| `icon-180.png`, `icon-192.png`, `icon-512.png`, `icon-maskable-192.png`, `icon-maskable-512.png`, `icon-32.png`, `apple-touch-icon.png`, `apple-touch-icon-precomposed.png` | App icons (Ganesha artwork): 180 for iPhone, 192/512 rounded tile, maskable versions with extra margin for Android, 32 for the browser tab. The two `apple-touch-icon` files are copies of `icon-180.png` at the site root, where iPhone also looks when it adds the site to the Home Screen. |
| `fonts/` | The four fonts, served from the site itself so nothing is fetched from Google and they work offline (see `fonts/README.md`). |

There is no build step. The files in this repository are exactly what the site serves.

## How publishing works

The site is hosted on **Cloudflare Pages**, connected to this repository. Every push (commit) to the `main` branch is published automatically, usually within a minute or two. Nothing else needs to be done.

To watch a publish: Cloudflare dashboard → **Workers & Pages** → **sankashti-chaturthi** → **Deployments**. The newest deployment should show *Success*.

## Making a change by hand

### Option A: on the GitHub website (no software needed)

1. Open https://github.com/satishghanekar/sankashti-chaturthi and click `index.html`.
2. Click the pencil icon (**Edit this file**).
3. Use the browser's find (Ctrl+F / ⌘F) to locate the text you want (see *Finding things in index.html* below), and make the change.
4. If this is a new release, **change the version** (see below). This is a second small edit, in `index.html` and in `sw.js`.
5. Click **Commit changes…**, write a short message (for example *Fix typo in Devi Aarti verse 2*), keep **Commit directly to the `main` branch** selected, and click **Commit changes**.
6. Wait a minute or two, then check the live site (see *After publishing*).

When you edit two files (`index.html` and `sw.js`) on the website, each one is its own commit. That is fine; Cloudflare simply publishes twice.

### Option B: on your computer with git

One-time setup:

```sh
git clone https://github.com/satishghanekar/sankashti-chaturthi.git
cd sankashti-chaturthi
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

Phones keep a saved copy of the site, but the page itself is always fetched fresh when there is internet, so a published change reaches phones the next time the site is opened online. **Check for updates** on the home card compares the page on the phone with the live one, so it finds changes even when the version stays the same.

The version is what the home card shows (v1.0). It appears in **two** places, and both must always be the **same**:

1. `sw.js`, near the top:
   ```js
   const V='aarti-v1.0';
   ```
2. `index.html`, near the end (search for `aarti-v`):
   ```js
   caches.open("aarti-v1.0")
   ```

Change it only for a new release, and change both together, using digits and dots only: `1.0` → `1.1` for new features, `2.0` for a redesign. Changing it also makes phones refresh the saved icons and fonts.

### After publishing

- Computer: open the site and reload (Ctrl+Shift+R / ⌘⇧R).
- Phone: open the site, wait a few seconds, then close it fully and open it again. The first open fetches the new version; the second shows it.

### Undoing a change

On GitHub, open **Commits** (the clock icon above the file list) and click the commit you want to undo: it shows exactly what changed, red for removed and green for added. Edit the file back the same way and commit again; it publishes like any other change. With git on a computer, `git revert <commit id>` followed by `git push` does the same in one step.

## Finding things in index.html

`index.html` is laid out top to bottom as:

1. `<head>`: title, and preloading of the main font files.
2. `<style>`: all styling, in labelled sections (`/* ==== … ==== */`), starting with the `@font-face` rules for `fonts/`.
3. `<body>`: the top bar, the settings panel, then the home page and every piece.
4. `<script>`: all behaviour, in labelled sections (`// ---- … ----`). The comment at the top of the script lists the sections in order.

Each piece is a `<section>` with an id. Search for the id to jump to it:

| Search for | Piece |
|---|---|
| `id="p1"` | Pooja 1. गणपत्यथर्वशीर्षोपनिषत् (Ganapati Atharvashirsha) |
| `id="a1"` | Aarti 1. गणपतीची आरती |
| `id="a2"` | Aarti 2. गणपतीची आरती (हिंदी) |
| `id="a3"` | Aarti 3. देवीची आरती |
| `id="a4"` | Aarti 4. शंकराची आरती |
| `id="a5"` | Aarti 5. दत्ताची आरती |
| `id="a6"` | Aarti 6. ज्ञानेश्वरांची आरती |
| `id="a7"` | Aarti 7. विठ्ठलाची आरती |
| `id="a8"` | Aarti 8. घालीन लोटांगण |
| `id="a9"` | Aarti 9. आरती जय गणेश देवा |
| `id="a10"` | Aarti 10. आरती जय जगदीश हरे |

Or search for a few words of the line itself.

### How a piece is written

```html
<section id="a1" class="ash">
  <header>
    <h2><span class="no"><span class="nm">१.</span><span class="ne">1.</span></span> <span class="mr">गणपतीची आरती</span><span class="en" lang="en">Ganapati Aarti</span></h2>
    <div class="tag"><span class="mr">मराठी</span><span class="en" lang="en">Marathi</span></div>
  </header>
  <div class="rftop">                     <!-- the dhrupad shown once at the top -->
    <div class="lab">…</div>
    <div class="verse">
      <div class="mr"> <p>…Marathi line…</p> … </div>
      <div class="en" lang="en"> <p>…English line…</p> … </div>
    </div>
  </div>
  <div class="items">
    <div class="item">                    <!-- one stanza -->
      <div class="verse">
        <div class="mr">
          <p data-l="s1l1">सुखकर्ता दुःखहर्ता, वार्ता विघ्नाची ।</p>
          …
        </div>
        <div class="en" lang="en">
          <p data-l="s1l1">Sukhkarta Dukhharta, Varta Vighnachi |</p>
          …
        </div>
      </div>
    </div>
    <div class="rmk">…↻ ध्रुपद…</div>      <!-- marker where the dhrupad is sung -->
    <div class="item rf">…</div>          <!-- the dhrupad repeated (shown when "after every stanza" is chosen) -->
    …
  </div>
  …
</section>
```

### Rules when editing text

- **One `<p>` per line.** The Marathi `<p>` lines and the English `<p>` lines of a stanza are paired by position: the 1st Marathi line goes with the 1st English line, and so on. Keep the same number of lines in both.
- **`data-l`** is the line's id (used by search and by tapping a line to highlight it). The Marathi and English versions of a line share the same id. A new line needs an id not used anywhere else on the page.
- **Stanza numbers (॥ १ ॥) are added automatically** at the end of each Aarti stanza. Do not type them. The Atharvashirsha keeps its own numbers, which are part of its text.
- **Piece numbers** (`<span class="nm">१.</span><span class="ne">1.</span>`) are typed in two places: the piece's `<h2>` and its line in the home-page contents (search for `class="toc"`). The left-hand menu and the search list build themselves from the home-page contents.
- **Vedic svara marks** (॑ ॒ ᳚) in the Atharvashirsha must be kept exactly. A mark that belongs with a visarga goes **after** the ः, otherwise it shows as a dotted circle.
- `<br>` inside a line forces a break at that point. An invisible zero-width space (written `&#8203;` if you need to type one) marks a place where a long line may break on a narrow phone. Put it after the space, e.g. `कर, &#8203;निढळावरी`, so the words keep their space when the line fits on one row. English lines need no marker: on a phone they break after a single `|` or a comma by themselves.
- Keep `&` written as `&amp;` and `<` as `&lt;` if they ever appear in text.
- **Only the Marathi/Sanskrit line and the everyday English line are typed.** The scholarly English (IAST) is made from the Marathi line, so a spelling fix in Marathi fixes the scholarly English too. If the everyday English should change as well, edit it by hand.

## How the scholarly English is made

When English style is set to *sukhakartā*, the script (section `// ---- IAST transliteration ----`, function `IA`) rewrites each English line from the Marathi/Sanskrit line beside it (function `trSet`, which keeps both spellings so the switch is instant). The rules:

- Standard IAST letters: ā ī ū ṛ, ṭ ṭh ḍ ḍh ṇ, ś ṣ, ṅ ñ, ḷ for ळ, ḥ for the visarga, `'` for ऽ, om̐ for ॐ.
- The inherent "a" is always written (*jaya deva*, *suravaravandanā*), as in strict IAST.
- Anusvara (ं): before k/g it is ṅ, before c/j ñ, before ṭ/ḍ ṇ, before t/d/n n, before p/b/m m (*sarvāṅgī*, *sundara*, *vakratuṇḍa*, *lambodara*). Otherwise, and in Marathi plural endings and nasal vowels, it stays ṃ (*muktāphaḷāṃcī*, *sumanāṃcyā*, *kaiṃcā*). Chandrabindu (ँ) is m̐.
- Swara marks in the Atharvashirsha: ॒ (anudatta) becomes a line under the vowel, ॑ (svarita) a tick above, ᳚ a double tick, matching the group's printed śivāñjali booklet.
- Hindi nukta letters: ड़ ṛ, ढ़ ṛh.

To change a rule, edit `IA` and check the Atharvashirsha and Ganapati Aarti against the printed booklet afterwards.

### Adding a new Aarti

1. Copy a whole `<section id="…" class="ash"> … </section>` block of a similar piece and paste it where the new one should appear.
2. Give it a new `id` (for example `a11`), the next number in its `<h2>`, its title in both languages, and the language tag.
3. Replace the lines, giving every new line a new `data-l` id (for example `s11l1`, `s11l2`, …).
4. Fix the *Previous / Next* links (`<nav class="pn">`) of the new piece and of its neighbours.
5. Add a line for it in the home-page contents (`<ol class="toc">` under आरती).
6. Commit and push (change the version if this is a new release).

## Checking a change

The texts are the point of the site, so after any edit:

- Open the changed piece on the live site in Marathi, English and Both (the language button in the top bar), and in both English styles (Settings).
- Check it on a phone and on a computer, and try **Print** if the layout changed.
- If a line or a mark looks wrong, compare it with the source booklet before changing anything.
