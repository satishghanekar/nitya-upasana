# Fonts

Copied from Google Fonts so the site needs nothing from Google and works offline.
Each font is split by script the way Google serves it (`-devanagari`, `-latin`, `-latin-ext`);
`index.html` lists them with `@font-face` and `unicode-range`, so a browser only downloads the parts a page uses.
`sw.js` and `index.html` (the `FONTS` list) keep the default ones for offline use; the optional text fonts are kept once someone picks them.

| Files | Font | Used for |
|---|---|---|
| `inter-*` | Inter (variable, weights 400–700) | English text, menus |
| `noto-sans-deva-*` | Noto Sans Devanagari (variable, 400–700) | Marathi menus and buttons |
| `tiro-marathi-*` | Tiro Devanagari Marathi | Marathi and Hindi texts, headings |
| `tiro-sanskrit-*` | Tiro Devanagari Sanskrit | Atharvashirsha (Vedic swara marks) |
| `noto-serif-*` | Noto Serif Devanagari + Noto Serif (variable) | Text font: Classic (loaded only when picked) |
| `sura-*` | Sura (400, 700) | Text font: Bold (loaded only when picked) |
| `kalam-*` | Kalam (400, 700) | Text font: Handwritten (loaded only when picked) |

All of them are under the SIL Open Font License 1.1 (https://openfontlicense.org), which allows using and
redistributing them with a website. Inter © The Inter Project Authors; Noto Sans Devanagari © Google LLC;
Tiro Devanagari Marathi and Sanskrit © Tiro Typeworks Ltd.; Noto Serif © Google LLC; Sura © Carolina Giovagnoli; Kalam © Indian Type Foundry.
