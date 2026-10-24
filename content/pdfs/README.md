# The Library's PDFs

The PDF files the Library's **PDFs** tab lists. Readers open them in their phone's or computer's own PDF viewer.

To add one:

1. Put the file in this folder. Use a short name in plain letters, digits and hyphens: `dasbodh.pdf`, `shri-gurucharitra.pdf`.
2. List it in `content/pdfs.json`, in a group, with its title in Marathi and English:

```json
{
 "groups": [
  {
   "name": { "mr": "ग्रंथ", "en": "Books" },
   "pdfs": [
    { "file": "pdfs/dasbodh.pdf", "title": { "mr": "दासबोध", "en": "Dasbodh" } }
   ]
  }
 ]
}
```

Groups and PDFs are listed in the order written. One name is enough (the other language then uses it too). The tab shows only while at least one PDF is listed.

A PDF is saved on a phone for offline use the first time it is opened there, not before, so large files never fill a phone that doesn't read them. Keep each file as small as it can be (under about 20 MB): phones download the whole file before showing it.
