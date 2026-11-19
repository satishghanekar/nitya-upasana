// How much a phone downloads: the site the first time it is opened and saved for offline use, by kind of file, as the
// server sends it (scripts, styles, words and texts compressed with gzip; fonts and pictures as they are, already
// compressed), and what comes only when it is used (the Library's PDFs; in Nitya Upasana, Listen's chanting model).
// It writes DOWNLOAD-SIZE.md at the root, and tests/site-files.spec.mjs checks that file and Help still say what is true
// (within 5%), so a change that makes the site much bigger or smaller says so.
// This file is the same in both apps.
//
//   cd tests && npm run sizes            # write DOWNLOAD-SIZE.md
import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { gzipSync } from "node:zlib";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { runInNewContext } from "node:vm";

const ROOT = fileURLToPath(new URL("../..", import.meta.url));
const at = (f) => join(ROOT, f);

/** The file lists of js/parts.js (the ones the page and sw.js use) */
function parts() {
  const box = {};
  runInNewContext(readFileSync(at("js/parts.js"), "utf8") + "\nthis.SITE_PARTS = SITE_PARTS;", box);
  return box.SITE_PARTS;
}

/** Bytes sent for a file: gzip for text, as it is for what is compressed already */
function sent(f) {
  const b = readFileSync(at(f));
  return /\.(webp|png|jpe?g|woff2|pdf|wasm|onnx)$/i.test(f) ? b.length : gzipSync(b, { level: 9 }).length;
}

/** Bytes in a folder, all of it */
function folder(d) {
  if (!existsSync(at(d))) return 0;
  return readdirSync(at(d), { recursive: true }).reduce((n, f) => {
    const s = statSync(join(at(d), String(f)));
    return n + (s.isFile() ? s.size : 0);
  }, 0);
}

/** What the first opening downloads, by kind, in bytes sent: [kind, files, bytes][] and the total */
export function firstDownload() {
  const P = parts();
  /** @type {Map<string, [number, number]>} */
  const kinds = new Map();
  const add = (k, f) => {
    const v = kinds.get(k) || [0, 0];
    kinds.set(k, [v[0] + 1, v[1] + sent(f)]);
  };
  const kind = (f) =>
    /^js\/strings\//.test(f)
      ? "Menu words (every menu language)"
      : /^js\//.test(f)
        ? "Code"
        : /^css\//.test(f)
          ? "Styles"
          : /^content\//.test(f)
            ? "Texts and calendar data"
            : "Other";
  add("The page", "index.html");
  add("The page", "manifest.json");
  for (const f of P.all) add(kind(f), f);
  for (const f of P.fonts) add("Fonts", f);
  for (const f of P.images) add("Pictures", f);
  const rows = [...kinds].map(([k, [n, b]]) => [k, n, b]).sort((a, b) => b[2] - a[2]);
  return { rows, total: rows.reduce((n, r) => n + r[2], 0) };
}

/** Megabytes, as people read them (1 MB = 1,000,000 bytes), one decimal place */
export const mb = (b) => (b / 1e6).toFixed(1);
const kb = (b) => (b >= 1e6 ? mb(b) + " MB" : Math.round(b / 1e3) + " KB");

/** What comes only when it is used */
function later() {
  const out = [];
  const pdfs = existsSync(at("content/pdfs.json")) ? JSON.parse(readFileSync(at("content/pdfs.json"), "utf8")).pdfs || [] : [];
  if (pdfs.length) {
    const sizes = pdfs.map((p) => p.size || 0);
    out.push([
      "A PDF from the Library",
      `${kb(Math.min(...sizes))} to ${kb(Math.max(...sizes))} each (${pdfs.length} PDFs, ${kb(sizes.reduce((a, b) => a + b, 0))} in all), only when it is opened`,
    ]);
  }
  // Listen (Nitya Upasana): one of two ways, its model, library and WebAssembly (js/features/listen.js, WAYS)
  if (existsSync(at("models/chant-v6"))) {
    const v = (d, lib, wasm) => folder(d) + [lib, ...wasm].reduce((n, f) => n + statSync(at("vendor/onnxruntime/" + f)).size, 0);
    const gpu = v("models/chant-v6-q4", "ort.webgpu.bundle.min.mjs", ["ort-wasm-simd-threaded.asyncify.wasm", "ort-wasm-simd-threaded.asyncify.wasm.2"]),
      cpu = v("models/chant-v6", "ort.wasm.bundle.min.mjs", ["ort-wasm-simd-threaded.wasm"]);
    out.push(["Listen's chanting model", `${kb(gpu)} (phones with WebGPU) or ${kb(cpu)}, once, only after the reader agrees to it`]);
  }
  return out;
}

/** Its section on what comes only when it is used, or nothing when there is none */
function onlyWhenUsed() {
  const rows = later();
  if (!rows.length) return "Nothing else is downloaded later: every part of the site is in the first download.\n\n";
  return "## Only when it is used\n\n| What | Size |\n| --- | --- |\n" + rows.map((r) => `| ${r[0]} | ${r[1]} |`).join("\n") + "\n\n";
}

/** The whole of DOWNLOAD-SIZE.md */
export function page() {
  const app = existsSync(at("models/chant-v6")) ? "Nitya Upasana" : "Sankathara Chaturthi";
  const { rows, total } = firstDownload();
  const fonts = rows.find((r) => r[0] === "Fonts");
  return `# Download size

How much a phone downloads for ${app}. Written by \`cd tests && npm run sizes\` (tests/tools/download-size.mjs); the
tests check it is still true (within 5%), and Help (About, "Works without internet") gives the total.

## The first time: about ${mb(total)} MB

Opening the site the first time downloads the page, and the service worker (sw.js) then saves every file in
js/parts.js on the phone, so it works without internet. Sizes are as the server sends them: scripts, styles, words and
texts compressed with gzip (Cloudflare Pages does this by itself); fonts (woff2) and pictures (webp) are compressed
formats already and are sent as they are.

| What | Files | Sent |
| --- | ---: | ---: |
${rows.map((r) => `| ${r[0]} | ${r[1]} | ${kb(r[2])} |`).join("\n")}
| **All** | ${rows.reduce((n, r) => n + r[1], 0)} | **${mb(total)} MB** |

Opening the app again downloads nothing: it opens from the saved copy.

## A new version

A new version (a new version number in sw.js and index.html) saves a whole fresh copy, every file again except the
fonts, which never change in place and are copied from the old copy: about ${mb(total - (fonts ? fonts[2] : 0))} MB.

${onlyWhenUsed()}## Making it smaller

The text files are compressed in transit already, so zipping them again saves nothing. The largest part is the fonts
(${fonts ? kb(fonts[2]) : "?"}): each holds whole alphabets, and cutting them down to the letters the texts and menus use
(subsetting) would save most of that, at the cost of redoing it whenever a text brings a letter not yet in them.
`;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  writeFileSync(at("DOWNLOAD-SIZE.md"), page());
  console.log("DOWNLOAD-SIZE.md: " + mb(firstDownload().total) + " MB the first time");
}
