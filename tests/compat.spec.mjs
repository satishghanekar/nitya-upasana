// Compatibility with the oldest supported browsers (iOS 15.4+, see .browserslistrc).
// The lint (npm run lint) catches most unsupported features; these tests cover what a linter can't.
import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { openSite, SETUPS, siteParts } from "./helpers.mjs";

// all the style files, joined in the order the page loads them
const CSS = siteParts()
  .css.map((f) => readFileSync(new URL("../" + f, import.meta.url), "utf8"))
  .join("\n");
const FALLBACK = /@supports not \(color: color-mix\(in srgb, red 50%, blue\)\) \{/;

// color-mix() needs iOS 16.2. Every rule that uses it must have a plain-colour twin in the fallback
// block, or it vanishes on iOS 15 (the linter doesn't know about color-mix, so this test does).
test("every color-mix() has an iOS 15 fallback", () => {
  const start = CSS.search(FALLBACK);
  expect(start, "fallback block present").toBeGreaterThan(0);
  const main = CSS.slice(0, start).replace(/\/\*[\s\S]*?\*\//g, "");
  const fallback = CSS.slice(start);
  const missing = [];
  for (const m of main.matchAll(/([^{}]+)\{([^{}]*color-mix[^{}]*)\}/g)) {
    const sel = m[1].trim().split(",").map((s) => s.trim());
    const props = [...m[2].matchAll(/([\w-]+)\s*:[^;]*color-mix/g)].map((p) => p[1]);
    // text-decoration-color falls back to the text colour by itself
    for (const prop of props.filter((p) => p !== "text-decoration-color"))
      for (const s of sel) {
        const esc = s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const re = new RegExp("(^|[,{}]\\s*)" + esc + "\\s*[,{][^}]*" + prop + "\\s*:", "m");
        if (!re.test(fallback)) missing.push(`${s} { ${prop} }`);
      }
  }
  expect(missing).toEqual([]);
});

// Make Chromium behave like iOS 15 Safari for color-mix(): every color-mix() is made invalid (so the
// declaration is dropped, as Safari 15 does) and the fallback block is switched on. The Settings
// switches must still show a track, and the home card its sheet colour.
test("without color-mix() the Settings switches and home card keep their colours @chromium-only", async ({ page }) => {
  await page.route("**/css/*.css", async (route) => {
    const file = new URL(route.request().url()).pathname.slice(1);
    const body = readFileSync(new URL("../" + file, import.meta.url), "utf8")
      .replace(FALLBACK, "@supports (color: red) {")
      .replace(/color-mix\(/g, "no-such-function(");
    await route.fulfill({ body, contentType: "text/css" });
  });
  await openSite(page, SETUPS.marathi);
  await page.locator("#aa").click();
  const sw = await page.locator("#tc").evaluate((e) => {
    const a = getComputedStyle(e, "::after");
    return { knob: a.backgroundImage, track: a.backgroundColor };
  });
  expect(sw.knob, "the switch knob is drawn").toContain("radial-gradient");
  expect(sw.track, "the switch track has a colour").not.toBe("rgba(0, 0, 0, 0)");
  await page.locator("#xc").click();
  const sheet = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--sheet").trim());
  expect(sheet).not.toBe("");
  expect(sheet).not.toContain("no-such-function");
});

// Old iOS has no dvh: the contents overlay must still be limited to the screen height
test("the contents overlay has a vh fallback for browsers without dvh", () => {
  expect(CSS).toMatch(/max-height: calc\(100vh - 90px\);\s*\/\*[^*]*\*\/\s*max-height: calc\(100dvh - 90px\);/);
});

test("pages work with reduced motion and without hover (touch screens) @mobile", async ({ page }) => {
  const errors = [];
  await openSite(page, SETUPS.both, { errors });
  expect(errors).toEqual([]);
});
