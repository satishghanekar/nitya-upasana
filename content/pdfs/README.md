# The Library's PDFs

The PDF files the Library's **PDFs** tab lists. Readers open them in their phone's or computer's own PDF viewer.

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

The PDFs tab lists them under the same categories as the Texts tab, in the categories' order and with the names this phone uses for them; within a category, in the order written. One title is enough (the other language then uses it too). A PDF whose category is not in `content/categories.json` goes in the first category. The tab shows only while at least one PDF is listed.

A PDF is saved on a phone for offline use the first time it is opened there, not before, so large files never fill a phone that doesn't read them. Keep each file as small as it can be (under about 20 MB): phones download the whole file before showing it.
