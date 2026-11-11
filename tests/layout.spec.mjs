// Layout across screen sizes: from the smallest phones to large monitors, in portrait and landscape.
// Checks the things that break first on an unfamiliar screen: a sideways scroll, a bar that is off
// screen, text that is too small to read, and controls too small to tap.
import { readdirSync, readFileSync } from "node:fs";
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

// Pavamana Suktam numbers each verse by its Rigveda hymn and verse (॥ ९.००१.०१ ॥): a phone's row never breaks inside
// one, in either language (24 of them have no closing ॥ in the booklet, or one set against the number: kept so)
for (const setup of ["marathi", "english"])
  test(`Pavamana Suktam · ${setup}: each verse reference stays whole on its row`, async ({ page }) => {
    await page.setViewportSize({ width: 393, height: 852 });
    await openSite(page, SETUPS[setup], { hash: "#vedic-chant-pavamana-suktam" });
    const r = await page.evaluate((lang) => {
      const sec = document.getElementById("vedic-chant-pavamana-suktam");
      const refs = [...sec.querySelectorAll(".verse ." + lang + " p")].filter((p) => /[0-9०-९]\.[0-9०-९]{3}\./.test(p.textContent));
      const whole = refs.filter((p) => [...p.querySelectorAll(".nb")].some((s) => /[॥|]+ [0-9०-९]\.[0-9०-९]{3}\.[0-9०-९]{2}/.test(s.textContent)));
      return { refs: refs.length, whole: whole.length };
    }, SETUPS[setup].lang);
    expect(r.refs).toBe(610);
    expect(r.whole).toBe(610);
  });

// Pavamana Suktam (layout: lines) is set as its booklet is: in one language each line of a verse starts a row of its
// own at the left. Its long references show on a phone as just the verse (॥ ६ ॥), a hymn's first verse whole
// (॥ ९.००२.०१ ॥), and whole everywhere on a wider screen; the words in the page stay the same (js/text/line-breaks.js)
for (const [setup, width] of [
  ["marathi", 393],
  ["english", 393],
  ["marathi", 1280],
  ["both", 393],
])
  test(`Pavamana Suktam · ${setup} at ${width}px: line by line, as the booklet, the references short on a phone`, async ({ page }) => {
    await page.setViewportSize({ width, height: 852 });
    await openSite(page, SETUPS[setup], { hash: "#vedic-chant-pavamana-suktam" });
    const r = await page.evaluate(() => {
      const sec = document.getElementById("vedic-chant-pavamana-suktam");
      const refs = [...sec.querySelectorAll(".ref")].filter((e) => e.getClientRects().length);
      const shown = (e) =>
        getComputedStyle(e.firstElementChild).display === "none" ? getComputedStyle(e, "::after").content.replace(/"/g, "") : e.textContent;
      // the rows of the verses: each line's first row starts where the verse's other lines do
      const starts = [...sec.querySelectorAll(".item:not(.dh) .verse > :not([hidden]) > p")]
        .filter((p) => p.getClientRects().length)
        .map((p) => Math.round(p.getClientRects()[0].left));
      return {
        refs: refs.length,
        texts: refs.map((e) => e.textContent),
        shown: refs.map(shown),
        starts: [...new Set(starts)].length,
        lines: starts.length,
      };
    });
    // 610 verses, in each language shown
    expect(r.refs).toBe(setup === "both" ? 1220 : 610);
    expect(r.texts.every((t) => /^[0-9०-९]\.[0-9०-९]{3}\.[0-9०-९]{2}$/.test(t))).toBe(true);
    const short = r.shown.filter((s) => /^[0-9०-९]{1,2}$/.test(s)).length;
    if (width < 600) {
      // all but each hymn's first verse (67 hymns), shown as the verse alone, its zeros dropped
      expect(short).toBe(r.refs - (setup === "both" ? 134 : 67));
      // (the second verse; with both languages each verse's reference comes twice, the original first)
      expect(r.shown[setup === "both" ? 2 : 1]).toBe(setup === "english" ? "2" : "२");
      expect(r.shown.filter((s) => /^[0०]/.test(s))).toEqual([]);
    } else expect(short).toBe(0);
    // one language: every line starts at the same left edge (both languages keep their own layout)
    if (setup !== "both") expect(r.starts).toBe(1);
    expect(r.lines).toBeGreaterThan(1200);
  });

// A line too long for a phone's row wraps with the rest of it at the left edge too, not indented (an indented rest
// looked like stray spaces, Satish 2026-11-10): Pavamana's opening prayer and verses, Lalita's names, and Shri Sukta,
// set line by line as they are since then
for (const [id, name, least] of [
  ["vedic-chant-pavamana-suktam", "Pavamana Suktam", 50],
  ["vedic-chant-lalita-sahasranama", "Lalita Sahasranama", 5],
  ["vedic-chant-shri-sukta", "Shri Sukta", 5],
])
  for (const setup of ["marathi", "english"])
    test(`${name} · ${setup} on a phone: line by line, a wrapped line's rows all start at the left edge`, async ({ page }) => {
      await page.setViewportSize({ width: 393, height: 852 });
      await openSite(page, SETUPS[setup], { hash: "#" + id });
      const r = await page.evaluate(
        ([lang, id]) => {
          const sec = document.getElementById(id);
          const ps = [...sec.querySelectorAll(".item .verse > ." + lang + " > p")].filter(
            (p) => p.getClientRects().length && !p.matches(".item.dh p:only-child"),
          );
          const range = document.createRange();
          /** each row's left edge: the leftmost of the text's boxes on it */
          const rows = (p) => {
            range.selectNodeContents(p);
            const left = new Map();
            for (const b of range.getClientRects()) if (b.width) left.set(Math.round(b.top), Math.min(left.get(Math.round(b.top)) ?? 1e9, b.left));
            return [...left.values()];
          };
          const wrapped = ps.map(rows).filter((l) => l.length > 1);
          const edge = Math.round(ps[0].getBoundingClientRect().left);
          return { lines: sec.classList.contains("lines"), wrapped: wrapped.length, off: wrapped.filter((l) => l.some((x) => Math.abs(x - edge) > 1)).length };
        },
        [SETUPS[setup].lang, id],
      );
      expect(r.lines).toBe(true);
      expect(r.wrapped).toBeGreaterThan(least);
      expect(r.off).toBe(0);
    });

// nor on paper, nor anywhere else: no stylesheet indents the rest of a wrapped line (a negative text-indent)
test("no text's wrapped line is indented, on screen or printed", () => {
  const dir = new URL("../css/", import.meta.url);
  const hanging = readdirSync(dir).filter((f) => f.endsWith(".css") && /text-indent:\s*-/.test(readFileSync(new URL(f, dir), "utf8")));
  expect(hanging).toEqual([]);
});

// Lalita Sahasranama is set line by line too (layout: lines), its Nyasa and Dhyanam (said once) as well: on a phone
// every line starts at the same edge, and no row runs off the screen, a long name joined by hyphens included
// (शक्ति-कूटैकतापन्न-कट्यधोभाग-धारिणी ॥ ३५ ॥: its number is glued to its last part only)
test("Lalita Sahasranama on a phone: line by line, nothing wider than the screen", async ({ page }) => {
  await page.setViewportSize({ width: 393, height: 852 });
  await openSite(page, SETUPS.marathi, { hash: "#vedic-chant-lalita-sahasranama" });
  const r = await page.evaluate(() => {
    const sec = document.getElementById("vedic-chant-lalita-sahasranama");
    const ps = [...sec.querySelectorAll(".item .verse > .mr > p")].filter((p) => p.getClientRects().length);
    const rows = ps.flatMap((p) => [...p.getClientRects()]);
    // (a single line said once is centred, as a heading)
    const many = ps.filter((p) => !p.matches(":only-child") || !p.closest(".item.dh"));
    return {
      lines: ps.length,
      starts: new Set(many.map((p) => Math.round(p.getClientRects()[0].left))).size,
      over: rows.filter((b) => b.right > innerWidth + 0.5 || b.left < -0.5).length,
    };
  });
  expect(r.lines).toBeGreaterThan(300);
  expect(r.starts).toBe(1);
  expect(r.over).toBe(0);
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
