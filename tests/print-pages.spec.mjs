// How many pages every text prints on, alone, in nine combinations, against a baseline (tests/tools/print-pages.json):
// a change to the printout that makes any text take a page more fails here, before anyone prints it. Satish
// (2026-11-18): "every time we touch print it's a nightmare"; the book printout's first try made eight texts a page
// longer, which only a count like this showed.
//
//   npm run print-pages              count and compare (a text with more pages fails; fewer are listed)
//   npm run print-pages -- --update  count and record the counts as the new baseline
//
// The counts are Chrome's PDF on this machine: they depend on its fonts, so the baseline is a Mac's and CI doesn't run
// it (PRINT_PAGES unset, every test here is skipped). Run it, on a Mac, after any change to css/15-print.css,
// js/print/ or js/features/print.js, and when a text is added or changed (README.md, "Print tests").

import { test, expect } from "@playwright/test";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { openSite, SETUPS } from "./helpers.mjs";
import { IDS } from "./content-files.mjs";
import { stubPrint } from "./print-helpers.mjs";

const ON = !!process.env.PRINT_PAGES;
const UPDATE = !!process.env.PRINT_PAGES_UPDATE;
const BASE = new URL("./tools/print-pages.json", import.meta.url);

// name, setup, print mode ("as" one language, "side" both), extra settings, paper
const COMBOS = [
  ["marathi", "marathi", "as", {}, "Letter"],
  ["marathi-a4", "marathi", "as", { ppr: "a4" }, "A4"],
  ["marathi-bold", "marathi", "as", { pfn: "bold" }, "Letter"],
  ["marathi-modern", "marathi", "as", { pfn: "std" }, "Letter"],
  ["marathi-every-verse", "marathi", "as", { pref: 0 }, "Letter"],
  ["marathi-landscape", "marathi", "as", { por: "land" }, "Letter"],
  ["english", "english", "as", {}, "Letter"],
  ["both", "both", "side", {}, "Letter"],
  ["both-bold", "both", "side", { pfn: "bold" }, "Letter"],
];

test.describe.configure({ mode: "parallel" });

for (const [name, setup, mode, extra, paper] of COMBOS)
  test(`print pages · ${name} @chromium-only`, async ({ browser }) => {
    test.skip(!ON, "npm run print-pages");
    test.setTimeout(600_000);
    const got = {};
    const context = await browser.newContext({ locale: "en-US", serviceWorkers: "block" });
    for (const id of IDS) {
      const page = await context.newPage();
      await stubPrint(page);
      await openSite(page, { ...SETUPS[setup], ...extra }, { hash: "?print=" + mode + "&t=" + id });
      await page.waitForFunction(() => window.__printed > 0, null, { timeout: 20_000 });
      await page.emulateMedia({ media: "print" });
      await page.evaluate(() => document.fonts.ready);
      const pdf = await page.pdf({ format: paper, preferCSSPageSize: true });
      got[id] = (pdf.toString("latin1").match(/\/Type\s*\/Page[^s]/g) || []).length;
      await page.close();
    }
    await context.close();
    // (each combination writes its own part of the baseline file: the tests run in parallel)
    const file = new URL(`./tools/print-pages-${name}.json`, import.meta.url);
    if (UPDATE) {
      writeFileSync(file, JSON.stringify(got, null, 1) + "\n");
      return;
    }
    const all = existsSync(BASE) ? JSON.parse(readFileSync(BASE, "utf8")) : {};
    const was = all[name] || {};
    const more = Object.keys(got)
      .filter((id) => id in was && got[id] > was[id])
      .map((id) => `${id}: ${was[id]} → ${got[id]}`);
    const fewer = Object.keys(got)
      .filter((id) => id in was && got[id] < was[id])
      .map((id) => `${id}: ${was[id]} → ${got[id]}`);
    const fresh = Object.keys(got).filter((id) => !(id in was));
    if (fewer.length) console.log(`${name}: a page fewer (run --update to keep it): ${fewer.join(", ")}`);
    if (fresh.length) console.log(`${name}: not in the baseline yet (run --update): ${fresh.join(", ")}`);
    expect(more, `${name}: texts that now take more pages`).toEqual([]);
  });
