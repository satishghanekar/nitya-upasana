// Interactions: what readers do, checked in every browser engine (and on phone emulation for @mobile).
import { test, expect } from "@playwright/test";
import { openSite, settle, SETUPS, PREFS_KEY, openMore, tapMore, readText, settingsTab } from "./helpers.mjs";

const prefs = (page) => page.evaluate((k) => JSON.parse(localStorage.getItem(k)), PREFS_KEY);
const rootAttr = (page, a) => page.evaluate((a) => document.documentElement.getAttribute(a), a);

// Opened at a piece on a phone, the bars start tucked away (a tap on the page brings them back)
const untuck = (page) => page.evaluate(() => document.documentElement.removeAttribute("data-tuck"));

// The top bar while reading, as on Home: the name, who is reading, Library, ⋯ More and Settings. Language and Dhrupad
// are in the reading sheet (Aa)
test("while reading the top bar has Library and no Language or Dhrupad button; the bottom bar has Home, Print and Reading @mobile", async ({ page }) => {
  await openSite(page, SETUPS.marathi, { hash: "#a1" });
  await untuck(page);
  expect(await page.locator("#home-btn, #rb, #asq").count()).toBe(0);
  for (const b of ["#who", "#hm", "#tmb", "#aa"]) await expect(page.locator(b)).toBeVisible();
  await expect(page.locator("#tmb")).toHaveAccessibleName("Share");
  // the bottom bar's middle buttons are named by the word under each icon, in the menu language
  await expect(page.locator("#ash")).toHaveAccessibleName("Home");
  await expect(page.locator("#hm")).toHaveAccessibleName("Library");
  await expect(page.locator("#rsb")).toHaveAccessibleName("Reading");
});

test("the bottom bar's words follow the menu language @mobile", async ({ page }) => {
  await openSite(page, SETUPS["marathi-menus"], { hash: "#a1" });
  await untuck(page);
  await expect(page.locator("#ash")).toHaveAccessibleName("मुख्यपृष्ठ");
  await expect(page.locator("#hm")).toHaveAccessibleName("संग्रह");
  await expect(page.locator("#rsb")).toHaveAccessibleName("वाचन");
});

// Kannada menus (js/strings/kn.js), with the texts in Kannada letters: the page's words and the scripts' words in
// Kannada, each marked lang="kn" so the Kannada font and a screen reader's Kannada voice are used; Settings offers
// English and Kannada only (the menus are English or the language the texts are shown in)
test("Kannada menus: the bars, Settings and the Library in Kannada, marked as Kannada @mobile", async ({ page }) => {
  await openSite(page, SETUPS["kannada-menus"], { hash: "#a1" });
  await untuck(page);
  await expect(page.locator("#ash")).toHaveAccessibleName("ಮುಖಪುಟ");
  await expect(page.locator("#hm")).toHaveAccessibleName("ಸಂಗ್ರಹ");
  await expect(page.locator("#rsb")).toHaveAccessibleName("ಓದು");
  await expect(page.locator("#ash [data-w]")).toHaveAttribute("lang", "kn");
  await expect(page.locator("#asn")).toHaveAttribute("lang", "kn");
  await expect(page.locator("#asn")).toHaveAccessibleName(/^ಮುಂದೆ/);
  await page.locator("#aa").click();
  await settingsTab(page, "screen");
  await expect(page.locator("#su button:not([hidden])")).toHaveText(["English", "ಕನ್ನಡ"]);
  await expect(page.locator('#su button[data-v="kn"]')).toHaveAttribute("aria-pressed", "true");
  // back to English, at once
  await page.locator('#su button[data-v="en"]').click();
  await page.locator("#xc").click();
  await expect(page.locator("#ash")).toHaveAccessibleName("Home");
  expect((await prefs(page)).ui).toBe("en");
});

// The menus are English or the language the texts are shown in, never mixed: picking other letters puts the menus
// back to English (Marathi menus over Kannada letters would be mixed), and Settings then offers English and the new
// letters' language
for (const [from, ind, pick] of [
  ["mr", "mr", "kn"],
  ["mr", "mr", "te"],
  ["kn", "kn", "gu"],
  ["en", "mr", "te"],
])
  test(`${from} menus, then ${pick} letters picked in Settings: the menus go back to English`, async ({ page }) => {
    const want = "Library";
    await openSite(page, { ...SETUPS.marathi, ind, ui: from }, { hash: "#a1" });
    await page.locator("#aa").click();
    await page.locator("#sl1s").selectOption(pick);
    await page.locator("#xc").click();
    await untuck(page);
    await expect(page.locator("#hm")).toHaveAccessibleName(want);
    await expect(page.locator("#a1 .verse .mr").first()).toHaveAttribute("lang", pick);
    await page.locator("#aa").click();
    await settingsTab(page, "screen");
    await expect(page.locator("#su button:not([hidden])")).toHaveText(["English", { kn: "ಕನ್ನಡ", te: "తెలుగు", gu: "ગુજરાતી" }[pick]]);
  });

// Menus in another language than the texts (saved before this rule) open in English; with English as the main
// language there is no choice of menus
test("menus never mixed: Telugu menus over Marathi letters open in English; English texts offer no menu choice", async ({ page }) => {
  await openSite(page, { ...SETUPS.marathi, ui: "te" }, { hash: "#a1" });
  await untuck(page);
  await expect(page.locator("#hm")).toHaveAccessibleName("Library");
  expect((await prefs(page)).ui).toBe("en");
  await page.locator("#aa").click();
  await settingsTab(page, "screen");
  await expect(page.locator("#su button:not([hidden])")).toHaveText(["English", "मराठी"]);
  await settingsTab(page, "read");
  await page.locator("#sl1s").selectOption("en:simple");
  await settingsTab(page, "screen");
  await expect(page.locator("#surow")).toBeHidden();
});

test("⋯ More opens App, Share, QR and Help under it while reading; a tap outside or Escape closes it @mobile", async ({ page }) => {
  await openSite(page, SETUPS.marathi, { hash: "#a1" });
  await untuck(page);
  const more = page.locator("#tmb"),
    menu = page.locator("#shr");
  await expect(menu).toBeHidden();
  await more.click();
  await expect(menu).toBeVisible();
  await expect(more).toHaveAttribute("aria-expanded", "true");
  for (const id of ["#shb", "#qrb", "#hlpb"]) await expect(page.locator(id)).toBeVisible();
  // (Print is its own button in the top bar, not here)
  await expect(page.locator("#shr #prb, #shr #prt")).toHaveCount(0);
  // under the button, on screen
  const b = await more.boundingBox(),
    m = await menu.boundingBox(),
    vw = page.viewportSize().width;
  expect(m.y).toBeGreaterThanOrEqual(b.y + b.height);
  expect(m.x).toBeGreaterThanOrEqual(0);
  expect(m.x + m.width).toBeLessThanOrEqual(vw + 0.5);
  await page.locator("main").click({ position: { x: 5, y: 300 } });
  await expect(menu).toBeHidden();
  await expect(more).toHaveAttribute("aria-expanded", "false");
  await more.click();
  await page.keyboard.press("Escape");
  await expect(menu).toBeHidden();
  await expect(more).toBeFocused();
});

test("a choice in ⋯ More closes the menu, and focus comes back to ⋯ when its pop-up closes", async ({ page }) => {
  await openSite(page, SETUPS.marathi, { hash: "#a1" });
  await page.locator("#tmb").click();
  await page.locator("#qrb").click();
  await expect(page.locator("#shr")).toBeHidden();
  await expect(page.locator("#qrm")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.locator("#qrm")).toBeHidden();
  await expect(page.locator("#tmb")).toBeFocused();
  await page.locator("#tmb").click();
  await page.locator("#hlpb").click();
  await expect(page.locator("#help")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.locator("#help")).toBeHidden();
  await expect(page.locator("#tmb")).toBeFocused();
});

test("a Library link jumps to a piece and moves focus to its heading", async ({ page }) => {
  await openSite(page, SETUPS.marathi);
  await page.locator("#hm").click();
  await page.locator('#jl a[data-go="a5"]').click();
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
  await settingsTab(page, "screen");
  await expect(page.locator("#panel")).toBeVisible();
  await page.locator('#st button[data-v="dark"]').click();
  expect(await rootAttr(page, "data-pref")).toBe("dark");
  await page.locator('#st button[data-v="sepia"]').click();
  expect(await rootAttr(page, "data-pref")).toBe("sepia");
  await page.locator("#tc").click();
  expect(await rootAttr(page, "data-hc")).toBe("1");
  // three fonts, Traditional first (the default), then Modern and Bold, on the Reading tab
  await settingsTab(page, "read");
  await expect(page.locator("#sfn button")).toHaveText(["Traditional", "Modern", "Bold"], { useInnerText: true });
  expect(await rootAttr(page, "data-font")).toBe("classic");
  await expect(page.locator('#sfn button[data-v="classic"]')).toHaveAttribute("aria-pressed", "true");
  await page.locator('#sfn button[data-v="bold"]').click();
  expect(await rootAttr(page, "data-font")).toBe("bold");
  await page.locator('#sfn button[data-v="std"]').click();
  expect(await rootAttr(page, "data-font")).toBe("std");
  await page.locator("#xc").click();
  await expect(page.locator("#panel")).toBeHidden();
  const p = await prefs(page);
  expect([p.th, p.hc, p.fnt]).toEqual(["sepia", 1, "std"]);
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
  await readText(page, "a2");
  await page.locator("#a2 header").click();
  await page.waitForTimeout(200);
  expect((await prefs(page)).af).toContain("a2");
  await expect(page.locator("#a2 .items")).toBeHidden();
  await page.reload();
  await settle(page);
  expect((await prefs(page)).af).toContain("a2");
  // going to a folded piece from the Library opens it
  await readText(page, "a2");
  await expect(page.locator("#a2 .items")).toBeVisible();
});

// Reading sheet: Aa in the bottom bar (while reading; on the home page Start takes its place); language, text size
// and dhrupad in one place, within thumb reach
test("Aa opens the reading sheet: language, text size and dhrupad, then Escape closes it @mobile", async ({ page }) => {
  await openSite(page, SETUPS.marathi, { hash: "#a1" });
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
  await openSite(page, SETUPS.marathi, { hash: "#a1" });
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
  await readText(page, "a1");
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
  await tapMore(page, "#qrb");
  await expect(page.locator("#qrm")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.locator("#qrm")).toBeHidden();
  await tapMore(page, "#hlpb");
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

// The picture follows the time of day (Morning before 12:00 → sunrise, Afternoon → midday, Evening from 17:00 →
// sunset) with today's weekday star ringed. 15 Oct 2026 is a Thursday (star 4), 18 Oct a Sunday (star 0).
for (const [when, picture, day, name, label] of [
  ["2026-10-15T10:00:00-04:00", "sunrise", 4, "icon-32.png", "Sunrise picture, Thursday star marked"],
  ["2026-10-15T12:00:00-04:00", "midday", 4, "favicon-midday-32.png", "Midday picture, Thursday star marked"],
  ["2026-10-18T19:30:00-04:00", "sunset", 0, "favicon-sunset-32.png", "Sunset picture, Sunday star marked"],
]) {
  test(`at ${when.slice(11, 16)} on the ${when.slice(8, 10)}th the ${picture} picture shows with star ${day} ringed @mobile`, async ({ page }) => {
    // the large picture, with its ring, is on wide screens; on phones the small one in the top bar opens it (#bti)
    await page.setViewportSize({ width: 1280, height: 820 });
    await openSite(page, SETUPS.marathi, { now: new Date(when) });
    await expect(page.locator("#bti")).toHaveAttribute("aria-label", "Show the picture full screen: " + label);
    await expect(page.locator("#bti img")).toHaveAttribute("src", `picture-${picture}-360.webp`);
    const btn = page.locator("#iconb");
    await expect(btn).toHaveAttribute("data-picture", picture);
    await expect(btn).toHaveAttribute("data-day", String(day));
    await expect(btn.locator("img")).toHaveAttribute("src", `picture-${picture}-360.webp`);
    await expect(btn).toHaveAttribute("aria-label", "Show the picture full screen: " + label);
    await expect(page.locator('link[rel="icon"][sizes="32x32"]')).toHaveAttribute("href", name);
    // the picture has loaded
    expect(await btn.locator("img").evaluate((i) => i.complete && i.naturalWidth > 0)).toBe(true);
    // the ring sits on today's star: on the picture, in the upper half, left of centre on Sunday, right on Thursday
    const ring = page.locator("#iconr");
    await expect(ring).toBeVisible();
    const b = await btn.boundingBox();
    const r = await ring.boundingBox();
    const cx = (r.x + r.width / 2 - b.x) / b.width,
      cy = (r.y + r.height / 2 - b.y) / b.height;
    expect(cy).toBeGreaterThan(0.1);
    expect(cy).toBeLessThan(0.5);
    if (day === 0) expect(cx).toBeLessThan(0.2);
    else expect(cx).toBeGreaterThan(0.6);
    // full screen: the same picture, large
    await btn.click();
    await expect(page.locator("#pzv")).toHaveAttribute("aria-label", label.replace(/,.*/, ""));
    await expect(page.locator("#pzi")).toHaveAttribute("src", `picture-${picture}.webp`);
    await expect(page.locator("#pzi")).toHaveAttribute("alt", new RegExp("^" + label.replace(/,.*/, "") + ": ॐ"));
    // with the same star ringed
    const [pb, pr] = [await page.locator("#pzi").boundingBox(), await page.locator("#pzr").boundingBox()];
    const px = (pr.x + pr.width / 2 - pb.x) / pb.width;
    if (day === 0) expect(px).toBeLessThan(0.2);
    else expect(px).toBeGreaterThan(0.6);
  });
}

test("the picture changes by itself at 12:00 and 17:00, and the star at midnight, while the page stays open", async ({ page }) => {
  await openSite(page, SETUPS.marathi, { now: new Date("2026-10-17T11:59:00-04:00"), running: true }); // Saturday morning
  const btn = page.locator("#iconb");
  await expect(btn).toHaveAttribute("data-picture", "sunrise");
  await expect(btn).toHaveAttribute("data-day", "6");
  await page.clock.runFor("02:00");
  await expect(btn).toHaveAttribute("data-picture", "midday");
  await expect(btn.locator("img")).toHaveAttribute("src", "picture-midday-360.webp");
  await page.clock.runFor("05:00:00");
  await expect(btn).toHaveAttribute("data-picture", "sunset");
  await page.clock.runFor("07:00:00"); // past midnight: Sunday morning
  await expect(btn).toHaveAttribute("data-picture", "sunrise");
  await expect(btn).toHaveAttribute("data-day", "0");
});

test("coming back to the page shows the picture for the time now", async ({ page }) => {
  await openSite(page, SETUPS.marathi, { now: new Date("2026-10-15T10:00:00-04:00") });
  await expect(page.locator("#iconb")).toHaveAttribute("data-picture", "sunrise");
  // the phone slept (timers paused) and is woken in the evening
  await page.clock.setFixedTime(new Date("2026-10-15T18:00:00-04:00"));
  await page.evaluate(() => document.dispatchEvent(new Event("visibilitychange")));
  await expect(page.locator("#iconb")).toHaveAttribute("data-picture", "sunset");
});

test("IAST spelling switches in place without a reload", async ({ page }) => {
  await openSite(page, SETUPS.english, { hash: "#a1" });
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
  // a text opened after the switch is built in the new spelling, title and lines (js/core/page.js)
  await readText(page, "a2");
  await expect(page.locator("#a2 .items .verse .en p.ia").first()).toBeAttached();
  await expect(page.locator("#a2 header h2 > .en")).toHaveText(/[āīūṃṇṣś]/);
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
    page
      .locator(selector)
      .first()
      .evaluate((el) => {
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
    page
      .locator(selector)
      .first()
      .evaluate(async (el) => {
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

  test("on the home page a pinch does nothing", async ({ page }) => {
    await openSite(page, SETUPS.marathi);
    const r = await pinchOut(page, "#tdy");
    expect(r.after).toBe(r.before);
    await expect(page.locator("#szt")).not.toHaveClass(/\bon\b/);
  });
  test("on a verse it resizes the text, with the size shown on screen", async ({ page }) => {
    await openSite(page, SETUPS.marathi);
    await readText(page, "a1");
    await page.locator("#a1 .items .verse p").first().scrollIntoViewIfNeeded();
    const r = await pinchOut(page, "#a1 .items .verse p");
    expect(parseFloat(r.after)).toBeGreaterThan(parseFloat(r.before));
    const box = await page.locator("#szt").boundingBox();
    expect(box.y).toBeGreaterThanOrEqual(0);
    expect(box.y + box.height).toBeLessThanOrEqual(844);
  });
  // The words between the fingers stay where they were on the screen as the text grows (Satish, 2026-10-23: the page
  // kept its top still, so the place being read ran off the bottom)
  test("the words between the fingers stay under them", async ({ page }) => {
    await openSite(page, SETUPS.marathi);
    await readText(page, "p1");
    // well into the text, a line in the middle of the screen
    await page.evaluate(() => scrollTo(0, document.getElementById("p1").offsetTop + 1500));
    await page.waitForTimeout(300);
    const r = await page.evaluate(async () => {
      const x = innerWidth / 2,
        y = innerHeight / 2;
      const el = document.elementFromPoint(x, y);
      const rng = document.caretRangeFromPoint(x, y);
      rng.setEnd(rng.startContainer, Math.min(rng.startOffset + 1, rng.startContainer.length));
      const before = rng.getBoundingClientRect().top;
      const t = (id, dx) => new Touch({ identifier: id, target: el, clientX: x + dx, clientY: y });
      const fire = (type, touches, changed) =>
        el.dispatchEvent(new TouchEvent(type, { touches, targetTouches: touches, changedTouches: changed || touches, bubbles: true, cancelable: true }));
      const frame = () => new Promise((ok) => requestAnimationFrame(() => requestAnimationFrame(ok)));
      const fs0 = getComputedStyle(document.documentElement).getPropertyValue("--fs");
      fire("touchstart", [t(1, -30), t(2, 30)]);
      fire("touchmove", [t(1, -60), t(2, 60)]);
      await frame();
      const during = rng.getBoundingClientRect().top;
      fire("touchmove", [t(1, -90), t(2, 90)]);
      await frame();
      fire("touchend", [], [t(1, -90), t(2, 90)]);
      await new Promise((ok) => setTimeout(ok, 500));
      return { before, during, after: rng.getBoundingClientRect().top, fs0, fs1: getComputedStyle(document.documentElement).getPropertyValue("--fs") };
    });
    expect(parseFloat(r.fs1)).toBeGreaterThan(parseFloat(r.fs0));
    expect(Math.abs(r.during - r.before), "while pinching").toBeLessThan(4);
    expect(Math.abs(r.after - r.before), "after the fingers lift").toBeLessThan(4);
  });
  test("on a verse it resizes the text instead of zooming", async ({ page }) => {
    await openSite(page, SETUPS.marathi, { hash: "#a1" });
    expect(await pinchStart(page, "#a1 .items .verse p")).toBe(true);
  });
  test("on the home page, Settings and Help the page does not zoom either", async ({ page }) => {
    await openSite(page, SETUPS.marathi);
    expect(await pinchStart(page, "#tdy")).toBe(true);
    await page.locator("#aa").click();
    expect(await pinchStart(page, "#panel .sp-card")).toBe(true);
    await page.locator("#xc").click();
    await tapMore(page, "#hlpb");
    expect(await pinchStart(page, "#help .hlpin")).toBe(true);
  });
});

// Settings' tabs on phones and tablets, Reading | Screen | More, beside Back: one tab's groups at a time, the credit
// under every tab, and Settings opens on Reading again each time
test("Settings: Reading | Screen | More, one at a time; opens on Reading each time", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openSite(page, SETUPS.marathi);
  await page.locator("#aa").click();
  const tab = (v) => page.locator(`#spv button[data-v="${v}"]`);
  await expect(tab("read")).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator("#sl1")).toBeVisible();
  await expect(page.locator("#sfn")).toBeVisible();
  await expect(page.locator("#st")).toBeHidden();
  await expect(page.locator(".sp-by")).toBeVisible();
  await tab("screen").click();
  await expect(tab("screen")).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator("#st")).toBeVisible();
  await expect(page.locator("#sl1")).toBeHidden();
  await expect(page.locator(".sp-by")).toBeVisible();
  await tab("more").click();
  await expect(page.locator("#bks")).toBeVisible();
  await expect(page.locator("#hlp2")).toBeVisible();
  await expect(page.locator(".sp-by")).toBeVisible();
  await page.locator("#xc").click();
  await expect(page.locator("#panel")).toBeHidden();
  await page.locator("#aa").click();
  await expect(tab("read")).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator("#bks")).toBeHidden();
});

// Settings on iPads and desktops: no tabs, the title beside Back, every group at once in two columns: the preview and
// the reading choices on the left, the screen, profiles and about on the right (Satish, 2026-10-30); an iPad upright
// too; narrowed to a phone, the tabs are back
test("Settings on a desktop or an iPad: every group at once, in two columns, no tabs", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await openSite(page, SETUPS.marathi);
  await page.locator("#aa").click();
  await expect(page.locator("#spv")).toBeHidden();
  await expect(page.locator("#spt")).toBeVisible();
  await expect(page.locator("#spt")).toHaveText("Settings");
  for (const id of ["#sprev", "#sl1", "#srf", "#st", "#su", "#bks", "#hlp2", "#upd"]) await expect(page.locator(id)).toBeVisible();
  // the reading choices in the left column, the rest in the right
  const x = async (sel) => (await page.locator(sel).boundingBox()).x;
  expect(await x(".sp-c1")).toBeLessThan(await x(".sp-c2"));
  for (const id of ["#sprev", "#sl1", "#srf"]) expect(await page.locator(".sp-c1 " + id).count(), id).toBe(1);
  for (const id of ["#st", "#su", "#bks", "#upd"]) expect(await page.locator(".sp-c2 " + id).count(), id).toBe(1);
  await page.setViewportSize({ width: 820, height: 1180 });
  await expect(page.locator("#spv")).toBeHidden();
  for (const id of ["#sl1", "#st", "#bks"]) await expect(page.locator(id)).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator("#spv")).toBeVisible();
  await expect(page.locator("#st")).toBeHidden();
  // (the title for screen readers only: a 1px box)
  expect((await page.locator("#spt").boundingBox()).width).toBeLessThanOrEqual(1);
});

// A phone held sideways is as wide as an iPad but too short for its layout: the tabs, and on Reading the preview on
// the left, staying in view while the choices scroll beside it (Satish, 2026-10-30)
test("Settings on a phone held sideways: the tabs, the preview beside the reading choices", async ({ page }) => {
  await page.setViewportSize({ width: 844, height: 390 });
  await openSite(page, SETUPS.marathi);
  await page.locator("#aa").click();
  await expect(page.locator("#spv")).toBeVisible();
  await expect(page.locator("#st")).toBeHidden();
  const prev = page.locator(".sp-pvg");
  const box = async (sel) => await page.locator(sel).boundingBox();
  expect((await box("#sl1")).x).toBeGreaterThan((await prev.boundingBox()).x + (await prev.boundingBox()).width);
  expect((await box("#sl1")).y, "the first choice in view beside the preview").toBeLessThan(390);
  await page.locator("#panel").evaluate((e) => (e.scrollTop = e.scrollHeight));
  const p = await prev.boundingBox();
  expect(p.y, "the preview stays in view").toBeGreaterThanOrEqual(0);
  expect(p.y + p.height).toBeLessThanOrEqual(390);
  await page.locator('#spv [data-v="screen"]').click();
  await expect(page.locator("#st")).toBeVisible();
  await expect(page.locator("#sl1")).toBeHidden();
  // turned upright, and an iPad held sideways, as before
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator("#spv")).toBeVisible();
  await page.setViewportSize({ width: 1180, height: 820 });
  await expect(page.locator("#spv")).toBeHidden();
  for (const id of ["#sl1", "#st"]) await expect(page.locator(id)).toBeVisible();
});

// Keep screen on (Satish, 2026-10-30): Off, 15, 30, 45 or 60 minutes after the last touch, key or scroll; the old
// switch's on is 30. The browser's lock is stood in for, so the test sees when it is held and let go
test("Keep screen on: held for the minutes chosen after the last touch, then let go @mobile", async ({ page }) => {
  await page.addInitScript(() => {
    const w = (window.__wl = { held: 0 });
    Object.defineProperty(navigator, "wakeLock", {
      configurable: true,
      value: {
        request() {
          w.held++;
          const l = new EventTarget();
          l.release = () => {
            w.held--;
            l.dispatchEvent(new Event("release"));
            return Promise.resolve();
          };
          return Promise.resolve(l);
        },
      },
    });
  });
  await openSite(page, { ...SETUPS.marathi, wake: 1 }, { running: true });
  const held = () => page.evaluate(() => window.__wl.held);
  await expect.poll(held).toBe(1);
  await page.locator("#aa").click();
  await settingsTab(page, "screen");
  await expect(page.locator('#tw [data-v="30"]')).toHaveAttribute("aria-pressed", "true");
  await page.locator('#tw [data-v="15"]').click();
  await expect(page.locator('#tw [data-v="15"]')).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator('#tw [data-v="30"]')).toHaveAttribute("aria-pressed", "false");
  await page.clock.runFor("14:00");
  expect(await held()).toBe(1);
  // a key starts the 15 minutes again
  await page.keyboard.press("Shift");
  await page.clock.runFor("14:00");
  expect(await held()).toBe(1);
  await page.clock.runFor("02:00");
  expect(await held(), "let go 15 minutes after the last touch").toBe(0);
  // back on the next touch, once
  await page.keyboard.press("Shift");
  await page.keyboard.press("Shift");
  await expect.poll(held).toBe(1);
  await page.locator('#tw [data-v="0"]').click();
  await expect.poll(held).toBe(0);
  await page.keyboard.press("Shift");
  await page.clock.runFor("01:00");
  expect(await held(), "Off stays off").toBe(0);
  const saved = await page.evaluate((k) => JSON.parse(localStorage.getItem(k)).wake, PREFS_KEY);
  expect(saved).toBe(0);
  // the minutes in the menu language's digits
  await page.locator('#su [data-v="mr"]').click();
  await expect(page.locator('#tw [data-v="45"]')).toHaveText("४५");
});

// Settings › Reading on a phone: the preview keeps one height whatever Show is (the cards below never jump), and at
// 100% every line shows whole, as the pieces fit their lines to the screen; A+ shows the size chosen, running past
test("Settings preview: one height for every Show choice, whole lines at 100%, A+ as chosen @mobile", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 });
  await openSite(page, SETUPS.english);
  await page.locator("#aa").click();
  const pw = page.locator("#sprev .sp-pw");
  const fits = () =>
    pw.evaluate((w) => {
      const r = w.getBoundingClientRect();
      return [...w.querySelectorAll("p")].every((p) => {
        const b = p.getBoundingClientRect();
        return b.left >= r.left && b.right <= r.right && b.bottom <= r.bottom;
      });
    });
  const heights = [];
  for (const v of ["mr", "en", "both"]) {
    await page.locator(`#slw [data-v="${v}"]`).click();
    await pw.waitFor();
    heights.push(Math.round((await pw.boundingBox()).height));
    expect(await fits(), `whole lines with Show ${v}`).toBe(true);
  }
  expect(new Set(heights).size).toBe(1);
  // English shown, fitted under the default size; A+ takes the size chosen, not the fit
  await page.locator('#slw [data-v="en"]').click();
  const fitted = await pw.evaluate((w) => parseFloat(getComputedStyle(w).getPropertyValue("--fs")));
  await page.locator("#lg").click();
  const chosen = await pw.evaluate((w) => parseFloat(getComputedStyle(w).getPropertyValue("--fs")));
  expect(chosen).toBeGreaterThan(fitted);
});

// On an iPhone a fixed bar made visible while the page still scrolls can be drawn in the middle of the page: scrolling
// up brings the bars back only once the page stops moving; scrolling down hides them at once
test("scrolling up brings the bars back once the page stops, not mid-scroll @mobile", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openSite(page, SETUPS.marathi, { hash: "#vedic-chant-shree-rudra" }); // a long text, so the page goes on scrolling
  await page.waitForTimeout(800);
  const tucked = () => page.evaluate(() => document.documentElement.hasAttribute("data-tuck"));
  const steps = (dy) =>
    page.evaluate(async (dy) => {
      for (let i = 0; i < 6; i++) {
        scrollBy(0, dy);
        await new Promise((r) => requestAnimationFrame(r));
      }
    }, dy);
  await steps(60);
  await expect.poll(tucked).toBe(true);
  await steps(-30);
  expect(await tucked()).toBe(true);
  await expect.poll(tucked).toBe(false);
});

// About's version line: "Close and reopen" (the longest word there) beside the version on a phone; on the narrowest
// phone, under it at its start, never stranded at the right
test("the version line keeps Check for updates beside it, or under its start", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openSite(page, SETUPS.english);
  await page.locator("#aa").click();
  await settingsTab(page, "more");
  // as on the phone in the report: saved for offline, and an update waiting
  await page.locator("#offv").evaluate((e) => (e.textContent = "Offline ready"));
  await page.locator("#updv").evaluate((e) => (e.textContent = "Close and reopen"));
  const box = async (sel) => await page.locator(sel).boundingBox();
  expect(Math.abs((await box("#upd .sp-l")).y - (await box("#updv")).y), "one line").toBeLessThan(4);
  await page.setViewportSize({ width: 280, height: 640 });
  const l = await box("#upd .sp-l"),
    v = await box("#updv");
  if (v.y > l.y + 4) expect(Math.abs(v.x - l.x), "under the version, at its start").toBeLessThan(2);
});
