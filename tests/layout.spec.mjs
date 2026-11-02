// Layout across screen sizes: from the smallest phones to large monitors, in portrait and landscape.
// Checks the things that break first on an unfamiliar screen: a sideways scroll, a bar that is off
// screen, text that is too small to read, and controls too small to tap.
import { test, expect } from "@playwright/test";
import { openSite, hasSidewaysScroll, SETUPS, buildAll, readText, openPrintBuilder, settingsTab } from "./helpers.mjs";

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
      const wide = await page.evaluate(
        (w) =>
          [...document.querySelectorAll(".verse p")].filter((p) => {
            const r = p.getBoundingClientRect();
            return r.width && r.right > w + 1;
          }).length,
        s.width,
      );
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
const PROSE = ["vedic-chant-shree-rudra", "p1", "vedic-chant-purusha-suktam"];
// Every danda (। ॥ |) sits on the same row as the character before it, so no row starts with one
async function dandasStartingRows(page, id, lang) {
  return page.evaluate(
    ([id, lang]) => {
      const bad = [];
      document.querySelectorAll("#" + id + " .verse ." + lang + " p").forEach((p) => {
        const w = document.createTreeWalker(p, NodeFilter.SHOW_TEXT);
        let prev = null,
          n;
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
      await openSite(page, SETUPS[setup], { hash: "#vedic-chant-shree-rudra" });
      const lang = setup === "english" ? "en" : "mr";
      for (const id of PROSE) {
        // one text at a time (.solo): each is opened before it is measured
        if (id !== "vedic-chant-shree-rudra") await openSite(page, SETUPS[setup], { hash: "#" + id });
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
              // the row width in the text's own size (em)
              wide: wrap.width / parseFloat(getComputedStyle(sec.querySelector(".items")).fontSize),
            };
          },
          [id, lang],
        );
        expect(st.line, id + " lines run on").toBe("inline");
        expect(st.items, id + " one column").toBe("block");
        // no indent: the paragraphs open with a gap, as on paper (css/15-print.css)
        expect(st.indent, id + " paragraph not indented").toBe(0);
        expect(st.shared, id + " lines share a row").toBe(true);
        // the printed page's measure (33.6em, css/15-print.css), so the rows break where the printout's do
        expect(st.wide, id + " rows no wider than the printed page").toBeLessThanOrEqual(33.61);
        expect(await dandasStartingRows(page, id, lang), id + " rows starting with a danda").toEqual([]);
      }
      expect(await hasSidewaysScroll(page)).toBe(false);
      await context.close();
    });

test("Vedic chants keep their lines in pairs with both languages", async ({ page }) => {
  await openSite(page, SETUPS.both, { hash: "#vedic-chant-shree-rudra" });
  await buildAll(page);
  const shown = await page.evaluate((ids) => ids.map((id) => getComputedStyle(document.querySelector("#" + id + " .item.para .verse .mr p")).display), PROSE);
  expect(shown).toEqual(["block", "block", "block"]);
});

test("Vedic chants: the run-on paragraphs survive a switch to IAST", async ({ page }) => {
  await page.setViewportSize({ width: 393, height: 852 });
  await openSite(page, SETUPS.english, { hash: "#vedic-chant-shree-rudra" });
  await page.evaluate(() => {
    const s = document.getElementById("sl2s");
    s.value = [...s.options].find((x) => /ā/.test(x.textContent)).value;
    s.dispatchEvent(new Event("change", { bubbles: true }));
  });
  await page.waitForTimeout(300);
  const nb = await page.evaluate(() => document.querySelectorAll("#vedic-chant-shree-rudra .verse .en p.ia .nb").length);
  expect(nb, "dandas glued again in IAST").toBeGreaterThan(100);
  for (const id of PROSE) expect(await dandasStartingRows(page, id, "en"), id).toEqual([]);
});

// Tap targets that look smaller than 44px (Settings' choices, 32px, so the Reading tab fits one iPhone screen; Use A4)
// reach 44px with an invisible area above and below (the 2026-11-02 walk-through): a tap 5px outside what is drawn
// still reaches the button, and no button's own middle is taken by another's area
async function reach(page, sel) {
  return page.evaluate((s) => {
    const out = [];
    const bs = [...document.querySelectorAll(s)].filter((b) => b.getClientRects().length && !b.closest("[hidden]"));
    for (const b of bs) {
      b.scrollIntoView({ block: "center" });
      const r = b.getBoundingClientRect(),
        x = r.left + r.width / 2,
        name = b.textContent.trim().slice(0, 20);
      // (44px: 6px more above and below what is drawn; checked 5.5px out)
      for (const y of [r.top - 5.5, r.bottom + 5.5, r.top + r.height / 2]) {
        const hit = document.elementFromPoint(x, y);
        if (!hit || !(hit === b || b.contains(hit)))
          out.push(`${name} at ${Math.round(y - r.top)}: ${hit ? hit.tagName + "#" + hit.id + "." + hit.className : "nothing"}`);
      }
    }
    return { n: bs.length, out };
  }, sel);
}
for (const [name, size] of [
  ["a phone", { width: 390, height: 844 }],
  ["an upright iPad", { width: 820, height: 1180 }],
  ["a computer", { width: 1440, height: 900 }],
])
  test(`tap targets: Settings' choices and Use A4 reach 44px, ${name}`, async ({ page }) => {
    await page.setViewportSize(size);
    await openSite(page, SETUPS.marathi);
    await page.locator("#aa").click();
    for (const tab of ["read", "screen"]) {
      await settingsTab(page, tab);
      const r = await reach(page, "#panel .sp-seg button");
      expect(r.n, tab).toBeGreaterThan(5);
      expect(r.out, tab).toEqual([]);
    }
    await page.keyboard.press("Escape");
    await openPrintBuilder(page);
    if (await page.locator("#prnx").isVisible()) await page.locator("#prnx").click();
    await expect(page.locator("#prpa")).toBeVisible();
    expect((await reach(page, "#prpa")).out).toEqual([]);
    for (const b of await page.locator(".wide:visible").all()) expect((await b.boundingBox()).height).toBeGreaterThanOrEqual(44);
  });
