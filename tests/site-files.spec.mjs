// The file list in js/parts.js is shared by the page ("Check for updates") and the service worker (the
// offline copy), but the page itself loads files from its own <link> and <script> tags. These checks keep
// the two in step, so a new style or script file is never missing from the offline copy.
// Also the size budget: what a first visit downloads.
import { test, expect } from "@playwright/test";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { gzipSync } from "node:zlib";
import { siteParts } from "./helpers.mjs";

const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const parts = siteParts();

test("index.html loads the styles listed in js/parts.js, in the same order", () => {
  const links = [...html.matchAll(/<link rel="stylesheet" href="([^"]+)">/g)].map((m) => m[1]);
  expect(links).toEqual(parts.css);
});

test("index.html loads the scripts listed in js/parts.js, in the same order", () => {
  const scripts = [...html.matchAll(/<script src="([^"]+)"><\/script>/g)].map((m) => m[1]);
  expect(scripts).toEqual(parts.scripts);
  const modules = [...html.matchAll(/<script type="module" src="([^"]+)"><\/script>/g)].map((m) => m[1]);
  expect(modules).toEqual(["js/main.js"]);
  const preload = [...html.matchAll(/<link rel="modulepreload" href="([^"]+)">/g)].map((m) => m[1]);
  expect(preload, "modulepreload links").toEqual(parts.modules);
});

test("js/parts.js lists every part of the site script, and main.js imports each one", () => {
  const files = ["core", "text", "features", "print", "store", "strings"].flatMap((d) =>
    readdirSync(new URL(`../js/${d}/`, import.meta.url))
      .filter((f) => f.endsWith(".js"))
      .map((f) => `js/${d}/${f}`),
  );
  expect([...parts.modules].sort()).toEqual(["js/main.js", ...files].sort());
  const main = readFileSync(new URL("../js/main.js", import.meta.url), "utf8");
  const imported = [...main.matchAll(/from "\.\/([^"]+)"/g)].map((m) => "js/" + m[1]);
  // every part with start-up work is imported by main.js (the others are imported by the parts that use them)
  for (const f of imported) expect(parts.modules).toContain(f);
});

test("every file in js/parts.js exists", () => {
  const missing = [...parts.css, ...parts.scripts, ...parts.modules, ...parts.content, ...parts.fonts, ...parts.images].filter(
    (f) => !existsSync(new URL("../" + f, import.meta.url)),
  );
  expect(missing).toEqual([]);
});

test("js/parts.js lists the texts in content/library.json, so every text is kept for offline use", () => {
  const lib = JSON.parse(readFileSync(new URL("../content/library.json", import.meta.url), "utf8"));
  // the routine (content/routines.json) is kept too: the Today card shows it offline; and the festival rules
  // (content/festivals.json) and the holidays (content/holidays.json), which the Vedic calendar uses offline; and the
  // list of the Library's PDFs (content/pdfs.json), not the PDFs themselves (each is kept once opened)
  expect(parts.content).toEqual([
    "content/library.json",
    "content/categories.json",
    "content/routines.json",
    "content/festivals.json",
    "content/holidays.json",
    "content/pdfs.json",
    ...lib.texts.map((t) => "content/" + t.file),
  ]);
  for (const f of parts.content) expect(parts.all).toContain(f);
});

test("js/parts.js keeps every picture the page shows, at every time of day, for offline use", () => {
  // the pictures and icons named in index.html (link previews' https addresses aside)
  const named = [...html.matchAll(/(?:src|href|data-src)="([^":]+\.(?:png|webp))"/g)].map((m) => m[1]);
  expect(named.length).toBeGreaterThan(3);
  for (const f of named) expect(parts.images).toContain(f);
  for (const t of ["sunrise", "midday", "sunset"]) {
    expect(parts.images).toContain(`picture-${t}-360.webp`);
    expect(parts.images).toContain(`picture-${t}.webp`);
  }
  // the manifest's app icons exist (the installed icon is the sunrise picture)
  const manifest = JSON.parse(readFileSync(new URL("../manifest.json", import.meta.url), "utf8"));
  for (const i of manifest.icons) expect(existsSync(new URL("../" + i.src, import.meta.url)), i.src).toBe(true);
});

// What a first visit downloads, compressed as a server sends it (gzip, file by file). Each limit is a little above the
// size when it was set, so the site can't grow by much unnoticed: when a change needs more, raise the limit in the same
// change and say why. (Set 2026-10-29: scripts 247 KB, styles 63 KB, index.html 27 KB. Scripts raised 2026-10-30
// to 275 KB for js/strings/kn.js, the Kannada menus: 265 KB then; to 295 KB for te.js and gu.js, the Telugu and
// Gujarati menus: 284 KB then; to 305 KB for js/core/fest-icons.js, a drawing for every festival: 296 KB then; on
// 2026-10-31 to 315 KB for the Print pop-up's hints and page count in five languages, js/print/pages.js: 306.6 KB
// then. Styles raised 2026-10-30 to 70 KB for the drawings' colours in each theme, css/12-calendar.css: 66.5 KB then.)
test("the scripts, styles and page stay within their size budget", () => {
  const parts = siteParts();
  const gz = (files) => files.reduce((n, f) => n + gzipSync(readFileSync(new URL("../" + f, import.meta.url))).length, 0);
  // (320 KB since 2026-11-02: the ready-made routines, the welcome card and the print Routine list; 330 KB since
  // 2026-11-05: the chanting model's arithmetic and the Listen lab; 336 KB since 2026-11-06: Listen in place of the lab,
  // js/core/follow.js and Listen's words in five languages: 333 KB then; 338 KB since 2026-11-07: js/core/align.js,
  // the sound lined up with the text: 336.4 KB then; 340 KB since 2026-11-09: Listen stopping by itself in five
  // languages, quicker after a jump, and on the GPU where there is one: 338.5 KB then; 341 KB since 2026-11-09: a
  // session in the page's own order, numbered by the session, and Coming up folded on phones: 340.1 KB then; 345 KB
  // since 2026-11-10: the JSDoc types the type checks need, in every script: 341.3 KB then; 347 KB since 2026-11-10:
  // Home's place hint and "Your routine" in five languages: 345.7 KB then; 348 KB since 2026-11-10: Listen started on
  // Home opening the session, and room for its panel at the page's end: 347.3 KB then; 350 KB since 2026-11-11: the
  // Library's Book order | A–Z in five languages, about 1.6 KB, 349.6 KB with it on a Mac)
  expect(gz([...parts.scripts, ...parts.modules]), "scripts, gzip bytes").toBeLessThanOrEqual(350_000);
  // (71 KB since 2026-11-02: every size of the menus and labels named, from one scale in css/01-theme.css; 72 KB since
  // 2026-11-05: layout: lines, a Vedic chant line by line on screen and paper; 73 KB since 2026-11-06: Listen's button,
  // panel and marked line, 72.03 KB then; 73.5 KB since 2026-11-11: the Library's Book order | A–Z, 73.3 KB with it on a
  // Mac, where Node's gzip gives a little more than GitHub's)
  expect(gz(parts.css), "styles, gzip bytes").toBeLessThanOrEqual(73_500);
  // (31 KB since 2026-11-09: About's Listen line with its chip icon and badge, and Help saying where it runs: 29.96 KB
  // then)
  expect(gz(["index.html"]), "index.html, gzip bytes").toBeLessThanOrEqual(31_000);
});

// The Content-Security-Policy in _headers (Cloudflare Pages sends it; tests/serve.mjs too, so every test runs under it):
// files from this site only, and never an inline script; WebAssembly may be compiled, for the chanting model
// (vendor/onnxruntime/, CLAUDE.md), and nothing else is allowed beside 'self'
test("every file carries the Content-Security-Policy: this site only, no inline scripts", async ({ request }) => {
  for (const path of ["./", "sw.js", "js/main.js"]) {
    const csp = (await request.get(path)).headers()["content-security-policy"] || "";
    expect(csp, path).toContain("default-src 'self'");
    expect(csp, path).toMatch(/script-src 'self' 'wasm-unsafe-eval'(;|$)/);
  }
});

// Type checks (npm run types) cover only the files that start with "// @ts-check" (tests/tsconfig.json). Every script
// has it now; a new file starts with it too (CLAUDE.md). The list of files waiting for it stays empty.
const UNCHECKED = [];

test("every script is type-checked", () => {
  const all = readdirSync(new URL("../js/", import.meta.url), { recursive: true })
    .map(String)
    .filter((f) => f.endsWith(".js"))
    .map((f) => "js/" + f.split("\\").join("/"));
  const unchecked = all.filter((f) => !readFileSync(new URL("../" + f, import.meta.url), "utf8").startsWith("// @ts-check")).sort();
  expect(unchecked, "files without // @ts-check on their first line").toEqual(UNCHECKED);
});

// The layers (js/README.md): core, text and store are the ground the features stand on, so they never import a feature
// or the printout; a feature that needs to know is told through a page event ("nitya-fold"). The parts that only
// start things up or show things are features.
test("core, text and store import no feature", () => {
  const low = readdirSync(new URL("../js/", import.meta.url), { recursive: true })
    .map((f) => String(f).split("\\").join("/"))
    .filter((f) => /^(core|text|store)\/.*\.js$/.test(f));
  const up = low.flatMap((f) =>
    [...readFileSync(new URL("../js/" + f, import.meta.url), "utf8").matchAll(/^import [^;]*? from "([^"]+)";/gms)]
      .map((m) => m[1])
      .filter((m) => /\/(features|print)\//.test(m))
      .map((m) => f + " → " + m),
  );
  expect(up).toEqual([]);
});
