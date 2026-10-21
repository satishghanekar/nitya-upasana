// Layout across screen sizes: from the smallest phones to large monitors, in portrait and landscape.
// Checks the things that break first on an unfamiliar screen: a sideways scroll, a bar that is off
// screen, text that is too small to read, and controls too small to tap.
import { test, expect } from "@playwright/test";
import { openSite, hasSidewaysScroll, SETUPS, buildAll, readText } from "./helpers.mjs";

export const SCREENS = [
  { name: "phone-320", width: 320, height: 640, mobile: true },
  { name: "iphone-se", width: 375, height: 667, mobile: true },
  { name: "iphone-15", width: 393, height: 852, mobile: true },
  { name: "android-412", width: 412, height: 915, mobile: true },
  { name: "phone-landscape", width: 844, height: 390, mobile: true },
  { name: "ipad-mini", width: 768, height: 1024, mobile: true },
  { name: "ipad-air", width: 820, height: 1180, mobile: true },
  { name: "ipad-landscape", width: 1180, height: 820, mobile: true },
  { name: "android-tablet", width: 800, height: 1280, mobile: true },
  { name: "laptop", width: 1280, height: 800, mobile: false },
  { name: "desktop", width: 1440, height: 900, mobile: false },
  { name: "full-hd", width: 1920, height: 1080, mobile: false },
  { name: "monitor-1440p", width: 2560, height: 1440, mobile: false },
];

for (const s of SCREENS)
  for (const setup of ["marathi", "both", "kannada-both"]) {
    test(`${s.name} · ${setup}: fits the screen`, async ({ browser, browserName }) => {
      const context = await browser.newContext({
        viewport: { width: s.width, height: s.height },
        // Firefox has no mobile emulation; it still checks the sizes
        ...(browserName !== "firefox" ? { isMobile: s.mobile, hasTouch: s.mobile } : {}),
        serviceWorkers: "block",
      });
      const page = await context.newPage();
      const errors = [];
      await openSite(page, SETUPS[setup], { errors });
      expect(errors).toEqual([]);
      expect(await hasSidewaysScroll(page), "no sideways scroll on the home page").toBe(false);
      // the top bar is on screen and fully inside it
      const bar = await page.locator(".bar").boundingBox();
      expect(bar.y).toBeGreaterThanOrEqual(0);
      expect(bar.x + bar.width).toBeLessThanOrEqual(s.width + 1);
      // open a piece: still no sideways scroll, and the text is readable
      await readText(page, "a1");
      await page.waitForTimeout(150);
      expect(await hasSidewaysScroll(page), "no sideways scroll in a piece").toBe(false);
      const size = await page.evaluate(() => parseFloat(getComputedStyle(document.querySelector("#a1 .verse p")).fontSize));
      expect(size, "verse text at least 16px").toBeGreaterThanOrEqual(16);
      // no verse line is wider than the screen
      const wide = await page.evaluate((w) =>
        [...document.querySelectorAll(".verse p")].filter((p) => {
          const r = p.getBoundingClientRect();
          return r.width && r.right > w + 1;
        }).length, s.width);
      expect(wide, "verse lines wider than the screen").toBe(0);
      await context.close();
    });
  }

test("tap targets in the top and bottom bars are at least 44px @mobile", async ({ page }) => {
  await openSite(page, SETUPS.marathi);
  const small = await page.evaluate(() =>
    [...document.querySelectorAll(".bar button, .bar a, #asc button")]
      .filter((b) => b.offsetParent !== null)
      .map((b) => ({ id: b.id, ...b.getBoundingClientRect().toJSON() }))
      .filter((r) => r.width < 44 || r.height < 44)
      .map((r) => `${r.id} ${Math.round(r.width)}×${Math.round(r.height)}`),
  );
  expect(small).toEqual([]);
});

// Vedic chants (layout: prose) in one language run on as paragraphs, as in Satish's booklets (v1.17)
const PROSE = ["shree-rudra", "p1", "purusha-suktam"];
// Every danda (। ॥ |) sits on the same row as the character before it, so no row starts with one
async function dandasStartingRows(page, id, lang) {
  return page.evaluate(
    ([id, lang]) => {
      const bad = [];
      document.querySelectorAll("#" + id + " .verse ." + lang + " p").forEach((p) => {
        const w = document.createTreeWalker(p, NodeFilter.SHOW_TEXT);
        let prev = null, n;
        while ((n = w.nextNode()))
          for (let i = 0; i < n.data.length; i++) {
            const c = n.data[i];
            if (/\s/.test(c)) continue;
            const r = document.createRange();
            r.setStart(n, i);
            r.setEnd(n, i + 1);
            const box = r.getClientRects()[0];
            if (/[।॥|]/.test(c) && prev && box && box.top > prev.bottom - 2) bad.push(p.getAttribute("data-l"));
            if (box) prev = box;
          }
      });
      return bad;
    },
    [id, lang],
  );
}

for (const s of SCREENS.filter((x) => ["iphone-15", "ipad-air", "ipad-landscape", "desktop"].includes(x.name)))
  for (const setup of ["marathi", "english"])
    test(`${s.name} · ${setup}: Vedic chants run on as paragraphs`, async ({ browser, browserName }) => {
      const context = await browser.newContext({
        viewport: { width: s.width, height: s.height },
        ...(browserName !== "firefox" ? { isMobile: s.mobile, hasTouch: s.mobile } : {}),
        serviceWorkers: "block",
      });
      const page = await context.newPage();
      await openSite(page, SETUPS[setup], { hash: "#shree-rudra" });
      const lang = setup === "english" ? "en" : "mr";
      for (const id of PROSE) {
        // one text at a time (.solo): each is opened before it is measured
        if (id !== "shree-rudra") await openSite(page, SETUPS[setup], { hash: "#" + id });
        const st = await page.evaluate(
          ([id, lang]) => {
            const sec = document.getElementById(id),
              p = sec.querySelector(".item.para .verse ." + lang + " p"),
              para = p.parentElement,
              wrap = sec.querySelector(".items").getBoundingClientRect();
            return {
              line: getComputedStyle(p).display,
              items: getComputedStyle(sec.querySelector(".items")).display,
              indent: parseFloat(getComputedStyle(para).textIndent),
              // lines share rows: some line ends on the row where the next one starts
              shared: [...para.querySelectorAll("p")].some((x, i, all) => {
                if (!all[i + 1]) return false;
                const a = [...x.getClientRects()].pop(),
                  b = all[i + 1].getClientRects()[0];
                return Math.abs(a.top + a.height / 2 - (b.top + b.height / 2)) < a.height / 2;
              }),
              wide: wrap.width,
            };
          },
          [id, lang],
        );
        expect(st.line, id + " lines run on").toBe("inline");
        expect(st.items, id + " one column").toBe("block");
        expect(st.indent, id + " paragraph indented").toBeGreaterThan(0);
        expect(st.shared, id + " lines share a row").toBe(true);
        expect(st.wide, id + " rows no wider than 52rem").toBeLessThanOrEqual(52 * 16 + 1);
        expect(await dandasStartingRows(page, id, lang), id + " rows starting with a danda").toEqual([]);
      }
      expect(await hasSidewaysScroll(page)).toBe(false);
      await context.close();
    });

test("Vedic chants keep their lines in pairs with both languages", async ({ page }) => {
  await openSite(page, SETUPS.both, { hash: "#shree-rudra" });
  await buildAll(page);
  const shown = await page.evaluate(
    (ids) => ids.map((id) => getComputedStyle(document.querySelector("#" + id + " .item.para .verse .mr p")).display),
    PROSE,
  );
  expect(shown).toEqual(["block", "block", "block"]);
});

test("Vedic chants: the run-on paragraphs survive a switch to IAST", async ({ page }) => {
  await page.setViewportSize({ width: 393, height: 852 });
  await openSite(page, SETUPS.english, { hash: "#shree-rudra" });
  await page.evaluate(() => {
    const s = document.getElementById("sl2s");
    s.value = [...s.options].find((x) => /ā/.test(x.textContent)).value;
    s.dispatchEvent(new Event("change", { bubbles: true }));
  });
  await page.waitForTimeout(300);
  const nb = await page.evaluate(() => document.querySelectorAll("#shree-rudra .verse .en p.ia .nb").length);
  expect(nb, "dandas glued again in IAST").toBeGreaterThan(100);
  for (const id of PROSE) expect(await dandasStartingRows(page, id, "en"), id).toEqual([]);
});
