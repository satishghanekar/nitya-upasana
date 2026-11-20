// Interactions: what readers do, checked in every browser engine (and on phone emulation for @mobile).
import { test, expect } from "@playwright/test";
import { openSite, settle, SETUPS, PREFS_KEY, openMore, tapMore, readText, settingsTab, axeEveryTheme, noViolations } from "./helpers.mjs";

const prefs = (page) => page.evaluate((k) => JSON.parse(localStorage.getItem(k)), PREFS_KEY);
const rootAttr = (page, a) => page.evaluate((a) => document.documentElement.getAttribute(a), a);

// Opened at a piece on a phone, the bars start tucked away (a tap on the page brings them back)
const untuck = (page) => page.evaluate(() => document.documentElement.removeAttribute("data-tuck"));

// The top bar while reading, as on Home: the name, who is reading, Share and Settings (Print is in the Share menu). Language
// and Dhrupad are in the reading sheet (Aa); on a phone Print is in the Share menu, so the title has the room (Satish,
// 2026-11-12)
test("while reading the top bar has Share and Settings; the bottom bar has Home, Library and Reading @mobile", async ({ page }) => {
  await openSite(page, SETUPS.marathi, { hash: "#a1" });
  await untuck(page);
  expect(await page.locator("#home-btn, #rb, #asq").count()).toBe(0);
  for (const b of ["#who", "#hm", "#tmb", "#aa"]) await expect(page.locator(b)).toBeVisible();
  expect(await page.locator(".bar .tools button:visible").evaluateAll((l) => l.map((b) => b.id))).toEqual(["tmb", "aa"]);
  await expect(page.locator("#tmb")).toHaveAccessibleName("Share");
  // the bottom bar's middle buttons: the icon with its word under it, in the menu language (icons alone, from
  // 2026-11-13, were hard to tell apart; the review of 2026-11-15, Satish: build it). The word is the button's name
  await expect(page.locator("#ash")).toHaveAccessibleName("Home");
  await expect(page.locator("#hm")).toHaveAccessibleName("Library");
  await expect(page.locator("#rsb")).toHaveAccessibleName("Reading");
  for (const b of ["#ash", "#hm", "#rsb"]) {
    await expect(page.locator(b + " .asil")).toBeVisible();
    const fit = await page.locator(b).evaluate((e) => {
      const r = e.getBoundingClientRect(),
        w = e.querySelector(".asil").getBoundingClientRect(),
        i = e.querySelector("svg").getBoundingClientRect();
      // (on a computer the four are in the top bar, the word beside its icon: "on a computer …" below)
      const rail = document.documentElement.hasAttribute("data-rail");
      return {
        wide: r.width,
        high: r.height,
        wordIn: w.left >= r.left && w.right <= r.right && w.bottom <= r.bottom,
        under: rail ? w.left >= i.right : w.top >= i.bottom,
      };
    });
    expect(fit.wide, b).toBeGreaterThanOrEqual(44);
    expect(fit.high, b).toBeGreaterThanOrEqual(44);
    expect(fit.wordIn, b + ": the word inside its button").toBe(true);
    expect(fit.under, b + ": the word under the icon (beside it on a computer)").toBe(true);
  }
  // and the bar is no taller than its round Prev and Next buttons need, as it was with icons alone
  expect(await page.locator("#asi").evaluate((e) => e.getBoundingClientRect().height)).toBeLessThanOrEqual(58);
  // nothing in the bar spills out of it
  expect(
    await page
      .locator("#asi")
      .evaluate((e) =>
        [...e.children].every(
          (b) =>
            b.hidden ||
            (b.getBoundingClientRect().left >= e.getBoundingClientRect().left && b.getBoundingClientRect().right <= e.getBoundingClientRect().right),
        ),
      ),
  ).toBe(true);
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

test("Share opens App, Share, QR and Help (and Print on a phone) under it while reading; a tap outside or Escape closes it @mobile", async ({ page }) => {
  await openSite(page, SETUPS.marathi, { hash: "#a1" });
  await untuck(page);
  const more = page.locator("#tmb"),
    menu = page.locator("#shr");
  await expect(menu).toBeHidden();
  await more.click();
  await expect(menu).toBeVisible();
  await expect(more).toHaveAttribute("aria-expanded", "true");
  for (const id of ["#shb", "#qrb", "#hlpb"]) await expect(page.locator(id)).toBeVisible();
  // Print is here on every screen and not in the bar, named by its word and as tall as a finger needs
  await expect(page.locator("#shr #menu-print")).toBeVisible();
  await expect(page.locator(".bar #asp")).toHaveCount(0);
  await expect(page.locator("#menu-print")).toHaveAccessibleName("Print");
  expect((await page.locator("#menu-print").boundingBox()).height).toBeGreaterThanOrEqual(44);
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

test("a choice in the Share menu closes the menu, and focus comes back to Share when its pop-up closes", async ({ page }) => {
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

// Print is a choice in the Share menu on every screen (Satish, 2026-11-13): like the others it closes the menu, and
// focus comes back to Share when the builder closes
test("Print opens from the Share menu on a phone, an iPad and a computer, and focus comes back to Share", async ({ page }) => {
  for (const [width, height] of [
    [390, 844],
    [820, 1180],
    [1440, 900],
  ]) {
    await page.setViewportSize({ width, height });
    await openSite(page, SETUPS.marathi, { hash: "#a1" });
    await untuck(page);
    await tapMore(page, "#menu-print");
    await expect(page.locator("#shr"), `menu closed ${width}px`).toBeHidden();
    await expect(page.locator("#prm"), `builder ${width}px`).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.locator("#prm")).toBeHidden();
    await expect(page.locator("#tmb"), `focus ${width}px`).toBeFocused();
  }
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
  // with what to try next, under it (Satish, 2026-11-12)
  await expect(page.locator("#none")).toHaveText("Nothing found" + "Try fewer letters or another spelling. Marathi and English letters both work.");
  await expect(page.locator("#none .none-hint")).toBeVisible();
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
  // (in the middle of the screen, as a reader taps it: at the very top the pill shown while scrolling covers it)
  await page.locator("#a2 header").evaluate((e) => e.scrollIntoView({ block: "center" }));
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
    // the large picture, with its ring, is on wide screens; on phones the small one in the top bar (#bti) plays the day's
    // opening again, whose picture opens it
    await page.setViewportSize({ width: 1280, height: 820 });
    await openSite(page, SETUPS.marathi, { now: new Date(when) });
    await expect(page.locator("#bti")).toHaveAttribute("aria-label", "Play the day's opening again: " + label);
    await expect(page.locator("#bti img")).toHaveAttribute("src", `picture-${picture}-360.webp`);
    const btn = page.locator("#iconb");
    await expect(btn).toHaveAttribute("data-picture", picture);
    await expect(btn).toHaveAttribute("data-day", String(day));
    await expect(btn.locator("img")).toHaveAttribute("src", `picture-${picture}-360.webp`);
    await expect(btn).toHaveAttribute("aria-label", "Show the picture full screen: " + label);
    await expect(page.locator('link[rel="icon"][sizes="32x32"]')).toHaveAttribute("href", name);
    // the large picture is Home's on a computer; on a touch screen (an iPad held sideways reads as upright, Satish
    // 2026-11-14) Home has the small one in the top bar, checked above
    if (await page.evaluate(() => matchMedia("(hover: none) and (pointer: coarse)").matches)) {
      await expect(btn).toBeHidden();
      return;
    }
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
    // what Settings does when "English · Scholarly (sukhakartā)" is picked
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
  // Over the calendar and the routine builder too (Satish, 2026-11-02): the text a pinch would resize is behind them
  test("over the calendar's Day, 15 days and Month, and the routine builder, a pinch does nothing", async ({ page }) => {
    await openSite(page, { ...SETUPS.marathi, loc: { lat: 39.96, lon: -83.0 } });
    await page.locator("#panb").click({ position: { x: 12, y: 12 } });
    for (const [tab, box] of [
      ["day", "#cald"],
      ["up", "#calu"],
      ["month", "#calm"],
    ]) {
      await page.locator(`#calv [data-v="${tab}"]`).click();
      expect(await pinchStart(page, box), tab + ": no zoom").toBe(true);
      const r = await pinchOut(page, box);
      expect(r.after, tab).toBe(r.before);
    }
    await expect(page.locator("#szt")).not.toHaveClass(/\bon\b/);
    // on a computer, Ctrl + is stopped there too (no page zoom) and leaves the size alone
    const fs = () => page.evaluate(() => document.documentElement.style.getPropertyValue("--fs"));
    const fs0 = await fs();
    await page.keyboard.press("Control+Equal");
    await page.evaluate(() => new Promise((ok) => requestAnimationFrame(() => requestAnimationFrame(ok))));
    expect(await fs()).toBe(fs0);
    await page.locator("#cbk").click();
    await page.locator("#tsed").click();
    await expect(page.locator("#rtb")).toBeVisible();
    const r = await pinchOut(page, "#rtb");
    expect(r.after).toBe(r.before);
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

// Settings' tabs on phones and tablets, Reading | Screen | You, beside Back: one tab's groups at a time, the credit
// under every tab, and Settings opens on Reading again each time
test("Settings: Reading | Screen | You, one at a time; opens on Reading each time", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openSite(page, SETUPS.marathi);
  await page.locator("#aa").click();
  const tab = (v) => page.locator(`#spv button[data-v="${v}"]`);
  await expect(tab("read")).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator("#sl1")).toBeVisible();
  await expect(page.locator("#sfn")).toBeVisible();
  await expect(page.locator("#st")).toBeHidden();
  // the tab once named More, for what it holds: the person, their routine, pace and backup (Satish, 2026-11-15)
  await expect(tab("more")).toHaveText("You");
  // English's spelling named as well as shown
  await expect(page.locator("#sl2v")).toHaveText("English · Simple");
  await expect(page.locator("#sl2s option", { hasText: "Sukhkarta" })).toHaveText("English · Simple (Sukhkarta)");
  await expect(page.locator("#sl2s option", { hasText: "sukhakartā" })).toHaveText("English · Scholarly (sukhakartā)");
  // the maker's line under About only, not under every tab
  await expect(page.locator(".sp-by")).toBeHidden();
  await tab("screen").click();
  await expect(tab("screen")).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator("#st")).toBeVisible();
  await expect(page.locator("#sl1")).toBeHidden();
  await expect(page.locator(".sp-by")).toBeHidden();
  // each holiday country chosen carries a tick; one turned off loses it
  const tick = (v) => page.locator(`#shol button[data-v="${v}"]`).evaluate((b) => getComputedStyle(b, "::before").content !== "none");
  expect([await tick("us"), await tick("in")]).toEqual([true, true]);
  await page.locator('#shol button[data-v="in"]').click();
  expect([await tick("us"), await tick("in")]).toEqual([true, false]);
  await page.locator('#shol button[data-v="in"]').click();
  await tab("more").click();
  await expect(page.locator("#bks")).toBeVisible();
  await expect(page.locator("#hlp2")).toBeHidden();
  await expect(page.locator(".sp-by")).toBeHidden();
  // About, a tab of its own (Satish, 2026-11-20): This app (the version first), then Follow; the maker's line under it
  await expect(page.locator("#spv button")).toHaveText(["Reading", "Screen", "You", "About"]);
  await tab("about").click();
  await expect(tab("about")).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator("#bks")).toBeHidden();
  await expect(page.locator("#hlp2")).toBeVisible();
  await expect(page.locator(".sp-abt .sp-row").first()).toHaveId("upr");
  await expect(page.locator(".sp-by")).toBeVisible();
  // the maker's line: the copyright and the terms of use (LICENSE.txt)
  await expect(page.locator(".sp-by")).toContainText("All rights reserved.");
  await expect(page.locator('.sp-by a[href="LICENSE.txt"]')).toHaveText("Terms of use");
  // the four tabs side by side on the smallest phone, each word whole
  await page.setViewportSize({ width: 320, height: 568 });
  for (const b of await page.locator("#spv button").all()) expect(await b.evaluate((x) => x.scrollWidth <= x.clientWidth)).toBe(true);
  const bar = await page.locator("#spv").boundingBox();
  expect(bar.x + bar.width).toBeLessThanOrEqual(320);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator("#xc").click();
  await expect(page.locator("#panel")).toBeHidden();
  await page.locator("#aa").click();
  await expect(tab("read")).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator("#bks")).toBeHidden();
});

// Settings on iPads and desktops: the title beside Back and the same four tabs as on a phone at the other end of the
// row, a tab's groups in two columns (Satish, 2026-11-20: every group at once looked unorganized). Reading: its choices
// on the left, the preview on the right; Screen: its one card in the middle; You: Profile beside Backup; About: This
// app beside Follow, the maker's line under them. An iPad upright too; on a phone, the title for screen readers only
test("Settings on a desktop or an iPad: the four tabs, a tab's groups in two columns", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await openSite(page, SETUPS.marathi);
  await page.locator("#aa").click();
  await expect(page.locator("#spv")).toBeVisible();
  await expect(page.locator("#spt")).toBeVisible();
  await expect(page.locator("#spt")).toHaveText("Settings");
  const tab = (v) => page.locator(`#spv button[data-v="${v}"]`);
  const box = async (sel) => await page.locator(sel).boundingBox();
  // the tabs at the end of the row, beside the title
  expect((await box("#spv")).x).toBeGreaterThan((await box("#spt")).x + (await box("#spt")).width);
  await expect(tab("read")).toHaveAttribute("aria-pressed", "true");
  for (const id of ["#sprev", "#sl1", "#srf"]) await expect(page.locator(id)).toBeVisible();
  for (const id of ["#st", "#bks", "#hlp2"]) await expect(page.locator(id)).toBeHidden();
  // Reading: the choices on the left, the preview on the right, both from the top
  const [choices, prev] = await Promise.all([".sp-grp:has(#sl1)", ".sp-pvg"].map((sel) => box(sel)));
  expect(prev.x).toBeGreaterThan(choices.x + choices.width - 1);
  expect(Math.abs(prev.y - choices.y)).toBeLessThan(2);
  // the preview's lines in the middle of their window, not at its top with the room left over under them
  const gaps = await page.locator("#sprev .sp-pw").evaluate((w) => {
    const r = w.getBoundingClientRect(),
      ps = [...w.querySelectorAll("p")].map((p) => p.getBoundingClientRect());
    return [Math.min(...ps.map((b) => b.top)) - r.top, r.bottom - Math.max(...ps.map((b) => b.bottom))];
  });
  expect(Math.abs(gaps[0] - gaps[1])).toBeLessThan(30);
  // Screen: its one card in the middle, at a comfortable width
  await tab("screen").click();
  await expect(page.locator("#st")).toBeVisible();
  await expect(page.locator("#sl1")).toBeHidden();
  const [screen, body] = await Promise.all([".sp-grp:has(#st)", "#sp-home .sp-body"].map((sel) => box(sel)));
  expect(screen.width).toBeLessThanOrEqual(641);
  expect(Math.abs(screen.x - body.x - (body.x + body.width - screen.x - screen.width))).toBeLessThan(4);
  // You: Profile beside Backup
  await tab("more").click();
  await expect(page.locator("#panel .sp-grp:not([hidden]) > .sp-h")).toHaveText(["Profile", "Backup"]);
  for (const id of ["#spf", "#sprt", "#spc"]) expect(await page.locator(".sp-grp:has(#spf) " + id).count(), id).toBe(1);
  expect((await box("#bks")).x).toBeGreaterThan((await box("#spc")).x + (await box("#spc")).width - 1);
  // About: This app (the version first) beside Follow, the maker's line under both
  await tab("about").click();
  await expect(page.locator("#panel .sp-grp:not([hidden]):visible > .sp-h")).toHaveText(["This app", "Follow"]);
  const [app, fol, by] = await Promise.all([".sp-abt", ".sp-follow", ".sp-by"].map((sel) => box(sel)));
  expect(fol.x).toBeGreaterThan(app.x + app.width - 1);
  expect(by.y).toBeGreaterThan(Math.max(app.y + app.height, fol.y + fol.height) - 1);
  await page.locator("#xc").click();
  await page.locator("#aa").click();
  await expect(tab("read")).toHaveAttribute("aria-pressed", "true");
  // an iPad held upright: the same
  await page.setViewportSize({ width: 820, height: 1180 });
  await expect(page.locator("#spv")).toBeVisible();
  const [c2, p2] = await Promise.all([".sp-grp:has(#sl1)", ".sp-pvg"].map((sel) => box(sel)));
  expect(p2.x).toBeGreaterThan(c2.x + c2.width - 1);
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator("#spv")).toBeVisible();
  // (the title for screen readers only: a 1px box)
  expect((await page.locator("#spt").boundingBox()).width).toBeLessThanOrEqual(1);
});

// While a page is open over a text (Settings, the Library, the calendar), the text behind the top pill is covered
// whole: it showed around the pill, above it on a phone held sideways and under the clock upright (Satish, 2026-11-15)
test("with Settings open, nothing of the text shows around the top bar @mobile", async ({ page }) => {
  await openSite(page, SETUPS.marathi, { hash: "#aarti-sukhkarta" });
  const band = () =>
    page.evaluate(() => {
      const s = getComputedStyle(document.body, "::before");
      return {
        shown: s.display !== "none",
        fade: s.backgroundImage !== "none",
        colour: s.backgroundColor,
        bottom: parseFloat(s.height),
        bg: getComputedStyle(document.body).backgroundColor,
      };
    });
  // while reading: a fade, so no half-covered line shows beside the pill
  expect(await band()).toMatchObject({ shown: true, fade: true });
  await page.locator("#aa").click();
  const open = await band();
  expect(open).toMatchObject({ shown: true, colour: open.bg });
  // down to where the page starts, under the pill
  expect(open.bottom).toBeGreaterThanOrEqual((await page.locator("#panel").boundingBox()).y);
  await page.locator("#xc").click();
  expect(await band()).toMatchObject({ shown: true, fade: true });
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
  // across the whole screen a row's label and its choices share a line, the choices no wider than they need
  // (Satish, 2026-11-15: Theme's four ran edge to edge under the label)
  const [label, seg, row] = await Promise.all(
    ["span.sp-l", "#st", ""].map((sel) =>
      page
        .locator(".sp-row:has(#st) " + sel)
        .first()
        .boundingBox(),
    ),
  );
  expect(seg.y).toBeLessThan(label.y + label.height);
  expect(seg.x).toBeGreaterThan(label.x + label.width - 1);
  expect(seg.width).toBeLessThan(row.width * 0.65);
  // You: Profile (who is reading, the routine, the chanting pace), then Backup, each under its heading
  await page.locator('#spv [data-v="more"]').click();
  await expect(page.locator("#panel .sp-grp:not([hidden]) > .sp-h")).toHaveText(["Profile", "Backup"]);
  expect((await box("#spc")).y).toBeLessThan((await box("#bks")).y);
  for (const id of ["#spf", "#sprt", "#spc"]) expect(await page.locator(".sp-grp:has(#spf) " + id).count(), id).toBe(1);
  // Settings has the whole of the short screen: the top bar steps aside while it is open, and comes back after
  await expect(page.locator("body > .bar")).toBeHidden();
  expect((await page.locator("#panel").boundingBox()).y).toBe(0);
  await page.locator("#xc").click();
  await expect(page.locator("body > .bar")).toBeVisible();
  await page.locator("#aa").click();
  // the dhrupad in the reading choices' own card, the last of them in view beside the preview with nothing scrolled
  expect(await page.locator(".sp-card:has(#sl1) #srf").count()).toBe(1);
  expect((await box("#sfn")).y + (await box("#sfn")).height).toBeLessThanOrEqual(390);
  // turned upright, and an iPad held sideways: the tabs still, Reading's choices in view
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator("#spv")).toBeVisible();
  await page.setViewportSize({ width: 1180, height: 820 });
  await expect(page.locator("#spv")).toBeVisible();
  await expect(page.locator("#sl1")).toBeVisible();
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
  await openSite(page, SETUPS.marathi, { hash: "#vedic-chant-shri-rudra" }); // a long text, so the page goes on scrolling
  await page.waitForTimeout(800);
  const tucked = () => page.evaluate(() => document.documentElement.hasAttribute("data-tuck"));
  // six steps a frame apart; whether the bars are tucked is read just after the last, in the page (on a busy machine a
  // second round trip can take longer than the page takes to stop)
  const steps = (dy) =>
    page.evaluate(async (dy) => {
      for (let i = 0; i < 6; i++) {
        scrollBy(0, dy);
        await new Promise((r) => requestAnimationFrame(r));
      }
      return document.documentElement.hasAttribute("data-tuck");
    }, dy);
  await steps(60);
  await expect.poll(tucked).toBe(true);
  expect(await steps(-30)).toBe(true);
  await expect.poll(tucked).toBe(false);
});

// About's version line: the version, under it the offline state at its start, and the round button beside them, a
// 44px target named for what it does; on the narrowest phone too
test("the version line: the version, its state under it, and the round Check for updates button beside them", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openSite(page, SETUPS.english);
  await page.locator("#aa").click();
  await settingsTab(page, "about");
  await expect(page.locator("#upr .sp-l > span").first()).toHaveText(/^Version \d/);
  await expect(page.locator("#upd")).toHaveAccessibleName("Check for updates");
  await expect(page.locator("#uph")).toBeHidden();
  for (const w of [390, 320]) {
    await page.setViewportSize({ width: w, height: 700 });
    const box = async (sel) => await page.locator(sel).boundingBox();
    const v = await box("#upr .sp-l > span"),
      s = await box("#ups"),
      b = await box("#upd");
    expect(Math.abs(s.x - v.x), w + ": the state under the version, at its start").toBeLessThan(2);
    expect(s.y, w + ": under it").toBeGreaterThan(v.y + v.height - 2);
    expect(b.x, w + ": the button beside them").toBeGreaterThan(Math.max(v.x + v.width, s.x + s.width) - 1);
    expect(Math.round(b.width) + "x" + Math.round(b.height), w + ": 44px").toBe("44x44");
  }
});

test("scrolling through a text: every verse on screen is shown at once, with no fade-in to blank it @mobile", async ({ page }) => {
  // (Satish, 2026-11-09: each verse used to show, go blank and fade back in once it was well on screen, so a page read
  // flickered all the way down; the same in both apps)
  const errors = [];
  await openSite(page, SETUPS.english, { errors });
  const id = await page.evaluate(() => {
    const ps = window.CONTENT.categories.flatMap((c) => c.pieces);
    return ps.reduce((a, b) => ((b.items || []).length > (a.items || []).length ? b : a)).id;
  });
  await page.goto("./#" + id);
  await page.waitForTimeout(600);
  for (let i = 0; i < 4; i++) {
    await page.evaluate(() => scrollBy(0, 900));
    const hidden = await page.evaluate(async () => {
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      return [...document.querySelectorAll(".ash .item")]
        .filter((x) => {
          const r = x.getBoundingClientRect();
          return r.bottom > 0 && r.top < innerHeight && r.height > 0;
        })
        .filter((x) => x.getAnimations().length || getComputedStyle(x).opacity !== "1").length;
    });
    expect(hidden).toBe(0);
  }
  expect(errors).toEqual([]);
});

// Go to (js/features/where.js, Satish 2026-11-14): in a long text or a session the pill shown while the page scrolls says
// where the reading is and opens a sheet of the places to go to, made from the text's own headings, parts and verses.
// The top bar's title stays the site's name (Satish 2026-11-17: "stop changing stuff in app title").
/** The bars tucked away, as while scrolling down: the pill at the top in their place */
const tuckIn = (page) => page.evaluate(() => document.documentElement.setAttribute("data-tuck", "1"));
/** The page scrolled so a line is where Go to puts one, a third of the way down, the bars tucked away */
async function toLine(page, l) {
  await page.evaluate((l) => {
    const el = document.querySelector('.wrap > .ash [data-l="' + l + '"]');
    scrollTo(0, el.getBoundingClientRect().top + scrollY - innerHeight * 0.3);
  }, l);
  await page.waitForTimeout(400);
  await tuckIn(page);
  await page.waitForTimeout(150);
}
const wh = (page) => page.locator("#tkw");
/** Go to opened from the pill (a jump brings the bars back, so it is tucked away again first) */
async function goTo(page) {
  await tuckIn(page);
  await page.locator("#tkb").click();
}

test("Go to in Pavamana: the pill says the adhyaya and sukta, a sukta is one tap away, Back returns @mobile", async ({ page }) => {
  await openSite(page, SETUPS.marathi);
  await readText(page, "vedic-chant-pavamana-suktam");
  await toLine(page, "vedic-chant-pavamana-suktam.700");
  // the pill opens Go to; the title is the site's name, as it is on Home
  await expect(page.locator("#tkb")).toBeVisible();
  await expect(page.locator("#btt")).toHaveText("नित्य उपासना");
  await expect(wh(page)).toHaveText(/^तृतीयोऽध्यायः · ९\.[०-९]{2}$/);
  await expect(page.locator("#tkt")).toHaveText(/^[०-९]+\. पवमानसूक्तम्$/);
  const was = await wh(page).textContent();
  await expect(page.locator("#tkb")).toHaveAccessibleName(/^Go to: .*पवमानसूक्तम्, तृतीयोऽध्यायः, ९\./);
  await goTo(page);
  await expect(page.locator("#goto")).toBeVisible();
  await expect(page.locator("#tkb")).toHaveAttribute("aria-expanded", "true");
  // its adhyaya open, the sukta being read marked
  await expect(page.locator('#gtl [aria-current="location"]')).toHaveText(was.split(" · ")[1]);
  await page.locator("#gtl .gt-grid button", { hasText: "९.६०" }).click();
  await expect(page.locator("#goto")).toBeHidden();
  await expect(wh(page)).toHaveText("तृतीयोऽध्यायः · ९.६०");
  // the bars back after the jump, and the title still the site's name
  await expect(page.locator("#btt")).toHaveText("नित्य उपासना");
  // another adhyaya: its own suktas behind ▾
  await goTo(page);
  await page.locator("#gtl .gt-more").first().click();
  await page.locator("#gtl .gt-grid:not([hidden]) button", { hasText: "९.३" }).first().click();
  await expect(wh(page)).toHaveText("प्रथमोऽध्यायः · ९.३");
  // Back: where the reading was before each jump
  await page.goBack();
  await expect(wh(page)).toHaveText("तृतीयोऽध्यायः · ९.६०");
  await page.goBack();
  await expect(wh(page)).toHaveText(was);
});

test("Go to in Pavamana reaches the khila mantras after the fourth adhyaya @mobile", async ({ page }) => {
  // (Satish 2026-11-17: Go to had no way to them; they were not a heading of their own)
  await openSite(page, SETUPS.marathi);
  await readText(page, "vedic-chant-pavamana-suktam");
  await toLine(page, "vedic-chant-pavamana-suktam.1200");
  await expect(wh(page)).toHaveText(/^चतुर्थोऽध्यायः · ९\.६७$/);
  await goTo(page);
  await expect(page.locator("#gtl .gt-go")).toHaveText([/प्रथमोऽध्यायः/, /द्वितीयोऽध्यायः/, /तृतीयोऽध्यायः/, /चतुर्थोऽध्यायः/, /खिलमन्त्रः/]);
  await expect(page.locator("#gtl .gt-grid:not([hidden]) button")).toHaveText(["९.६५", "९.६६", "९.६७"]);
  await page.locator("#gtl .gt-go", { hasText: "खिलमन्त्रः" }).click();
  await expect(wh(page)).toHaveText("खिलमन्त्रः");
});

test("Go to in Lalita: a verse by its number, in either digits; one there is not is said; Escape closes @mobile", async ({ page }) => {
  await openSite(page, SETUPS.marathi);
  await readText(page, "vedic-chant-lalita-sahasranama");
  await toLine(page, "vedic-chant-lalita-sahasranama.120");
  await expect(wh(page)).toHaveText(/^स्तोत्रम् · [०-९]+$/);
  await goTo(page);
  // the verses in groups of 25, the box above them
  await expect(page.locator("#gtl .gt-grid:not([hidden]) button")).toHaveCount(8);
  await page.locator("#gtn").fill("१४२");
  await page.locator("#gtf button").click();
  await expect(wh(page)).toHaveText("स्तोत्रम् · १४२");
  await goTo(page);
  await page.locator("#gtn").fill("42");
  await page.locator("#gtn").press("Enter");
  await expect(wh(page)).toHaveText("स्तोत्रम् · ४२");
  await goTo(page);
  await page.locator("#gtn").fill("500");
  await page.locator("#gtf button").click();
  await expect(page.locator("#gtm")).toHaveText("No verse 500 here");
  await page.keyboard.press("Escape");
  await expect(page.locator("#goto")).toBeHidden();
  await expect(page.locator("#tkb")).toBeFocused();
});

test("Go to in Shri Rudra: Namakam and Chamakam, eleven anuvakas each, the grid by number alone @mobile", async ({ page }) => {
  await openSite(page, SETUPS.marathi);
  await readText(page, "vedic-chant-shri-rudra");
  await toLine(page, "vedic-chant-shri-rudra.90");
  await expect(wh(page)).toHaveText(/^नमकम् · अनुवाकः [०-९]+$/);
  await goTo(page);
  const open = page.locator("#gtl .gt-grid:not([hidden]) button");
  await expect(open).toHaveCount(11);
  await expect(open.first()).toHaveText("१");
  await page.locator("#gtl .gt-more").last().click();
  await page.locator("#gtl .gt-grid:not([hidden])").last().locator("button", { hasText: "५" }).click();
  await expect(wh(page)).toHaveText("चमकम् · अनुवाकः ५");
});

test("with the bars tucked away, the pill at the top says where the reading is, large and bold, and opens Go to @mobile", async ({ page }) => {
  // (Satish 2026-11-14: the name in view while reading is the one to tap; Go to opened at the foot of the screen, far from
  // it. 2026-11-17: "make the pill larger and bold on all devices")
  await openSite(page, SETUPS.marathi);
  await readText(page, "vedic-chant-pavamana-suktam");
  await toLine(page, "vedic-chant-pavamana-suktam.700");
  const pill = page.locator("#tkb");
  await expect(pill).toBeVisible();
  await expect(page.locator("#tkw")).toHaveText(/^तृतीयोऽध्यायः · ९\.[०-९]{2}$/);
  await expect(pill).toHaveAccessibleName(/^Go to: .*पवमानसूक्तम्, तृतीयोऽध्यायः, ९\./);
  // below the top of the screen, where the system dims nothing, a whole tap target, two lines, the place large and bold
  const pb = await pill.boundingBox();
  expect(pb.y).toBeGreaterThanOrEqual(10);
  expect(pb.height).toBeGreaterThanOrEqual(52);
  const place = await page.locator("#tkw").evaluate((e) => [parseFloat(getComputedStyle(e).fontSize), getComputedStyle(e).fontWeight]);
  const title = await page.locator("#tkt").evaluate((e) => parseFloat(getComputedStyle(e).fontSize));
  expect(place[0]).toBeGreaterThanOrEqual(17);
  expect(place[1]).toBe("700");
  expect(place[0]).toBeGreaterThan(title);
  expect((await page.locator("#tkw").boundingBox()).y).toBeGreaterThan((await page.locator("#tkt").boundingBox()).y);
  await pill.click();
  await expect(page.locator("#goto")).toBeVisible();
  await expect(pill).toHaveAttribute("aria-expanded", "true");
  // the card hangs from the top of the screen, under where it was opened
  const cb = await page.locator("#goto .rsc").boundingBox();
  expect(cb.y).toBeLessThan(20);
  expect(cb.y + cb.height).toBeLessThan((await page.evaluate(() => innerHeight)) - 16);
  // the bars stay tucked; Escape gives focus back to the pill
  expect(await page.evaluate(() => document.documentElement.hasAttribute("data-tuck"))).toBe(true);
  await page.keyboard.press("Escape");
  await expect(page.locator("#goto")).toBeHidden();
  await expect(pill).toBeFocused();
  await expect(pill).toHaveAttribute("aria-expanded", "false");
  // a part chosen from the pill's card
  await pill.click();
  await page.locator("#gtl .gt-grid button", { hasText: "९.६०" }).click();
  await expect(page.locator("#tkw")).toHaveText("तृतीयोऽध्यायः · ९.६०");
});

test("after Go to, focus is on the line gone to, and the tab names the text @mobile", async ({ page }) => {
  // (Satish 2026-11-14: VoiceOver began again at the text's title after a jump to ९.६०; every tab read "Nitya Upasana")
  await openSite(page, SETUPS.marathi);
  await expect(page).toHaveTitle("Nitya Upasana");
  await readText(page, "vedic-chant-pavamana-suktam");
  await toLine(page, "vedic-chant-pavamana-suktam.700");
  await expect(page).toHaveTitle("पवमानसूक्तम् · Nitya Upasana");
  await goTo(page);
  const to = page.locator("#gtl .gt-grid button", { hasText: "९.६०" });
  const line = await to.getAttribute("data-line");
  await to.click();
  expect(await page.evaluate(() => document.activeElement.tagName + " " + document.activeElement.getAttribute("data-l"))).toBe("P " + line);
});

test("on the narrowest phone the pill keeps the place itself in sight; the headings give way @mobile", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 });
  await openSite(page, SETUPS.marathi);
  await readText(page, "vedic-chant-pavamana-suktam");
  await toLine(page, "vedic-chant-pavamana-suktam.700");
  const at = page.locator("#tkw .wh-at");
  await expect(at).toHaveText(/^९\.[०-९]{2}$/);
  const shown = await at.evaluate((e) => {
    const r = e.getBoundingClientRect(),
      box = e.closest("#tkb").getBoundingClientRect();
    return r.width > 10 && r.right <= box.right + 1 && e.scrollWidth <= e.clientWidth + 1;
  });
  expect(shown).toBe(true);
});

test("on a tablet the pill sits in the middle, over the text @mobile", async ({ page }) => {
  await page.setViewportSize({ width: 820, height: 1180 });
  await openSite(page, SETUPS.marathi);
  await readText(page, "vedic-chant-pavamana-suktam");
  await toLine(page, "vedic-chant-pavamana-suktam.700");
  const mid = (b) => b.x + b.width / 2;
  expect(Math.abs(mid(await page.locator("#tkb").boundingBox()) - 410)).toBeLessThan(4);
});

test("on a computer the title stays the site's name while a long text is read, and no pill covers the text", async ({ page }) => {
  // (Satish 2026-11-17: the title said "८. पवमानसूक्तम् / चतुर्थोऽध्यायः · ९.६७"; Go to is for a phone or a tablet while
  // chanting, and a computer's search box finds a line)
  await page.setViewportSize({ width: 1440, height: 900 });
  await openSite(page, SETUPS.marathi);
  await readText(page, "vedic-chant-pavamana-suktam");
  await expect(page.locator("html")).toHaveAttribute("data-rail", "1");
  await page.mouse.wheel(0, 3000);
  await page.waitForTimeout(400);
  await expect(page.locator("#btt")).toHaveText("नित्य उपासना");
  await expect(page.locator("#tkb")).toBeHidden();
});

test("a short text's pill is its name alone, and a tap on it brings the bars back @mobile", async ({ page }) => {
  await openSite(page, SETUPS.marathi);
  await readText(page, "a1");
  await page.evaluate(() => scrollBy(0, 500));
  await page.waitForTimeout(300);
  await tuckIn(page);
  const pill = page.locator("#tkb");
  await expect(page.locator("#tkw")).toBeEmpty();
  await expect(page.locator("#tkt")).toHaveText(/सुखकर्ता/);
  await expect(pill).not.toHaveAttribute("aria-haspopup", /./);
  await expect(pill.locator("svg")).toBeHidden();
  await pill.click();
  await expect.poll(() => page.evaluate(() => document.documentElement.hasAttribute("data-tuck"))).toBe(false);
  await expect(page.locator("#goto")).toBeHidden();
  // the title the site's name throughout, the Home link
  await expect(page.locator("#btt")).toHaveText("नित्य उपासना");
  await expect(page.locator("#bt")).toHaveAttribute("href", "./");
});

// ==== The phone and iPad review of 2026-11-15 (Satish: build it), the nine screens' mock-ups ====

// The bottom bar where there is no room for icon and word: under 360px the icon alone, on a phone's side the word alone
test("the bottom bar: icons alone on the smallest phones, words alone on a phone held sideways", async ({ page }) => {
  await page.setViewportSize({ width: 340, height: 640 });
  await openSite(page, SETUPS.marathi, { hash: "#a1" });
  await untuck(page);
  const inside = () =>
    page.locator("#asi").evaluate((e) => {
      const r = e.getBoundingClientRect();
      return [...e.children].every((b) => b.hidden || (b.getBoundingClientRect().left >= r.left && b.getBoundingClientRect().right <= r.right));
    });
  expect(await page.locator("#hm .asil").evaluate((e) => getComputedStyle(e).height)).toBe("1px");
  await expect(page.locator("#hm svg")).toBeVisible();
  await expect(page.locator("#hm")).toHaveAccessibleName("Library");
  expect(await inside()).toBe(true);
  await page.setViewportSize({ width: 844, height: 390 });
  await untuck(page);
  await expect(page.locator("#hm .asil")).toBeVisible();
  await expect(page.locator("#hm svg")).toBeHidden();
  expect(await page.locator("#hm").evaluate((e) => e.getBoundingClientRect().height)).toBeGreaterThanOrEqual(44);
  expect(await inside()).toBe(true);
});

// Both languages: the number and the Marathi name, then the English name, each centred in the title's card as a
// one-language title is (they stood to the left of the text they head); the dhrupad's label is its two words, one line
test("Marathi + English: the title centred in its card, and the dhrupad's label on one line @mobile", async ({ page }) => {
  await openSite(page, SETUPS.both, { hash: "#a1" });
  const off = await page.locator("#a1 header").evaluate((h) => {
    const mid = (/** @type {Element} */ e) => {
      const r = document.createRange();
      r.selectNodeContents(e);
      const b = r.getBoundingClientRect();
      return (b.left + b.right) / 2;
    };
    const c = h.getBoundingClientRect(),
      centre = (c.left + c.right) / 2;
    return [Math.abs(mid(/** @type {Element} */ (h.querySelector("h2 .en"))) - centre), Math.abs(mid(/** @type {Element} */ (h.querySelector("h2"))) - centre)];
  });
  expect(off[0], "the English name").toBeLessThanOrEqual(2);
  expect(off[1], "the heading").toBeLessThanOrEqual(2);
  const lab = page.locator("#a1 .rftop .lab");
  await expect(lab.locator(".lab-how").first()).toBeHidden();
  await expect(lab).toHaveText("ध्रुपद (प्रत्येक कडव्यानंतर म्हणावे)Refrain (sung after every verse)");
  // one line: no taller than its line height allows
  expect(await lab.evaluate((e) => e.getBoundingClientRect().height / parseFloat(getComputedStyle(e).lineHeight))).toBeLessThan(1.6);
});

test("one language: the dhrupad's label says how it is sung @mobile", async ({ page }) => {
  await openSite(page, SETUPS.marathi, { hash: "#a1" });
  await expect(page.locator("#a1 .rftop .lab .mr .lab-how")).toBeVisible();
  await expect(page.locator("#a1 .rftop .lab .mr")).toHaveText("ध्रुपद (प्रत्येक कडव्यानंतर म्हणावे)");
});

// A phone held sideways: Home's two columns are narrower than an upright phone, and the lines that keep to one line
// there ("रविवार, १८ ऑ…", "Afterno…", "Columbu") wrap or lose their drawing instead
test("Home on a phone held sideways: no word is cut", async ({ page }) => {
  await page.setViewportSize({ width: 667, height: 375 });
  await openSite(page, { ...SETUPS.marathi, loc: { lat: 39.96, lon: -83.0 } }, { now: new Date("2026-10-18T19:00:00-04:00") });
  const cut = await page.evaluate(() =>
    [...document.querySelectorAll("#tdd .d1, #pan .p2, #ploc, #tss .tsw")].filter((e) => e.scrollWidth > e.clientWidth + 1).map((e) => e.id || e.className),
  );
  expect(cut).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

// A phone held sideways: the Library and the Vedic calendar have the whole short screen, as Settings has: the top bar
// steps aside, and the Library's Back, tabs and search box share one row
test("the Library and the calendar on a phone held sideways: the whole screen, one header row", async ({ page }) => {
  await page.setViewportSize({ width: 844, height: 390 });
  await openSite(page, { ...SETUPS.marathi, loc: { lat: 39.96, lon: -83.0 } }, { now: new Date("2026-10-18T19:00:00-04:00") });
  await page.locator("#hm").click();
  await expect(page.locator("#jump")).toBeVisible();
  expect(await page.locator(".bar").evaluate((e) => getComputedStyle(e).visibility)).toBe("hidden");
  const row = await page.evaluate(() =>
    ["#jump", "#jbk", "#jtb", "#q", "#library-top"].map((s) => Math.round(/** @type {Element} */ (document.querySelector(s)).getBoundingClientRect().top)),
  );
  expect(row[0], "the Library from the top of the screen").toBe(0);
  expect(Math.abs(row[1] - row[2]), "Back and the tabs level").toBeLessThanOrEqual(4);
  expect(Math.abs(row[1] - row[3]), "the search box beside them").toBeLessThanOrEqual(4);
  expect(row[4], "the list starts within the first third").toBeLessThan(130);
  // the list in two columns, and still found by typing
  expect(await page.locator("#jl").evaluate((e) => getComputedStyle(e).columnCount)).toBe("2");
  await page.locator("#q").fill("sukh");
  await expect(page.locator("#res li").first()).toBeVisible();
  await page.locator("#q").fill("");
  await page.locator("#jbk").click();
  await expect(page.locator("#jump")).toBeHidden();
  expect(await page.locator(".bar").evaluate((e) => getComputedStyle(e).visibility)).toBe("visible");
  await page.locator("#panb").click({ position: { x: 12, y: 12 } });
  await expect(page.locator("#cal")).toBeVisible();
  expect(await page.locator(".bar").evaluate((e) => getComputedStyle(e).visibility)).toBe("hidden");
  expect(await page.locator("#cal").evaluate((e) => Math.round(e.getBoundingClientRect().top))).toBe(0);
  await page.locator("#cbk").click();
  await expect(page.locator("#cal")).toBeHidden();
});

// ==== The desktop review of 2026-11-15 (Satish: start with 1, 2, 4 and 5) ====

// With a keyboard: / opens the Library at its search box; while a text is read ← → are Prev and Next; never while
// typing or inside a group of choices, and nothing under an open page
test("a keyboard: / opens the Library's search, and ← → go to the previous and next text", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await openSite(page, SETUPS.marathi, { hash: "#a1" });
  const at = () => page.evaluate(() => location.hash);
  await page.waitForTimeout(300);
  await page.keyboard.press("ArrowRight");
  await expect.poll(at).toBe("#a2");
  await page.keyboard.press("ArrowLeft");
  await expect.poll(at).toBe("#a1");
  // with Alt held (the browser's own Back), nothing
  await page.keyboard.press("Alt+ArrowRight");
  expect(await at()).toBe("#a1");
  await page.keyboard.press("/");
  await expect(page.locator("#jump")).toBeVisible();
  await expect(page.locator("#q")).toBeFocused();
  // typing in the box: a / and the arrows are the box's own
  await page.keyboard.type("a/b");
  await page.keyboard.press("ArrowLeft");
  await expect(page.locator("#q")).toHaveValue("a/b");
  expect(await at()).toBe("#a1");
  await page.locator("#q").fill("");
  // from elsewhere in the open Library, / goes back to the box
  await page.locator("#jbk").focus();
  await page.keyboard.press("/");
  await expect(page.locator("#q")).toBeFocused();
  await page.keyboard.press("Escape");
  // under Settings the keys do nothing
  await page.locator("#aa").click();
  await expect(page.locator("#panel")).toBeVisible();
  await page.locator("#xc").focus();
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("/");
  await expect(page.locator("#jump")).toBeHidden();
  expect(await at()).toBe("#a1");
});

test("a keyboard on Home: ← → leave the page alone, and the session's tabs keep their arrows", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await openSite(page, SETUPS.marathi);
  await page.keyboard.press("ArrowRight");
  expect(await page.evaluate(() => location.hash)).toBe("");
  await page.locator("#tss-morning").click();
  await page.keyboard.press("ArrowRight");
  await expect(page.locator("#tss-afternoon")).toBeFocused();
  expect(await page.evaluate(() => location.hash)).toBe("");
});

// A computer, one column: the dhrupad's rule beside its lines, not at the page's left edge; the Library's search box
// as wide as the tabs above it
test("a computer: the dhrupad's rule stands beside its lines, and the Library's search box is as wide as its tabs", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await openSite(page, SETUPS.marathi, { hash: "#a1" });
  const gap = await page.locator("#a1 .rftop .verse").evaluate((v) => {
    const r = document.createRange();
    r.selectNodeContents(/** @type {Element} */ (v.querySelector("p")));
    return r.getBoundingClientRect().left - v.getBoundingClientRect().left;
  });
  expect(gap).toBeGreaterThanOrEqual(0);
  expect(gap).toBeLessThan(80);
  await page.keyboard.press("/");
  const wide = await page.evaluate(() => {
    const r = (/** @type {string} */ s) => /** @type {Element} */ (document.querySelector(s)).getBoundingClientRect();
    return [Math.round(r("#q").left - r(".libhd").left), Math.round(r(".libhd").right - r("#q").right)];
  });
  expect(wide).toEqual([0, 0]);
});

// Two columns of stanzas: a stanza with none beside it (the last of three) is centred across both, not alone on the left
test("two columns: a last stanza with none beside it is centred across both", async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 1080 });
  await openSite(page, SETUPS.marathi, { hash: "#a1" });
  await expect(page.locator("html")).toHaveAttribute("data-cols", "2");
  const at = await page.locator("#a1 .items").evaluate((b) => {
    const main = [...b.children].filter((e) => e.classList.contains("item") && !e.classList.contains("rf") && !e.classList.contains("dh"));
    const last = main[main.length - 1].getBoundingClientRect(),
      box = b.getBoundingClientRect();
    return {
      odd: main.length % 2,
      off: Math.abs((last.left + last.right) / 2 - (box.left + box.right) / 2),
      first: main[0].classList.contains("c1") && main[1].classList.contains("c2"),
    };
  });
  expect(at.odd, "Sukhkarta has three stanzas").toBe(1);
  expect(at.first, "the first two side by side").toBe(true);
  expect(at.off, "the last one centred").toBeLessThanOrEqual(2);
});

// Board 3 of the desktop mock-ups (Satish, 2026-11-15): on a computer Home, Library, Reading and Follow stand in the
// top bar with their words, a stand-in for the search box beside them; the bottom bar is only Prev and Next, at the
// two sides of the text. The buttons themselves move, and move back when the window narrows
test("on a computer Home, Library, Reading and Follow are in the top bar, and go back to the bottom bar on a narrow window", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await openSite(page, SETUPS.marathi, { hash: "#a1" });
  const ids = (sel) => page.locator(sel).evaluateAll((l) => l.filter((b) => b.getClientRects().length).map((b) => b.id));
  expect(await ids("body > .bar button, body > .bar a")).toEqual(["bti", "bt", "ash", "hm", "rsb", "lsb", "bar-find", "who", "tmb", "aa"]);
  expect(await ids("#asi button")).toEqual(["asv", "asn"]);
  // each with its word showing, on one line, and nothing wider than the bar
  for (const b of ["#ash", "#hm", "#rsb", "#lsb"]) {
    await expect(page.locator(b + " .asil")).toBeVisible();
    expect(await page.locator(b).evaluate((e) => e.getBoundingClientRect().height)).toBeGreaterThanOrEqual(44);
  }
  await expect(page.locator("#hm")).toHaveAccessibleName("Library");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  // Prev and Next: at the two sides of the text's area, clear of the text's lines
  const side = await page.evaluate(() => {
    const r = (/** @type {string} */ s) => /** @type {Element} */ (document.querySelector(s)).getBoundingClientRect();
    const line = document.createRange();
    line.selectNodeContents(/** @type {Element} */ (document.querySelector("#a1 .items p")));
    const t = line.getBoundingClientRect();
    return { prev: r("#asv").right <= t.left, next: r("#asn").left >= t.right, far: r("#asn").left - r("#asv").right > 400 };
  });
  expect(side).toEqual({ prev: true, next: true, far: true });
  // the keys still work the buttons, wherever they stand
  await page.locator("#asn").click();
  await expect.poll(() => page.evaluate(() => location.hash)).toBe("#a2");
  // the stand-in says what the box says, and opens the Library with the box ready
  await expect(page.locator("#bar-find")).toHaveAccessibleName("Find a text or a line");
  await page.locator("#bar-find").click();
  await expect(page.locator("#jump")).toBeVisible();
  await expect(page.locator("#q")).toBeFocused();
  await page.keyboard.press("Escape");
  // Reading's sheet drops from the bar, under its button
  await page.locator("#rsb").click();
  const sheet = await page.evaluate(() => {
    const r = (/** @type {string} */ s) => /** @type {Element} */ (document.querySelector(s)).getBoundingClientRect();
    return { under: r("#rsh .rsc").top >= r("body > .bar").bottom - 1 && r("#rsh .rsc").top < 120, at: Math.abs(r("#rsh .rsc").left - r("#rsb").left) };
  });
  expect(sheet.under).toBe(true);
  expect(sheet.at).toBeLessThanOrEqual(2);
  await page.keyboard.press("Escape");
  await expect(page.locator("#rsh")).toBeHidden();
  // on Home the same buttons in the same places (Home among them), and no bottom bar's buttons at all
  const lib = await page.locator("#hm").evaluate((e) => e.getBoundingClientRect().left);
  await page.locator("#ash").click();
  await expect(page.locator("html")).toHaveAttribute("data-home", "1");
  await expect(page.locator("#ash")).toBeVisible();
  expect(await page.locator("#hm").evaluate((e) => e.getBoundingClientRect().left)).toBe(lib);
  expect(await ids("#asi button")).toEqual([]);
  // a narrow window: back in the bottom bar, in their order
  await page.setViewportSize({ width: 820, height: 1000 });
  await expect(page.locator("#bar-nav")).toBeHidden();
  await expect(page.locator("#bar-find")).toBeHidden();
  expect(await page.locator("#asi button").evaluateAll((l) => l.map((b) => b.id))).toEqual(["asv", "ash", "hm", "rsb", "lsb", "asn"]);
  await page.setViewportSize({ width: 1440, height: 900 });
  await expect.poll(() => page.locator("#bar-nav button").evaluateAll((l) => l.map((b) => b.id))).toEqual(["ash", "hm", "rsb", "lsb"]);
});

test("a computer's top bar in Marathi at 1024px: every word whole, and readable in every theme", async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 700 });
  await openSite(page, SETUPS["marathi-menus"], { hash: "#a1" });
  const cut = await page.locator("#bar-nav button, #who, #tmb").evaluateAll((l) => l.filter((b) => b.scrollWidth > b.clientWidth + 1).map((b) => b.id));
  expect(cut).toEqual([]);
  await expect(page.locator("#bar-find")).toBeVisible();
  expect(await page.locator("#bar-find").evaluate((e) => e.getBoundingClientRect().width)).toBeGreaterThanOrEqual(44);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(await axeEveryTheme(page, ["body > .bar", "#asc"])).toEqual(noViolations());
});
