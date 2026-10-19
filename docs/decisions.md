# v2 decision log

Newest first. Each entry: the decision, who made it, and where it came from.

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
