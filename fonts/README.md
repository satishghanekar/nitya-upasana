# Fonts

Copied from Google Fonts so the site needs nothing from Google and works offline. Both apps (Nitya Upasana and
Sankathara Chaturthi) ship the same fonts.
Most files are split by script the way Google serves them (`-devanagari`, `-kannada`, `-telugu`, `-gujarati`, `-latin`,
`-latin-ext`); `css/00-fonts.css` lists them with `@font-face` and `unicode-range`, so a browser only downloads the
parts a page uses.
`sw.js` and `js/features/offline.js` (the `FONTS` list, from `js/parts.js`) keep Traditional's and Modern's
(Kannada's too) for offline use; Bold's, and Telugu's and Gujarati's, are kept once someone uses them.

The site offers three text fonts (Settings → Text font, and the same three in the Print pop-up), chosen on
2026-10-31 after checking every Google Fonts family with faces in Devanagari, Kannada, Telugu and Gujarati: only Tiro,
Noto Serif and Noto Sans draw the Vedic svara marks (udātta ॑, anudātta ॒, ᳚) in every script. Kalam (Handwritten),
Baloo 2, Hind and Anek do not.

| Choice | Devanagari | English | Kannada, Telugu, Gujarati letters |
|---|---|---|---|
| **Traditional** (`classic`, the default) | Tiro Devanagari Marathi; the Vedic chants in Tiro Devanagari Sanskrit | Noto Serif | Tiro Kannada, Tiro Telugu; Noto Serif Gujarati (Tiro has none) |
| **Modern** (`std`) | Noto Sans Devanagari | Noto Sans | Noto Sans Kannada, Telugu, Gujarati |
| **Bold** (`bold`) | Noto Serif Devanagari, SemiBold | Noto Serif, SemiBold | Noto Serif Kannada, Telugu, Gujarati, SemiBold |

The menus are in Inter and Noto Sans Devanagari, in every text font.

**The English (IAST) svara marks.** IAST writes the marks as combining accents (̍ ̎ ̱ ̐). Google's `latin` and
`latin-ext` pieces leave them out, so they came from whatever font the phone had, and Inter and Tiro's Latin have
none at all. `noto-serif-latin` and `noto-sans-latin` are therefore cut here, one piece each, from the full fonts with
fontTools (Latin, Latin Extended, the IAST letters and every combining mark; the width axis fixed, the weights kept):

```sh
pyftsubset NotoSerif[wdth,wght].ttf --unicodes="U+0000-024F,U+0259,U+02B0-02FF,U+0300-036F,U+1E00-1EFF,U+2000-206F,U+20AC,U+20B9,U+2122,U+2190-2193,U+2212,U+2215,U+25CC,U+FEFF,U+FFFD" --layout-features='*' --flavor=woff2
fonttools varLib.instancer <subset> wdth=100 wght=400:800    # Noto Sans: wght=400:700
```

`tiro-kannada-kannada` and `tiro-telugu-telugu` are cut the same way (their script, the dandas, ॑ ॒ and the Vedic
Extensions). The Gujarati faces have no ᳚ (U+1CDA): `js/render.js` writes it ॑॑ on Gujarati letters, which looks the same.

| Files | Font | Used for |
|---|---|---|
| `inter-*` | Inter (variable, weights 400–700) | Menus and buttons |
| `noto-sans-deva-*` | Noto Sans Devanagari (variable, 400–700) | Modern; Marathi menus and buttons |
| `noto-sans-latin` | Noto Sans (variable, 400–700), with the IAST marks | Modern: the texts' English |
| `tiro-marathi-*` | Tiro Devanagari Marathi | Traditional; headings in every font |
| `tiro-sanskrit-*` | Tiro Devanagari Sanskrit | Traditional: the Vedic chants |
| `noto-serif-latin` | Noto Serif (variable, 400–800), with the IAST marks | Traditional's and Bold's English |
| `noto-serif-deva-devanagari` | Noto Serif Devanagari (variable) | Bold |
| `tiro-kannada-kannada`, `tiro-telugu-telugu` | Tiro Kannada, Tiro Telugu, their letters only | Kannada and Telugu letters in Traditional |
| `noto-sans-kannada-kannada`, `noto-sans-telugu-telugu`, `noto-sans-gujarati-gujarati` | Noto Sans Kannada, Telugu, Gujarati (variable), their letters only | Those letters in Modern |
| `noto-serif-kannada-kannada`, `noto-serif-telugu-telugu`, `noto-serif-gujarati-gujarati` | Noto Serif Kannada, Telugu, Gujarati (variable) | Those letters in Bold; Gujarati in Traditional too |

All of them are under the SIL Open Font License 1.1 (https://openfontlicense.org), which allows using and
redistributing them with a website, cut down or not. Inter © The Inter Project Authors; Noto Sans and Noto Serif
(Devanagari, Latin, Kannada, Telugu, Gujarati) © Google LLC; Tiro Devanagari Marathi and Sanskrit, Tiro Kannada and
Tiro Telugu © Tiro Typeworks Ltd.
