// Shared helpers for the regression suite.
//
// Every test opens the site with a known set of reader settings (the same object js/core/state.js keeps in
// localStorage under "aarti2-prefs") and a fixed date, so the date card, the "in N days" badge and
// every screenshot are the same on every run.

import { readFileSync } from "node:fs";
import vm from "node:vm";

export const PREFS_KEY = "aarti2-prefs";

// Screenshots and printed page counts depend on the machine's font rendering, so each machine type keeps
// its own: "ci" (GitHub Actions, in the Playwright Docker image) and "local" (a developer's computer).
// Text snapshots are the same everywhere and are shared.
export const SNAP_ENV = process.env.SNAPSHOT_ENV || (process.env.CI ? "ci" : "local");
// 2026-10-15 10:00 in Columbus: a normal day, a few days before the next Sankashti
export const FIXED_NOW = new Date("2026-10-15T10:00:00-04:00");

// Settings that make a run repeatable: current settings version (so no migration runs), screen
// wake off, no saved reading position (the reading position lives under its own key and is cleared).
export const BASE_PREFS = { sv: 6, wake: 0 };

/** Named reader set-ups used across suites. Each is merged over BASE_PREFS. */
export const SETUPS = {
  "marathi": { lang: "mr", lead: "mr", l2: "en" },
  "english": { lang: "en", lead: "mr", l2: "en" },
  "both": { lang: "both", lead: "mr", l2: "en" },
  "english-iast": { lang: "en", lead: "mr", l2: "en", tr: "iast" },
  "both-iast": { lang: "both", lead: "mr", l2: "en", tr: "iast" },
  "english-main-both": { lang: "both", lead: "en", l2: "mr" },
  "kannada": { lang: "mr", lead: "mr", l2: "en", ind: "kn" },
  "kannada-both": { lang: "both", lead: "mr", l2: "en", ind: "kn" },
  "marathi-every-verse": { lang: "mr", lead: "mr", l2: "en", ref: 0 },
  "marathi-menus": { lang: "mr", lead: "mr", l2: "en", ui: "mr" },
};

/**
 * Open the site with the given settings.
 * @param {import('@playwright/test').Page} page
 * @param {object} prefs   settings merged over BASE_PREFS
 * @param {object} [opt]   { hash: "#a1", errors: array that collects page errors, now: a Date other than FIXED_NOW }
 */
export async function openSite(page, prefs = {}, opt = {}) {
  const all = { ...BASE_PREFS, ...prefs };
  await page.clock.setFixedTime(opt.now || FIXED_NOW);
  await page.addInitScript(
    ([k, v]) => {
      // only on the first load of this page: a test that reloads keeps what the site saved
      if (sessionStorage.getItem("__seeded")) return;
      sessionStorage.setItem("__seeded", "1");
      localStorage.clear();
      localStorage.setItem(k, v);
    },
    [PREFS_KEY, JSON.stringify(all)],
  );
  if (opt.errors) {
    page.on("pageerror", (e) => opt.errors.push(e.message));
    page.on("console", (m) => m.type() === "error" && opt.errors.push(m.text()));
  }
  await page.goto("./" + (opt.hash || ""), { waitUntil: "load" });
  await settle(page);
}

/** Wait until the texts are in the page, fonts have loaded and the page has stopped re-fitting its text. */
export async function settle(page) {
  // the texts are fetched after the page loads (js/text/load.js); data-ready is set once every part has started
  await page.waitForFunction(() => document.documentElement.hasAttribute("data-ready"));
  await page.evaluate(async () => {
    await document.fonts.ready;
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  });
  // auto-fit and the two-column "pull" run on short timers after fonts arrive
  await page.waitForTimeout(250);
}

/** The text a reader sees in every piece, piece by piece (hidden parts excluded). */
export async function pieceText(page) {
  return page.evaluate(() =>
    [...document.querySelectorAll("section.ash")]
      .map((s) => "### " + s.id + "\n" + s.innerText.replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim())
      .join("\n\n"),
  );
}

/** True when the page is wider than the window (a sideways scroll appears). */
export async function hasSidewaysScroll(page) {
  return page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
}

/** The site's file lists (js/parts.js, the one list the page and the service worker share). */
export function siteParts() {
  const ctx = {};
  vm.runInNewContext(readFileSync(new URL("../js/parts.js", import.meta.url), "utf8"), ctx);
  return ctx.SITE_PARTS;
}
