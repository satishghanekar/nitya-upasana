// Shared helpers for the regression suite.
//
// Every test opens the site with a known set of reader settings (the same object js/core/state.js keeps in
// localStorage under "aarti2-prefs") and a fixed date, so the date card, the "in N days" badge and
// every screenshot are the same on every run.

import { readFileSync } from "node:fs";
import vm from "node:vm";
import { createRequire } from "node:module";

export const PREFS_KEY = "aarti2-prefs";

// Screenshots and printed page counts depend on the machine's font rendering, so each machine type keeps
// its own: "cloud" (the Claude cloud session, the reference set) and "ci" (GitHub Actions, in the Playwright Docker image).
// Text snapshots are the same everywhere and are shared.
export const SNAP_ENV = process.env.SNAPSHOT_ENV || (process.env.CI ? "ci" : "cloud");
// 2026-10-15 10:00 in Columbus: a normal day, a few days before the next Sankashti
export const FIXED_NOW = new Date("2026-10-15T10:00:00-04:00");

// Settings that make a run repeatable: current settings version (so no migration runs), screen
// wake off, no saved reading position (the reading position lives under its own key and is cleared).
// How many texts the site can build (one section.ash each, when it is opened): every text in content/library.json
export const TEXT_COUNT = JSON.parse(readFileSync(new URL("../content/library.json", import.meta.url), "utf8")).texts.length;

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
 * @param {object} [opt]   { hash: "#a1", errors: array that collects page errors, now: a Date other than FIXED_NOW,
 *                          running: true to start the clock at that time and let the test move it (page.clock.runFor) }
 */
export async function openSite(page, prefs = {}, opt = {}) {
  const all = { ...BASE_PREFS, ...prefs };
  if (opt.running) await page.clock.install({ time: opt.now || FIXED_NOW });
  else await page.clock.setFixedTime(opt.now || FIXED_NOW);
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

/**
 * Build every piece on the page, as opening each one would (js/core/page.js builds a piece the first time it is
 * opened). The page's own module is imported again, which gives the same copy the site runs on.
 */
export async function buildAll(page) {
  await page.evaluate(async () => {
    const m = await import(new URL("js/core/page.js", document.baseURI).href);
    window.CONTENT.categories.forEach((c) => c.pieces.forEach((p) => m.pieceEl(p.id)));
  });
}

/** The text a reader sees in every piece, piece by piece (hidden parts excluded). */
export async function pieceText(page) {
  await buildAll(page);
  // Home on its own (data-hv) hides the reading page, and the page shows one text at a time (.solo): each piece is
  // shown for the read, as opening it would
  return page.evaluate(() => {
    const r = document.documentElement,
      hv = r.getAttribute("data-hv");
    r.removeAttribute("data-hv");
    const t = [...document.querySelectorAll("section.ash")]
      .map((s) => {
        const was = s.classList.contains("solo");
        s.classList.add("solo");
        const x = "### " + s.id + "\n" + s.innerText.replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
        if (!was) s.classList.remove("solo");
        return x;
      })
      .join("\n\n");
    if (hv !== null) r.setAttribute("data-hv", hv);
    return t;
  });
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

/** Share, QR, Print, Help (and Add to Home Screen) sit under More on the home page: open it (as a reader would), then
 *  tap the button. */
/** ⋯ More in the top bar: App, Share, QR, Print and Help. A choice closes it, and focus comes back to ⋯. */
export async function openMore(page) {
  if (!(await page.locator("#shr").isVisible())) await page.locator("#tmb").click();
}
export async function tapMore(page, id) {
  await openMore(page);
  await page.locator(id).click();
}

// Accessibility (axe-core, WCAG 2.2 A/AA + best practice). A theme changes only colours (and high contrast's text
// weight), so a screen is scanned in full once, then switched to each other theme in place, on the same page, and
// checked for the colour rules only (axeEveryTheme). Every screen is still checked in every theme, without opening
// the site and running every rule again for each.
export const AXE_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"];
export const CONTRAST_RULES = ["color-contrast", "link-in-text-block"];
const AXE_SOURCE = readFileSync(createRequire(import.meta.url).resolve("axe-core/axe.min.js"), "utf8");
// What Settings sets for each theme (Theme and High contrast), the way a reader switches it
export const THEMES = {
  dark: { th: "dark", hc: 0 },
  sepia: { th: "sepia", hc: 0 },
  "high contrast": { th: "auto", hc: 1 },
};

/**
 * axe on the page, or on the parts `include` names. Returns the violations as short lines (an empty list passes).
 * @param {object} [opt]  { rules: only these rules; mismatch: keep label-content-name-mismatch on (it is off by default:
 *                        axe 4.14 counts the letters drawn inside aria-hidden SVG icons; a11y.spec.mjs checks
 *                        WCAG 2.5.3 on the visible text instead) }
 */
export async function axeScan(page, include = [], opt = {}) {
  // axe-core itself, run in the page (the version @axe-core/playwright uses). AxeBuilder re-injects it and merges
  // the results in a second blank page on every scan, which doubled the time of a scan. The page's only frame is the
  // print view's hidden layout frame (aria-hidden, off screen), so frames are left out.
  if (!(await page.evaluate(() => "axe" in window))) await page.evaluate(AXE_SOURCE);
  const sel = [].concat(include);
  const options = opt.rules
    ? { iframes: false, runOnly: { type: "rule", values: opt.rules } }
    : { iframes: false, runOnly: { type: "tag", values: AXE_TAGS }, rules: opt.mismatch ? {} : { "label-content-name-mismatch": { enabled: false } } };
  const violations = await page.evaluate(
    ([sel, options]) =>
      // @ts-ignore axe is injected above
      window.axe.run(sel.length ? { include: sel.map((s) => [s]) } : document, options).then((r) =>
        r.violations.map((v) => ({ id: v.id, impact: v.impact, targets: v.nodes.map((n) => n.target.join(" ")) })),
      ),
    [sel, options],
  );
  return violations.map((v) => `${v.id} (${v.impact}): ${v.targets.slice(0, 5).join(", ")}`);
}

/** Switch theme and high contrast in place, through Settings' own buttons (Settings itself can stay closed). */
export async function setTheme(page, { th, hc }) {
  await page.evaluate(
    async ({ th, hc }) => {
      /** @type {HTMLElement} */ (document.querySelector(`#st button[data-v="${th}"]`)).click();
      if (document.documentElement.getAttribute("data-hc") !== String(hc)) /** @type {HTMLElement} */ (document.getElementById("tc")).click();
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    },
    { th, hc },
  );
  // Settings' switches fade their colour over 0.2 s
  await page.waitForTimeout(250);
}

/**
 * Every rule in the theme the page opened in, then the colour rules in each other theme. Returns
 * { "<theme>": violations } for every theme checked, so a failure names the theme. The page goes back to the theme it
 * was in, so a test can carry on.
 * @param {string[]} [themes]  names from THEMES (default: all three)
 */
export async function axeEveryTheme(page, include = [], opt = {}, themes = Object.keys(THEMES)) {
  const was = await page.evaluate(() => ({
    th: document.documentElement.getAttribute("data-pref") || "auto",
    hc: Number(document.documentElement.getAttribute("data-hc") || 0),
  }));
  const found = { "as opened": await axeScan(page, include, opt) };
  for (const name of themes) {
    await setTheme(page, THEMES[name]);
    found[name] = await axeScan(page, include, { rules: CONTRAST_RULES });
  }
  await setTheme(page, was);
  return found;
}
/** What axeEveryTheme returns when nothing is wrong. */
export function noViolations(themes = Object.keys(THEMES)) {
  return Object.fromEntries(["as opened", ...themes].map((t) => [t, []]));
}

/** Home shows only what to chant now; a text is read by opening it, here from the Library (as a reader would). */
export async function readText(page, sec) {
  // the top bar's book on the home page; while reading, the bottom bar's
  await page.locator((await page.locator("#hm").isVisible()) ? "#hm" : "#asq").click();
  await page.locator(`#jl a[data-go="${sec}"]`).click();
  await page.locator(`#${sec}`).waitFor({ state: "visible" });
}

// The routine the behaviour tests of Home and the routine builder run on, whatever Satish's schedule is today
// (content/routines.json changes as texts are added): the first default, v1.10 (Morning = the Ganapati Atharvashirsha,
// Evening = the ten aartis in the Library's order, Afternoon empty). The bundled default has its own tests
// (unit/today.test.mjs and "the bundled default" in today.spec.mjs).
export const TEST_AARTIS = ["sukhkarta", "shendur-lal-chadhayo", "durge-durghat-bhari", "lavathavati-vikrala", "trigunatmak-traimurti",
  "aarti-dnyanaraja", "yei-o-vitthale", "ghalin-lotangan", "jai-ganesh-deva", "jai-jagdish-hare"];
export const TEST_ROUTINE = {
  morning: { mode: "fixed", texts: ["atharvashirsha"] },
  afternoon: { mode: "fixed", texts: [] },
  evening: { mode: "fixed", texts: TEST_AARTIS },
};
/** Serve TEST_ROUTINE in place of content/routines.json (call before openSite). */
export async function useTestRoutine(page) {
  await page.route("**/content/routines.json", (r) => r.fulfill({ contentType: "application/json", body: JSON.stringify(TEST_ROUTINE) }));
}
