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
  const files = ["core", "text", "features", "print", "store"].flatMap((d) =>
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
// change and say why. (Set 2026-10-29: scripts 247 KB, styles 63 KB, index.html 27 KB.)
test("the scripts, styles and page stay within their size budget", () => {
  const parts = siteParts();
  const gz = (files) => files.reduce((n, f) => n + gzipSync(readFileSync(new URL("../" + f, import.meta.url))).length, 0);
  expect(gz([...parts.scripts, ...parts.modules]), "scripts, gzip bytes").toBeLessThanOrEqual(260_000);
  expect(gz(parts.css), "styles, gzip bytes").toBeLessThanOrEqual(66_000);
  expect(gz(["index.html"]), "index.html, gzip bytes").toBeLessThanOrEqual(30_000);
});
