// Print and PDF: the most thorough suite, because the printout is what the group hands round.
//
// For every combination of layout × text font × paper size (and a set of special cases) it checks:
//   - the contents page lists the page each piece really starts on in the PDF
//   - every unbroken block (heading with its dhrupad and first stanza, each stanza) sits on one page
//   - every piece is printed, even when it or its section is folded on screen
//   - the screen-only controls (Open all, settings, etc.) never print
//   - in layouts with English, every English line of the print view is in the PDF
//   - the page count and contents numbers match the recorded baseline
//   - no line is lost, side by side rows stay in step and lines break mid-phrase only rarely (see the print audit)
// PDFs can only be made by Chromium, so this suite is Chromium-only.
import { test, expect, devices } from "@playwright/test";
import { openSite, SETUPS, SNAP_ENV } from "./helpers.mjs";
import { pdfMarks, auditLines } from "./print-audit-helpers.mjs";
import { printOnce, checkPrintout, stubPrint, printFromButton, readPrintView, addMarkers, pdfPages, markerPages, toInt } from "./print-helpers.mjs";

test.describe.configure({ mode: "parallel" });

// The Print pop-up's choices: Portrait (pr1) and Landscape (pr2). One language prints in a column either way;
// both languages print side by side, on Landscape only (stacked is no longer offered).
const LAYOUTS = [
  { name: "marathi-single-column", setup: "marathi", choice: "pr1", mode: "one" },
  { name: "english-single-column", setup: "english", choice: "pr1", mode: "one" },
];
const SIDEWAYS = [
  { name: "marathi-single-column", setup: "marathi", choice: "pr2", mode: "one" },
  { name: "english-single-column", setup: "english", choice: "pr2", mode: "one" },
  { name: "both-side-by-side", setup: "both", choice: "pr2", mode: "side" },
  { name: "kannada-side-by-side", setup: "kannada-both", choice: "pr2", mode: "side" },
];
// iPhone 13 emulation in Chromium (the device entry names WebKit as its browser, which newContext does not take)
const { defaultBrowserType: _bt, ...IPHONE } = devices["iPhone 13"];
const FONTS = ["std", "classic", "bold", "hand"];
// Letter is chosen for US / Canada / Mexico / Philippines, A4 everywhere else (see LTR in js/features/print.js)
const PAPERS = [
  { paper: "Letter", locale: "en-US" },
  { paper: "A4", locale: "en-IN" },
];

// Special cases beyond the main grid (standard font, Letter unless stated)
const EXTRAS = [
  { name: "iast-english-single-column", prefs: SETUPS["english-iast"], choice: "pr1", mode: "one" },
  { name: "iast-both-side-by-side", prefs: SETUPS["both-iast"], choice: "pr2", mode: "side" },
  { name: "english-main-side-by-side", prefs: SETUPS["english-main-both"], choice: "pr2", mode: "side" },
  { name: "kannada-single-column", prefs: SETUPS.kannada, choice: "pr1", mode: "one" },
  { name: "dhrupad-every-verse-single", prefs: SETUPS["marathi-every-verse"], choice: "pr1", mode: "one" },
  { name: "marathi-menus-single-column", prefs: SETUPS["marathi-menus"], choice: "pr1", mode: "one" },
  // Folded on screen: the Pooja section, the Aarti section and two pieces. All must still print.
  { name: "everything-folded", prefs: { ...SETUPS.marathi, pf: 1, xf: 1, af: ["a3", "a7"], tf: 1, fold: 1 }, choice: "pr1", mode: "one" },
  { name: "a4-kannada-single-column", prefs: SETUPS.kannada, choice: "pr1", mode: "one", paper: "A4", locale: "en-GB" },
];

for (const L of LAYOUTS)
  for (const fnt of FONTS)
    for (const P of PAPERS) {
      test(`${L.name} · ${fnt} font · ${P.paper} @chromium-only`, async ({ browser }) => {
        const r = await printOnce(browser, { prefs: { ...SETUPS[L.setup], fnt }, choice: L.choice, mode: L.mode, ...P, lines: true });
        const summary = checkPrintout(r, P.paper);
        expect(JSON.stringify(summary, null, 1)).toMatchSnapshot([SNAP_ENV, `${L.name}-${fnt}-${P.paper}.json`]);
        // the lines themselves (js/print/fit.js): nothing lost, side by side in step, lines broken mid-phrase only
        // where a line is too long even at its smallest (npm run print:audit shows every case)
        const a = auditLines(r.marked, await pdfMarks(r.pdf.buf), L.mode);
        // a failure names the lines, so it can be understood from the log alone (CI keeps no PDFs)
        const which = (kind) => kind + ": " + a.findings.filter((f) => f.kind.startsWith(kind)).slice(0, 12).map((f) => `\n  ${f.sid} ${f.lines || ""} ${f.text}`).join("");
        expect(a.missing, which("text missing")).toBe(0);
        expect(a.overflow, which("runs past its column")).toBe(0);
        expect(a.outOfStep, which("side by side out of step")).toBeLessThanOrEqual(6);
        expect(a.brokeMidPhrase, which("line broken mid-phrase")).toBeLessThanOrEqual(12);
      });
    }

// Landscape: every layout in every font, on Letter or A4 by turns, with the same checks. The text is fitted to
// the wider line and the pages planned for the shorter page.
for (const L of SIDEWAYS)
  FONTS.forEach((fnt, i) => {
    const P = PAPERS[i % 2];
    test(`sideways · ${L.name} · ${fnt} font · ${P.paper} @chromium-only`, async ({ browser }) => {
      const r = await printOnce(browser, { prefs: { ...SETUPS[L.setup], fnt, por: "land" }, choice: L.choice, mode: L.mode, ...P, lines: true });
      expect(r.pdf.landscape, "the PDF pages are sideways").toBe(true);
      const summary = checkPrintout(r, P.paper);
      expect(JSON.stringify(summary, null, 1)).toMatchSnapshot([SNAP_ENV, `sideways-${L.name}-${fnt}-${P.paper}.json`]);
      const a = auditLines(r.marked, await pdfMarks(r.pdf.buf), L.mode);
      const which = (kind) => kind + ": " + a.findings.filter((f) => f.kind.startsWith(kind)).slice(0, 12).map((f) => `\n  ${f.sid} ${f.lines || ""} ${f.text}`).join("");
      expect(a.missing, which("text missing")).toBe(0);
      expect(a.overflow, which("runs past its column")).toBe(0);
      expect(a.outOfStep, which("side by side out of step")).toBeLessThanOrEqual(6);
      expect(a.brokeMidPhrase, which("line broken mid-phrase")).toBeLessThanOrEqual(12);
    });
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
  await openSite(page, SETUPS.marathi);
  // the contents numbers for the menu print are worked out in the background ~3 s after load
  await page.waitForTimeout(4000);
  // page.pdf() fires beforeprint exactly as the browser's Print menu does; the markers go in after
  // the site's own handler has built the print view
  await addMarkers(page, "beforeprint");
  const pdf = await pdfPages(page, "Letter");
  await page.emulateMedia({ media: "print" });
  const pv = await readPrintView(page);
  expect(pv.pieces).toHaveLength(11);
  expect(pv.toc.every((t) => t.page)).toBe(true);
  const at = markerPages(pdf.pages);
  for (const t of pv.toc) expect(at[t.id + ":0:s"], `${t.id} page`).toBe(toInt(t.page));
  expect(JSON.stringify({ pages: pdf.pages.length, contents: Object.fromEntries(pv.toc.map((t) => [t.id, toInt(t.page)])) }, null, 1))
    .toMatchSnapshot([SNAP_ENV, "browser-menu.json"]);
  // afterprint (fired when page.pdf finished) puts the page back to normal
  expect(await page.evaluate(() => document.documentElement.hasAttribute("data-print"))).toBe(false);
  await context.close();
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
    expect(pv.pieces).toHaveLength(11);
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
  await page.locator("#prb").click();
  await expect(page.locator("#prpg")).toBeHidden();
  await expect(page.locator("#prpv")).toHaveText("Landscape, side by side");
  await expect(page.locator("#prq")).toHaveText("Letter");
  await expect(page.locator("#prgp")).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(page.locator("#prm")).toBeHidden();
  await expect(page.locator("#prb")).toBeFocused();
  await page.locator("#prb").click();
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
  await page.locator("#prb").click();
  await page.locator("#pr1").click();
  await page.locator("#prgp").click();
  await expect(page.locator("#prgo")).toBeVisible({ timeout: 15_000 });
  await expect(page.locator("#pr1")).toBeHidden();
  await expect(page.locator("#prgo")).toBeFocused();
  await page.locator("#prgo").click();
  expect(await page.evaluate(() => window.__printed)).toBe(2);
  await page.waitForTimeout(1300);
  await expect(page.locator("#prm")).toBeHidden();
  expect(await page.evaluate(() => document.documentElement.getAttribute("data-print"))).toBe("one");
  // the next Print shows the layout choices again
  await page.evaluate(() => dispatchEvent(new Event("afterprint")));
  await page.locator("#prb").click();
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
  await page.locator("#prb").click();
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
  await page.locator("#prb").click();
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
  await page.locator("#prb").click();
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
  await page.locator("#prb").click();
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
  await openSite(page, SETUPS.english);
  await page.waitForTimeout(9000);
  await page.locator("#prb").click();
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
  await page.locator("#prb").click();
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
    await page.locator("#prb").click();
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
    await page.locator("#prb").click();
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
    await page.locator("#prb").click();
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
    await page.locator("#prb").click();
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
  await page.locator("#prb").click();
  await expect(page.locator("#pr2")).toHaveAttribute("aria-pressed", "true");
});

// A card taller than the screen (a phone on its side, in the iPhone's Open in Safari state) starts at the top and
// the pop-up scrolls to Cancel, rather than running off both edges
test("print pop-up scrolls when taller than the screen @chromium-only", async ({ page }) => {
  await page.setViewportSize({ width: 844, height: 390 });
  await stubPrint(page);
  await openSite(page, SETUPS.marathi);
  await page.locator("#prb").click();
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
  await page.locator("#prb").click();
  await expect(page.locator("#prdg [aria-pressed=true]")).toHaveText("Once", { useInnerText: true });
  await expect(page.locator("#prfs")).toHaveCSS("text-align", "center");
  await expect(page.locator("#prfn [aria-pressed=true]")).toHaveText("Classic", { useInnerText: true });
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
