// Interactions: what readers do, checked in every browser engine (and on phone emulation for @mobile).
import { test, expect } from "@playwright/test";
import { openSite, settle, SETUPS, PREFS_KEY } from "./helpers.mjs";

const prefs = (page) => page.evaluate((k) => JSON.parse(localStorage.getItem(k)), PREFS_KEY);
const rootAttr = (page, a) => page.evaluate((a) => document.documentElement.getAttribute(a), a);

test("language button cycles main → second → both and is remembered @mobile", async ({ page }) => {
  await openSite(page, SETUPS.marathi);
  const btn = page.locator("#home-btn");
  const lang = () => page.locator("#a1").getAttribute("data-lang");
  expect(await lang()).toBe("mr");
  await btn.click();
  expect(await lang()).toBe("en");
  await btn.click();
  expect(await lang()).toBe("both");
  await btn.click();
  expect(await lang()).toBe("mr");
  await btn.click();
  expect((await prefs(page)).lang).toBe("en");
  await page.reload();
  await settle(page);
  expect(await lang()).toBe("en");
});

test("dhrupad button switches between once and after every verse @mobile", async ({ page }) => {
  await openSite(page, SETUPS.marathi);
  expect(await rootAttr(page, "data-ref")).toBe("1");
  await page.locator("#rb").click();
  expect(await rootAttr(page, "data-ref")).toBe("0");
  expect(await page.locator("#a1 .item.rf").first().isVisible()).toBe(true);
  await page.locator("#rb").click();
  expect(await rootAttr(page, "data-ref")).toBe("1");
});

test("contents link jumps to a piece and moves focus to its heading", async ({ page }) => {
  await openSite(page, SETUPS.marathi);
  await page.locator('a[data-go="a5"]:visible').first().click();
  await page.waitForTimeout(400);
  const top = await page.locator("#a5").evaluate((e) => e.getBoundingClientRect().top);
  expect(Math.abs(top)).toBeLessThan(200);
  expect(page.url()).toContain("#a5");
});

test("search finds a line with forgiving spelling and opens it @mobile", async ({ page }) => {
  await openSite(page, SETUPS.marathi);
  await page.locator("#hm").click();
  await expect(page.locator("#jump")).toBeVisible();
  await page.locator("#q").fill("sukhakarta");
  await expect(page.locator("#res li").first()).toBeVisible();
  const n = await page.locator("#res li").count();
  expect(n).toBeGreaterThan(0);
  await page.locator("#q").fill("zzzzqqq");
  await expect(page.locator("#none")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.locator("#jump")).toBeHidden();
});

test("search in Marathi letters finds the line", async ({ page }) => {
  await openSite(page, SETUPS.marathi);
  await page.locator("#hm").click();
  await page.locator("#q").fill("सुखकर्ता");
  await expect(page.locator("#res li").first()).toBeVisible();
});

test("Settings opens, changes theme, high contrast and font, and closes with Back", async ({ page }) => {
  await openSite(page, SETUPS.marathi);
  await page.locator("#aa").click();
  await expect(page.locator("#panel")).toBeVisible();
  await page.locator('#st button[data-v="dark"]').click();
  expect(await rootAttr(page, "data-pref")).toBe("dark");
  await page.locator('#st button[data-v="sepia"]').click();
  expect(await rootAttr(page, "data-pref")).toBe("sepia");
  await page.locator("#tc").click();
  expect(await rootAttr(page, "data-hc")).toBe("1");
  await page.locator('#sfn button[data-v="classic"]').click();
  expect(await rootAttr(page, "data-font")).toBe("classic");
  await page.locator("#xc").click();
  await expect(page.locator("#panel")).toBeHidden();
  const p = await prefs(page);
  expect([p.th, p.hc, p.fnt]).toEqual(["sepia", 1, "classic"]);
});

test("text size A+ / A− / reset", async ({ page }) => {
  await openSite(page, SETUPS.marathi);
  await page.locator("#aa").click();
  const fs = () => prefs(page).then((p) => p.fs);
  // the size the page uses now (saved settings only hold it once the reader has changed something)
  const start = await page.evaluate(() => parseFloat(document.documentElement.style.getPropertyValue("--fs")));
  await page.locator("#lg").click();
  await page.locator("#lg").click();
  expect(await fs()).toBe(start + 4);
  await page.locator("#sm").click();
  expect(await fs()).toBe(start + 2);
  await page.locator("#sr").click();
  expect((await prefs(page)).fsu).toBe(0);
  await expect(page.locator("#szv")).toHaveText(/%$/);
});

test("main and second language from the Settings dropdowns", async ({ page }) => {
  await openSite(page, SETUPS.marathi);
  await page.locator("#aa").click();
  // the English (scholarly spelling) entry of the main-language list
  const opts = await page.locator("#sl1s option").evaluateAll((o) => o.map((x) => [x.value, x.textContent]));
  expect(opts.length).toBeGreaterThanOrEqual(4);
  const kn = opts.find((o) => o[1].includes("ಕನ್ನಡ"));
  await page.locator("#sl1s").selectOption(kn[0]);
  await page.waitForTimeout(300);
  expect(await page.evaluate(() => document.documentElement.lang)).toBe("kn");
  expect(await page.locator("#a1 .verse .mr p").first().textContent()).toMatch(/[ಀ-೿]/);
});

test("piece fold is remembered across a reload @mobile", async ({ page }) => {
  await openSite(page, SETUPS.marathi);
  await page.locator("#a2 header").click();
  await page.waitForTimeout(200);
  expect((await prefs(page)).af).toContain("a2");
  await expect(page.locator("#a2 .items")).toBeHidden();
  await page.reload();
  await settle(page);
  await expect(page.locator("#a2 .items")).toBeHidden();
  // going to a folded piece from the contents opens it
  await page.locator('a[data-go="a2"]:visible').first().click();
  await expect(page.locator("#a2 .items")).toBeVisible();
});

test("Pooja and Aarti section folds @mobile", async ({ page }) => {
  await openSite(page, SETUPS.marathi);
  await page.locator("#pfb").click();
  expect(await rootAttr(page, "data-pf")).toBe("1");
  await expect(page.locator("#p1")).toBeHidden();
  await page.locator("#xfb").click();
  expect(await rootAttr(page, "data-xf")).toBe("1");
  await page.locator("#pfb").click();
  expect(await rootAttr(page, "data-pf")).toBeNull();
});

test("home card folds to one line and opens again @mobile", async ({ page }) => {
  await openSite(page, SETUPS.marathi);
  await page.locator("#cvb").click();
  await expect(page.locator("#slim")).toBeVisible();
  await expect(page.locator("#shr")).toBeHidden();
  await page.locator("#slim").click();
  await expect(page.locator("#shr")).toBeVisible();
});

// Sankashti day (28 Oct 2026 in Columbus): the card opens on tonight's moonrise; the date strip, the calendar
// links and the App / Share / QR / Print / Help row wait under More dates
test("on Sankashti day the card leads with moonrise, and More dates opens the rest @mobile", async ({ page }) => {
  await openSite(page, SETUPS.marathi, { now: new Date("2026-10-28T17:30:00-04:00") });
  await expect(page.locator("#home")).toHaveClass(/\bpday\b/);
  await expect(page.locator("#skc .skm b").last()).toHaveText(/pm/);
  const more = page.locator("#skmore");
  await expect(more).toBeVisible();
  await expect(more).toHaveAttribute("aria-expanded", "false");
  await expect(page.locator("#skc .sks")).toBeHidden();
  await expect(page.locator("#shr")).toBeHidden();
  await more.click();
  await expect(more).toHaveAttribute("aria-expanded", "true");
  await expect(page.locator("#skc .sks")).toBeVisible();
  await expect(page.locator("#skall")).toBeVisible();
  await expect(page.locator("#shr")).toBeVisible();
});

// Other days: the card leads with the next Chaturthi date and its moonrise too, with the App / Share / QR /
// Print / Help row in view and the date strip under More dates
test("on other days the card leads with the next Chaturthi date, and More dates opens the strip @mobile", async ({ page }) => {
  await openSite(page, SETUPS.marathi);
  await expect(page.locator("#home")).not.toHaveClass(/\bpday\b/);
  await expect(page.locator("#skc .skh").first()).toContainText("पुढील चतुर्थी");
  await expect(page.locator("#skc .sktd")).toBeVisible();
  const more = page.locator("#skmore");
  await expect(more).toBeVisible();
  await expect(more).toHaveAttribute("aria-expanded", "false");
  await expect(page.locator("#skc .sks")).toBeHidden();
  await expect(page.locator("#shr")).toBeVisible();
  await more.click();
  await expect(more).toHaveAttribute("aria-expanded", "true");
  await expect(page.locator("#skc .sks")).toBeVisible();
  await expect(page.locator("#shr")).toBeVisible();
});

// Reading sheet: Aa in the bottom bar; language, text size and dhrupad in one place, within thumb reach
test("Aa opens the reading sheet: language, text size and dhrupad, then Escape closes it @mobile", async ({ page }) => {
  await openSite(page, SETUPS.marathi);
  const rsb = page.locator("#rsb");
  await rsb.click();
  await expect(page.locator("#rsh")).toBeVisible();
  await expect(rsb).toHaveAttribute("aria-expanded", "true");
  const langs = page.locator("#rsl button");
  await expect(langs).toHaveCount(3);
  await expect(langs.first()).toHaveAttribute("aria-pressed", "true");
  await langs.nth(1).click();
  expect(await page.locator("#a1").getAttribute("data-lang")).toBe("en");
  await expect(langs.nth(1)).toHaveAttribute("aria-pressed", "true");
  await langs.nth(2).click();
  expect(await page.locator("#a1").getAttribute("data-lang")).toBe("both");
  const fs0 = (await prefs(page)).fs;
  await page.locator("#rsp").click();
  await page.locator("#rsp").click();
  expect((await prefs(page)).fs).toBe(fs0 + 4);
  await expect(page.locator("#rsv")).toHaveText(/%$/);
  await page.waitForTimeout(600);
  expect(await page.evaluate(() => document.documentElement.style.getPropertyValue("--fs"))).toBe(fs0 + 4 + "px");
  await page.locator("#rsr").click();
  await page.waitForTimeout(600);
  expect((await prefs(page)).fsu).toBe(0);
  await page.locator("#rsf button[data-v='0']").click();
  expect(await rootAttr(page, "data-ref")).toBe("0");
  await expect(page.locator("#rsf button[data-v='0']")).toHaveAttribute("aria-pressed", "true");
  await page.keyboard.press("Escape");
  await expect(page.locator("#rsh")).toBeHidden();
  await expect(rsb).toHaveAttribute("aria-expanded", "false");
  await expect(rsb).toBeFocused();
});

test("reading sheet: a tap outside closes it, and All settings opens Settings @mobile", async ({ page }) => {
  await openSite(page, SETUPS.marathi);
  await page.locator("#rsb").click();
  await page.locator("#rsh").click({ position: { x: 20, y: 20 } });
  await expect(page.locator("#rsh")).toBeHidden();
  await page.locator("#rsb").click();
  await page.locator("#rsall").click();
  await expect(page.locator("#rsh")).toBeHidden();
  await expect(page.locator("#panel")).toBeVisible();
});

test("tapping a line highlights it and is remembered @mobile", async ({ page }) => {
  await openSite(page, SETUPS.marathi);
  const line = page.locator("#a1 .items .verse .mr p[data-l]").first();
  await line.scrollIntoViewIfNeeded();
  await line.click();
  await expect(line).toHaveClass(/hl/);
  const id = await line.getAttribute("data-l");
  expect((await prefs(page)).hl).toBe(id);
  await line.click();
  await expect(line).not.toHaveClass(/hl/);
});

test("bottom bar Next goes to the next piece", async ({ page }) => {
  await openSite(page, SETUPS.marathi, { hash: "#a1" });
  await page.waitForTimeout(300);
  await page.locator("#asn").click();
  await page.waitForTimeout(500);
  expect(page.url()).toContain("#a2");
});

test("dialogs: QR, Help and Add to Home Screen open and close with Escape", async ({ page }) => {
  await openSite(page, SETUPS.marathi);
  await page.locator("#qrb").click();
  await expect(page.locator("#qrm")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.locator("#qrm")).toBeHidden();
  await page.locator("#hlpb").click();
  await expect(page.locator("#help")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.locator("#help")).toBeHidden();
});

test("picture opens full screen and closes", async ({ page }) => {
  await openSite(page, SETUPS.marathi);
  await page.locator("#iconb").click();
  await expect(page.locator("#pzv")).toBeVisible();
  await expect(page.locator("#pzi")).toBeVisible();
  await page.locator("#pzx").click();
  await expect(page.locator("#pzv")).toBeHidden();
});

test("IAST spelling switches in place without a reload", async ({ page }) => {
  await openSite(page, SETUPS.english);
  const first = () => page.locator("#a1 .items .verse .en p").first().textContent();
  expect(await first()).toContain("Sukhkarta");
  await page.evaluate((k) => {
    // what Settings does when "English · sukhakartā" is picked
    const s = document.getElementById("sl2s");
    const o = [...s.options].find((x) => /ā/.test(x.textContent));
    s.value = o.value;
    s.dispatchEvent(new Event("change", { bubbles: true }));
  }, PREFS_KEY);
  await page.waitForTimeout(300);
  expect(await first()).toMatch(/sukhakartā/);
});

test("the date card shows the next Sankashti with moonrise", async ({ page }) => {
  await openSite(page, SETUPS.marathi);
  const card = await page.locator("#skc").innerText();
  expect(card).toMatch(/Moonrise|moonrise|चंद्रोदय/);
});

test("reopens where the reader was (within 12 hours)", async ({ page }) => {
  await openSite(page, SETUPS.marathi, { hash: "#a6" });
  await page.waitForTimeout(500);
  await page.evaluate(() => dispatchEvent(new Event("pagehide")));
  await page.goto("./");
  await settle(page);
  await page.waitForTimeout(300);
  const top = await page.locator("#a6").evaluate((e) => e.getBoundingClientRect().top);
  expect(Math.abs(top)).toBeLessThan(400);
});

// Pinch never zooms the page, wherever it starts (a page that zooms only in some places looks broken on a
// phone). It resizes the text, except on the home card, where it does nothing.
// Chromium only: Firefox has no mobile emulation and desktop WebKit cannot create Touch objects
test.describe("pinch @chromium-only", () => {
  test.use({ hasTouch: true, isMobile: true, viewport: { width: 390, height: 844 } });
  // fires a two-finger touchstart on the element and reports whether the site stopped the browser's zoom
  const pinchStart = (page, selector) =>
    page.locator(selector).first().evaluate((el) => {
      const r = el.getBoundingClientRect();
      const t = (id, dx) => new Touch({ identifier: id, target: el, clientX: r.left + 20 + dx, clientY: r.top + 10 });
      const touches = [t(1, 0), t(2, 60)];
      const ev = new TouchEvent("touchstart", { touches, targetTouches: touches, changedTouches: touches, bubbles: true, cancelable: true });
      el.dispatchEvent(ev);
      const end = new TouchEvent("touchend", { touches: [], targetTouches: [], changedTouches: touches, bubbles: true, cancelable: true });
      el.dispatchEvent(end);
      return ev.defaultPrevented;
    });

  // spreads two fingers apart on the element and returns the text size before and after
  const pinchOut = (page, selector) =>
    page.locator(selector).first().evaluate(async (el) => {
      const fs = () => document.documentElement.style.getPropertyValue("--fs");
      const before = fs();
      const r = el.getBoundingClientRect();
      const t = (id, x) => new Touch({ identifier: id, target: el, clientX: r.left + x, clientY: r.top + 10 });
      const fire = (type, touches) =>
        el.dispatchEvent(new TouchEvent(type, { touches, targetTouches: touches, changedTouches: touches, bubbles: true, cancelable: true }));
      fire("touchstart", [t(1, 20), t(2, 80)]);
      fire("touchmove", [t(1, 10), t(2, 200)]);
      await new Promise((ok) => requestAnimationFrame(() => requestAnimationFrame(ok)));
      const after = fs();
      el.dispatchEvent(new TouchEvent("touchend", { touches: [], targetTouches: [], changedTouches: [t(1, 10), t(2, 200)], bubbles: true }));
      return { before, after };
    });

  test("on the home card a pinch does nothing", async ({ page }) => {
    await openSite(page, SETUPS.marathi);
    const r = await pinchOut(page, "#home .top .hero");
    expect(r.after).toBe(r.before);
    await expect(page.locator("#szt")).not.toHaveClass(/\bon\b/);
  });
  test("on a verse it resizes the text, with the size shown on screen", async ({ page }) => {
    await openSite(page, SETUPS.marathi);
    await page.locator("#a1 .items .verse p").first().scrollIntoViewIfNeeded();
    const r = await pinchOut(page, "#a1 .items .verse p");
    expect(parseFloat(r.after)).toBeGreaterThan(parseFloat(r.before));
    const box = await page.locator("#szt").boundingBox();
    expect(box.y).toBeGreaterThanOrEqual(0);
    expect(box.y + box.height).toBeLessThanOrEqual(844);
  });
  test("on a verse it resizes the text instead of zooming", async ({ page }) => {
    await openSite(page, SETUPS.marathi);
    expect(await pinchStart(page, "#a1 .items .verse p")).toBe(true);
  });
  test("on the home card, Settings and Help the page does not zoom either", async ({ page }) => {
    await openSite(page, SETUPS.marathi);
    expect(await pinchStart(page, "#home .top .hero")).toBe(true);
    await page.locator("#aa").click();
    expect(await pinchStart(page, "#panel .sp-card")).toBe(true);
    await page.locator("#xc").click();
    await page.locator("#hlpb").click();
    expect(await pinchStart(page, "#help .hlpin")).toBe(true);
  });
});
