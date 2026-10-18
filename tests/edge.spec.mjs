// Edge cases found in the Phase 3 audit: notched iPhones, pressed and hovered states in every theme,
// keyboard focus hidden behind the bars, layout shift after the page is shown, very narrow and very wide
// screens, what screen readers are told, Windows High Contrast, wider text spacing, and printing with the
// keyboard alone. Each test names the audit item it guards (H1–H4, M1–M6, T4–T8).
import { test, expect } from "@playwright/test";
import { readFileSync, readdirSync } from "node:fs";
import { openSite, settle, SETUPS } from "./helpers.mjs";
import { stubPrint } from "./print-helpers.mjs";

// ---- Notched iPhones (H2, H4) -------------------------------------------------------------------------
// Chromium can pretend the screen has a notch (the same env(safe-area-inset-*) values an iPhone 16 Pro gives).
const IPHONE_16_PRO = { width: 402, height: 874 };
const PORTRAIT = { top: 62, bottom: 34, left: 0, right: 0 };
const LANDSCAPE = { top: 0, bottom: 21, left: 62, right: 62 };

async function notch(page, size, insets) {
  await page.setViewportSize(size);
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Emulation.setSafeAreaInsetsOverride", { insets });
}
const box = (page, sel) =>
  page.locator(sel).first().evaluate((e) => {
    const r = e.getBoundingClientRect();
    return { left: r.left, top: r.top, right: r.right, bottom: r.bottom };
  });

test.describe("notched iPhone @chromium-only", () => {
  test("upright: the text-size bubble and Default size sit below the top bar (H2)", async ({ page }) => {
    await notch(page, IPHONE_16_PRO, PORTRAIT);
    await openSite(page, SETUPS.marathi, { hash: "#a1" });
    await page.evaluate(() => {
      document.getElementById("szr").hidden = false;
      document.getElementById("szt").classList.add("on");
    });
    const bar = await box(page, "body > .bar");
    expect(bar.top).toBeGreaterThanOrEqual(PORTRAIT.top);
    for (const sel of ["#szt", "#szr"]) {
      const b = await box(page, sel);
      expect(b.top, `${sel} overlaps the top bar`).toBeGreaterThanOrEqual(bar.bottom);
    }
  });

  test("sideways: close buttons and bar buttons stay clear of the notch (H4)", async ({ page }) => {
    const size = { width: IPHONE_16_PRO.height, height: IPHONE_16_PRO.width };
    await notch(page, size, LANDSCAPE);
    await openSite(page, SETUPS.marathi);
    const clear = async (sel) => {
      for (const b of await page.locator(sel).evaluateAll((els) =>
        els.filter((e) => e.getClientRects().length).map((e) => {
          const r = e.getBoundingClientRect();
          return { id: e.id || e.className, left: r.left, right: r.right };
        }),
      )) {
        expect(b.left, `${b.id} is in the left notch zone`).toBeGreaterThanOrEqual(LANDSCAPE.left);
        expect(b.right, `${b.id} is in the right notch zone`).toBeLessThanOrEqual(size.width - LANDSCAPE.right);
      }
    };
    await clear("body > .bar button");
    await clear("#asc button");
    await page.locator("#hlpb").click();
    await clear("#hlpx");
    await page.keyboard.press("Escape");
    await page.locator("#aa").click();
    await clear("#panel .sp-hd button");
    await page.keyboard.press("Escape");
    await page.locator("#iconb").click();
    await clear("#pzx");
  });
});

// ---- Contrast of pressed and hovered states, every theme (H1, M4) -------------------------------------
const THEMES = [
  ["light", { th: "light" }],
  ["sepia", { th: "sepia" }],
  ["dark", { th: "dark" }],
  ["high contrast", { th: "light", hc: 1 }],
  ["high contrast, dark", { th: "dark", hc: 1 }],
];
// [selector, state]: buttons and links whose look changes when pressed or pointed at
const STATES = [
  [".pn > a", "active"],
  [".pnq a", "active"],
  [".pnq button", "active"],
  ["ol.toc a", "active"],
  [".cr a[href]", "hover"],
  ["#rail a", "hover"],
];
for (const [name, prefs] of THEMES) {
  test(`contrast: pressed and hovered text stays readable in ${name} (H1) @chromium-only`, async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await openSite(page, { ...SETUPS.marathi, ...prefs });
    const cdp = await page.context().newCDPSession(page);
    await cdp.send("DOM.enable");
    await cdp.send("CSS.enable");
    const { root } = await cdp.send("DOM.getDocument", { depth: -1 });
    const bad = [];
    for (const [sel, state] of STATES) {
      const { nodeId } = await cdp.send("DOM.querySelector", { nodeId: root.nodeId, selector: sel });
      if (!nodeId) continue;
      await cdp.send("CSS.forcePseudoState", { nodeId, forcedPseudoClasses: [state] });
      const low = await page.evaluate((sel) => {
        const cv = document.createElement("canvas").getContext("2d");
        const rgb = (s) => {
          cv.fillStyle = "#000";
          cv.fillStyle = s;
          const t = cv.fillStyle;
          return t[0] === "#" ? [1, 3, 5].map((i) => parseInt(t.slice(i, i + 2), 16)) : t.match(/[\d.]+/g).slice(0, 3).map(Number);
        };
        const lum = (c) => {
          const a = c.map((x) => ((x /= 255) <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4));
          return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2];
        };
        const e = document.querySelector(sel);
        let bg = "rgba(0, 0, 0, 0)";
        for (let x = e; x; x = x.parentElement) {
          bg = getComputedStyle(x).backgroundColor;
          if (!/rgba\(.*, 0\)$/.test(bg)) break;
        }
        const out = [];
        for (const t of [e, ...e.querySelectorAll("*")]) {
          if (![...t.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())) continue;
          const a = lum(rgb(getComputedStyle(t).color)),
            b = lum(rgb(bg));
          const r = (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
          if (r < 4.5) out.push(`${sel} "${t.textContent.trim().slice(0, 20)}" ${r.toFixed(2)}:1`);
        }
        return out;
      }, sel);
      bad.push(...low.map((x) => `${x} (${state})`));
      await cdp.send("CSS.forcePseudoState", { nodeId, forcedPseudoClasses: [] });
    }
    expect(bad).toEqual([]);
  });
}

// ---- Keyboard focus is never hidden behind the bars (H3, WCAG 2.4.11) --------------------------------
for (const width of [390, 1280]) {
  test(`keyboard: every focused item on the home page is at least half visible at ${width}px (H3) @chromium-only`, async ({ page }) => {
    await page.setViewportSize({ width, height: width < 600 ? 844 : 800 });
    await openSite(page, SETUPS.marathi);
    const seen = new Set(),
      hidden = [];
    for (let i = 0; i < 80; i++) {
      await page.keyboard.press("Tab");
      await page.waitForTimeout(40);
      const r = await page.evaluate(() => {
        const e = document.activeElement;
        if (!e || e === document.body) return null;
        const key = e.id || e.tagName + "|" + (e.textContent || "").trim().slice(0, 30);
        const b = e.getBoundingClientRect();
        // sample points down the middle of the item: each is visible if the item (or a part of it) is on top
        let shown = 0;
        const n = 5;
        for (let k = 0; k < n; k++) {
          const y = b.top + ((k + 0.5) * b.height) / n,
            x = b.left + Math.min(b.width / 2, 20);
          const at = y >= 0 && y < innerHeight && document.elementFromPoint(x, y);
          if (at && (at === e || e.contains(at))) shown++;
        }
        return { key, frac: shown / n };
      });
      if (!r) continue;
      if (seen.has(r.key)) break;
      seen.add(r.key);
      if (r.frac < 0.5) hidden.push(`${r.key} ${Math.round(r.frac * 100)}% visible`);
    }
    expect(seen.size).toBeGreaterThan(20);
    expect(hidden).toEqual([]);
  });
}

// ---- Layout shift after the page is shown (T4) --------------------------------------------------------
// Lighthouse checks the first load only. These count every shift the reader did not cause (late fonts,
// the text refit, the date card, the "ready offline" note) for a few seconds after the page appears, and
// shifts that land long after a tap (a delayed jump).
for (const [w, h] of [
  [390, 844],
  [1280, 800],
]) {
  test(`layout shift stays under 0.05 after the page appears at ${w}px (T4) @chromium-only`, async ({ page }) => {
    await page.setViewportSize({ width: w, height: h });
    await page.addInitScript(() => {
      window.__cls = [];
      new PerformanceObserver((l) => {
        for (const e of l.getEntries())
          if (!e.hadRecentInput && document.documentElement.hasAttribute("data-ready")) window.__cls.push(e.value);
      }).observe({ type: "layout-shift", buffered: true });
    });
    await openSite(page, SETUPS.marathi);
    await page.waitForTimeout(2500);
    // open and close Help, fold the first piece: nothing should move on its own afterwards
    await page.locator("#hlpb").click();
    await page.keyboard.press("Escape");
    await page.waitForTimeout(800);
    const sum = await page.evaluate(() => window.__cls.reduce((a, b) => a + b, 0));
    expect(sum).toBeLessThan(0.05);
  });
}

// ---- Very narrow and very wide screens (T5, M3, M5) ---------------------------------------------------
const WIDTHS = [
  [360, 780], // common Android
  [402, 874], // iPhone 16 Pro
  [430, 932], // iPhone Pro Max
  [3840, 2160], // 4K
  [5120, 1440], // super-wide
  [7680, 2160], // two 4K screens side by side
];
for (const [w, h] of WIDTHS) {
  test(`${w}px wide: no sideways scroll, text column centred, bar buttons near the text (T5) @chromium-only`, async ({ page }) => {
    await page.setViewportSize({ width: w, height: h });
    await openSite(page, SETUPS.marathi, { hash: "#a1" });
    const r = await page.evaluate(() => {
      const d = document.documentElement,
        wrap = document.querySelector(".wrap").getBoundingClientRect(),
        btns = [...document.querySelectorAll("body > .bar button, #asc button")]
          .filter((b) => b.getClientRects().length)
          .map((b) => b.getBoundingClientRect());
      return {
        over: d.scrollWidth - d.clientWidth,
        wrapL: wrap.left,
        wrapR: wrap.right,
        btnL: Math.min(...btns.map((b) => b.left)),
        btnR: Math.max(...btns.map((b) => b.right)),
        width: d.clientWidth,
        fs: parseFloat(getComputedStyle(d).getPropertyValue("--fs")),
      };
    });
    expect(r.over, "sideways scroll").toBeLessThanOrEqual(0);
    expect(r.wrapL).toBeGreaterThanOrEqual(0);
    expect(r.wrapR).toBeLessThanOrEqual(r.width);
    // the reader's controls stay within reach of the text, however wide the screen
    expect(r.btnL).toBeGreaterThanOrEqual(r.wrapL - 700);
    expect(r.btnR).toBeLessThanOrEqual(r.wrapR + 700);
    expect(r.fs).toBeGreaterThanOrEqual(16);
  });
}

// Windows and Macs set to always show scrollbars: 100vw is wider than the page by the scrollbar, so the
// layout uses the page's own width (--vw). Chromium here has no classic scrollbar, so the check is that
// the script measures the page without one, and sets nothing when there is none.
test("the page width used for centring leaves out a classic scrollbar (M3) @chromium-only", async ({ page }) => {
  await page.setViewportSize({ width: 1600, height: 900 });
  await openSite(page, SETUPS.marathi);
  const r = await page.evaluate(() => {
    const d = document.documentElement;
    return { vw: d.style.getPropertyValue("--vw"), cw: d.clientWidth, iw: innerWidth };
  });
  if (r.cw < r.iw) expect(r.vw).toBe(r.cw + "px");
  else expect(r.vw).toBe("");
});

// ---- What screen readers are told (M1, M2, M6) --------------------------------------------------------
test("screen readers: the size bubble is silent while pinching, the final size is announced once (M1) @chromium-only", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openSite(page, SETUPS.marathi);
  await expect(page.locator("#szt")).toHaveAttribute("aria-hidden", "true");
  await expect(page.locator("#sza")).toHaveAttribute("role", "status");
  await page.locator("#a1 .items .verse p").first().scrollIntoViewIfNeeded();
  await page.locator("#a1 .items .verse p").first().evaluate((el) => {
    const r = el.getBoundingClientRect();
    const t = (id, x) => new Touch({ identifier: id, target: el, clientX: x, clientY: r.top + 5 });
    el.dispatchEvent(new TouchEvent("touchstart", { touches: [t(1, 100), t(2, 150)], targetTouches: [t(1, 100), t(2, 150)], changedTouches: [t(1, 100), t(2, 150)], bubbles: true, cancelable: true }));
    for (let d = 60; d <= 160; d += 20)
      el.dispatchEvent(new TouchEvent("touchmove", { touches: [t(1, 100), t(2, 100 + d)], targetTouches: [t(1, 100), t(2, 100 + d)], changedTouches: [t(2, 100 + d)], bubbles: true, cancelable: true }));
    el.dispatchEvent(new TouchEvent("touchend", { touches: [], targetTouches: [], changedTouches: [t(1, 100), t(2, 260)], bubbles: true }));
  });
  await expect(page.locator("#sza")).toHaveText(/^Text size \d+%$/);
});

test("screen readers: search announces how many lines matched, or that nothing did (M2)", async ({ page }) => {
  await openSite(page, SETUPS.marathi);
  await expect(page.locator("#srs")).toHaveAttribute("role", "status");
  await page.locator("#hm").click();
  await page.locator("#q").fill("deva");
  await expect(page.locator("#srs")).toHaveText(/^(\d+|40 or more) results?$/);
  await page.locator("#q").fill("zzqxw");
  await expect(page.locator("#srs")).toHaveText("Nothing found");
  // Enter straight after typing opens the first result, even before the pause
  await page.locator("#q").fill("deva");
  await page.keyboard.press("Enter");
  await expect(page.locator("#jump")).toBeHidden();
});

test("screen readers: short notes have their own live region, apart from the size bubble (M6)", async ({ page }) => {
  await openSite(page, SETUPS.marathi);
  await expect(page.locator("#fl")).toHaveAttribute("aria-live", "polite");
  await page.evaluate(async () => (await import("./js/core/page.js")).flash("चाचणी", "A test note"));
  await expect(page.locator("#fl")).toHaveText("A test note");
  await expect(page.locator("#fl")).toHaveClass(/\bon\b/);
  await expect(page.locator("#szt")).toHaveText("");
});

// ---- Windows High Contrast and wider text spacing (T7) -------------------------------------------------
test("Windows High Contrast: every Tab stop still shows a focus outline (T7) @chromium-only", async ({ page }) => {
  await page.emulateMedia({ forcedColors: "active" });
  await page.setViewportSize({ width: 1280, height: 800 });
  await openSite(page, SETUPS.marathi);
  const seen = new Set(),
    none = [];
  for (let i = 0; i < 60; i++) {
    await page.keyboard.press("Tab");
    const r = await page.evaluate(() => {
      const e = document.activeElement;
      if (!e || e === document.body) return null;
      const cs = getComputedStyle(e);
      // box-shadow is not drawn in this mode, so only a real outline counts
      return { key: e.id || e.tagName + (e.textContent || "").trim().slice(0, 20), ok: cs.outlineStyle !== "none" && parseFloat(cs.outlineWidth) > 0 };
    });
    if (!r) continue;
    if (seen.has(r.key)) break;
    seen.add(r.key);
    if (!r.ok) none.push(r.key);
  }
  expect(none).toEqual([]);
});

test("wider text spacing (WCAG 1.4.12) does not cut off any button text (T7) @chromium-only", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openSite(page, SETUPS.marathi);
  await page.addStyleTag({
    content: "* { line-height: 1.5 !important; letter-spacing: 0.12em !important; word-spacing: 0.16em !important; } p { margin-bottom: 2em !important; }",
  });
  await settle(page);
  const cut = await page.evaluate(() =>
    [...document.querySelectorAll("button, a")]
      .filter((e) => e.getClientRects().length && e.offsetParent !== null)
      .filter((e) => {
        const cs = getComputedStyle(e);
        return (cs.overflow === "hidden" || cs.overflowX === "hidden") && e.scrollWidth > e.clientWidth + 2 && cs.textOverflow !== "ellipsis";
      })
      .map((e) => e.id || e.textContent.trim().slice(0, 30)),
  );
  expect(cut).toEqual([]);
  const d = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(d).toBeLessThanOrEqual(0);
});

// ---- Printing with the keyboard alone (T8) ------------------------------------------------------------
test("keyboard only: Tab to Print, choose a layout, print, and focus comes back (T8) @chromium-only", async ({ page }) => {
  await stubPrint(page);
  await page.setViewportSize({ width: 1280, height: 800 });
  await openSite(page, SETUPS.both);
  let found = false;
  for (let i = 0; i < 60 && !found; i++) {
    await page.keyboard.press("Tab");
    found = await page.evaluate(() => document.activeElement.id === "prb");
  }
  expect(found, "Tab never reached the Print button").toBe(true);
  await page.keyboard.press("Enter");
  await expect(page.locator("#prm")).toBeVisible();
  await expect(page.locator("#prgp")).toBeFocused();
  await page.keyboard.press("Enter");
  await page.waitForFunction(() => window.__printed > 0, null, { timeout: 15_000 });
  expect(await page.evaluate(() => document.documentElement.getAttribute("data-print"))).toBeTruthy();
  await page.evaluate(() => dispatchEvent(new Event("afterprint")));
  await expect(page.locator("#prm")).toBeHidden();
  await expect(page.locator("#prb")).toBeFocused();
});

// ---- Keeping the cascade from getting harder to change (L1, L2) ----------------------------------------
// The counts may only go down. A new breakpoint must be added to css/README.md's list first.
// ---- 2026-10-18 audit: pop-ups on short screens, Back, and the dhrupad bubble ----------------------------
for (const size of [{ width: 667, height: 375 }, { width: 320, height: 256 }]) {
  test(`QR and Add to Home Screen pop-ups scroll so Close is reachable at ${size.width}×${size.height} (WCAG 1.4.10) @chromium-only`, async ({ page }) => {
    await page.setViewportSize(size);
    await openSite(page, SETUPS.marathi);
    for (const [open, close] of [["#qrb", "#qrx"], ["#inb", "#inx"]]) {
      if (!(await page.locator(open).isVisible())) continue;
      await page.locator(open).click();
      const x = page.locator(close);
      await x.scrollIntoViewIfNeeded();
      const box = await x.boundingBox();
      expect(box.y, `${close} top`).toBeGreaterThanOrEqual(0);
      expect(box.y + box.height, `${close} bottom`).toBeLessThanOrEqual(size.height + 1);
      await x.click();
    }
  });
}

test("the phone's Back closes QR, Print and the picture and returns focus to their button (WCAG 2.4.3) @chromium-only", async ({ page }) => {
  await openSite(page, SETUPS.marathi);
  for (const [open, dlg] of [["#qrb", "#qrm"], ["#prb", "#prm"], ["#iconb", "#pzv"]]) {
    await page.locator(open).focus();
    await page.keyboard.press("Enter");
    await expect(page.locator(dlg)).toBeVisible();
    await page.goBack();
    await expect(page.locator(dlg)).toBeHidden();
    expect(await page.evaluate(() => "#" + document.activeElement.id), `focus after Back from ${dlg}`).toBe(open);
    expect(await page.evaluate(() => document.documentElement.style.overflow), "page scrolls again").toBe("");
  }
});

test("the ↻ ध्रुपद bubble stays open until the next tap (WCAG 2.2.1)", async ({ page }) => {
  await openSite(page, SETUPS.marathi);
  const m = page.locator(".rmkt").first();
  await m.scrollIntoViewIfNeeded();
  await m.click();
  await expect(m).toHaveAttribute("aria-expanded", "true");
  await page.waitForTimeout(7500); // longer than the 7 s it used to close after
  await expect(m).toHaveAttribute("aria-expanded", "true");
  await page.locator("main").click({ position: { x: 5, y: 5 } });
  await expect(m).toHaveAttribute("aria-expanded", "false");
});

test("a 320px phone: the home buttons show their words, and a note sits under the top bar, on screen @chromium-only", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await openSite(page, SETUPS.both);
  for (const id of ["#shb", "#qrb", "#prb"]) {
    const w = page.locator(id + " > span.en");
    await expect(w).toBeVisible();
    const b = await page.locator(id).boundingBox(), t = await w.boundingBox();
    expect(t.x >= b.x - 0.5 && t.x + t.width <= b.x + b.width + 0.5, `${id} word inside its button`).toBe(true);
  }
  await page.locator("#home-btn").click();
  const fl = page.locator("#fl");
  await expect(fl).toHaveClass(/\bon\b/);
  await expect(fl).toContainText("Next tap:");
  const f = await fl.boundingBox(), bar = await page.locator("body > .bar").first().boundingBox();
  expect(f.x).toBeGreaterThanOrEqual(0);
  expect(f.x + f.width).toBeLessThanOrEqual(320);
  expect(f.y, "note under the top bar").toBeGreaterThanOrEqual(bar.y + bar.height - 0.5);
});

test("CSS: no new !important, :root:root boosts or unlisted breakpoints (L1, L2)", () => {
  const dir = new URL("../css/", import.meta.url);
  const css = readdirSync(dir)
    .filter((f) => f.endsWith(".css"))
    .map((f) => readFileSync(new URL(f, dir), "utf8"))
    .join("\n");
  expect((css.match(/!important/g) || []).length).toBeLessThanOrEqual(70);
  expect((css.match(/:root:root/g) || []).length).toBeLessThanOrEqual(11); // :root:root:root:root counts twice
  const readme = readFileSync(new URL("README.md", dir), "utf8");
  const widths = [...new Set([...css.matchAll(/\((?:min|max)-(?:width|height): *(\d+)px\)/g)].map((m) => m[1]))];
  const unlisted = widths.filter((w) => !readme.includes(w + "px"));
  expect(unlisted, "breakpoints missing from css/README.md").toEqual([]);
});
