# Fonts

Copied from Google Fonts so the site needs nothing from Google and works offline.
Each font is split by script the way Google serves it (`-devanagari`, `-latin`, `-latin-ext`);
`css/00-fonts.css` lists them with `@font-face` and `unicode-range`, so a browser only downloads the parts a page uses.
`sw.js` and `js/features/offline.js` (the `FONTS` list, from `js/parts.js`) keep the default ones for offline use; the optional text fonts are kept once someone picks them.

| Files | Font | Used for |
|---|---|---|
| `inter-*` | Inter (variable, weights 400–700) | English text, menus |
| `noto-sans-deva-*` | Noto Sans Devanagari (variable, 400–700) | Marathi menus and buttons |
| `tiro-marathi-*` | Tiro Devanagari Marathi | Marathi and Hindi texts, headings |
| `tiro-sanskrit-*` | Tiro Devanagari Sanskrit | Atharvashirsha (Vedic swara marks) |
| `noto-serif-*` | Noto Serif Devanagari + Noto Serif (variable) | Text font: Classic (loaded only when picked) |
| `sura-*` | Sura (400, 700) | Text font: Bold (loaded only when picked) |
| `kalam-*` | Kalam (400, 700) | Text font: Handwritten (loaded only when picked) |
| `noto-sans-kannada-kannada` | Noto Sans Kannada (variable), Kannada letters only | Kannada letters in the Standard font, and the dandas and Vedic marks in every font |
| `noto-serif-kannada-kannada` | Noto Serif Kannada (variable) | Text font Classic, in Kannada (loaded only when picked) |
| `baloo-tamma-kannada` | Baloo Tamma 2 (variable, 400–800) | Text font Bold, in Kannada (loaded only when picked) |
| `hubballi-kannada` | Hubballi (400) | Text font Handwritten, in Kannada (loaded only when picked) |

All of them are under the SIL Open Font License 1.1 (https://openfontlicense.org), which allows using and
redistributing them with a website. Inter © The Inter Project Authors; Noto Sans Devanagari © Google LLC;
Tiro Devanagari Marathi and Sanskrit © Tiro Typeworks Ltd.; Noto Serif, Noto Sans Kannada and Noto Serif Kannada © Google LLC; Baloo Tamma 2 © Ek Type; Hubballi © Erin McLaughlin; Sura © Carolina Giovagnoli; Kalam © Indian Type Foundry.
