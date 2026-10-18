# v2 decision log

Newest first. Each entry: the decision, who made it, and where it came from.

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
