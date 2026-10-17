// Print / PDF helpers.
//
// How a print test works:
//  1. window.print is replaced with a stub, so the site's own Print button runs exactly as for a
//     reader (build the print view #pv, work out the contents page numbers, then call print()).
//  2. When print() is called, invisible markers are added at the start and end of every unbroken
//     block (.pvk) of every piece. They are absolutely positioned, so they take no space and the
//     page breaks are the ones a reader gets.
//  3. Chromium prints the page to PDF at the reader's paper size (Letter for US/Canada, A4 elsewhere)
//     and pdf.js reads the text of every page back, so the test can check where each piece and each
//     block actually landed.
import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { test, expect } from "@playwright/test";
import { openSite } from "./helpers.mjs";
import { addLineMarkers } from "./print-audit-helpers.mjs";

const DIGITS = { "०": 0, "१": 1, "२": 2, "३": 3, "४": 4, "५": 5, "६": 6, "७": 7, "८": 8, "९": 9,
  "೦": 0, "೧": 1, "೨": 2, "೩": 3, "೪": 4, "೫": 5, "೬": 6, "೭": 7, "೮": 8, "೯": 9 };
/** "१२" or "೧೨" or "12" → 12 */
export const toInt = (s) => Number(String(s).replace(/./g, (c) => (c in DIGITS ? DIGITS[c] : c)));

/**
 * Stub window.print before the site loads; calls are counted in window.__printed. Like a real print,
 * it fires beforeprint (the dialog opened), so the site knows the print was not ignored.
 */
export async function stubPrint(page) {
  await page.addInitScript(() => {
    window.__printed = 0;
    window.print = () => {
      window.__printed++;
      dispatchEvent(new Event("beforeprint"));
    };
  });
}

/** Press Print on the home page, then the given choice ("pr1" = first button, "pr2" = second). */
export async function printFromButton(page, choice) {
  await page.evaluate(() => scrollTo(0, 0));
  // a folded home card hides its buttons: open it first, as a reader would (tap the slim line)
  if (!(await page.locator("#prb").isVisible())) await page.locator("#slim").click();
  await page.locator("#prb").click();
  await page.locator("#prm").waitFor({ state: "visible" });
  await page.locator("#" + choice).click();
  // Safari (class "wk"): when laying out took longer than a tap counts for, the pop-up asks for one more
  // tap (Print now), as an iPhone reader sees it
  await page.waitForFunction(() => window.__printed > 0 || !document.getElementById("prgo").hidden, null, { timeout: 15_000 });
  if (await page.locator("#prgo").isVisible()) await page.locator("#prgo").click();
  await page.waitForFunction(() => window.__printed > 0, null, { timeout: 15_000 });
  // From here on the page is styled as the printer sees it, so "shown" means shown on paper
  await page.emulateMedia({ media: "print" });
}

/** What the site built: contents numbers, the text of each piece in the print view, block count. */
export async function readPrintView(page) {
  return page.evaluate(() => {
    const pv = document.getElementById("pv");
    return {
      mode: document.documentElement.getAttribute("data-print"),
      toc: [...pv.querySelectorAll(".pvtoc li[data-sid]")].map((li) => ({
        id: li.dataset.sid,
        page: (li.querySelector(".pgn") || {}).textContent || "",
      })),
      pieces: [...pv.querySelectorAll(".pvs")].map((s) => s.dataset.sid),
      blocks: pv.querySelectorAll(".pvk").length,
      // blocks taller than a page, which may break between their lines ("p1:11", as the markers name them)
      tall: [...pv.querySelectorAll(".pvs")].flatMap((s) => [...s.querySelectorAll(".pvk")].map((k, j) => (k.classList.contains("pvtall") ? s.dataset.sid + ":" + j : "")).filter(Boolean)),
      // the English lines that are actually shown in the print view (for the text check)
      english: [...pv.querySelectorAll(".en p, td.pve")]
        // shown unless the line or a parent inside the print view is display:none (the print view
        // itself is hidden on screen until printing, so it is not counted)
        .filter((e) => {
          for (let x = e; x && x !== pv; x = x.parentElement) if (getComputedStyle(x).display === "none") return false;
          return true;
        })
        .map((e) => e.textContent.trim())
        .filter(Boolean),
    };
  });
}

/**
 * Add the start/end markers described above to every block of every piece.
 * when = "now" (after the Print button has built the print view), or "beforeprint" to add them
 * each time the browser is about to print, just after the site's own beforeprint handler has built
 * the view (for printing from the browser menu, which rebuilds it).
 */
export async function addMarkers(page, when = "now") {
  await page.evaluate((when) => {
    const run = () => {
    const mk = (t) => {
      const s = document.createElement("span");
      s.className = "__pm";
      s.textContent = " [[" + t + "]] ";
      // white 1px text: printed (so pdf.js can read it) but invisible and taking no space
      // !important: the site's own !important font rules (Kannada letters set every .mr element's font) must not
      // reach the marker, or it is drawn in whatever font the machine falls back to and may not read back
      s.style.cssText = ["position:absolute", "font:1px/1 monospace", "letter-spacing:0", "word-spacing:0", "text-transform:none", "color:#fff", "white-space:nowrap"].map((d) => d + " !important").join(";");
      return s;
    };
    const shown = (n) => {
      for (let e = n.parentElement; e && e.id !== "pv"; e = e.parentElement)
        if (getComputedStyle(e).display === "none") return false;
      return true;
    };
    document.querySelectorAll("#pv .pvs").forEach((sec) => {
      sec.querySelectorAll(".pvk").forEach((k, j) => {
        const w = document.createTreeWalker(k, NodeFilter.SHOW_TEXT, {
          acceptNode: (n) => (n.data.trim() && shown(n) ? 1 : 3),
        });
        const first = w.nextNode();
        if (!first) return;
        let last = first, n;
        while ((n = w.nextNode())) last = n;
        first.parentNode.insertBefore(mk(sec.dataset.sid + ":" + j + ":s"), first);
        last.parentNode.insertBefore(mk(sec.dataset.sid + ":" + j + ":e"), last.nextSibling);
      });
    });
    };
    if (when === "now") run();
    else addEventListener("beforeprint", run);
  }, when);
}

// SAVE_PDFS=1 keeps every PDF in tests/pdfs/, named after its test, to look at by eye
const PDF_DIR = new URL("./pdfs/", import.meta.url);

/**
 * Print to PDF and return the text of every page (and the PDF itself, for the print audit).
 * save: a path under tests/pdfs/ to keep the PDF at; by default it is kept only with SAVE_PDFS=1,
 * named after the test.
 */
export async function pdfPages(page, paper, save) {
  const buf = await page.pdf({ format: paper, preferCSSPageSize: true, printBackground: true });
  if (!save && process.env.SAVE_PDFS) save = test.info().title.replace(/ @[\w-]+/g, "").replace(/[^\w.-]+/g, "-").replace(/^-|-$/g, "") + ".pdf";
  if (save) {
    const f = fileURLToPath(new URL(save, PDF_DIR));
    mkdirSync(dirname(f), { recursive: true });
    writeFileSync(f, buf);
  }
  const doc = await pdfjs.getDocument({ data: new Uint8Array(buf), useSystemFonts: false, verbosity: 0 }).promise;
  const out = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const tc = await (await doc.getPage(i)).getTextContent();
    out.push(tc.items.map((x) => x.str).join(""));
  }
  const v = (await doc.getPage(1)).view;
  return { pages: out, bytes: buf.length, buf, landscape: v[2] > v[3] };
}

const SCREEN_ONLY = ["Open all", "Fold all", "Check for updates", "Settings", "Add to Home Screen"];

/**
 * Open the site with the given settings, print from the Print button and read the PDF back.
 * lines: also mark every printed line for the print audit (see print-audit-helpers.mjs).
 */
export async function printOnce(browser, { prefs, choice, mode, paper, locale, save, lines = false }) {
  const context = await browser.newContext({ locale, viewport: { width: 1280, height: 900 }, serviceWorkers: "block" });
  const page = await context.newPage();
  const errors = [];
  await stubPrint(page);
  // upright pages unless the test says otherwise (por: "land" sideways, "" each layout on its best page)
  await openSite(page, { por: "up", ...prefs }, { errors });
  // What a reader sees on screen, for the completeness check (folded pieces opened for the count)
  const onScreen = await page.evaluate(() => [...document.querySelectorAll("section.ash")].map((s) => s.id));
  await printFromButton(page, choice);
  const pv = await readPrintView(page);
  await addMarkers(page);
  const marked = lines ? await addLineMarkers(page) : null;
  const pdf = await pdfPages(page, paper, save);
  await context.close();
  return { pv, pdf, errors, onScreen, mode, marked };
}

/**
 * The checks every printout must pass (see print.spec.mjs). Returns the page count and the contents numbers.
 */
export function checkPrintout(r, paper) {
  const { pv, pdf, errors, onScreen, mode } = r;
  const at = markerPages(pdf.pages);
  expect(errors, "no script errors").toEqual([]);
  expect(pv.mode, "print mode set on the page").toBe(mode);
  // every piece is in the print view, in reading order
  expect(pv.pieces).toEqual(onScreen);
  // contents numbers: one per piece, and each is the page the piece really starts on
  expect(pv.toc.map((t) => t.id)).toEqual(onScreen);
  for (const t of pv.toc) {
    expect(t.page, `contents has a page number for ${t.id}`).not.toBe("");
    expect(at[t.id + ":0:s"], `${t.id} starts on the page the contents says (${paper})`).toBe(toInt(t.page));
  }
  // no block is cut across a page break
  const cut = [];
  for (const key of Object.keys(at)) {
    if (!key.endsWith(":s") || pv.tall.includes(key.slice(0, -2))) continue;
    const end = key.replace(/:s$/, ":e");
    if (at[end] !== at[key]) cut.push(`${key.slice(0, -2)} (pages ${at[key]}–${at[end]})`);
  }
  expect(cut, "blocks split across pages").toEqual([]);
  // every block was found in the PDF (nothing lost off the page)
  expect(Object.keys(at).length, "every block start and end printed").toBe(pv.blocks * 2);
  // page footer "N / total" on every page
  const n = pdf.pages.length;
  pdf.pages.forEach((t, i) => expect(t.replace(/\s/g, ""), `footer on page ${i + 1}`).toContain(`${i + 1}/${n}`));
  // screen-only controls never print
  const all = pdf.pages.join("\n");
  for (const s of SCREEN_ONLY) expect(all, `"${s}" is screen-only`).not.toContain(s);
  // English text is all there (Devanagari and Kannada can't be read back reliably from a PDF; their
  // completeness is covered by the block markers above)
  if (pv.english.length) {
    const flat = squash(all.replace(/\[\[[^\]]+\]\]|\{\{[^}]+\}\}/g, ""));
    const missing = pv.english.filter((l) => !flat.includes(squash(l)));
    expect(missing, "English lines missing from the PDF").toEqual([]);
  }
  return { pages: n, contents: Object.fromEntries(pv.toc.map((t) => [t.id, toInt(t.page)])), ...(pv.tall.length ? { tall: pv.tall } : {}) };
}

/** Where each marker landed: { "a1:0:s": 5, … } (page numbers from 1). */
export function markerPages(pages) {
  const at = {};
  pages.forEach((t, i) => {
    for (const m of t.replace(/\s+/g, "").matchAll(/\[\[([^\]]+)\]\]/g)) if (!(m[1] in at)) at[m[1]] = i + 1;
  });
  return at;
}

/** Text compared without spaces, line breaks or Unicode composition differences. */
// Accent marks (Vedic svara marks, macrons below) are dropped before comparing: they come from whichever
// fallback font the machine has, and PDF text extraction places them differently from one machine to
// the next. The letters they sit on are still compared. Some fonts (macOS) draw an "i" carrying a mark
// above as a dotless "ı", and the PDF text then reads "ı", so it counts as "i".
export const squash = (s) => s.normalize("NFD").replace(/\p{M}/gu, "").replace(/ı/g, "i").replace(/[\s​­]+/g, "");
