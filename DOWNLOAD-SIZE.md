# Download size

How much a phone downloads for Nitya Upasana. Written by `cd tests && npm run sizes` (tests/tools/download-size.mjs); the
tests check it is still true (within 5%), and Help (About, "Works without internet") gives the total.

## The first time: about 2.7 MB

Opening the site the first time downloads the page, and the service worker (sw.js) then saves every file in
js/parts.js on the phone, so it works without internet. Sizes are as the server sends them: scripts, styles, words and
texts compressed with gzip (Cloudflare Pages does this by itself); fonts (woff2) and pictures (webp) are compressed
formats already and are sent as they are.

| What | Files | Sent |
| --- | ---: | ---: |
| Fonts | 21 | 1.4 MB |
| Pictures | 12 | 472 KB |
| Code | 94 | 382 KB |
| Texts and calendar data | 79 | 240 KB |
| Styles | 18 | 94 KB |
| Menu words (every menu language) | 5 | 70 KB |
| The page | 2 | 37 KB |
| **All** | 231 | **2.7 MB** |

Opening the app again downloads nothing: it opens from the saved copy.

## A new version

A new version (a new version number in sw.js and index.html) saves a whole fresh copy, every file again except the
fonts, which never change in place and are copied from the old copy: about 1.3 MB.

## Only when it is used

| What | Size |
| --- | --- |
| A PDF from the Library | 318 KB to 4.1 MB each (5 PDFs, 6.7 MB in all), only when it is opened |
| Listen's chanting model | 116.8 MB (phones with WebGPU) or 122.0 MB, once, only after the reader agrees to it |

## Making it smaller

The text files are compressed in transit already, so zipping them again saves nothing. The largest part is the fonts
(1.4 MB): each holds whole alphabets, and cutting them down to the letters the texts and menus use
(subsetting) would save most of that, at the cost of redoing it whenever a text brings a letter not yet in them.
