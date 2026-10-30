# Fonts

Copied from Google Fonts so the site needs nothing from Google and works offline.
Each font is split by script the way Google serves it (`-devanagari`, `-kannada`, `-telugu`, `-gujarati`, `-latin`, `-latin-ext`, and `-400`/`-700` where a font has separate weights);
`css/00-fonts.css` lists them with `@font-face` and `unicode-range`, so a browser only downloads the parts a page uses.
`sw.js` and `js/features/offline.js` (the `FONTS` list, from `js/parts.js`) keep Traditional's and Modern's (Kannada's too) for offline use; Bold's, Telugu's and Gujarati's are kept once someone picks them.
The Gujarati faces have no ᳚ (U+1CDA): `js/render.js` writes it ॑॑ on Gujarati letters, which looks the same.

The site offers three text fonts (Settings → Text font, and the same three in the Print pop-up). Each one draws the
Vedic svara marks (udātta ॑, anudātta ॒, ᳚) itself, which matters for the Rudra, the Atharvashirsha and the Purusha Suktam:

| Choice | Devanagari | English | Kannada, Telugu, Gujarati letters |
|---|---|---|---|
| **Traditional** (`classic`, the default) | Tiro Devanagari Marathi; the Vedic chants in Tiro Devanagari Sanskrit | Tiro's Latin | Noto Serif Kannada, Telugu, Gujarati |
| **Modern** (`std`) | Noto Sans Devanagari | Inter | Noto Sans Kannada, Telugu, Gujarati |
| **Bold** (`bold`) | Noto Serif Devanagari, SemiBold | Noto Serif, SemiBold | Noto Serif Kannada, Telugu, Gujarati, SemiBold |

| Files | Font | Used for |
|---|---|---|
| `inter-*` | Inter (variable, weights 400–700) | English in Modern, menus |
| `noto-sans-deva-*` | Noto Sans Devanagari (variable, 400–700) | Modern; Marathi menus and buttons |
| `tiro-marathi-*` | Tiro Devanagari Marathi | Traditional; headings in every font |
| `tiro-sanskrit-*` | Tiro Devanagari Sanskrit | Traditional: the Vedic chants |
| `noto-serif-*` | Noto Serif Devanagari + Noto Serif (variable) | Bold (loaded only when picked) |
| `noto-sans-kannada-kannada` | Noto Sans Kannada (variable), Kannada letters only | Kannada letters in Modern |
| `noto-serif-kannada-kannada` | Noto Serif Kannada (variable) | Kannada letters in Traditional and Bold |
| `noto-sans-telugu-telugu`, `noto-sans-gujarati-gujarati` | Noto Sans Telugu, Noto Sans Gujarati (variable), their letters only | Telugu and Gujarati letters in Modern |
| `noto-serif-telugu-telugu`, `noto-serif-gujarati-gujarati` | Noto Serif Telugu, Noto Serif Gujarati (variable) | Telugu and Gujarati letters in Traditional and Bold |

All of them are under the SIL Open Font License 1.1 (https://openfontlicense.org), which allows using and
redistributing them with a website. Inter © The Inter Project Authors; Noto Sans Devanagari © Google LLC;
Tiro Devanagari Marathi and Sanskrit © Tiro Typeworks Ltd.; Noto Serif, and Noto Sans and Noto Serif Kannada, Telugu and Gujarati © Google LLC.
