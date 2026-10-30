# The Library's PDFs

The PDF files the Library's **Books** tab (पोथी) lists. Readers open them in their phone's or computer's own PDF viewer.

To add one:

1. Put the file in this folder. Use a short name in plain letters, digits and hyphens: `dasbodh.pdf`, `shri-gurucharitra.pdf`.
2. List it in `content/pdfs.json`, written the same way as `content/library.json`: an id, the file, its title in Marathi (`title`) and English (`titleEn`), its category (one of the ids in `content/categories.json`: `vedic-chant`, `aarti`, `stotra`, `ashtak`) and its language (`sa` Sanskrit, `mr` Marathi):

```json
{
 "pdfs": [
  {
   "id": "stotra-dasbodh",
   "file": "pdfs/dasbodh.pdf",
   "title": "दासबोध",
   "titleEn": "Dasbodh",
   "category": "stotra",
   "language": "mr"
  }
 ]
}
```

3. Fill in its pages and size: from the `tests` folder, run `npm run pdfs`. It reads every PDF and writes `"pages"` and `"size"` into `content/pdfs.json`; the Books tab shows them beside each one ("48 pages · 849 KB"). Run it again whenever a PDF is replaced; the tests fail until you do.

The Books tab lists them under the same categories as the Chants tab (पाठ), in the categories' order and with the names this phone uses for them; within a category, in the order written. One title is enough (the other language then uses it too). A PDF whose category is not in `content/categories.json` goes in the first category. The tab shows only while at least one PDF is listed.

A PDF is saved on a phone for offline use the first time it is opened there, not before, so large files never fill a phone that doesn't read them. Keep each file as small as it can be (under about 20 MB): phones download the whole file before showing it.

After that the phone opens it from its own copy (the Books tab marks it ✓) and never downloads it again. A new version of the app (`V` in `sw.js` and `<meta name="version">` in `index.html`) keeps the saved copy when this list still gives the PDF the same size, to the byte (`keepPdfs` in `sw.js`). So when you replace a PDF with a corrected one, run `npm run pdfs` (the new size) and release a new version too: phones then leave the old copy behind and download the corrected one the next time it is opened.
