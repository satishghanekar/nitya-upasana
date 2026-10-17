// Content integrity: the exact text a reader sees in every piece, for every language set-up.
// The snapshots were recorded from the site before the refactor, so any change to a line, a Vedic
// mark, a stanza number or a dhrupad marker shows up here as a text diff.
import { test, expect } from "@playwright/test";
import { openSite, pieceText, SETUPS } from "./helpers.mjs";

for (const name of Object.keys(SETUPS)) {
  test(`piece text: ${name} @chromium-only`, async ({ page }) => {
    await openSite(page, SETUPS[name]);
    expect(await pieceText(page)).toMatchSnapshot(`pieces-${name}.txt`);
  });
}

test("home page contents and menus @chromium-only", async ({ page }) => {
  await openSite(page, SETUPS.marathi);
  const home = await page.evaluate(() => document.getElementById("home").innerText.trim());
  expect(home.replace(/[ \t]+\n/g, "\n")).toMatchSnapshot("home-marathi.txt");
});

test("home page in Marathi menus @chromium-only", async ({ page }) => {
  await openSite(page, SETUPS["marathi-menus"]);
  const home = await page.evaluate(() => document.getElementById("home").innerText.trim());
  expect(home.replace(/[ \t]+\n/g, "\n")).toMatchSnapshot("home-marathi-menus.txt");
});

test("every line has a unique id and a partner in the other language @chromium-only", async ({ page }) => {
  await openSite(page, SETUPS.both);
  const r = await page.evaluate(() => {
    const ids = [...document.querySelectorAll(".verse .mr p[data-l]")].map((p) => p.dataset.l);
    const dup = ids.filter((x, i) => ids.indexOf(x) !== i);
    const unpaired = [...document.querySelectorAll(".verse")].filter(
      (v) => v.querySelectorAll(".mr p").length !== v.querySelectorAll(".en p").length,
    ).length;
    return { n: ids.length, dup, unpaired };
  });
  expect(r.n).toBeGreaterThan(200);
  expect(r.dup).toEqual([]);
  expect(r.unpaired).toBe(0);
});
