// The Library's books: each PDF's page count and size (in bytes) read from the file and written into
// content/pdfs.json ("pages", "size"), which the Books tab shows ("48 pp · 4 MB"). Run after adding or replacing a
// PDF: npm run pdfs (from tests/). tests/unit/pdfs.test.mjs fails when a number no longer matches its file.
import { readFileSync, statSync, writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";

const content = new URL("../../content/", import.meta.url);

/** The page count and size of a PDF under content/ @param {string} file */
export async function pdfInfo(file) {
  const at = new URL(file, content);
  const doc = await getDocument({ data: new Uint8Array(readFileSync(at)), verbosity: 0 }).promise;
  const pages = doc.numPages;
  await doc.destroy();
  return { pages, size: statSync(at).size };
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const at = new URL("pdfs.json", content);
  const o = JSON.parse(readFileSync(at, "utf8"));
  for (const p of o.pdfs) {
    Object.assign(p, await pdfInfo(p.file));
    console.log(p.file + ": " + p.pages + " pages, " + p.size + " bytes");
  }
  writeFileSync(at, JSON.stringify(o, null, 1) + "\n");
}
