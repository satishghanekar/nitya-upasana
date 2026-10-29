// Print and PDF. The printout is laid out by the browser itself (nothing is measured: js/features/print.js), so these
// check what must hold in any printout, on the PDF Chromium makes of it:
//   - every text is printed, in reading order, and listed in the contents; each starts on a new page
//   - no stanza (or other block) is split between pages, and nothing is lost (a marker at each block's start and end)
//   - every English line of every printed text is on paper, read against the texts themselves
//   - the page footers; nothing screen-only prints
// for one language and both, in each of the three fonts, with Kannada letters, IAST, and the dhrupad after every
// verse; then the Print pop-up and builder, the iPhone's Print now and Open in Safari, and routine printouts.
// PDFs can only be made by Chromium, so this suite is Chromium-only.
import { test, expect, devices } from "@playwright/test";
import { openSite, SETUPS, TEXT_COUNT, openMore, tapMore, readText, useTestRoutine, TEST_AARTIS, openPrintBuilder, FIXED_NOW } from "./helpers.mjs";
import {
  printOnce,
  checkPrintout,
  checkPages,
  stubPrint,
  printFromButton,
  howStep,
  readPrintView,
  addMarkers,
  pdfPages,
  markerPages,
  sourceLines,
} from "./print-helpers.mjs";

test.describe.configure({ mode: "parallel" });

// The whole Library, as the Print button prints it. Portrait (pr1) or Landscape (pr2) for one language; both
// languages side by side, on Landscape only. The fonts: Traditional (classic, the default), Modern (std), Bold
const WHOLE = [
  { name: "Marathi, Traditional, Letter", prefs: SETUPS.marathi, choice: "pr1", mode: "one" },
  { name: "English, Modern, A4", prefs: { ...SETUPS.english, pfn: "std" }, choice: "pr1", mode: "one", paper: "A4", locale: "en-IN" },
  { name: "Marathi, Bold, Landscape", prefs: { ...SETUPS.marathi, pfn: "bold", por: "land" }, choice: "pr2", mode: "one" },
  { name: "both side by side, Traditional", prefs: SETUPS.both, choice: "pr2", mode: "side" },
  { name: "both side by side, English first, Modern", prefs: { ...SETUPS["english-main-both"], pfn: "std" }, choice: "pr2", mode: "side" },
  { name: "Kannada letters", prefs: SETUPS.kannada, choice: "pr1", mode: "one" },
  { name: "Kannada letters side by side, Bold", prefs: { ...SETUPS["kannada-both"], pfn: "bold" }, choice: "pr2", mode: "side" },
  { name: "English in IAST", prefs: SETUPS["english-iast"], choice: "pr1", mode: "one" },
  { name: "the dhrupad after every verse", prefs: SETUPS["marathi-every-verse"], choice: "pr1", mode: "one" },
  { name: "the dhrupad after every verse, side by side", prefs: { ...SETUPS["marathi-every-verse"], plang: "both" }, choice: "pr2", mode: "side" },
];
// iPhone 13 emulation in Chromium (the device entry names WebKit as its browser, which newContext does not take)
const { defaultBrowserType: _bt, ...IPHONE } = devices["iPhone 13"];

for (const W of WHOLE) {
  test(`whole Library · ${W.name} @chromium-only`, async ({ browser }) => {
    const paper = W.paper || "Letter";
    const r = await printOnce(browser, { prefs: W.prefs, choice: W.choice, mode: W.mode, paper, locale: W.locale || "en-US" });
    expect(r.pdf.landscape, "the PDF pages are sideways").toBe(W.choice === "pr2");
    checkPrintout(r);
  });
}

// Some texts only (a print link naming them, ?print=…&t=…): the contents list just those, in reading order, numbered
// in their own categories (1 | 1, 2: never 1 | 1, 3)
test("a few texts: their own contents @chromium-only", async ({ browser }) => {
  const context = await browser.newContext({ locale: "en-US", serviceWorkers: "block" });
  const page = await context.newPage();
  await stubPrint(page);
  await openSite(page, SETUPS.marathi, { hash: "?print=as&t=vedic-chant-atharvashirsha,aarti-durge-durghat-bhari,aarti-ghalin-lotangan" });
  await page.waitForFunction(() => window.__printed > 0, null, { timeout: 20_000 });
  await page.emulateMedia({ media: "print" });
  const pv = await readPrintView(page);
  expect(pv.pieces).toEqual(["p1", "a3", "a8"]);
  expect(pv.toc.map((t) => t.id)).toEqual(["p1", "a3", "a8"]);
  expect(await page.locator("#pv .pvtoc .pvnum").allTextContents()).toEqual(["१.", "१.", "२."]);
  const source = await sourceLines(page);
  await addMarkers(page);
  const pdf = await pdfPages(page, "Letter");
  checkPages({ pv, pdf, mode: "one", source, tr: false });
  await context.close();
});

test("the contents follow the Library as this phone lists it: a renamed category, a text moved @chromium-only", async ({ browser }) => {
  const context = await browser.newContext({ locale: "en-US", serviceWorkers: "block" });
  const page = await context.newPage();
  await stubPrint(page);
  await openSite(page, SETUPS.marathi);
  await page.locator("#hm").click();
  await page.locator("#lbb").click();
  await page.locator('.lbe[data-id="aarti"]').click();
  await page.locator("#lbmr").fill("आरत्या");
  await page.locator("#lben").fill("Aartis");
  await page.locator("#lbsave").click();
  await page.locator("#lbs-aarti-ghalin-lotangan").selectOption("vedic-chant");
  await page.locator("#lbx").click();
  // (the categories are kept on this phone, so a print link opened now prints with them)
  await page.goto("./?print=as&t=vedic-chant-atharvashirsha,aarti-durge-durghat-bhari,aarti-ghalin-lotangan");
  await page.waitForFunction(() => window.__printed > 0, null, { timeout: 20_000 });
  await page.emulateMedia({ media: "print" });
  const pv = await readPrintView(page);
  expect(pv.toc.map((t) => t.id)).toEqual(["p1", "a8", "a3"]);
  expect(pv.pieces).toEqual(["p1", "a8", "a3"]);
  await expect(page.locator("#pv .pvcat")).toHaveText([/वैदिक मंत्र/, /आरत्या/]);
  expect(await page.locator("#pv .pvtoc .pvnum").allTextContents()).toEqual(["१.", "२.", "१."]);
  await context.close();
});

// A print link naming only texts since removed: never the whole Library; What opens to choose again, and says why
test("a print link naming no text in the Library prints nothing, and opens What @chromium-only", async ({ browser }) => {
  const context = await browser.newContext({ locale: "en-US", serviceWorkers: "block" });
  const page = await context.newPage();
  await stubPrint(page);
  await openSite(page, SETUPS.english, { hash: "?print=as&t=no-such-text,gone-too" });
  await expect(page.locator("#prm")).toBeVisible({ timeout: 20_000 });
  await expect(page.locator("#fl")).toHaveText("The texts chosen are no longer in the Library: choose again.");
  await expect(page.locator("#prgp")).toBeDisabled();
  expect(await page.evaluate(() => window.__printed)).toBe(0);
  expect(await page.locator("#pv .pvs").count()).toBe(0);
  await context.close();
});

// Printing from the browser's own menu (Ctrl/⌘ P, or Share → Print on a phone) doesn't go through the pop-up: the
// page builds the print view in "beforeprint", the whole Library
test("browser menu print gives the whole Library @chromium-only", async ({ browser }) => {
  const context = await browser.newContext({ locale: "en-US", serviceWorkers: "block" });
  const page = await context.newPage();
  await openSite(page, SETUPS.marathi);
  // page.pdf() fires beforeprint exactly as the browser's Print menu does; the markers go in after the site's own
  // handler has built the print view
  await addMarkers(page, "beforeprint");
  const pdf = await pdfPages(page, "Letter");
  // afterprint (fired when page.pdf finished) puts the page back to normal
  expect(await page.evaluate(() => document.documentElement.hasAttribute("data-print"))).toBe(false);
  const at = markerPages(pdf.pages);
  const pieces = await page.evaluate(() => [...document.querySelectorAll("#pv .pvs")].map((s) => s.dataset.sid));
  expect(pieces).toHaveLength(TEXT_COUNT);
  for (const id of pieces) expect(at[id + ":0:s"], `${id} printed`).toBeGreaterThan(0);
  await context.close();
});

// The printout is built from the texts themselves (js/print/compose.js), not copied from the reading page, so it is
// the same whatever the page shows: Home, one text open, everything folded
test("the printout does not depend on what the reading page shows @chromium-only", async ({ browser }) => {
  async function printView(prefs, hash) {
    const context = await browser.newContext({ locale: "en-US", serviceWorkers: "block" });
    const page = await context.newPage();
    await stubPrint(page);
    await openSite(page, prefs, { hash });
    await printFromButton(page, "pr1");
    const html = await page.evaluate(() => document.getElementById("pv").innerHTML);
    // the copy it was built from is gone again
    expect(await page.locator("#pvsrc").count()).toBe(0);
    await context.close();
    return html;
  }
  const home = await printView(SETUPS.marathi, "");
  expect(await printView(SETUPS.marathi, "#a5")).toBe(home);
  expect(await printView({ ...SETUPS.marathi, af: ["a3", "a7"], tf: 1, fold: 1 }, "#p1")).toBe(home);
});

// While a session is being read (Start on Home: data-run), the printout still has every text in full. Before
// version 1.21.2 the page's rule for a session hid the copy the printout is built from: titles only (Satish's PDF)
test("a session being read: Print in the bottom bar prints the texts in full @chromium-only", async ({ browser }) => {
  const context = await browser.newContext({ locale: "en-US", serviceWorkers: "block" });
  const page = await context.newPage();
  await stubPrint(page);
  await useTestRoutine(page);
  await openSite(page, SETUPS.marathi);
  // reading the Morning session (data-run is on, hiding every other text on the page), Print in the bottom bar
  await page.locator("#tsl a.tgo").first().click();
  await expect(page.locator("html")).toHaveAttribute("data-run", "1");
  await page.locator("#asp").click();
  await page.locator("#prgp").click();
  await page.waitForFunction(() => window.__printed > 0 || !document.getElementById("prgo").hidden, null, { timeout: 15_000 });
  if (await page.locator("#prgo").isVisible()) await page.locator("#prgo").click();
  await page.waitForFunction(() => window.__printed > 0, null, { timeout: 15_000 });
  const secs = await page.evaluate(() =>
    [...document.querySelectorAll("#pv .pvs")].map(
      (s) => s.querySelectorAll(".pvl").length + [...s.querySelectorAll(".pvpr")].reduce((n, p) => n + (p.pvLines || []).length, 0),
    ),
  );
  expect(secs.length).toBeGreaterThan(0);
  for (const n of secs) expect(n).toBeGreaterThan(2);
  await context.close();
});

// The Print pop-up itself: the right choices for each language, the paper named, Escape and Cancel close it.
test("print pop-up offers the right choices and closes cleanly @chromium-only", async ({ page }) => {
  await stubPrint(page);
  await openSite(page, SETUPS.both);
  await openPrintBuilder(page);
  await howStep(page);
  await expect(page.locator("#prpg")).toBeHidden();
  await expect(page.locator("#prpv")).toHaveText("Landscape, side by side");
  await expect(page.locator("#prq")).toHaveText("Letter");
  await expect(page.locator("#prgp")).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(page.locator("#prm")).toBeHidden();
  // opened from elsewhere (no button named): focus comes back to Print in the bottom bar, on Home too
  await expect(page.locator("#asp")).toBeFocused();
  await openPrintBuilder(page);
  await howStep(page);
  await page.locator("#prx").click();
  await expect(page.locator("#prm")).toBeHidden();
  expect(await page.evaluate(() => window.__printed)).toBe(0);
});

// iPhone: Safari opens the print dialog only in answer to a tap. Should it still ignore window.print() (no
// beforeprint), the pop-up offers Print now, whose own tap prints.
test("iPhone: an ignored print offers Print now @chromium-only", async ({ browser }) => {
  const context = await browser.newContext({ ...IPHONE, locale: "en-US", serviceWorkers: "block" });
  const page = await context.newPage();
  await page.addInitScript(() => {
    window.__printed = 0;
    // the first call is ignored, as iOS does once the tap has expired; a later one opens the dialog
    window.print = () => {
      if (window.__printed++) dispatchEvent(new Event("beforeprint"));
    };
  });
  await openSite(page, SETUPS.english);
  await openPrintBuilder(page);
  await howStep(page);
  await page.locator("#pr1").click();
  await page.locator("#prgp").click();
  await expect(page.locator("#prgo")).toBeVisible({ timeout: 15_000 });
  await expect(page.locator("#pr1")).toBeHidden();
  // neither step: the title, without ‹ What to print or the total
  await expect(page.locator("#prmt")).toBeVisible();
  await expect(page.locator("#prbk")).toBeHidden();
  await expect(page.locator("#prsum")).toBeHidden();
  await expect(page.locator("#prgo")).toBeFocused();
  await page.locator("#prgo").click();
  expect(await page.evaluate(() => window.__printed)).toBe(2);
  await page.waitForTimeout(1300);
  await expect(page.locator("#prm")).toBeHidden();
  expect(await page.evaluate(() => document.documentElement.getAttribute("data-print"))).toBe("one");
  // the next Print shows the layout choices again
  await page.evaluate(() => dispatchEvent(new Event("afterprint")));
  await openPrintBuilder(page);
  await howStep(page);
  await expect(page.locator("#pr1")).toBeVisible();
  await expect(page.locator("#prgo")).toBeHidden();
  await expect(page.locator("#prw")).toBeHidden();
  await context.close();
});

// When Print now does not open the dialog either (an app's own browser, from a link in a chat app), the pop-up
// says to use Share → Print, or to open the page in Safari
test("iPhone: when Print now does not print either, Share → Print and Open in Safari are offered @chromium-only", async ({ browser }) => {
  const context = await browser.newContext({ ...IPHONE, locale: "en-US", serviceWorkers: "block" });
  const page = await context.newPage();
  await page.addInitScript(() => {
    window.__printed = 0;
    window.print = () => window.__printed++;
  });
  await openSite(page, SETUPS.english);
  await openPrintBuilder(page);
  await howStep(page);
  await page.locator("#pr1").click();
  await page.locator("#prgp").click();
  await expect(page.locator("#prgo")).toBeVisible({ timeout: 15_000 });
  await page.locator("#prgo").click();
  await expect(page.locator("#prv")).toBeVisible({ timeout: 5_000 });
  await expect(page.locator("#prv")).toContainText("Share");
  await expect(page.locator("#prsf")).toBeVisible();
  await expect(page.locator("#prcp")).toBeVisible();
  await expect(page.locator("#prw")).toBeHidden();
  await expect(page.locator("#prgo")).toBeHidden();
  expect(await page.evaluate(() => window.__printed)).toBe(2);
  // the next Print shows the layout choices again
  await page.locator("#prx").click();
  await openPrintBuilder(page);
  await howStep(page);
  await expect(page.locator("#pr1")).toBeVisible();
  await expect(page.locator("#prv")).toBeHidden();
  await context.close();
});

// The iPhone Home Screen app cannot print (neither tap opens the dialog there): before iOS 17 (the device here is
// iOS 15), choosing a layout goes straight to Open in Safari, without trying to print
test("iPhone Home Screen app: a layout choice goes straight to Open in Safari @chromium-only", async ({ browser }) => {
  const context = await browser.newContext({ ...IPHONE, locale: "en-US", serviceWorkers: "block" });
  const page = await context.newPage();
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "standalone", { value: true });
    window.__printed = 0;
    window.print = () => window.__printed++;
  });
  await openSite(page, SETUPS.english);
  await openPrintBuilder(page);
  await howStep(page);
  await page.locator("#pr1").click();
  await page.locator("#prgp").click();
  await expect(page.locator("#prsf")).toBeVisible();
  await expect(page.locator("#prsf")).toBeFocused();
  await expect(page.locator("#prcp")).toBeVisible();
  await expect(page.locator("#prw")).toBeVisible();
  await expect(page.locator("#prgo")).toBeHidden();
  expect(await page.evaluate(() => window.__printed)).toBe(0);
  expect(await page.evaluate(() => document.documentElement.hasAttribute("data-print"))).toBe(false);
  await page.locator("#prx").click();
  await expect(page.locator("#prm")).toBeHidden();
  await openPrintBuilder(page);
  await howStep(page);
  await expect(page.locator("#pr1")).toBeVisible();
  await expect(page.locator("#prw")).toBeHidden();
  await context.close();
});

// iOS 17 and later: the Home Screen app's Print goes to Safari in the same tap, no pop-up between. Once the app is
// left the builder is closed; if Safari did not open (the app still on screen), Open in Safari and Copy link
test("iPhone Home Screen app on iOS 17: Print goes straight to Safari @chromium-only", async ({ browser }) => {
  const ua = IPHONE.userAgent.replace(/OS \d+_\d+(_\d+)? like/, "OS 17_4 like");
  const context = await browser.newContext({ ...IPHONE, userAgent: ua, locale: "en-US", serviceWorkers: "block" });
  const page = await context.newPage();
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "standalone", { value: true });
    window.__printed = 0;
    window.print = () => window.__printed++;
  });
  await openSite(page, SETUPS.english);
  // Safari opens: the app is left, and the builder is put away
  await openPrintBuilder(page);
  await howStep(page);
  await page.locator("#prgp").click({ noWaitAfter: true });
  await expect(page.locator("#prsf")).toHaveAttribute("data-to", /^x-safari-http.*\?print=as&s=/);
  await expect(page.locator("#prsf")).toBeHidden();
  await page.evaluate(() => {
    Object.defineProperty(document, "visibilityState", { value: "hidden", configurable: true });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect(page.locator("#prm")).toBeHidden();
  await context.close();
  // Safari does not open (the app stays on screen): after a moment, Open in Safari and Copy link
  const c2 = await browser.newContext({ ...IPHONE, userAgent: ua, locale: "en-US", serviceWorkers: "block" });
  const p2 = await c2.newPage();
  await p2.addInitScript(() => {
    Object.defineProperty(navigator, "standalone", { value: true });
    window.__printed = 0;
    window.print = () => window.__printed++;
  });
  await openSite(p2, SETUPS.english);
  await openPrintBuilder(p2);
  await howStep(p2);
  await p2.locator("#prgp").click({ noWaitAfter: true });
  await expect(p2.locator("#prsf")).toHaveAttribute("data-to", /^x-safari-/);
  await expect(p2.locator("#prsf")).toBeVisible({ timeout: 5_000 });
  await expect(p2.locator("#prcp")).toBeVisible();
  expect(await p2.evaluate(() => window.__printed)).toBe(0);
  await c2.close();
});

// iPhone: the print view is written at once (nothing is laid out ahead or measured), so Print opens the dialog from
// the tap itself: no Print now. (The stub prints only while the tap still counts, as Safari does.)
test("iPhone: Print prints on its first tap @chromium-only", async ({ browser }) => {
  const context = await browser.newContext({ ...IPHONE, locale: "en-US", serviceWorkers: "block" });
  const page = await context.newPage();
  await page.addInitScript(() => {
    window.__printed = 0;
    window.print = () => {
      if (!navigator.userActivation.isActive) return;
      window.__printed++;
      dispatchEvent(new Event("beforeprint"));
    };
  });
  await openSite(page, SETUPS.english);
  await openPrintBuilder(page);
  await howStep(page);
  await page.locator("#pr1").click();
  await page.locator("#prgp").click();
  await page.waitForTimeout(300);
  expect(await page.evaluate(() => window.__printed)).toBe(1);
  await expect(page.locator("#prgo")).toBeHidden();
  expect(await page.evaluate(() => document.documentElement.getAttribute("data-print"))).toBe("one");
  await context.close();
});

// The Home Screen app's Open in Safari: Safari, opened at that
// address, takes the print choices, cleans the address and lays the printout out, ready to print
test("iPhone Home Screen app: Open in Safari carries the print choices @chromium-only", async ({ browser }) => {
  const context = await browser.newContext({ ...IPHONE, locale: "en-US", serviceWorkers: "block" });
  const page = await context.newPage();
  await page.addInitScript(() => {
    if (!location.search) Object.defineProperty(navigator, "standalone", { value: true });
    window.__printed = 0;
    window.print = () => {
      if (window.__printed++ && !navigator.standalone) dispatchEvent(new Event("beforeprint"));
    };
  });
  await openSite(page, SETUPS.english);
  await page.evaluate(() => {
    const p = JSON.parse(localStorage.getItem("aarti2-prefs"));
    p.ref = 0;
    p.por = "land";
    localStorage.setItem("aarti2-prefs", JSON.stringify(p));
  });
  await page.reload();
  await openPrintBuilder(page);
  await howStep(page);
  await page.locator("#pr2").click();
  await page.locator("#prgp").click();
  await expect(page.locator("#prsf")).toBeVisible();
  expect(await page.evaluate(() => window.__printed)).toBe(0);
  // the address Open in Safari goes to (Chromium has no x-safari-https, so the page stays)
  await page.locator("#prsf").click();
  const href = await page.locator("#prsf").getAttribute("data-to");
  expect(href).toMatch(/^x-safari-http.*\?print=as&s=/);
  const url = href.replace(/^x-safari-/, "");
  // Safari: a fresh browser with its own storage
  const sf = await browser.newContext({ ...IPHONE, locale: "en-US", serviceWorkers: "block" });
  const sp = await sf.newPage();
  await sp.addInitScript(() => {
    window.__printed = 0;
    window.print = () => {
      // as Safari: the call made as the page opens is ignored (no tap); the next one, Print now's, opens the dialog
      if (window.__printed++) dispatchEvent(new Event("beforeprint"));
    };
  });
  await sp.goto(url);
  await expect(sp.locator("#prgo")).toBeVisible({ timeout: 15_000 });
  expect(await sp.evaluate(() => location.search)).toBe("");
  const prefs = await sp.evaluate(() => JSON.parse(localStorage.getItem("aarti2-prefs")));
  expect([prefs.lang, prefs.ref, prefs.por]).toEqual(["en", 0, "land"]);
  await sp.locator("#prgo").click();
  await sp.waitForTimeout(1300);
  expect(await sp.evaluate(() => document.documentElement.getAttribute("data-print"))).toBe("one");
  // English
  expect(await sp.evaluate(() => /Sukhkarta/.test(document.getElementById("pv").textContent))).toBe(true);
  await sf.close();
  await context.close();
});

// What the pop-up offers (CHOICE in js/print/profiles.js): one language, Portrait or Landscape on one line,
// Portrait until the reader has chosen a page, and the font tiles' word in that language; both languages, Landscape
// (side by side) only, the language row with the main language first. The focus is on Print.
for (const [setup, words] of [
  ["marathi", "सुखकर्ता दुःखहर्ता"],
  ["english", "Sukhkarta Dukhharta"],
  ["kannada", "ಸುಖಕರ್ತಾ"],
]) {
  test(`print pop-up offers Portrait and Landscape: ${setup} @chromium-only`, async ({ page }) => {
    await stubPrint(page);
    await openSite(page, SETUPS[setup]);
    await openPrintBuilder(page);
    await howStep(page);
    await expect(page.locator("#pr1")).toHaveText("Portrait");
    await expect(page.locator("#pr2")).toHaveText("Landscape");
    await expect(page.locator("#pr1")).toHaveAttribute("aria-pressed", "true");
    await expect(page.locator("#prpv")).toBeHidden();
    // each font's tile (the three of Settings → Text font) shows the text's first word in that font, in the language printed
    await expect(page.locator("#prfn .prfx")).toHaveText(Array(3).fill(words.split(" ")[0]));
    await expect(page.locator("#prgp")).toBeFocused();
  });
}
for (const [setup, a] of [
  ["both", "सुखकर्ता"],
  ["kannada-both", "ಸುಖಕರ್ತಾ"],
  ["english-main-both", "Sukhkarta"],
]) {
  test(`print pop-up offers only Landscape side by side: ${setup} @chromium-only`, async ({ page }) => {
    await stubPrint(page);
    await openSite(page, { ...SETUPS[setup], por: "up" });
    await openPrintBuilder(page);
    await howStep(page);
    await expect(page.locator("#prpg")).toBeHidden();
    await expect(page.locator("#prpv")).toHaveText("Landscape, side by side");
    // the language row: the main language first, then the other, then Both (chosen); the tiles show the main language
    await expect(page.locator("#prlg [aria-pressed=true]")).toHaveAttribute("data-v", "both");
    expect(await page.locator("#prlg button").evaluateAll((l) => l.map((x) => x.dataset.v))).toEqual(
      setup === "english-main-both" ? ["en", "mr", "both"] : ["mr", "en", "both"],
    );
    await expect(page.locator("#prfn .prfx").first()).toHaveText(a);
    await expect(page.locator("#prgp")).toBeFocused();
  });
}

// The browser's own menu (Ctrl/⌘ P) prints what the pop-up offers: both languages side by side, sideways
test("printing from the browser's menu: both languages print side by side @chromium-only", async ({ page }) => {
  await stubPrint(page);
  await openSite(page, SETUPS.both);
  await page.evaluate(() => dispatchEvent(new Event("beforeprint")));
  expect(await page.evaluate(() => document.documentElement.getAttribute("data-print"))).toBe("side");
  expect(await page.evaluate(() => [...document.querySelectorAll("style[media=print]")].some((e) => /size: landscape/.test(e.textContent)))).toBe(true);
});

// Each choice prints on its page: Portrait upright, Landscape sideways
for (const [setup, choice, mode, landscape] of [
  ["both", "pr2", "side", true],
  ["marathi", "pr1", "one", false],
  ["marathi", "pr2", "one", true],
]) {
  test(`each choice prints on its own page: ${setup} ${choice} @chromium-only`, async ({ browser }) => {
    const r = await printOnce(browser, { prefs: { ...SETUPS[setup], por: "" }, choice, mode, paper: "Letter", locale: "en-US" });
    expect(r.pdf.landscape).toBe(landscape);
    checkPrintout(r, "Letter");
  });
}

// The page chosen is remembered (shown chosen next time), the printer is told the page size, and Safari,
// which keeps the sheet picked in its own dialog, is told, once Landscape is chosen, to pick it there too (and, on a Mac, that Chrome
// prints it best)
test("print pop-up: the page chosen is remembered and printed that way @chromium-only", async ({ browser }) => {
  for (const ua of [undefined, devices["Desktop Safari"].userAgent]) {
    const context = await browser.newContext({ locale: "en-US", serviceWorkers: "block", userAgent: ua });
    const page = await context.newPage();
    await stubPrint(page);
    await openSite(page, SETUPS.marathi);
    await openPrintBuilder(page);
    await howStep(page);
    await expect(page.locator("#prl")).toBeHidden();
    await expect(page.locator("#prc")).toBeVisible({ visible: !!ua });
    const sizes = () =>
      page.evaluate(() => {
        const all = (rules) => [...rules].flatMap((r) => (r.cssRules && r.type !== 6 ? all(r.cssRules) : [r]));
        return [...document.styleSheets]
          .flatMap((s) => all(s.cssRules))
          .filter((r) => r.type === 6 && r.style.size)
          .map((r) => r.style.size);
      });
    await page.locator("#pr2").click();
    await expect(page.locator("#prl")).toBeVisible({ visible: !!ua });
    await page.locator("#prgp").click();
    await page.waitForFunction(() => window.__printed > 0 || !document.getElementById("prgo").hidden, null, { timeout: 15_000 });
    expect((await sizes()).pop()).toBe("landscape");
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem("aarti2-prefs")).por)).toBe("land");
    await page.evaluate(() => dispatchEvent(new Event("afterprint")));
    await openPrintBuilder(page);
    await howStep(page);
    await expect(page.locator("#pr2")).toHaveAttribute("aria-pressed", "true");
    await context.close();
  }
});

// A saved page is kept from one visit to the next
test("print pop-up: a saved Landscape choice is kept @chromium-only", async ({ page }) => {
  await stubPrint(page);
  await openSite(page, SETUPS.marathi);
  await page.evaluate(() => {
    const p = JSON.parse(localStorage.getItem("aarti2-prefs"));
    p.por = "land";
    localStorage.setItem("aarti2-prefs", JSON.stringify(p));
  });
  await page.reload();
  await openPrintBuilder(page);
  await howStep(page);
  await expect(page.locator("#pr2")).toHaveAttribute("aria-pressed", "true");
});

// A card taller than the screen (a phone on its side, in the iPhone's Open in Safari state) starts at the top and
// the pop-up scrolls to Cancel, rather than running off both edges
test("print pop-up scrolls when taller than the screen @chromium-only", async ({ page }) => {
  await page.setViewportSize({ width: 844, height: 390 });
  await stubPrint(page);
  await openSite(page, SETUPS.marathi);
  await openPrintBuilder(page);
  await howStep(page);
  await page.evaluate(() => ["prw", "prsf", "prcp"].forEach((i) => (document.getElementById(i).hidden = false)));
  expect(await page.locator("#prm .qrc").evaluate((e) => e.getBoundingClientRect().top)).toBeGreaterThanOrEqual(0);
  await page.locator("#prx").scrollIntoViewIfNeeded();
  await expect(page.locator("#prx")).toBeInViewport();
});

// How: the printout's dhrupad and font (a tap picks another, for the printout only: the reading page keeps its own),
// the fonts as tiles, each with a word of the text in it. The fonts are the same three as Settings → Text font
test("print pop-up shows the dhrupad and font settings @chromium-only", async ({ page }) => {
  await stubPrint(page);
  await openSite(page, { ...SETUPS.marathi, fnt: "bold" });
  await openPrintBuilder(page);
  await howStep(page);
  await expect(page.locator("#prdg [aria-pressed=true]")).toHaveText("Once", { useInnerText: true });
  // the same three fonts as Settings, in the same order; the printout's starts as the text font (Bold here)
  await expect(page.locator("#prfn .prfm")).toHaveText(["Traditional", "Modern", "Bold"], { useInnerText: true });
  await expect(page.locator("#prfn [aria-pressed=true] .prfm")).toHaveText("Bold", { useInnerText: true });
  await expect(page.locator('#prfn [data-v="classic"] .prfx')).toHaveText("सुखकर्ता");
  const font = (v) => page.locator(`#prfn [data-v="${v}"] .prfx`).evaluate((e) => getComputedStyle(e).fontFamily);
  expect(await font("classic")).toContain("SC Classic");
  expect(await font("bold")).toContain("SC Bold");
  expect(await font("std")).not.toContain("SC ");
  // a font picked here is the printout's only: the reading page keeps its own,
  // and the page takes it just while it prints
  await page.locator('#prfn [data-v="classic"]').click();
  await expect(page.locator("#prfn [aria-pressed=true] .prfm")).toHaveText("Traditional", { useInnerText: true });
  const prefs = await page.evaluate(() => JSON.parse(localStorage.getItem("aarti2-prefs")));
  expect([prefs.pfn, prefs.fnt]).toEqual(["classic", "bold"]);
  expect(await page.evaluate(() => document.documentElement.getAttribute("data-font"))).toBe("bold");
  expect(
    await page.evaluate(() => {
      window.dispatchEvent(new Event("beforeprint"));
      const f = document.documentElement.getAttribute("data-font");
      window.dispatchEvent(new Event("afterprint"));
      return [f, document.documentElement.getAttribute("data-font")];
    }),
  ).toEqual(["classic", "bold"]);
  // the dhrupad likewise: every verse in the printout, once on the reading page
  await page.locator('#prdg [data-v="0"]').click();
  await expect(page.locator("#prdg [aria-pressed=true]")).toHaveText("Every verse", { useInnerText: true });
  const p2 = await page.evaluate(() => JSON.parse(localStorage.getItem("aarti2-prefs")));
  expect([p2.pref, p2.ref]).toEqual([0, 1]);
  expect(
    await page.evaluate(() => {
      const r = () => document.documentElement.getAttribute("data-ref");
      const was = r();
      window.dispatchEvent(new Event("beforeprint"));
      const f = r();
      window.dispatchEvent(new Event("afterprint"));
      return [was, f, r()];
    }),
  ).toEqual(["1", "0", "1"]);
  await expect(page.locator("#prm")).toBeVisible();
});

// ---- The print builder (print redesign P4): What, then How ----
// A phone shows one step at a time: What first, every text ticked, with how many in the bar;
// Next goes on to How, ‹ What to print comes back. What is ticked is what prints.
test("print builder: pick texts on a phone, then print just those @chromium-only", async ({ browser }) => {
  const context = await browser.newContext({ ...IPHONE, locale: "en-US", serviceWorkers: "block" });
  const page = await context.newPage();
  await stubPrint(page);
  await openSite(page, SETUPS.marathi);
  await openPrintBuilder(page);
  await expect(page.locator("#prwh")).toBeVisible();
  await expect(page.locator("#prhw")).toBeHidden();
  await expect(page.locator("#prgp")).toBeHidden();
  await expect(page.locator("#prnx")).toBeFocused();
  const boxes = page.locator("#prwl .tpkl input");
  await expect(boxes).toHaveCount(TEXT_COUNT);
  expect(await boxes.evaluateAll((l) => l.every((x) => x.checked))).toBe(true);
  await expect(page.locator("#prsum")).toContainText(`${TEXT_COUNT} texts`);
  // Clear everything: nothing to print, so Next waits
  await page.locator('.prcb[data-cat=""]').click();
  await expect(page.locator("#prsum")).toContainText("Pick at least one text");
  await expect(page.locator("#prnx")).toBeDisabled();
  await expect(page.locator('.prcb[data-cat=""]')).toHaveText("Select all");
  // two texts, found by search
  await page.locator(".prwq").fill("sukhkarta");
  await expect(page.locator("#prwl .tpkl li:visible")).toHaveCount(1);
  await page.locator("#prwl .tpkl li:visible input").check();
  await page.locator(".prwq").fill("");
  await page.locator('#prwl .tpkl li[data-id="vedic-chant-atharvashirsha"] input').check();
  await expect(page.locator("#prsum span").first()).toHaveText("2 texts");
  // Next, and back
  await page.locator("#prnx").click();
  await expect(page.locator("#prhw")).toBeVisible();
  await expect(page.locator("#prwh")).toBeHidden();
  await expect(page.locator("#prgp")).toBeFocused();
  await page.locator("#prbk").click();
  await expect(page.locator("#prwh")).toBeVisible();
  await expect(page.locator('#prwl .tpkl li[data-id="vedic-chant-atharvashirsha"] input')).toBeChecked();
  await page.locator("#prnx").click();
  await page.locator("#prgp").click();
  await page.waitForFunction(() => window.__printed > 0 || !document.getElementById("prgo").hidden, null, { timeout: 15_000 });
  if (await page.locator("#prgo").isVisible()) await page.locator("#prgo").click();
  await page.waitForFunction(() => window.__printed > 0, null, { timeout: 15_000 });
  const pv = await page.evaluate(() => ({
    pieces: [...document.querySelectorAll("#pv .pvs")].map((e) => e.getAttribute("data-sid")),
    toc: document.querySelectorAll("#pv .pvtoc li").length,
  }));
  expect(pv.pieces.length).toBe(2);
  expect(pv.toc).toBe(2);
  // Safari laying the page out again after afterprint (its print sheet) still prints the two
  await page.evaluate(() => dispatchEvent(new Event("afterprint")));
  await page.evaluate(() => dispatchEvent(new Event("beforeprint")));
  expect(await page.evaluate(() => document.querySelectorAll("#pv .pvs").length)).toBe(2);
  // the browser's own menu, once the reader is back on the page, prints the whole Library again
  await page.evaluate(() => dispatchEvent(new Event("afterprint")));
  await page.locator("body").dispatchEvent("pointerdown");
  await page.evaluate(() => dispatchEvent(new Event("beforeprint")));
  expect(await page.evaluate(() => document.querySelectorAll("#pv .pvs").length)).toBe(TEXT_COUNT);
  // and the builder keeps the two ticked
  await page.evaluate(() => dispatchEvent(new Event("afterprint")));
  await openPrintBuilder(page);
  await expect(page.locator("#prsum span").first()).toHaveText("2 texts");
  await context.close();
});

// Select all and Clear for one category leave the others as they are; one text on its own prints without a contents
// page. Wide screens show What and How side by side, with Print in reach at once.
test("print builder: a category's Select all and Clear, and one text alone @chromium-only", async ({ page }) => {
  await stubPrint(page);
  await openSite(page, SETUPS.english);
  await openPrintBuilder(page);
  await expect(page.locator("#prwh")).toBeVisible();
  await expect(page.locator("#prhw")).toBeVisible();
  await expect(page.locator("#prnx")).toBeHidden();
  await expect(page.locator("#prgp")).toBeFocused();
  const groups = page.locator("#prwl .prgr");
  const first = groups.first(),
    second = groups.nth(1);
  await first.locator(".prcb").click();
  expect(await first.locator("input").evaluateAll((l) => l.every((x) => !x.checked))).toBe(true);
  expect(await second.locator("input").evaluateAll((l) => l.every((x) => x.checked))).toBe(true);
  await expect(first.locator(".prcb")).toHaveText("Select all");
  await expect(page.locator('.prcb[data-cat=""]')).toHaveText("Select all");
  await first.locator(".prcb").click();
  await expect(first.locator(".prcb")).toHaveText("Clear");
  await expect(page.locator('.prcb[data-cat=""]')).toHaveText("Clear");
  // one text alone
  await page.locator('.prcb[data-cat=""]').click();
  await page.locator('#prwl .tpkl li[data-id="aarti-sukhkarta"] input').check();
  await expect(page.locator("#prsum span").first()).toHaveText("सुखकर्ता दुःखहर्ता");
  await page.locator("#prgp").click();
  await page.waitForFunction(() => window.__printed > 0, null, { timeout: 15_000 });
  const pv = await page.evaluate(() => ({ pieces: document.querySelectorAll("#pv .pvs").length, toc: !!document.querySelector("#pv .pvtoc") }));
  expect(pv).toEqual({ pieces: 1, toc: false });
});

// The words follow the menu language: Marathi menus, Marathi words and digits
test("print builder: Marathi menus @chromium-only", async ({ browser }) => {
  const context = await browser.newContext({ ...IPHONE, locale: "en-US", serviceWorkers: "block" });
  const page = await context.newPage();
  await stubPrint(page);
  await openSite(page, SETUPS["marathi-menus"]);
  await openPrintBuilder(page);
  await expect(page.locator(".prwq")).toHaveAttribute("placeholder", "संग्रहात शोधा");
  await expect(page.locator('.prcb[data-cat=""]')).toHaveText("सर्व काढा");
  await expect(page.locator("#prsum span").first()).toHaveText(/^[०-९]+ रचना$/);
  await expect(page.locator("#prx")).toHaveAttribute("aria-label", "रद्द");
  await context.close();
});

// The iPhone Home Screen app hands the printout to Safari: the link carries the texts ticked, and Safari prints those
test("print builder: Open in Safari carries the texts ticked @chromium-only", async ({ browser }) => {
  const context = await browser.newContext({ ...IPHONE, locale: "en-US", serviceWorkers: "block" });
  const page = await context.newPage();
  await page.addInitScript(() => {
    if (!location.search) Object.defineProperty(navigator, "standalone", { value: true });
    window.__printed = 0;
    window.print = () => window.__printed++;
  });
  await openSite(page, SETUPS.english);
  await openPrintBuilder(page);
  await page.locator('.prcb[data-cat=""]').click();
  await page.locator('#prwl .tpkl li[data-id="aarti-sukhkarta"] input').check();
  await page.locator('#prwl .tpkl li[data-id="vedic-chant-purusha-suktam"] input').check();
  await howStep(page);
  await page.locator("#prgp").click();
  await page.locator("#prsf").click();
  const href = await page.locator("#prsf").getAttribute("data-to");
  expect(href).toMatch(/&t=([a-z-]+,[a-z-]+)$/);
  expect(href.split("&t=")[1].split(",").sort()).toEqual(["aarti-sukhkarta", "vedic-chant-purusha-suktam"]);
  const sf = await browser.newContext({ ...IPHONE, locale: "en-US", serviceWorkers: "block" });
  const sp = await sf.newPage();
  await sp.addInitScript(() => {
    window.__printed = 0;
    window.print = () => {
      if (window.__printed++) dispatchEvent(new Event("beforeprint"));
    };
  });
  await sp.goto(href.replace(/^x-safari-/, ""));
  await expect(sp.locator("#prgo")).toBeVisible({ timeout: 15_000 });
  await sp.locator("#prgo").click();
  await sp.waitForTimeout(1300);
  expect(await sp.evaluate(() => document.querySelectorAll("#pv .pvs").length)).toBe(2);
  await sf.close();
  await context.close();
});

// Print in the bottom bar, while reading a session: the builder opens at What, on the Today tab with that session
// chosen, Next › going on to How. Today offers each session and all of today, one tap each (the test routine:
// Morning the Atharvashirsha, Afternoon empty, Evening ten aartis; 10 am, so Home shows Morning).
test("print builder: the bottom bar's Print while reading a session, and the Today tab @chromium-only", async ({ browser }) => {
  const context = await browser.newContext({ ...IPHONE, locale: "en-US", serviceWorkers: "block" });
  const page = await context.newPage();
  await stubPrint(page);
  await useTestRoutine(page);
  await openSite(page, SETUPS.english);
  await page.locator("#tsl a.tgo").first().click();
  await page.locator("#asp").click();
  await expect(page.locator("#prm")).toHaveAttribute("data-step", "what");
  await expect(page.locator("#prnx")).toBeFocused();
  await expect(page.locator("#prsum span").first()).toHaveText("गणपत्यथर्वशीर्षोपनिषत्");
  await expect(page.locator("#prtab-today")).toHaveAttribute("aria-selected", "true");
  await expect(page.locator('.prses[data-s="morning"]')).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator('.prses[data-s="afternoon"]')).toBeDisabled();
  // Evening, then all of today
  await page.locator('.prses[data-s="evening"]').click();
  await expect(page.locator("#prsum span").first()).toHaveText(`${TEST_AARTIS.length} texts`);
  await expect(page.locator('.prses[data-s="morning"]')).toHaveAttribute("aria-pressed", "false");
  await page.locator('.prses[data-s="all"]').click();
  await expect(page.locator("#prsum span").first()).toHaveText(`${TEST_AARTIS.length + 1} texts`);
  // the Library tab keeps its own ticks, none when opened at a session: one text ticked there prints on its own
  await page.locator("#prtab-texts").click();
  await expect(page.locator("#prtp-texts")).toBeVisible();
  await expect(page.locator("#prtp-today")).toBeHidden();
  await expect(page.locator("#prwl .tpkl input:checked")).toHaveCount(0);
  await expect(page.locator("#prgp")).toBeDisabled();
  await page.locator("#prwl .tpkl input").first().check();
  await expect(page.locator("#prwl .tpkl input:checked")).toHaveCount(1);
  await expect(page.locator("#prsum span").first()).not.toHaveText(/texts$/);
  // back on Today, the session chosen is still the choice; Evening prints just its texts, and Safari laying the page
  // out again after afterprint (its print sheet) still prints them, not the whole Library
  await page.locator("#prtab-today").click();
  await expect(page.locator('.prses[data-s="all"]')).toHaveAttribute("aria-pressed", "true");
  await page.locator('.prses[data-s="evening"]').click();
  await page.locator("#prnx").click();
  await page.locator("#prgp").click();
  await page.waitForFunction(() => window.__printed > 0 || !document.getElementById("prgo").hidden, null, { timeout: 15_000 });
  if (await page.locator("#prgo").isVisible()) await page.locator("#prgo").click();
  await page.waitForFunction(() => window.__printed > 0, null, { timeout: 15_000 });
  expect(await page.evaluate(() => document.querySelectorAll("#pv .pvs").length)).toBe(TEST_AARTIS.length);
  expect(
    await page.evaluate(() => {
      dispatchEvent(new Event("afterprint"));
      dispatchEvent(new Event("beforeprint"));
      const n = document.querySelectorAll("#pv .pvs").length;
      dispatchEvent(new Event("afterprint"));
      return n;
    }),
  ).toBe(TEST_AARTIS.length);
  // once the reader is back on the page, the browser's own Print prints the whole Library again
  await page.locator("body").dispatchEvent("pointerdown");
  expect(
    await page.evaluate(() => {
      dispatchEvent(new Event("beforeprint"));
      const n = document.querySelectorAll("#pv .pvs").length;
      dispatchEvent(new Event("afterprint"));
      return n;
    }),
  ).toBeGreaterThan(TEST_AARTIS.length + 1);
  await context.close();
});

// A session prints in Home's order (never sorted into the Library's categories), numbered 1, 2, 3… in that order under
// one heading, the day and the session; Open in Safari carries the session, and Safari prints it the same way
test("print builder: a session prints in Home's order, in the app and in Safari @chromium-only", async ({ browser }) => {
  const context = await browser.newContext({ ...IPHONE, locale: "en-US", serviceWorkers: "block" });
  const page = await context.newPage();
  await stubPrint(page);
  await useTestRoutine(page);
  await openSite(page, SETUPS.marathi);
  await page.locator("#asp").click();
  await page.locator('.prses[data-s="evening"]').click();
  const day = await page.evaluate(() => ["रविवार", "सोमवार", "मंगळवार", "बुधवार", "गुरुवार", "शुक्रवार", "शनिवार"][new Date().getDay()]);
  /** @param {import("@playwright/test").Page} p */
  const printed = (p) =>
    p.evaluate(() => ({
      heads: [...document.querySelectorAll("#pv .pvcov .pvcat")].map((e) => e.textContent.trim()),
      toc: [...document.querySelectorAll("#pv .pvcov li")].map((e) => e.getAttribute("data-sid")),
      texts: [...document.querySelectorAll("#pv .pvs")].map((e) => e.getAttribute("data-sid")),
      nums: [...document.querySelectorAll("#pv .pvs .pvnum")].map((e) => e.textContent.trim()),
    }));
  const sids = await page.evaluate(
    (ids) =>
      ids.map((id) => {
        let sid = "";
        window.CONTENT.categories.forEach((g) => g.pieces.forEach((p) => p.text === id && (sid = p.id)));
        return sid;
      }),
    TEST_AARTIS,
  );
  // the preview shows the session's first text
  await page.locator("#prnx").click();
  await expect(page.locator("#prsheet iframe")).toHaveCount(1);
  expect(await page.locator("#prsheet iframe").evaluate((f) => f.contentDocument.querySelector(".pvs").getAttribute("data-sid"))).toBe(sids[0]);
  await page.locator("#prgp").click();
  await page.waitForFunction(() => window.__printed > 0 || !document.getElementById("prgo").hidden, null, { timeout: 15_000 });
  if (await page.locator("#prgo").isVisible()) await page.locator("#prgo").click();
  await page.waitForFunction(() => window.__printed > 0, null, { timeout: 15_000 });
  const app = await printed(page);
  expect(app.texts).toEqual(sids);
  expect(app.toc).toEqual(sids);
  expect(app.heads).toEqual([`${day} · सायंकाळ`]);
  expect(app.nums.slice(0, 3)).toEqual(["१.", "२.", "३."]);
  // Safari prints it the same way
  await page.locator("body").dispatchEvent("pointerdown");
  await page.evaluate(() => dispatchEvent(new Event("afterprint")));
  const sa = await browser.newContext({ ...IPHONE, locale: "en-US", serviceWorkers: "block" });
  const hp = await sa.newPage();
  await hp.addInitScript(() => {
    Object.defineProperty(navigator, "standalone", { value: true });
  });
  await useTestRoutine(hp);
  await openSite(hp, SETUPS.marathi);
  await hp.locator("#asp").click();
  await hp.locator('.prses[data-s="evening"]').click();
  await hp.locator("#prnx").click();
  await hp.locator("#prgp").click();
  await hp.locator("#prsf").click();
  const href = await hp.locator("#prsf").getAttribute("data-to");
  expect(href).toContain("&o=evening");
  const sf = await browser.newContext({ ...IPHONE, locale: "en-US", serviceWorkers: "block" });
  const sp = await sf.newPage();
  await sp.addInitScript(() => {
    window.__printed = 0;
    window.print = () => {
      if (window.__printed++) dispatchEvent(new Event("beforeprint"));
    };
  });
  await sp.clock.setFixedTime(FIXED_NOW);
  await sp.goto(href.replace(/^x-safari-/, ""));
  await expect(sp.locator("#prgo")).toBeVisible({ timeout: 15_000 });
  await sp.locator("#prgo").click();
  await sp.waitForFunction(() => document.querySelectorAll("#pv .pvs").length > 0, null, { timeout: 15_000 });
  const safari = await printed(sp);
  expect(safari.texts).toEqual(sids);
  expect(safari.heads).toEqual([`${day} · सायंकाळ`]);
  await sf.close();
  await sa.close();
  await context.close();
});

// Home showing another day (‹ › under the date): Print prints that day's session, headed by that day, and Open in Safari
// carries the day, so Safari (on today, a Thursday) heads it the same
test("print builder: a session of another day is headed by that day, in the app and in Safari @chromium-only", async ({ browser }) => {
  const context = await browser.newContext({ ...IPHONE, locale: "en-US", serviceWorkers: "block" });
  const page = await context.newPage();
  await stubPrint(page);
  await useTestRoutine(page);
  await openSite(page, SETUPS.marathi);
  await page.locator("#tdx").click();
  await expect(page.locator("#tdd .d2")).toHaveText("Friday, 16 October 2026");
  await page.locator("#asp").click();
  await expect(page.locator("#prtab-today")).toHaveText("Friday");
  await page.locator('.prses[data-s="evening"]').click();
  const heads = (p) => p.evaluate(() => [...document.querySelectorAll("#pv .pvcov .pvcat")].map((e) => e.textContent.trim()));
  await page.locator("#prnx").click();
  await page.locator("#prgp").click();
  await page.waitForFunction(() => window.__printed > 0 || !document.getElementById("prgo").hidden, null, { timeout: 15_000 });
  if (await page.locator("#prgo").isVisible()) await page.locator("#prgo").click();
  await page.waitForFunction(() => window.__printed > 0, null, { timeout: 15_000 });
  expect(await heads(page)).toEqual(["शुक्रवार · सायंकाळ"]);
  await page.locator("body").dispatchEvent("pointerdown");
  await page.evaluate(() => dispatchEvent(new Event("afterprint")));
  // the Home Screen app hands it to Safari with its day
  const sa = await browser.newContext({ ...IPHONE, locale: "en-US", serviceWorkers: "block" });
  const hp = await sa.newPage();
  await hp.addInitScript(() => {
    Object.defineProperty(navigator, "standalone", { value: true });
  });
  await useTestRoutine(hp);
  await openSite(hp, SETUPS.marathi);
  await hp.locator("#tdx").click();
  await hp.locator("#asp").click();
  await hp.locator('.prses[data-s="evening"]').click();
  await hp.locator("#prnx").click();
  await hp.locator("#prgp").click();
  await hp.locator("#prsf").click();
  const href = await hp.locator("#prsf").getAttribute("data-to");
  expect(href).toContain("&o=evening&od=5");
  const sf = await browser.newContext({ ...IPHONE, locale: "en-US", serviceWorkers: "block" });
  const sp = await sf.newPage();
  await sp.addInitScript(() => {
    window.__printed = 0;
    window.print = () => {
      if (window.__printed++) dispatchEvent(new Event("beforeprint"));
    };
  });
  await sp.clock.setFixedTime(FIXED_NOW);
  await sp.goto(href.replace(/^x-safari-/, ""));
  await expect(sp.locator("#prgo")).toBeVisible({ timeout: 15_000 });
  await sp.locator("#prgo").click();
  await sp.waitForFunction(() => document.querySelectorAll("#pv .pvs").length > 0, null, { timeout: 15_000 });
  expect(await heads(sp)).toEqual(["शुक्रवार · सायंकाळ"]);
  await sf.close();
  await sa.close();
  await context.close();
});

// Print in the bottom bar while a text is read (Print and Print this text left ⋯ More, 2026-10-22): just that text, at
// How, named in the bar
test("print builder: Print in the bottom bar prints the text being read @chromium-only", async ({ browser }) => {
  const context = await browser.newContext({ ...IPHONE, locale: "en-US", serviceWorkers: "block" });
  const page = await context.newPage();
  await stubPrint(page);
  await openSite(page, SETUPS.marathi);
  await openMore(page);
  await expect(page.locator("#shr #prt, #shr #prb")).toHaveCount(0);
  await page.keyboard.press("Escape");
  await readText(page, "a7");
  await page.locator("#asp").click();
  await expect(page.locator("#prhw")).toBeVisible();
  const name = await page.evaluate(() =>
    document
      .querySelector("#a7 header h2 .mr")
      .textContent.replace(/^[०-९0-9.\s]+/, "")
      .trim(),
  );
  await expect(page.locator("#prsum span").first()).toHaveText(name);
  await expect(page.locator("#prsum span").first()).toHaveAttribute("lang", "mr");
  // the first tab is the Library (the menus are in English here; Marathi menus: संग्रह)
  await expect(page.locator("#prtab-texts")).toHaveText("Library");
  await page.locator("#prgp").click();
  await page.waitForFunction(() => window.__printed > 0 || !document.getElementById("prgo").hidden, null, { timeout: 15_000 });
  if (await page.locator("#prgo").isVisible()) await page.locator("#prgo").click();
  await page.waitForFunction(() => window.__printed > 0, null, { timeout: 15_000 });
  expect(await page.evaluate(() => [...document.querySelectorAll("#pv .pvs")].map((e) => e.getAttribute("data-sid")))).toEqual(["a7"]);
  await context.close();
});

// The printout's language is its own (like its font): picked under How, it changes what prints, not the reading page;
// it is carried to Safari; Both turns the page row into "Landscape, side by side"
test("print builder: the printout's language @chromium-only", async ({ browser }) => {
  const context = await browser.newContext({ ...IPHONE, locale: "en-US", serviceWorkers: "block" });
  const page = await context.newPage();
  await stubPrint(page);
  await openSite(page, SETUPS.marathi);
  await openPrintBuilder(page);
  await howStep(page);
  await expect(page.locator("#prlg button")).toHaveText(["Marathi", "English", "Both"]);
  await expect(page.locator("#prlg [aria-pressed=true]")).toHaveText("Marathi");
  await expect(page.locator("#prpg")).toBeVisible();
  await page.locator('#prlg [data-v="both"]').click();
  await expect(page.locator("#prpg")).toBeHidden();
  await expect(page.locator("#prpv")).toHaveText("Landscape, side by side");
  await page.locator('#prlg [data-v="en"]').click();
  await expect(page.locator("#prpg")).toBeVisible();
  await expect(page.locator("#prfn .prfx").first()).toHaveText("Sukhkarta");
  const prefs = await page.evaluate(() => JSON.parse(localStorage.getItem("aarti2-prefs")));
  expect([prefs.plang, prefs.lang]).toEqual(["en", "mr"]);
  // just one text, in English; the reading page stays in Marathi
  await page.locator("#prbk").click();
  await page.locator('.prcb[data-cat=""]').click();
  await page.locator('#prwl .tpkl li[data-id="aarti-sukhkarta"] input').check();
  await page.locator("#prnx").click();
  await page.locator("#prgp").click();
  await page.waitForFunction(() => window.__printed > 0 || !document.getElementById("prgo").hidden, null, { timeout: 15_000 });
  if (await page.locator("#prgo").isVisible()) await page.locator("#prgo").click();
  await page.waitForFunction(() => window.__printed > 0, null, { timeout: 15_000 });
  await page.emulateMedia({ media: "print" });
  const shown = await page.evaluate(() => {
    const s = document.querySelector("#pv .pvs");
    const vis = (sel) => [...s.querySelectorAll(sel)].some((e) => e.getClientRects().length && getComputedStyle(e).display !== "none");
    return { lang: document.getElementById("pv").getAttribute("data-lang"), en: vis(".pvl.pve, .pvpr.pve"), mr: vis(".pvl.pvo, .pvpr.pvo") };
  });
  expect(shown).toEqual({ lang: "en", en: true, mr: false });
  await page.emulateMedia({ media: "screen" });
  expect(await page.evaluate(() => document.querySelector(".wrap > .ash").getAttribute("data-lang"))).toBe("mr");
  await context.close();
});

// The preview under How: the first page of the first text ticked, made small; it follows the ticks. The paper: Letter
// in the US (this locale), A4 a tap away; the choice is kept and the printout asks the browser for that paper
test("print builder: the preview and the paper @chromium-only", async ({ browser }) => {
  const context = await browser.newContext({ ...IPHONE, locale: "en-US", serviceWorkers: "block" });
  const page = await context.newPage();
  await stubPrint(page);
  await openSite(page, SETUPS.english);
  await openPrintBuilder(page);
  await howStep(page);
  await expect(page.locator("#prsheet")).toHaveAttribute("aria-label", "Preview of the first page");
  const title = () => page.frameLocator("#prsheet iframe").locator("#pv .pvs h2").first();
  await expect(title()).toContainText("Ganapati Atharvashirsha", { timeout: 20_000 });
  // the first text only
  expect(await page.frameLocator("#prsheet iframe").locator("#pv .pvs").count()).toBe(1);
  await expect(page.locator("#prq")).toHaveText("Letter");
  await expect(page.locator("#prpa")).toHaveText("Use A4");
  // Letter is taller for its width than A4
  const ratio = () => page.locator("#prsheet").evaluate((e) => e.offsetHeight / e.offsetWidth);
  expect(await ratio()).toBeCloseTo(279.4 / 215.9, 1);
  await page.locator("#prpa").click();
  await expect(page.locator("#prq")).toHaveText("A4");
  await expect(page.locator("#prpa")).toHaveText("Use Letter");
  expect(await ratio()).toBeCloseTo(297 / 210, 1);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("aarti2-prefs")).ppr)).toBe("a4");
  await expect(title()).toContainText("Ganapati Atharvashirsha", { timeout: 20_000 });
  // one aarti ticked: the preview shows it
  await page.locator("#prbk").click();
  await page.locator('.prcb[data-cat=""]').click();
  await page.locator('#prwl .tpkl li[data-id="aarti-sukhkarta"] input').check();
  await page.locator("#prnx").click();
  await expect(title()).toContainText("Sukhkarta Dukhharta", { timeout: 20_000 });
  await page.locator("#prgp").click();
  await page.waitForFunction(() => window.__printed > 0 || !document.getElementById("prgo").hidden, null, { timeout: 15_000 });
  const rules = await page.evaluate(() => [...document.querySelectorAll("style[media=print]")].map((s) => s.textContent).join(" "));
  expect(rules).toContain("@page { size: A4 portrait }");
  await context.close();
});

// ---- Routine printouts (print redesign P5) ----
// A routine of its own, so the tests do not change when content/routines.json does: the Atharvashirsha on Monday
// mornings, the Ganapati aarti every morning and evening, the Devi aarti every evening, Ghalin Lotangan on Saturday
// mornings. Routine order is Monday first, then Morning, Afternoon and Evening.
const P5_ROUTINE = {
  morning: {
    mode: "weekday",
    days: {
      mon: ["vedic-chant-atharvashirsha", "aarti-sukhkarta"],
      tue: ["aarti-sukhkarta"],
      wed: ["aarti-sukhkarta"],
      thu: ["aarti-sukhkarta"],
      fri: ["aarti-sukhkarta"],
      sat: ["aarti-sukhkarta", "aarti-ghalin-lotangan"],
      sun: ["aarti-sukhkarta"],
    },
  },
  afternoon: { mode: "fixed", texts: [] },
  evening: { mode: "fixed", texts: ["aarti-durge-durghat-bhari", "aarti-sukhkarta"] },
};
const P5_ORDER = ["vedic-chant-atharvashirsha", "aarti-sukhkarta", "aarti-durge-durghat-bhari", "aarti-ghalin-lotangan"];
const P5_TAGS = ["Mon · Morning", "Daily · Morning, Evening", "Daily · Evening", "Sat · Morning"];
async function useP5Routine(page) {
  await page.route("**/content/routines.json", (r) => r.fulfill({ contentType: "application/json", body: JSON.stringify(P5_ROUTINE) }));
}
async function openRoutineTab(page) {
  await openPrintBuilder(page);
  await page.locator("#prtab-routine").click();
  await expect(page.locator("#prtp-routine")).toBeVisible();
}
async function printNow(page) {
  if (await page.locator("#prnx").isVisible()) await page.locator("#prnx").click();
  await page.locator("#prgp").click();
  await page.waitForFunction(() => window.__printed > 0 || !document.getElementById("prgo").hidden, null, { timeout: 15_000 });
  if (await page.locator("#prgo").isVisible()) await page.locator("#prgo").click();
  await page.waitForFunction(() => window.__printed > 0, null, { timeout: 15_000 });
}

// The Routine tab: the whole week at first, each text once in routine order with its tag; One day is today (the
// fixed test date is a Thursday); a session with no texts is greyed; a day or session taken off leaves its texts out
test("print builder: the Routine tab lists each text once, in routine order, with its tag @chromium-only", async ({ browser }) => {
  const context = await browser.newContext({ ...IPHONE, locale: "en-US", serviceWorkers: "block" });
  const page = await context.newPage();
  await stubPrint(page);
  await useP5Routine(page);
  await openSite(page, SETUPS.english);
  await openRoutineTab(page);
  const ids = () => page.locator(".prrl li").evaluateAll((l) => l.map((x) => x.dataset.id));
  expect(await ids()).toEqual(P5_ORDER);
  await expect(page.locator(".prrl .prtag")).toHaveText(P5_TAGS);
  await expect(page.locator("#prsum span").first()).toHaveText("4 texts");
  await expect(page.locator('[data-rses="afternoon"]')).toBeDisabled();
  await expect(page.locator(".prwho")).toHaveText("Me");
  // one day: today, Thursday
  await page.locator('[data-rspan="day"]').click();
  await expect(page.locator(".prchip[data-rday][aria-pressed=true]")).toHaveText(["Thu"]);
  expect(await ids()).toEqual(["aarti-sukhkarta", "aarti-durge-durghat-bhari"]);
  await expect(page.locator(".prrl .prtag")).toHaveText(["Thu · Morning, Evening", "Thu · Evening"]);
  await page.locator('[data-rday="6"]').click();
  expect(await ids()).toEqual(["aarti-sukhkarta", "aarti-ghalin-lotangan", "aarti-durge-durghat-bhari"]);
  // the whole week, without Monday, and mornings only
  await page.locator('[data-rspan="week"]').click();
  await page.locator('[data-rday="1"]').click();
  await page.locator('[data-rses="evening"]').click();
  expect(await ids()).toEqual(["aarti-sukhkarta", "aarti-ghalin-lotangan"]);
  await expect(page.locator(".prrl .prtag")).toHaveText(["Tue–Sun · Morning", "Sat · Morning"]);
  // the arrow keys move through the three tabs
  await page.locator("#prtab-routine").focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.locator("#prtab-texts")).toBeFocused();
  await page.keyboard.press("ArrowLeft");
  await expect(page.locator("#prtab-routine")).toBeFocused();
  await context.close();
});

// The printout (PLAN §3 A and B): page 1 has whose routine, the week at a glance and the contents with each text's tag
// and the page it really starts on; then the texts in routine order, numbered 1, 2, 3…, each with its tag under its
// title. A Library printout has no tags and keeps its plain contents.
test("print: a routine printout, its week at a glance and tags @chromium-only", async ({ browser }) => {
  const context = await browser.newContext({ locale: "en-US", viewport: { width: 1280, height: 900 }, serviceWorkers: "block" });
  const page = await context.newPage();
  await stubPrint(page);
  await useP5Routine(page);
  await openSite(page, SETUPS.english);
  await openRoutineTab(page);
  await printNow(page);
  expect(await page.evaluate(() => [...document.querySelectorAll("#pv .pvs")].map((e) => e.getAttribute("data-sid")))).toEqual(
    await page.evaluate((o) => o.map((id) => window.CONTENT.categories.flatMap((g) => g.pieces).find((p) => p.text === id).id), P5_ORDER),
  );
  // the grid: Monday first; Morning and Evening (Afternoon has nothing); each cell the texts' numbers
  expect(await page.locator("#pv .pvgrid thead th").allTextContents()).toEqual(["", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]);
  expect(await page.locator("#pv .pvgrid tbody th").allTextContents()).toEqual(["Morning", "Evening"]);
  expect(await page.locator("#pv .pvgrid tbody tr").first().locator("td").allTextContents()).toEqual(["1 2", "2", "2", "2", "2", "2 4", "2"]);
  expect(await page.locator("#pv .pvgrid tbody tr").last().locator("td").allTextContents()).toEqual(Array(7).fill("3 2"));
  await expect(page.locator("#pv .pvrh")).toHaveText("Me");
  await expect(page.locator("#pv .pvtoc .pvtag")).toHaveText(P5_TAGS);
  await expect(page.locator("#pv .pvs h2 .pvtag")).toHaveText(P5_TAGS);
  await expect(page.locator("#pv .pvs h2 .pvnum")).toHaveText(["1.", "2.", "3.", "4."]);
  // the PDF: page 1, then each text on pages of its own, in order, its tag under its title
  await page.emulateMedia({ media: "print" });
  const pdf = await pdfPages(page, "Letter");
  expect(pdf.pages[0]).toContain("The week at a glance");
  expect(pdf.pages[0]).toContain("Daily · Morning, Evening");
  const titles = await page.locator("#pv .pvs h2 .pvtt").allTextContents();
  let at = 0;
  titles.forEach((t, i) => {
    const p = pdf.pages.findIndex((x, j) => j > at && x.includes(t.trim()) && x.includes(P5_TAGS[i]));
    expect(p, `${t} on a page of its own after the one before`).toBeGreaterThan(at);
    at = p;
  });
  await context.close();
});

test("print: a Library printout has no tags or week grid @chromium-only", async ({ page }) => {
  await stubPrint(page);
  await useP5Routine(page);
  await openSite(page, SETUPS.english);
  await printFromButton(page, "pr1");
  expect(await page.locator("#pv .pvtag, #pv .pvgrid").count()).toBe(0);
  expect(await page.locator("#pv .pvcov .pvcat").count()).toBeGreaterThan(1);
});

// Open in Safari carries the routine printout: Safari keeps its own storage, so the link holds whose routine (name and
// routine) and the days and sessions; Safari opens at the Routine tab's printout, ready to print
test("iPhone Home Screen app: Open in Safari carries a routine printout @chromium-only", async ({ browser }) => {
  const context = await browser.newContext({ ...IPHONE, locale: "en-US", serviceWorkers: "block" });
  const page = await context.newPage();
  await page.addInitScript(() => {
    if (!location.search) Object.defineProperty(navigator, "standalone", { value: true });
    window.__printed = 0;
    window.print = () => {
      window.__printed++;
    };
  });
  await useP5Routine(page);
  await openSite(page, SETUPS.english);
  await openRoutineTab(page);
  await page.locator('[data-rses="evening"]').click();
  await page.locator("#prnx").click();
  await page.locator("#prgp").click();
  await expect(page.locator("#prsf")).toBeVisible();
  await page.locator("#prsf").click();
  const href = await page.locator("#prsf").getAttribute("data-to");
  expect(href).toMatch(/&r=/);
  // of the routine, just what is printed: Evening was taken off, so the link has none of its texts
  const carried = JSON.parse(decodeURIComponent(/&r=([^&]*)/.exec(href)[1])).r;
  expect(carried.evening).toEqual({ mode: "fixed", texts: [] });
  expect(carried.afternoon).toEqual({ mode: "fixed", texts: [] });
  // Safari: a fresh browser, with the default routine (the link brings the person's own)
  const sf = await browser.newContext({ ...IPHONE, locale: "en-US", serviceWorkers: "block" });
  const sp = await sf.newPage();
  await sp.addInitScript(() => {
    window.__printed = 0;
    window.print = () => {
      if (window.__printed++) dispatchEvent(new Event("beforeprint"));
    };
  });
  await sp.goto(href.replace(/^x-safari-/, ""));
  await expect(sp.locator("#prgo")).toBeVisible({ timeout: 15_000 });
  expect(await sp.evaluate(() => location.search)).toBe("");
  await expect(sp.locator("#pv .pvrh")).toHaveText("Me");
  await expect(sp.locator("#pv .pvtoc .pvtag")).toHaveText(["Mon · Morning", "Daily · Morning", "Sat · Morning"]);
  await expect(sp.locator("#pv .pvgrid tbody th")).toHaveText(["Morning"]);
  await sf.close();
  await context.close();
});
