# v2 decision log

Newest first. Each entry: the decision, who made it, and where it came from.

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
