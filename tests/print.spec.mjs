// Print and PDF: how a printout is put together. How each text prints, line by line in every layout, is checked text
// by text in print-items.spec.mjs; this suite checks the rest:
//   - the contents page lists the page each piece really starts on in the PDF (the whole Library in each layout, and
//     a few texts only)
//   - every unbroken block (heading with its dhrupad and first stanza, each stanza) sits on one page
//   - every piece is printed, even when it or its section is folded on screen, and whatever the reading page shows
//   - the screen-only controls (Open all, settings, etc.) never print
//   - in layouts with English, every English line of the print view is in the PDF
//   - the page count and contents numbers match the recorded baseline
//   - printing from the browser's menu, Safari's print layout, the Print pop-up and the iPhone's Print now and
//     Open in Safari
// PDFs can only be made by Chromium, so this suite is Chromium-only.
import { test, expect, devices } from "@playwright/test";
import { openSite, SETUPS, SNAP_ENV, TEXT_COUNT, openMore, tapMore, readText, useTestRoutine, TEST_AARTIS } from "./helpers.mjs";
import { printOnce, checkPrintout, stubPrint, printFromButton, howStep, readPrintView, addMarkers, pdfPages, markerPages, toInt, trackWarmUp, waitForWarmUp } from "./print-helpers.mjs";

test.describe.configure({ mode: "parallel" });

// The whole Library, as the Print button prints it: the contents page and its numbers, every piece in reading order.
// How each text itself prints (every line, in every layout, the other fonts) is checked text by text in
// print-items.spec.mjs: a text prints the same inside the whole Library as on its own, so these check how the printout
// is put together. Portrait (pr1) and Landscape (pr2): one language prints in a column either way; both languages
// print side by side, on Landscape only.
const WHOLE = [
  { name: "marathi-single-column-best-Letter", prefs: SETUPS.marathi, choice: "pr1", mode: "one", paper: "Letter", locale: "en-US" },
  { name: "english-single-column-best-A4", prefs: SETUPS.english, choice: "pr1", mode: "one", paper: "A4", locale: "en-IN" },
  { name: "sideways-marathi-single-column-best-Letter", prefs: { ...SETUPS.marathi, por: "land" }, choice: "pr2", mode: "one", paper: "Letter", locale: "en-US" },
  { name: "sideways-english-single-column-best-Letter", prefs: { ...SETUPS.english, por: "land" }, choice: "pr2", mode: "one", paper: "Letter", locale: "en-US" },
  { name: "sideways-both-side-by-side-best-Letter", prefs: { ...SETUPS.both, por: "land" }, choice: "pr2", mode: "side", paper: "Letter", locale: "en-US" },
  { name: "sideways-kannada-side-by-side-best-Letter", prefs: { ...SETUPS["kannada-both"], por: "land" }, choice: "pr2", mode: "side", paper: "Letter", locale: "en-US" },
];
// iPhone 13 emulation in Chromium (the device entry names WebKit as its browser, which newContext does not take)
const { defaultBrowserType: _bt, ...IPHONE } = devices["iPhone 13"];

// Special cases beyond those (the default font, Best for each text; Letter unless stated)
const EXTRAS = [
  { name: "iast-english-single-column", prefs: SETUPS["english-iast"], choice: "pr1", mode: "one" },
  { name: "iast-both-side-by-side", prefs: SETUPS["both-iast"], choice: "pr2", mode: "side" },
  { name: "english-main-side-by-side", prefs: SETUPS["english-main-both"], choice: "pr2", mode: "side" },
  { name: "kannada-single-column", prefs: SETUPS.kannada, choice: "pr1", mode: "one" },
  { name: "dhrupad-every-verse-single", prefs: SETUPS["marathi-every-verse"], choice: "pr1", mode: "one" },
  { name: "marathi-menus-single-column", prefs: SETUPS["marathi-menus"], choice: "pr1", mode: "one" },
  // Folded on screen: two pieces. They must still print.
  { name: "everything-folded", prefs: { ...SETUPS.marathi, af: ["a3", "a7"], tf: 1, fold: 1 }, choice: "pr1", mode: "one" },
  { name: "a4-kannada-single-column", prefs: SETUPS.kannada, choice: "pr1", mode: "one", paper: "A4", locale: "en-GB" },
];

for (const W of WHOLE) {
  test(`whole Library · ${W.name} @chromium-only`, async ({ browser }) => {
    const r = await printOnce(browser, { prefs: W.prefs, choice: W.choice, mode: W.mode, paper: W.paper, locale: W.locale });
    if (W.choice === "pr2") expect(r.pdf.landscape, "the PDF pages are sideways").toBe(true);
    const summary = checkPrintout(r, W.paper);
    expect(JSON.stringify(summary, null, 1)).toMatchSnapshot([SNAP_ENV, `${W.name}.json`]);
  });
}

// Some texts only (a print link naming them, ?print=…&t=…): the contents page lists just those, in reading order,
// each with the page it starts on
test("a few texts: their own contents page @chromium-only", async ({ browser }) => {
  const ids = ["sukhkarta", "shree-rudra", "ashtak-monday"];
  const context = await browser.newContext({ locale: "en-US", viewport: { width: 1280, height: 900 }, serviceWorkers: "block" });
  const page = await context.newPage();
  const errors = [];
  await stubPrint(page);
  await openSite(page, { ...SETUPS.marathi, por: "up" }, { errors, hash: `?print=as&t=${ids.join(",")}` });
  await page.waitForFunction(() => window.__printed > 0, null, { timeout: 20_000 });
  await page.emulateMedia({ media: "print" });
  // reading order is the Library's (content/categories.json), whatever order the link names them in
  const onScreen = await page.evaluate((ids) => window.CONTENT.categories.flatMap((g) => g.pieces).filter((p) => ids.includes(p.text)).map((p) => p.id), ids);
  expect(onScreen).toHaveLength(3);
  const pv = await readPrintView(page);
  await addMarkers(page);
  const pdf = await pdfPages(page, "Letter");
  await context.close();
  const summary = checkPrintout({ pv, pdf, errors, onScreen, mode: "one" }, "Letter");
  expect(JSON.stringify(summary, null, 1)).toMatchSnapshot([SNAP_ENV, "a-few-texts.json"]);
});

// Sideways special cases: the dhrupad after every verse, and Kannada
for (const X of [
  { name: "sideways-dhrupad-every-verse-single", prefs: SETUPS["marathi-every-verse"], choice: "pr2", mode: "one" },
  { name: "sideways-dhrupad-every-verse-side", prefs: { ...SETUPS["marathi-every-verse"], lang: "both" }, choice: "pr2", mode: "side" },
  { name: "sideways-kannada-single-column", prefs: SETUPS.kannada, choice: "pr2", mode: "one" },
]) {
  test(`${X.name} @chromium-only`, async ({ browser }) => {
    const r = await printOnce(browser, { prefs: { ...X.prefs, por: "land" }, choice: X.choice, mode: X.mode, paper: "Letter", locale: "en-US" });
    expect(r.pdf.landscape).toBe(true);
    const summary = checkPrintout(r, "Letter");
    expect(JSON.stringify(summary, null, 1)).toMatchSnapshot([SNAP_ENV, `${X.name}.json`]);
  });
}

for (const X of EXTRAS) {
  test(`${X.name} @chromium-only`, async ({ browser }) => {
    const paper = X.paper || "Letter";
    const r = await printOnce(browser, { prefs: X.prefs, choice: X.choice, mode: X.mode, paper, locale: X.locale || "en-US" });
    const summary = checkPrintout(r, paper);
    expect(JSON.stringify(summary, null, 1)).toMatchSnapshot([SNAP_ENV, `${X.name}.json`]);
  });
}

// Printing from the browser's own menu (Ctrl/⌘ P, or Share → Print on a phone) doesn't go through
// the pop-up: the page builds the single-column print view in "beforeprint".
test("browser menu print gives the single-column print view @chromium-only", async ({ browser }) => {
  const context = await browser.newContext({ locale: "en-US", serviceWorkers: "block" });
  const page = await context.newPage();
  await trackWarmUp(page);
  await openSite(page, SETUPS.marathi);
  // the contents numbers for the menu print are worked out in the background ~3 s after load
  await waitForWarmUp(page);
  // page.pdf() fires beforeprint exactly as the browser's Print menu does; the markers go in after
  // the site's own handler has built the print view
  await addMarkers(page, "beforeprint");
  const pdf = await pdfPages(page, "Letter");
  await page.emulateMedia({ media: "print" });
  const pv = await readPrintView(page);
  expect(pv.pieces).toHaveLength(TEXT_COUNT);
  expect(pv.toc.every((t) => t.page)).toBe(true);
  const at = markerPages(pdf.pages);
  for (const t of pv.toc) expect(at[t.id + ":0:s"], `${t.id} page`).toBe(toInt(t.page));
  expect(JSON.stringify({ pages: pdf.pages.length, contents: Object.fromEntries(pv.toc.map((t) => [t.id, toInt(t.page)])) }, null, 1))
    .toMatchSnapshot([SNAP_ENV, "browser-menu.json"]);
  // afterprint (fired when page.pdf finished) puts the page back to normal
  expect(await page.evaluate(() => document.documentElement.hasAttribute("data-print"))).toBe(false);
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

// Safari and iOS (class "wk") keep the page plan worked out from the heights (see paginate in
// js/features/print.js). Chromium can take that path too: nothing lost, contents numbers present.
for (const [setup, por] of [["marathi", "up"], ["english", "up"], ["marathi", "land"]]) {
  test(`Safari print layout (${setup}${por === "land" ? ", sideways" : ""}) @chromium-only`, async ({ browser }) => {
    // Safari's user agent makes the site take its Safari print path (class "wk" on <html>)
    const context = await browser.newContext({ locale: "en-US", serviceWorkers: "block", userAgent: devices["Desktop Safari"].userAgent });
    const page = await context.newPage();
    await stubPrint(page);
    await openSite(page, { ...SETUPS[setup], por });
    await printFromButton(page, por === "land" ? "pr2" : "pr1");
    const pv = await readPrintView(page);
    expect(pv.mode).toBe("one");
    expect(pv.pieces).toHaveLength(TEXT_COUNT);
    expect(pv.toc.every((t) => t.page)).toBe(true);
    await addMarkers(page);
    const pdf = await pdfPages(page, "Letter");
    const at = markerPages(pdf.pages);
    expect(Object.keys(at).length).toBe(pv.blocks * 2);
    expect(JSON.stringify({ pages: pdf.pages.length, contents: Object.fromEntries(pv.toc.map((t) => [t.id, toInt(t.page)])) }, null, 1))
      .toMatchSnapshot([SNAP_ENV, `safari-${setup}${por === "land" ? "-sideways" : ""}.json`]);
    await context.close();
  });
}

// The Print pop-up itself: the right choices for each language, the paper named, Escape and Cancel close it.
test("print pop-up offers the right choices and closes cleanly @chromium-only", async ({ page }) => {
  await stubPrint(page);
  await openSite(page, SETUPS.both);
  await tapMore(page, "#prb");
  await howStep(page);
  await expect(page.locator("#prpg")).toBeHidden();
  await expect(page.locator("#prpv")).toHaveText("Landscape, side by side");
  await expect(page.locator("#prq")).toHaveText("Letter");
  await expect(page.locator("#prgp")).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(page.locator("#prm")).toBeHidden();
  // Print is in the ⋯ More menu, closed by then: focus comes back to ⋯
  await expect(page.locator("#tmb")).toBeFocused();
  await tapMore(page, "#prb");
  await howStep(page);
  await page.locator("#prx").click();
  await expect(page.locator("#prm")).toBeHidden();
  expect(await page.evaluate(() => window.__printed)).toBe(0);
});

// iPhone: Safari opens the print dialog only in answer to a tap, and laying the print view out takes longer
// than a tap counts for, so window.print() is quietly ignored (no beforeprint). The pop-up then offers
// Print now, whose own tap prints.
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
  await tapMore(page, "#prb");
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
  await tapMore(page, "#prb");
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
  await tapMore(page, "#prb");
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
  await tapMore(page, "#prb");
  await howStep(page);
  await expect(page.locator("#pr1")).toBeVisible();
  await expect(page.locator("#prv")).toBeHidden();
  await context.close();
});

// The iPhone Home Screen app cannot print (neither tap opens the dialog there): choosing a layout goes straight
// to Open in Safari, without trying to print
test("iPhone Home Screen app: a layout choice goes straight to Open in Safari @chromium-only", async ({ browser }) => {
  const context = await browser.newContext({ ...IPHONE, locale: "en-US", serviceWorkers: "block" });
  const page = await context.newPage();
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "standalone", { value: true });
    window.__printed = 0;
    window.print = () => window.__printed++;
  });
  await openSite(page, SETUPS.english);
  await tapMore(page, "#prb");
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
  await tapMore(page, "#prb");
  await howStep(page);
  await expect(page.locator("#pr1")).toBeVisible();
  await expect(page.locator("#prw")).toBeHidden();
  await context.close();
});

// Laid out ahead: once the page has been open a few seconds, the single-column printout is ready, so on an
// iPhone the Print button prints on its first tap (no Print now), while the tap still counts
test("iPhone: a printout laid out ahead prints on the first tap @chromium-only", async ({ browser }) => {
  const context = await browser.newContext({ ...IPHONE, locale: "en-US", serviceWorkers: "block" });
  const page = await context.newPage();
  await page.addInitScript(() => {
    window.__printed = 0;
    window.print = () => {
      window.__printed++;
      dispatchEvent(new Event("beforeprint"));
    };
  });
  await trackWarmUp(page);
  await openSite(page, SETUPS.english);
  await waitForWarmUp(page);
  await tapMore(page, "#prb");
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
  await tapMore(page, "#prb");
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
// Portrait until the reader has chosen a page, and the sample in that language; both languages, Landscape (side
// by side) only, with a few words of each language in the sample. The focus is on Print.
for (const [setup, words] of [
  ["marathi", "सुखकर्ता दुःखहर्ता"],
  ["english", "Sukhkarta Dukhharta"],
  ["kannada", "ಸುಖಕರ್ತಾ"],
]) {
  test(`print pop-up offers Portrait and Landscape: ${setup} @chromium-only`, async ({ page }) => {
    await stubPrint(page);
    await openSite(page, SETUPS[setup]);
    await tapMore(page, "#prb");
    await howStep(page);
    await expect(page.locator("#pr1")).toHaveText("Portrait");
    await expect(page.locator("#pr2")).toHaveText("Landscape");
    await expect(page.locator("#pr1")).toHaveAttribute("aria-pressed", "true");
    await expect(page.locator("#prpv")).toBeHidden();
    await expect(page.locator("#prfs")).toContainText(words);
    await expect(page.locator("#prfs")).not.toContainText("·");
    await expect(page.locator("#prgp")).toBeFocused();
  });
}
for (const [setup, a, b] of [
  ["both", "सुखकर्ता", "Sukhkarta"],
  ["kannada-both", "ಸುಖಕರ್ತಾ", "Sukhkarta"],
  ["english-main-both", "Sukhkarta", "सुखकर्ता"],
]) {
  test(`print pop-up offers only Landscape side by side: ${setup} @chromium-only`, async ({ page }) => {
    await stubPrint(page);
    await openSite(page, { ...SETUPS[setup], por: "up" });
    await tapMore(page, "#prb");
    await howStep(page);
    await expect(page.locator("#prpg")).toBeHidden();
    await expect(page.locator("#prpv")).toHaveText("Landscape, side by side");
    const t = await page.locator("#prfs").textContent();
    expect(t.indexOf(a)).toBeGreaterThanOrEqual(0);
    expect(t.indexOf(b)).toBeGreaterThan(t.indexOf(a));
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
    await tapMore(page, "#prb");
    await howStep(page);
    await expect(page.locator("#prl")).toBeHidden();
    await expect(page.locator("#prc")).toBeVisible({ visible: !!ua });
    const sizes = () =>
      page.evaluate(() => {
        const all = (rules) => [...rules].flatMap((r) => (r.cssRules && r.type !== 6 ? all(r.cssRules) : [r]));
        return [...document.styleSheets].flatMap((s) => all(s.cssRules)).filter((r) => r.type === 6 && r.style.size).map((r) => r.style.size);
      });
    await page.locator("#pr2").click();
    await expect(page.locator("#prl")).toBeVisible({ visible: !!ua });
    await page.locator("#prgp").click();
    await page.waitForFunction(() => window.__printed > 0 || !document.getElementById("prgo").hidden, null, { timeout: 15_000 });
    expect((await sizes()).pop()).toBe("landscape");
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem("aarti2-prefs")).por)).toBe("land");
    await page.evaluate(() => dispatchEvent(new Event("afterprint")));
    await tapMore(page, "#prb");
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
  await tapMore(page, "#prb");
  await howStep(page);
  await expect(page.locator("#pr2")).toHaveAttribute("aria-pressed", "true");
});

// A card taller than the screen (a phone on its side, in the iPhone's Open in Safari state) starts at the top and
// the pop-up scrolls to Cancel, rather than running off both edges
test("print pop-up scrolls when taller than the screen @chromium-only", async ({ page }) => {
  await page.setViewportSize({ width: 844, height: 390 });
  await stubPrint(page);
  await openSite(page, SETUPS.marathi);
  await tapMore(page, "#prb");
  await howStep(page);
  await page.evaluate(() => ["prw", "prsf", "prcp"].forEach((i) => (document.getElementById(i).hidden = false)));
  expect(await page.locator("#prm .qrc").evaluate((e) => e.getBoundingClientRect().top)).toBeGreaterThanOrEqual(0);
  await page.locator("#prx").scrollIntoViewIfNeeded();
  await expect(page.locator("#prx")).toBeInViewport();
});

// Above the choices: the printout's dhrupad and font (a tap picks another, for the printout only: the reading
// page keeps its own), with a line of the text in it, centred for one language
test("print pop-up shows the dhrupad and font settings @chromium-only", async ({ page }) => {
  await stubPrint(page);
  await openSite(page, { ...SETUPS.marathi, fnt: "classic" });
  await tapMore(page, "#prb");
  await howStep(page);
  await expect(page.locator("#prdg [aria-pressed=true]")).toHaveText("Once", { useInnerText: true });
  await expect(page.locator("#prfs")).toHaveCSS("text-align", "center");
  // the printout's font starts as Best for each text (its sample in Classic), whatever the text font
  await expect(page.locator("#prfn [aria-pressed=true]")).toHaveText("Best", { useInnerText: true });
  await expect(page.locator("#prfn button")).toHaveText(["Best", "Standard", "Classic", "Bold", "Handwritten"], { useInnerText: true });
  await expect(page.locator("#prfs")).toContainText("सुखकर्ता");
  expect(await page.locator("#prfs").evaluate((e) => getComputedStyle(e).fontFamily)).toContain("SC Classic");
  // a font picked here is the printout's only: the sample line follows it, the reading page keeps its own,
  // and the page takes it just while it prints
  await page.locator('#prfn [data-v="bold"]').click();
  await expect(page.locator("#prfn [aria-pressed=true]")).toHaveText("Bold", { useInnerText: true });
  const prefs = await page.evaluate(() => JSON.parse(localStorage.getItem("aarti2-prefs")));
  expect([prefs.pfn, prefs.fnt]).toEqual(["bold", "classic"]);
  expect(await page.locator("#prfs").evaluate((e) => getComputedStyle(e).fontFamily)).toContain("SC Bold");
  expect(await page.evaluate(() => document.documentElement.getAttribute("data-font"))).toBe("classic");
  expect(
    await page.evaluate(() => {
      window.dispatchEvent(new Event("beforeprint"));
      const f = document.documentElement.getAttribute("data-font");
      window.dispatchEvent(new Event("afterprint"));
      return [f, document.documentElement.getAttribute("data-font")];
    }),
  ).toEqual(["bold", "classic"]);
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
// A phone shows one step at a time: What first, every text ticked, with each text's pages and the total in the bar;
// Next goes on to How, ‹ What to print comes back. What is ticked is what prints.
test("print builder: pick texts on a phone, then print just those @chromium-only", async ({ browser }) => {
  const context = await browser.newContext({ ...IPHONE, locale: "en-US", serviceWorkers: "block" });
  const page = await context.newPage();
  await stubPrint(page);
  await openSite(page, SETUPS.marathi);
  await tapMore(page, "#prb");
  await expect(page.locator("#prwh")).toBeVisible();
  await expect(page.locator("#prhw")).toBeHidden();
  await expect(page.locator("#prgp")).toBeHidden();
  await expect(page.locator("#prnx")).toBeFocused();
  const boxes = page.locator("#prwl .tpkl input");
  await expect(boxes).toHaveCount(TEXT_COUNT);
  expect(await boxes.evaluateAll((l) => l.every((x) => x.checked))).toBe(true);
  await expect(page.locator("#prsum")).toContainText(`${TEXT_COUNT} texts`);
  // the pages come from the whole Library's plan, laid out in the background: each text's, and the total (with the
  // contents page)
  await expect(page.locator("#prwl .prpc").first()).toHaveText(/^~\d+ pages?$/, { timeout: 20_000 });
  const each = await page.locator("#prwl .prpc").allTextContents();
  const sum = each.reduce((a, t) => a + Number(t.replace(/\D/g, "")), 0);
  const pagesIn = async () => Number((await page.locator("#prsum span").nth(1).textContent()).replace(/\D/g, ""));
  await expect(page.locator("#prsum span").nth(1)).toHaveText(/^~\d+ pages$/);
  expect(await pagesIn()).toBe(sum + 1);
  // Clear everything: nothing to print, so Next waits
  await page.locator('.prcb[data-cat=""]').click();
  await expect(page.locator("#prsum")).toContainText("Pick at least one text");
  await expect(page.locator("#prnx")).toBeDisabled();
  await expect(page.locator('.prcb[data-cat=""]')).toHaveText("Select all");
  // two texts, found by search
  await page.locator(".prwq").fill("ganapati aarti");
  await expect(page.locator("#prwl .tpkl li:visible")).toHaveCount(1);
  await page.locator("#prwl .tpkl li:visible input").check();
  await page.locator(".prwq").fill("");
  await page.locator('#prwl li[data-id="atharvashirsha"] input').check();
  await expect(page.locator("#prsum span").first()).toHaveText("2 texts");
  const two = await page.locator('#prwl li[data-id="atharvashirsha"] .prpc, #prwl li[data-id="sukhkarta"] .prpc').allTextContents();
  expect(await pagesIn()).toBe(two.reduce((a, t) => a + Number(t.replace(/\D/g, "")), 0) + 1);
  // Next, and back
  await page.locator("#prnx").click();
  await expect(page.locator("#prhw")).toBeVisible();
  await expect(page.locator("#prwh")).toBeHidden();
  await expect(page.locator("#prgp")).toBeFocused();
  await page.locator("#prbk").click();
  await expect(page.locator("#prwh")).toBeVisible();
  await expect(page.locator('#prwl li[data-id="atharvashirsha"] input')).toBeChecked();
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
  // the browser's own menu, after that printout, prints the whole Library again
  await page.evaluate(() => dispatchEvent(new Event("afterprint")));
  await page.evaluate(() => dispatchEvent(new Event("beforeprint")));
  expect(await page.evaluate(() => document.querySelectorAll("#pv .pvs").length)).toBe(TEXT_COUNT);
  // and the builder keeps the two ticked
  await page.evaluate(() => dispatchEvent(new Event("afterprint")));
  await tapMore(page, "#prb");
  await expect(page.locator("#prsum span").first()).toHaveText("2 texts");
  await context.close();
});

// Select all and Clear for one category leave the others as they are; one text on its own prints without a contents
// page. Wide screens show What and How side by side, with Print in reach at once.
test("print builder: a category's Select all and Clear, and one text alone @chromium-only", async ({ page }) => {
  await stubPrint(page);
  await openSite(page, SETUPS.english);
  await tapMore(page, "#prb");
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
  await page.locator('#prwl li[data-id="sukhkarta"] input').check();
  await expect(page.locator("#prsum span").first()).toHaveText("गणपतीची आरती");
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
  await tapMore(page, "#prb");
  await expect(page.locator(".prwq")).toHaveAttribute("placeholder", "संग्रहात शोधा");
  await expect(page.locator('.prcb[data-cat=""]')).toHaveText("सर्व काढा");
  await expect(page.locator("#prsum span").first()).toHaveText(/^[०-९]+ रचना$/);
  await expect(page.locator("#prwl .prpc").first()).toHaveText(/^~[०-९]+ (पान|पाने)$/, { timeout: 20_000 });
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
  await tapMore(page, "#prb");
  await page.locator('.prcb[data-cat=""]').click();
  await page.locator('#prwl li[data-id="sukhkarta"] input').check();
  await page.locator('#prwl li[data-id="purusha-suktam"] input').check();
  await howStep(page);
  await page.locator("#prgp").click();
  await page.locator("#prsf").click();
  const href = await page.locator("#prsf").getAttribute("data-to");
  expect(href).toMatch(/&t=([a-z-]+,[a-z-]+)$/);
  expect(href.split("&t=")[1].split(",").sort()).toEqual(["purusha-suktam", "sukhkarta"]);
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

// Print this session (Home): the builder opens at How with just the session's texts ticked; ‹ What to print shows the
// Today tab with that session chosen. Today offers each session and all of today, one tap each (the test routine:
// Morning the Atharvashirsha, Afternoon empty, Evening ten aartis; 10 am, so Home shows Morning).
test("print builder: Print this session, and the Today tab @chromium-only", async ({ browser }) => {
  const context = await browser.newContext({ ...IPHONE, locale: "en-US", serviceWorkers: "block" });
  const page = await context.newPage();
  await stubPrint(page);
  await useTestRoutine(page);
  await openSite(page, SETUPS.english);
  await page.locator("#tspr").click();
  await expect(page.locator("#prhw")).toBeVisible();
  await expect(page.locator("#prgp")).toBeFocused();
  await expect(page.locator("#prsum span").first()).toHaveText("गणपत्यथर्वशीर्षोपनिषत्");
  await page.locator("#prbk").click();
  await expect(page.locator("#prtab-today")).toHaveAttribute("aria-selected", "true");
  await expect(page.locator('.prses[data-s="morning"]')).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator('.prses[data-s="afternoon"]')).toBeDisabled();
  // Evening, then all of today
  await page.locator('.prses[data-s="evening"]').click();
  await expect(page.locator("#prsum span").first()).toHaveText(`${TEST_AARTIS.length} texts`);
  await expect(page.locator('.prses[data-s="morning"]')).toHaveAttribute("aria-pressed", "false");
  await page.locator('.prses[data-s="all"]').click();
  await expect(page.locator("#prsum span").first()).toHaveText(`${TEST_AARTIS.length + 1} texts`);
  // the Texts tab shows the same ticks
  await page.locator("#prtab-texts").click();
  await expect(page.locator("#prtp-texts")).toBeVisible();
  await expect(page.locator("#prtp-today")).toBeHidden();
  expect(await page.locator("#prwl .tpkl input:checked").evaluateAll((l) => l.map((x) => x.value).sort())).toEqual(["atharvashirsha", ...TEST_AARTIS].sort());
  // Evening prints just its texts
  await page.locator("#prtab-today").click();
  await page.locator('.prses[data-s="evening"]').click();
  await page.locator("#prnx").click();
  await page.locator("#prgp").click();
  await page.waitForFunction(() => window.__printed > 0 || !document.getElementById("prgo").hidden, null, { timeout: 15_000 });
  if (await page.locator("#prgo").isVisible()) await page.locator("#prgo").click();
  await page.waitForFunction(() => window.__printed > 0, null, { timeout: 15_000 });
  expect(await page.evaluate(() => document.querySelectorAll("#pv .pvs").length)).toBe(TEST_AARTIS.length);
  await context.close();
});

// Print this text (More, while a text is read; not on Home): just that text, at How, named in the bar
test("print builder: Print this text @chromium-only", async ({ browser }) => {
  const context = await browser.newContext({ ...IPHONE, locale: "en-US", serviceWorkers: "block" });
  const page = await context.newPage();
  await stubPrint(page);
  await openSite(page, SETUPS.marathi);
  await openMore(page);
  await expect(page.locator("#prt")).toBeHidden();
  await page.keyboard.press("Escape");
  await readText(page, "a7");
  await tapMore(page, "#prt");
  await expect(page.locator("#prhw")).toBeVisible();
  const name = await page.evaluate(() => document.querySelector("#a7 header h2 .mr").textContent.replace(/^[०-९0-9.\s]+/, "").trim());
  await expect(page.locator("#prsum span").first()).toHaveText(name);
  await expect(page.locator("#prsum span").first()).toHaveAttribute("lang", "mr");
  await page.locator("#prgp").click();
  await page.waitForFunction(() => window.__printed > 0 || !document.getElementById("prgo").hidden, null, { timeout: 15_000 });
  if (await page.locator("#prgo").isVisible()) await page.locator("#prgo").click();
  await page.waitForFunction(() => window.__printed > 0, null, { timeout: 15_000 });
  expect(await page.evaluate(() => [...document.querySelectorAll("#pv .pvs")].map((e) => e.getAttribute("data-sid")))).toEqual(["a7"]);
  await context.close();
});
