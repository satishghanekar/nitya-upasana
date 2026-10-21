# v2 decision log

Newest first. Each entry: the decision, who made it, and where it came from.

## 2026-10-20: Home v3, option A (session switch, More, no full list on Home)

Satish picked option A of the Home v3 mockup (`mockups/home-v3.html` on `mockup-home-v3`, frames 1–5; picture
`home-v3.png`) on 2026-10-20. He had asked: "The share, qr, print, help can be made collapsable. The table of contents
from main page need to be dynamic just show stuff that is relevant to that day and session. With ability to quickly
switch between morning, afternoon and evening. If there is no content for a session you can grey that out." Version
aarti-v1.13.

- **Morning | Afternoon | Evening**, a segmented switch right above the list, replaces "Not this time?". It opens at
  the session for the time now; a tap shows that session's texts for today in place (the reading person's routine for
  today's weekday), with its heading, "N of M done", Edit and Start / Continue. Tabs (`role="tablist"`): arrow keys,
  Home and End move between them, Enter or Space picks (as in the mockup). A pick lasts until the next day; picking the
  clock's session follows the clock again.
- **A session with nothing set today is greyed**: dashed edge, muted words, "Nothing set" ("काहीच नाही") under its
  name. It stays focusable (`aria-disabled="true"`); picking it shows the empty state with Add texts. The clock's
  session stays picked when it is empty (frame 3). Muted on the switch is 5.5:1 (light), 6.8:1 (dark), 4.8:1 (sepia).
- **More** ("आणखी") folds App / Share / QR / Print / Help into one disclosure button (`aria-expanded`,
  `aria-controls="shr"`), closed by default, with "App · Share · QR · Print · Help" as its hint. The five buttons are
  the same ones, and work as before.
- **"Another text? Open the Library"** ("दुसरी रचना? संग्रह उघडा", संग्रह being the Library's Marathi name in the app)
  after More opens the Library as the top bar's book button does.
- **The full list of every text is gone from Home.** That list was the reading page itself: every piece, in its
  पूजा / आरती groups, sits right under Home in one long page, and reading a text is scrolling to it. So nothing was
  deleted. `data-hv` on `<html>` ("Home on its own", `homeView()` in `js/features/history.js`) hides the pieces
  under Home on screen only (`css/10-today.css`); going to a piece (the list, Start, the Library, search, the side
  menu, ‹ Prev / Next ›, Back to a piece's address, a link such as `#a5`, the reading position kept for 12 hours)
  takes it off first, and the text is fitted to the screen again then. The Home buttons, the end of a session and Back
  to the bare address put it back. Scrolling up from a piece back to
  Home (once the session switch is on screen) or picking a session puts it back too, so Home never shows the whole
  Library below it, even with nothing planned (v1.13.2).
  Reading a session (Start, or a text of its list) shows only that session's texts on the reading page, without the
  पूजा / आरती rows (`data-run`, v1.13.3); going to a text from the Library, search or the side menu shows every piece. Print copies the pieces with
  `data-hv` off, so printing everything works from Home as before; search and the Library read the page as before.
- The picture beside the date still follows the session picked (as in Home v2); the mockup kept the clock's picture.

## 2026-10-19: routine builder (design A, "List per day")

Satish chose design A, "List per day" (`mockups/builder-a.html` on `mockup-home-v2`; picture `builder.png`, panels "A · List with move buttons", "A · dark theme" and "A · with the Add texts picker beside it"), on 2026-10-19. Built to fit today's app (the Home redesign came after the mockup): a page like the Library and the Vedic calendar, under the top bar with Back. Version aarti-v1.9 (merged after the Library by category, which took 1.8).

- **Way in:** "Edit" (Marathi menus "बदला") beside the session's heading on Home, "Add texts" in an empty session (which also opens the picker), and Settings → Profiles and backup → **Routine**. It opens for the person reading ("Aai's routine" / "दिनक्रम: आई"), at the session Home shows and today's weekday.
- **The page:** Morning / Afternoon / Evening; "Same every day" or "Different by weekday"; with weekdays a row Monday … Sunday (this week's dates, today underlined) and "Copy to other days…" (tick the days, Copy). The list has ↑ ↓ ✕ (44px), Alt+↑/↓ and Delete on a text's buttons, and drag by the grip (pointer events, so touch works on iPhone); every change is read out ("घालीन लोटांगण moved to 3 of 5") and shown in a line under the list. Changes are kept at once; there is no Save button.
- **Add texts** (`js/features/text-picker.js`): every text in `content/library.json`, with search (Marathi or English letters, accents ignored) and a checkbox each; ticking adds at the end, unticking removes. Beside the list from 1100px; on phones and tablets a sheet from the bottom (Done, Escape, the phone's Back or a tap outside closes it). Its own file so the Library's categories can become filters later; each row already shows its category.
- **Data:** each profile has `routine`, in the shape of `content/routines.json`; `null` means "never changed" and follows `content/routines.json` (decision 5 of the architecture plan): a new person starts from it, and a person who never edited gets a changed default after an update. The first edit copies the default into the profile. Backups carry each person's routine; a backup from before 1.9 restores everyone on the default. Switching "Different by weekday" back to "Same every day" keeps the day shown's list for every day (the weekday lists come back if switched again before leaving the page).
- **Home** uses the reading person's routine for today's weekday and the session; a text taken out of a session loses its tick for today (the others keep theirs). An empty session says "Nothing is planned for afternoon yet." with Add texts.
- **Names** follow the reading languages as the Vedic calendar's do: the first language large, the second under it; English first gives the English titles. Home's own list is unchanged (Marathi title with the English under it).

Open for Satish: whether a person who never edited should keep following `content/routines.json` when it changes (as built), or get a frozen copy when the person is made; whether "Same every day" after "Different by weekday" should ask first (as built it keeps the day shown's list and says so); the Marathi words (बदला, दिनक्रम: …, रोज तेच / वारानुसार वेगळे, इतर वारांना हीच यादी…, रचना जोडा); whether Home's list should also follow the reading languages.

## 2026-10-19: slice 3, the Library by category

Satish said go ahead (2026-10-19) on finishing slice 3 on the new Library page. It was begun on the old home page
(WIP commit 58ccc19 on `slice-3-library`); the category model (`js/core/library.js`), the search rules
(`js/text/search-core.js`), the store and backup parts and the categories sheet are reused from it, re-pointed from the
old home list to the Library (`#jump`). Version aarti-v1.8.

- **The Library lists the texts by category** (`content/categories.json`: वैदिक मंत्र / Vedic Chant, आरती / Aarti,
  स्तोत्र / Stotra, अष्टक / Ashtak, in that order, then the family's own), in place of पूजा / आरती. The reading page
  keeps its groups (पूजा, आरती), and so does the printout's contents page, which now follows the reading page rather
  than the Library's list. The side menu on wide screens follows the Library's categories.
- **"Edit categories" ("विभाग बदला")** at the end of the list opens the categories sheet over the Library: add a
  category (Marathi name, English name, or one of them for both; up to 20), rename any (a built-in one only on this
  phone, with "Use the original name" to undo), delete one the family added (its texts go back to their own
  categories; built-in ones can't be deleted), and choose each text's category. Kept per phone for everyone on it
  (IndexedDB `meta.library`) and in backup files (`payload.library`); a backup from 1.7 or before leaves the
  categories alone. The texts are never changed.
- **Search** covers the whole library: texts by title (Marathi, English, scholarly spelling), id, first line and
  category, listed first under "Texts" ("रचना"), then lines under "Lines" ("ओळी"); loose spellings, one typo per four
  letters, Devanagari typed found through its English letters.
- **Languages:** the sheet's words follow the menu language; category and text names in the sheet follow the reading
  languages as the Vedic calendar's do (first language, the second as a small line under a category's name); the list
  and search results follow the language shown on the reading page, like every title there, with English first when
  English is the first language. English category names stay plain English (they are English words, not
  transliterations), also with the scholarly spelling.
- **Defaults for the open questions** (Claude's, for Satish to confirm or change):
  1. A category with no texts is **hidden from the Library's list** but **shown in the sheet** ("No texts yet (not shown
     in the Library)"), so it can be filled.
  2. Texts **keep their reading-page numbers** in the Library (आरती ५ stays ५ in whichever category it is listed).
     *Changed 2026-10-21 (v1.18): each category is numbered from 1; see below.*
  3. Marathi wording: **रचना** for a text, **विभाग** for a category, the search box says **"रचना किंवा ओळ शोधा"**
     (English: "Find a text or a line").
- **Back:** the sheet has its own Back step over the Library's, so the phone's Back (or ✕, Escape, a tap outside)
  closes the sheet and leaves the Library open; focus returns to "Edit categories".

## 2026-10-19: festival days in the Vedic calendar

Satish said yes (2026-10-19) to marking festivals such as दसरा, the open question in the entry below. Version aarti-v1.7.

- **What shows:** on the day in the month grid, the festival's short name (bolder than the Ekadashi / Sankashti marks; it stands in for "एकादशी" on आषाढी and कार्तिकी एकादशी); in the day card a tag and a row "सण" with the full name (and the English name in English menus); on Home, on the day only, one line under the calendar line: "आज दसरा" (Marathi menus) / "Today: दसरा · Dasara (Vijayadashami)" (Marathi first, English second, English menus); like the panchang's names they follow the reading languages (the entry below): English only gives "Today: Dasara (Vijayadashami)" and "Dasara" in the month, Marathi only "आज दसरा". The English names are plain, in the same style as the months (Shravan, Bhadrapad, Kartik).
- **The list** is data, `content/festivals.json` (kept for offline use; fetched with the routine by `js/text/load.js`), each with Marathi and English names, a short label (both languages) and a rule. The rules are applied on the phone by `js/core/festivals.js` (pure, `tests/unit/festivals.test.mjs`):

| Festival | Month (amanta) · tithi | Decided by |
|---|---|---|
| मकर संक्रांत Makar Sankranti | sun enters sidereal Makara (Lahiri) | the day from the previous sunset to this sunset in which it happens |
| महाशिवरात्री Maha Shivratri | Magh krishna 14 | nishita (midnight), first |
| होळी Holi | Phalgun purnima | pradosh, second |
| गुढीपाडवा Gudi Padwa | Chaitra shukla 1 | sunrise |
| श्रीराम नवमी Ram Navami | Chaitra shukla 9 | madhyahna, second |
| हनुमान जयंती Hanuman Jayanti | Chaitra purnima | sunrise |
| अक्षय्य तृतीया Akshaya Tritiya | Vaishakh shukla 3 | sunrise |
| वटपौर्णिमा Vat Purnima | Jyeshtha purnima | madhyahna, first |
| आषाढी एकादशी Ashadhi Ekadashi | Ashadh shukla 11 | sunrise (Smarta: first of two) |
| गुरुपौर्णिमा Guru Purnima | Ashadh purnima | sunrise |
| नागपंचमी Nag Panchami | Shravan shukla 5 | sunrise |
| नारळी पौर्णिमा · रक्षाबंधन | Shravan purnima | sunrise |
| गोकुळाष्टमी Gokulashtami | Shravan krishna 8 | nishita, first |
| श्री गणेश चतुर्थी Ganesh Chaturthi | Bhadrapad shukla 4 | madhyahna, first |
| अनंत चतुर्दशी Anant Chaturdashi | Bhadrapad shukla 14 | sunrise |
| घटस्थापना Ghatasthapana | Ashvin shukla 1 | sunrise |
| दसरा Dasara | Ashvin shukla 10 | aparahna, first |
| कोजागिरी पौर्णिमा Kojagiri | Ashvin purnima | nishita, first |
| नरक चतुर्दशी Narak Chaturdashi | Ashvin krishna 14 | moonrise (before dawn), first |
| लक्ष्मीपूजन Lakshmi Pujan | Ashvin amavasya | pradosh, second |
| बलिप्रतिपदा (दिवाळी पाडवा) Bali Pratipada | Kartik shukla 1 | sunrise |
| भाऊबीज Bhaubeej | Kartik shukla 2 | aparahna, second |
| कार्तिकी एकादशी Kartiki Ekadashi | Kartik shukla 11 | sunrise (Smarta: first of two) |
| त्रिपुरारी पौर्णिमा Tripurari Purnima | Kartik purnima | pradosh, first |
| दत्त जयंती Datta Jayanti | Margashirsha purnima | pradosh, first |

- **The rules** (as Kalnirnay / Drik apply dharmashastra): the festival's tithi in its **nija** month (never an adhika month: Vat Purnima 2026 is in nija Jyeshtha, 29 June); the day is the one on which that tithi is current at the festival's part of the day — sunrise; madhyahna / aparahna, the 3rd / 4th fifth of daylight; pradosh, the first fifth of the night; nishita, the 8th of the night's 15 muhurtas; moonrise. When that is so on two days, or on none (vriddhi / kshaya at that time), the rule's "first" or "second" day is taken; on none, only among the days the tithi is current in daylight. A kshaya tithi at sunrise is kept on the day it falls in (Gudi Padwa 2026, 19 March). Not considered: nakshatra (Shravana for Dasara, Rohini for Janmashtami), bhadra (Holi, Raksha Bandhan), Vaishnava ekadashi, and Dharmasindhu's special cases for Lakshmi Pujan (2025: the app gives 20 October, Kalnirnay printed 21), so a printed calendar can differ in such years.
- **Checked:** 2026 Pune against the printed dates (Gudi Padwa 19 Mar, Ram Navami 26 Mar, Ganesh Chaturthi 14 Sep, Dasara 20 Oct, Lakshmi Pujan 8 Nov, Bali Pratipada 10 Nov, Bhaubeej 11 Nov and more), the tie rules against 2024 (Ram Navami 17 Apr, Vat Purnima 21 Jun, Lakshmi Pujan 1 Nov). **In America** the same rules at the local sunrise, midday and midnight put some festivals a day earlier than in India (2026 Columbus: Narak Chaturdashi 7 Nov, Bali Pratipada 9 Nov, Bhaubeej 10 Nov, Gokulashtami 3 Sep, …); a day's difference from India is expected there. Dasara is 20 October in both.
- Less certain for 2026 Pune (not in the tests): Holi 2 March (purnima at dusk only on the 2nd, but bhadra then and a lunar eclipse on the 3rd; a printed calendar may say 3 March) and Akshaya Tritiya 20 April (tritiya at sunrise for 1¼ hours; Drik may give 19 April).

## 2026-10-19: the Vedic calendar follows the reading languages

Satish (2026-10-19): "The Vedic calendar when English is set as 1st language and none for 2nd language shows in marathi". Version aarti-v1.6.1 (a patch, so phones fetch it). This replaces the "Words" choice of the entry below.

- **The panchang's names follow Settings → Languages**, as the pieces do: tithi, paksha, masa, nakshatra, yoga, samvatsara, ritu, ayana, the weekday headers, the day card's labels, the Ekadashi / Sankashti / Purnima / Amavasya marks and the next-Sankashti name. The **first language** is used everywhere (Home line, day card, month); the **second** is the small line under each of the day card's rows ("शुद्ध अष्टमी" / "Shukla Ashtami · until Mon 1:21 am"). The Home line and the month's days show the first language only (no room for two).
- English first, no second: all English, Latin digits ("Ashvin Shukla Ashtami", "Nakshatra Uttara Ashadha · Shaka 1948 · Parabhava", Sun…Sat). Marathi first, no second: Marathi names with no English line (before, English menus added English glosses). Kannada letters: the Marathi names in Kannada script, as before. Scholarly English (IAST): the names are worked out from their Marathi by `js/text/iast.js` ("Āśvina Śukla Aṣṭamī"), with śukla / kṛṣṇa for the paksha.
- **The words around the names** (times, dates, "until", the key, the footnote, the screen-reader text of each day) still follow the menu language, with Devanagari digits in Marathi menus. English first always has English menus (Settings), so the two never disagree that way; with Marathi first and English menus, the names are Marathi and the words English.
- **Spellings:** the months in plain English are spelled as said in Marathi (Shravan, Bhadrapad, Ashvin, Kartik, Magh …; were Shravana, Bhadrapada, Kartika, Magha). Long English names in the month's days break at a soft hyphen ("Chatur-dashi") and are a step smaller on phones.

## 2026-10-19: Vedic calendar (panchang) on Home and its own page

Built from the approved mockups (`mockups/home-v2-a.html`, the line on Home; `mockups/vedic-calendar.html`, the page; branch `mockup-home-v2`). Version aarti-v1.6.

- **On-device only.** Everything is worked out on the phone by `js/core/panchang.js` (from the Meeus sun and moon in `js/features/astronomy.js`); nothing is fetched or sent, and it works offline. Checked against the Swiss Ephemeris 2020–2032 (`tests/unit/panchang.test.mjs`): sunrise and sunset within 0.2 minute, tithi end times within 1.5 minutes, moonrise within 0.5 minute.
- **Convention: Kalnirnay / Drik Panchang.** Sidereal positions with the **Lahiri** (Chitrapaksha) ayanamsha; **amanta** months (new moon to new moon, adhika when no sankranti falls in it); a day's tithi, nakshatra, yoga and month are those at that day's **sunrise** at the place. A tithi that begins and ends between two sunrises is kshaya (shown as "+ name" in its day), one at two sunrises is vriddhi; a tithi boundary within 5 minutes of sunrise gets a note that a printed calendar may differ.
- **Moonrise fix, chosen by Satish (2026-10-18):** moonrise is the moon's centre at +0.125° (upper limb on the horizon with refraction, semidiameter and parallax) with the moon taken at UT + ΔT. The Sankashti moonrise for 28 October 2026 in Columbus moves from 8:16 pm to 8:09 pm (Swiss Ephemeris 8:10 pm).
- **Place:** the one moonrise already uses (Settings → Place for moonrise, else the city for the phone's time zone, `skLoc()`); times are on the phone's clock. With no place known, the line stays hidden.
- **Home:** one button under the date, "आश्विन शुद्ध अष्टमी" (adhika named when so; पौर्णिमा and अमावास्या without the paksha), "नक्षत्र … · शके १९४८ · पराभव संवत्सर", then sunrise, sunset and the place. Only today is worked out, a moment after the page shows (its room is kept so nothing jumps).
- **The page** works like the Library (Back, the phone's Back, Escape; focus returns to the line). Day card: picture, title, tithi / नक्षत्र / योग with "until …" (weekday named when it ends on another day), वार, सूर्योदय with sunset and place, चंद्रोदय, मास (amanta), संवत्सर, ऋतु · अयन, and the next Sankashti with moonrise (`js/features/sankashti.js`). Month: a table of day buttons (रवि…शनि), each day's tithi at sunrise, shukla / krishna shading with a key, full and new moon marks, Ekadashi and Sankashti labels, today highlighted; previous / next month; arrow keys and Page Up / Down. A month is worked out only when shown. Two columns from 820px.
- **Words** (replaced on 2026-10-19, above): the panchang's names stay Marathi in both menu languages, as in the approved design; the words around them (English glosses, times, dates, buttons, key, footnote) follow the menu language, with Devanagari digits in Marathi menus. Open for Satish: whether English menus should show the month heading in Marathi as the mockup did (it now follows the menus: "October 2026"; the weekday headers रवि…शनि stay Marathi), and whether festivals beyond Ekadashi and Sankashti (e.g. दसरा in the mockup) should be marked (yes: see "festival days" above).

## 2026-10-18: Home redesign (simple "what to chant now" page) and the Library page

Satish (2026-10-18): "This app has nothing to do with sankathara chaturthi.. the main card needs to be redesigned. That can go away. When I open the app it should just be simplistic layout of what i should be chanting for that day and time... I think the table of contents can also go away." Built from mockup A (`mockups/home-v2-a.html` on `mockup-home-v2`). Version aarti-v1.5.

- **Home** holds only: the top bar (brand, profile chip, Library with a book icon, Settings); the time-of-day picture with today's weekday star beside the date in Marathi and English; an empty slot `#pan` for the Vedic calendar line (filled later by `js/core/panchang.js`); this session's texts with ticks under "सायंकाळ · Evening" and "2 of 10"; a line "Not this time? Morning · Afternoon" to switch session; and Start / Continue, which is pinned to the bottom on phones (below 820 px, above the safe-area inset). On desktop it is one centred column of up to 560 px.
- **Gone from Home:** the Sankathara / Next Chaturthi date card (with its date strip and "add all to calendar", `js/features/date-card.js` deleted), the table of contents, the ॥ श्री गणेशाय नमः ॥ line, the hero picture and the weekday row (the list is always today's). The "home card fold" setting goes with the card.
- **Sankashti** (`js/features/sankashti.js`, using `js/core/astronomy.js` as before): only on a Sankashti day one small line shows, "Sankashti Chaturthi today · Moonrise h:mm pm · place" (Angaraki named when it falls on a Tuesday). The place for moonrise moved to Settings → About ("Place for moonrise · Use my location"). The share message is unchanged.
- **The Library** (`#jump`, opened by the book button or the bottom bar's search button) is a full page with Back, search and the contents grouped as before (Pooja / Aarti). Opening a text works as before; Back from that text returns to Home (the Library step is replaced, not stacked). Opening the Library does not change the URL; browser Back closes it.
- **App / Share / QR / Print / Help** stay in their quiet row, now under the session list (below Start) at every width: the least disruptive place, unchanged buttons and order.
- On Home the reading-only controls (Home button, reading sheet, bottom bar, desktop side menu) hide; they come back as soon as a text is at the top.

## 2026-10-18: slice 2, storage, profiles and backup

Built as planned in `docs/architecture.md` §3.4, §3.7, §3.8 and §4.2 (see the "As built" notes there). Version aarti-v1.4. Choices made while building, open for Satish to change:

- **The boot copy keeps the old key.** The active person's settings are written at once to `localStorage["aarti2-prefs"]` with `pid`, instead of a new `nitya-boot`: `js/render.js` and the Print hand-over already read that key, version 1.3 still works if someone goes back, and it wins at start-up for its person because IndexedDB writes may not finish before a page closes.
- **Person or phone.** Per person: languages, menus, letters, English spelling, text size, font, dhrupad, theme, high contrast (Q4), autoscroll speeds, folds of the Pooja / Aarti / Contents and the highlighted line. Per phone: Keep screen on, layout, location, print page and print choices, and the home card fold.
- **The first person is called "Me"** (renameable), made from today's settings and ticks on the first visit after 1.3.
- **Restore replaces everyone** on the phone with the people in the file, after showing who is added, replaced and removed. The phone's Keep screen on stays.
- **The reminder** shows 14 days after the first visit if no backup was ever saved, then 30 days after each backup; *Not now* hides it for 14 days. `navigator.storage.persist()` is asked after a backup, a restore or adding a person.
- **The chip** (mockup A) shows the badge and name from 600 px up, the badge alone on phones; at 420 px and under the top bar tightens (the title's Ganesha drawing hides, the Marathi title is 19 px) so नित्य उपासना still fits at 390 px.
- Up to eight people, eight badge colours (white letters at 4.5:1 or more), up to four badge letters.

Two Today changes Satish approved during the slice (2026-10-18):

1. In a session, **Next › ticks the text being left** as done today for the person reading, before moving on (also after the last text). ‹ Prev does not tick; a tick can still be taken off on the card. Only on today's list.
2. **On phones (below 820 px) the App / Share / QR / Print / Help row moves under the session card**, as in mockup A. The wide layout is unchanged.

The Marathi menu labels on the Today card (वार, वेळ, सकाळ/दुपार/सायंकाळ, सुरू करा, पुढे चालू, N पैकी M झाले) are confirmed as they are.

## 2026-10-18: Today page brought forward before profiles and library

Satish said "go ahead" to building slice 4 (the Today page) before slices 2 (profiles) and 3 (library), with mockup A (paper card) and the time-of-day picture (`mockups/today-icons.html`). One implicit family profile until slice 2: the ticks are kept under `localStorage["nitya-ticks"]` behind `js/core/ticks.js`, so only that module moves to IndexedDB later. Default routine from Q5 in `content/routines.json` (Morning = Ganapati Atharvashirsha, Evening = all ten aartis, Afternoon empty), the same every weekday; session times from Q6; the only special-day rule is the existing Sankashti one, shown on the card and adding no texts (Q7). No profile chip yet. The reading view is still the one long page: Start / Continue opens the first unticked text there, and ‹ Prev / Next › follow the session. Version aarti-v1.3.

## 2026-10-18: time-of-day pictures

Satish chose three new pictures for the app (his images, kept in `originals/`): a circle with ॐ, a palm-leaf book and a rosary under an arch of seven stars for the weekdays (र सो मं बु गु शु श = Sunday … Saturday), in sunrise (orange), midday (blue) and sunset (purple). In the app the picture follows the default sessions: Morning before 12:00 → sunrise, Afternoon 12:00–17:00 → midday, Evening from 17:00 → sunset, with a glowing ring on today's weekday star (as in the approved mockup `mockups/today-icons.html` on the `mockup-icons` branch). It updates if the app stays open across 12:00, 17:00 or midnight. **The sunrise picture is the fixed home-screen icon** (chosen by Satish): iPhone and Android copy the icon when the app is installed, so it cannot follow the time; only the browser tab icon does. Titles and texts stay as they are. Version aarti-v1.2.

## 2026-10-18: build on main

Satish chose to build v2 on `main` ("Nitya Upasana is a brand new app"). Today's code was saved as the branch `sankathara-chaturthi-base` (at `22b6702`); the `v2` branch was merged into `main` and deleted. `main` no longer mirrors or syncs from sankathara-chaturthi. Every merge to `main` goes live at nitya-upasana.pages.dev, so slices merge only with tests green and Satish's OK. Q11 below is superseded: the version follows the normal release rules.

## 2026-10-18: architecture plan approved

Satish approved `docs/architecture.md` and answered "yes to all" to its questions:

1. Texts get readable ids (`sukhkarta`, …); old links like `#a5` redirect.
2. Atharvashirsha → Vedic Chant; all ten aartis, including Ghalin Lotangan → Aarti. Stotra and Ashtak start empty.
3. In text files, `¦` marks "may break here" (was a hidden ZWSP) and ` // ` marks "always break here" (was `<br>`).
4. Theme and high contrast are per profile, along with text size, language and English style.
5. A new profile starts with Morning = Atharvashirsha, Evening = the ten aartis in today's order, Afternoon empty (`content/routines.json`).
6. Default session: Morning until 12:00, Afternoon 12:00–17:00, Evening after 17:00.
7. Special days: only the existing Sankashti / Angaraki rule, adding no texts, until Satish sends the rules table. Kalnirnay / Drik Panchang, amanta months.
8. Keep "show in Kannada letters" and add Telugu letters the same way. Tamil is not a display script.
9. Tamil originals: everyday English typed by hand, no generated scholarly line.
10. `.nitya` files: plain JSON with a checksum in Phase 1; passphrase encryption after the cut line.
11. The preview shows "v2.0 preview" with cache `nitya-v2.0-pre`.
12. Everything the site does today carries over (bottom bar, autoscroll, tilt, reading sheet, picture viewer, QR, four fonts, Sankashti card).

Earlier (from the revised prompt, before the plan): work on the long-lived `v2` branch, `main` untouched; plain JavaScript, no build step, no framework; profiles share one device and each phone keeps its own data.

## Desktop A (v1.14, 2026-10-20)

Satish picked Desktop A (mockup `mockups/desktop-a.html` on branch `mockup-desktop`). On screens 1100px and wider the
layout spans 85% of the screen (at least 1000px). Home on its own shows today on the left (session switch, the
session's texts with ticks, Start, More, Library line) and the day's picture large on the right with the date. While a
session is read, the side menu is the session panel: its name, how many are done, its texts with ticks (the one on
screen highlighted) and "Another text? Open the Library". Reading from the Library keeps the full contents menu.

## Desktop B (v1.15)

- On desktop (≥1100px, side menu shown) the Vedic calendar and Settings open in the right-hand area, beside the left column, instead of as a full-screen layer. The left column (today panel or the session's side menu) stays in view.
- The calendar shows the month on the left and the day card on the right. Settings home lays its cards in two columns.
- The left column is now 360px (--S 400px with the gap) so session names fit on one line.
- The gear and calendar buttons stay highlighted while their area is open. Phones are unchanged.

## Desktop reading: one text at a time (v1.15.1)

- On desktop (≥1100px), reading a session shows only the text you are on, on the right, scrolling there beside the session's list. The next text no longer runs on below it, and Home is not above it.
- ‹ Prev / Next ›, the session's list on the left, and Back change the text. मुखपृष्ठ (Home) in the list or the bottom bar goes back to Home. Phones still read the session as one page.

## Full screen on every device (v1.16, 2026-10-21)

Satish approved the layout review (mockup branch `mockup-responsive`, sheets in the project's `v2/responsive/`) after
the iPad looked squeezed. These replace the 85% frame of Desktop A and the 1100px start of Desktop B:

- The side-by-side layout (left column + page beside it) starts at 1024px, so every iPad held sideways has it.
- It uses the whole width: 24px from the edges up to 1399px (left column with its gap 380px), 32px from 1400px (460px);
  it stops growing at 2200px, centred.
- Large monitors (2200px and wider, 3000px and wider: a 2K screen at 100%, a 4K one at low scaling): the left column,
  the bars, the reading text and the pages beside them are drawn 1.25× and 1.6× larger (CSS `zoom` on the parts in the
  page's flow; the fixed areas keep their place).
- Home: the day's picture as large as the screen allows, centred in the height beside today.
- The calendar's month takes the room the day card (290–360px) leaves; its days fill the screen's height and tithi
  names stay whole words.
- The Library opens in the right-hand area too, beside today, its categories in columns. Settings' cards go to three
  columns where there is room.
- Tablets held upright (600–1023px wide): Home is one larger column with the picture large on top; the calendar's
  month on top across the width and the day card under it, its rows in two columns; the Library and Settings in two
  columns.
- Phones held sideways: Home in two columns, the day on the left, the session (its texts and Start) on the right.
- iPhones held upright are unchanged. Home still shows only what to chant now.
- Tests: all suites run in the cloud session until GitHub Actions is available again; the screenshots made on
  Satish's Mac and on GitHub were removed and a fresh set was made there (Satish, 2026-10-21).
- Found by the tests once they ran again: the hidden Restore file picker printed "Choose File" above the contents
  (pushing every contents page number out by one in Kannada on A4), and the transliteration missed ḷ (कॢप्त) and a
  zero-width joiner inside श‍ृ. All three are fixed. Shree Rudra's passages are wider than half a sideways page with
  Kannada beside them, so they wrap mid-phrase; the print test's limit of 12 such lines counts the other texts.

## Vedic chants run on as paragraphs (v1.17, 2026-10-21)

Satish asked for the Vedic chants to read like his booklets (the Rudra and Atharvashirsha PDFs) on every device,
whenever one language is shown. Approved from the mockup (branch `mockup-vedic-flow`, sheets in the project's
`v2/vedic-flow/`).

- Pieces marked `layout: prose` (Shree Rudra, Ganapati Atharvashirsha, Purusha Suktam) shown in Marathi/Sanskrit
  only or English only: the lines run on, each after the last with its । or ॥, as running paragraphs. A `[para]`
  stanza starts a paragraph, indented; the dhrupad (opening and closing peace chants) is a centred paragraph.
- A danda never starts a row (it is glued to the word before it). Rows are no wider than 52rem on wide screens.
- Each line is still its own element, so tapping a line, the highlight, search and reading position work as before.
- The automatic text size no longer counts these pieces' long lines (they run on), so they never make it smaller.
- With both languages the lines stay in pairs, as before. Shri Sukta (numbered verses) keeps its verse layout.
  Printing already used running paragraphs for these pieces and is unchanged.

## Library: pinch resizes the list, numbers restart in each category (v1.18, 2026-10-21)

Satish asked (2026-10-21) that a pinch on the Library zoom only the list of texts, not the title bar, with the same
text size setting as the reading page, and that the numbering restart after each section. Approved from screenshots
(the project's `v2/library-zoom/`).

- **Pinch:** the list (#jl) follows the text size: 15px at the automatic size, by the same share as the reading page
  (150% there is 150% here). The top bar, Back, the title and the search box keep their size. The Library scrolls on
  its own, so it (and the categories sheet) now has `touch-action: pan-y`, as the Settings preview has: iPhones
  zoomed the whole page there before. Ctrl/⌘ + and − on a computer do the same.
- **Numbers:** each category is numbered 1, 2, 3… in the Library and in the side menu on wide screens; a text moved
  to another category takes its place there. The headings on the reading page keep their running numbers.

## Navigation: one place for each button (v1.19, 2026-10-21)

Satish asked (2026-10-21) for the Dhrupad button to leave the top bar, a clearer Home and Library icon, and a better
place for the More row. He approved the review "Navigation and menus review" as recommended (screenshots in the
project's `v2/navigation/`).

- **Top bar:** the name (home), who is reading, Library (on the home page only), ⋯ More and Settings. The धृ Dhrupad
  and अ/A Language buttons are gone: both are in the Reading sheet (Aa in the bottom bar) and in Settings.
- **⋯ More:** App, Share, QR, Print and Help in a small menu under the button, on every page. The More row on the home
  page is gone.
- **Bottom bar:** ‹ Prev, Home (a house with a lamp), Library (an open book), Reading (Aa), Next ›, each middle button
  with its word under the icon in the menu language; on a phone on its side the words are kept for screen readers
  only. The open book is the Library's icon everywhere; the Ganapati drawing stays as the logo beside the name.

## Autoscroll and Tilt to scroll removed for now (v1.20.1, 2026-10-21)

- Both were built and held back (switched off in `js/core/features.js`) but still loaded on every page. Satish chose to remove them for now; they are in git history up to v1.20 and could come back, for example with Recital mode.
- Gone: `js/features/tilt.js`, the autoscroll half of `js/features/bottom-bar.js`, their buttons in the bottom bar, the Settings switch, the Help entries and their CSS. The bottom bar is now ‹ Prev, Home, Library, Aa, Next ›.
- The saved settings `as`, `ason` and `asp` are still read and kept on each person, so nothing saved is lost if they come back.
