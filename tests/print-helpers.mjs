// Print / PDF helpers.
//
// How a print test works:
//  1. window.print is replaced with a stub, so the site's own Print button runs exactly as for a
//     reader (build the print view #pv, then call print()).
//  2. When print() is called, invisible markers are added at the start and end of every unbroken
//     block (.pvk) of every piece. Each is a box of no width (its text runs over the block), so they take no space and the
//     page breaks are the ones a reader gets.
//  3. Chromium prints the page to PDF at the reader's paper size (Letter for US/Canada, A4 elsewhere)
//     and pdf.js reads the text of every page back, so the test can check where each piece and each
//     block actually landed.
import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { test, expect } from "@playwright/test";
import { openSite, openPrintBuilder } from "./helpers.mjs";

const DIGITS = {
  "०": 0,
  "१": 1,
  "२": 2,
  "३": 3,
  "४": 4,
  "५": 5,
  "६": 6,
  "७": 7,
  "८": 8,
  "९": 9,
  "೦": 0,
  "೧": 1,
  "೨": 2,
  "೩": 3,
  "೪": 4,
  "೫": 5,
  "೬": 6,
  "೭": 7,
  "೮": 8,
  "೯": 9,
};
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

/** The print builder on a phone shows What first: Next goes on to How (from 760px wide both are on screen) */
export async function howStep(page) {
  if (await page.locator("#prnx").isVisible()) await page.locator("#prnx").click();
  await page.locator("#prgp").waitFor({ state: "visible" });
}

/** Press Print on the home page, then the given choice ("pr1" = first button, "pr2" = second). */
export async function printFromButton(page, choice) {
  await page.evaluate(() => scrollTo(0, 0));
  // (the builder is opened as js/features/print.js lets another part open it, at What with everything ticked as last
  // left; the reader's way in is Print in the top bar)
  await openPrintBuilder(page);
  await howStep(page);
  // the page (Portrait pr1 or Landscape pr2; both languages have only Landscape, so no choice shows), then Print
  if (await page.locator("#" + choice).isVisible()) await page.locator("#" + choice).click();
  await page.locator("#prgp").click();
  // (should the browser ignore the print, the pop-up asks for one more tap: Print now)
  await page.waitForFunction(() => window.__printed > 0 || !document.getElementById("prgo").hidden, null, { timeout: 15_000 });
  if (await page.locator("#prgo").isVisible()) await page.locator("#prgo").click();
  await page.waitForFunction(() => window.__printed > 0, null, { timeout: 15_000 });
  // From here on the page is styled as the printer sees it, so "shown" means shown on paper
  await page.emulateMedia({ media: "print" });
}

/** What the site built: the contents, the pieces, the blocks, the English lines shown. */
export async function readPrintView(page) {
  return page.evaluate(() => {
    const pv = document.getElementById("pv");
    return {
      mode: document.documentElement.getAttribute("data-print"),
      toc: [...pv.querySelectorAll(".pvtoc li[data-sid]")].map((li) => ({ id: li.dataset.sid })),
      pieces: [...pv.querySelectorAll(".pvs")].map((s) => s.dataset.sid),
      blocks: pv.querySelectorAll(".pvs .pvk").length,
      // the blocks that may run on from one page to the next (a Vedic paragraph: "p1:11", as the markers name them)
      flow: [...pv.querySelectorAll(".pvs")].flatMap((s) =>
        [...s.querySelectorAll(".pvk")].map((k, j) => (k.classList.contains("pvflow") ? s.dataset.sid + ":" + j : "")).filter(Boolean),
      ),
      // the English lines that are shown in the print view (for the text check)
      // (a Vedic paragraph is one text: its lines are the paragraph's pvLines, js/features/print.js)
      english: [...pv.querySelectorAll(".pvl.pve, .pvpr.pve, td.pve")]
        .filter((e) => {
          for (let x = e; x && x !== pv; x = x.parentElement) if (getComputedStyle(x).display === "none") return false;
          return true;
        })
        .flatMap((e) => (e.pvLines ? e.pvLines : [e.textContent]))
        .map((t) => t.trim())
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
      const mk = (t, end) => {
        // A box of no width at the start or end of the block, its text (white, 1px) running out of it over the block's
        // own letters: to the right from the start, to the left from the end (the box is right-to-left, its text inside
        // still left-to-right). So it takes no space, moves nothing, and never reaches past the block into the page's
        // margin, where Chrome cuts what it prints. (Absolutely placed, a marker ran off a line at the page's edge.)
        // !important: the site's own !important font rules (Kannada letters set every .mr element's font) must not
        // reach the marker, or it is drawn in whatever font the machine falls back to and may not read back
        const s = document.createElement("span"),
          i = document.createElement("span");
        s.className = "__pm";
        s.style.cssText = [
          "display:inline-block",
          "width:0",
          "font:1px/1 monospace",
          "letter-spacing:0",
          "word-spacing:0",
          "text-transform:none",
          "text-indent:0",
          "color:#fff",
          "white-space:nowrap",
          "vertical-align:baseline",
          "direction:" + (end ? "rtl" : "ltr"),
        ]
          .map((d) => d + " !important")
          .join(";");
        i.style.cssText = "direction:ltr !important;unicode-bidi:isolate !important";
        i.textContent = " [[" + t + "]] ";
        s.appendChild(i);
        return s;
      };
      const shown = (n) => {
        for (let e = n.parentElement; e && e.id !== "pv"; e = e.parentElement) if (getComputedStyle(e).display === "none") return false;
        return true;
      };
      document.querySelectorAll("#pv .pvs").forEach((sec) => {
        sec.querySelectorAll(".pvk").forEach((k, j) => {
          const w = document.createTreeWalker(k, NodeFilter.SHOW_TEXT, {
            acceptNode: (n) => (n.data.trim() && shown(n) ? 1 : 3),
          });
          const first = w.nextNode();
          if (!first) return;
          let last = first,
            n;
          while ((n = w.nextNode())) last = n;
          first.parentNode.insertBefore(mk(sec.dataset.sid + ":" + j + ":s"), first);
          last.parentNode.insertBefore(mk(sec.dataset.sid + ":" + j + ":e", true), last.nextSibling);
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
  if (!save && process.env.SAVE_PDFS)
    save =
      test
        .info()
        .title.replace(/ @[\w-]+/g, "")
        .replace(/[^\w.-]+/g, "-")
        .replace(/^-|-$/g, "") + ".pdf";
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

const SCREEN_ONLY = ["Open all", "Fold all", "Check for updates", "Settings", "Add to Home Screen", "Choose File", "No file chosen"];

/**
 * Open the site with the given settings, print from the Print button and read the PDF back.
 */
export async function printOnce(browser, { prefs, choice, mode, paper, locale, save }) {
  const context = await browser.newContext({ locale, viewport: { width: 1280, height: 900 }, serviceWorkers: "block" });
  const page = await context.newPage();
  const errors = [];
  await stubPrint(page);
  // upright pages unless the test says otherwise (por: "land" sideways, "" each layout on its best page)
  await openSite(page, { por: "up", ...prefs }, { errors });
  // Every text in the Library, in reading order, for the completeness check (the page builds a text only when opened)
  const onScreen = await page.evaluate(() => window.CONTENT.categories.flatMap((c) => c.pieces.map((p) => p.id)));
  const source = await sourceLines(page);
  await printFromButton(page, choice);
  const pv = await readPrintView(page);
  await addMarkers(page);
  const pdf = await pdfPages(page, paper, save);
  await context.close();
  return { pv, pdf, errors, onScreen, mode, source, tr: !!prefs.tr };
}

/**
 * The checks every printout must pass (see print.spec.mjs): every piece printed, in reading order and listed in the
 * contents; each starting on a new page; then the checks of every page (checkPages). Returns the page count.
 */
export function checkPrintout(r) {
  const { pv, pdf, errors, onScreen, mode } = r;
  const at = markerPages(pdf.pages);
  expect(errors, "no script errors").toEqual([]);
  expect(pv.mode, "print mode set on the page").toBe(mode);
  // every piece is in the print view, in reading order, and the contents lists each one
  expect(pv.pieces).toEqual(onScreen);
  expect(pv.toc.map((t) => t.id)).toEqual(onScreen);
  // every piece starts on a page of its own: its first block below the last page of the one before
  const last = (id) =>
    Math.max(
      ...Object.entries(at)
        .filter(([k]) => k.startsWith(id + ":"))
        .map(([, p]) => p),
    );
  for (let i = 1; i < onScreen.length; i++) expect(at[onScreen[i] + ":0:s"], `${onScreen[i]} starts on a new page`).toBeGreaterThan(last(onScreen[i - 1]));
  checkPages(r);
  return { pages: pdf.pages.length };
}

/**
 * The checks every page of every printout must pass, whatever it holds: no block cut across a page break or lost, the
 * page footers, nothing screen-only printed, every English line there.
 */
export function checkPages(r) {
  const { pv, pdf, mode } = r;
  const at = markerPages(pdf.pages);
  // no block is cut across a page break
  const cut = [];
  for (const key of Object.keys(at)) {
    if (!key.endsWith(":s") || pv.flow.includes(key.slice(0, -2))) continue;
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
    // without the page footers, so a line of prose that runs on to the next page reads whole
    const flat = pdf.pages.map((t, i) => squash(t.replace(/\[\[[^\]]+\]\]|\{\{[^}]+\}\}/g, "")).replace(`${i + 1}/${n}`, "")).join("");
    // A Vedic paragraph side by side is read back row by row, with its original's words (and, at a page's end, the
    // next piece's heading) between the English ones: there, a line is all there when its words come in order with
    // only other scripts between them (Devanagari or Kannada, and the odd number or mark: never an English word)
    const other = "[^A-Za-z]{0,3000}?";
    const words = (l) =>
      new RegExp(
        l
          .split(/\s+/)
          .filter((w) => squash(w))
          .map((w) => squash(w).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
          .join(other),
      );
    const missing = pv.english.filter((l) => !flat.includes(squash(l)) && !(mode === "side" && words(l).test(flat)));
    expect(missing, "English lines missing from the PDF").toEqual([]);
    // (in English letters as the texts have them: not with IAST, which prints other letters)
    if (r.source && !r.tr) {
      const lost = pv.pieces.flatMap((id) => r.source[id] || []).filter((l) => !flat.includes(squash(l)) && !(mode === "side" && words(l).test(flat)));
      expect(lost, "lines of the texts missing from the PDF").toEqual([]);
    }
  }
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
// (also without zero-width joiners and with plain quotes: a PDF's text layer may drop the one and straighten the other, or read a closing quote as the letter ʼ)
export const squash = (s) =>
  s
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/ı/g, "i")
    .replace(/[‘’ʼ]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[\s​­‌‍]+/g, "");

/**
 * Every English line of every text, by piece id, from the texts themselves (window.CONTENT), not from the print view:
 * a fault in laying out the pages could lose lines from that. When English is printed each must be on paper.
 */
export function sourceLines(page) {
  return page.evaluate(() =>
    Object.fromEntries(
      window.CONTENT.categories.flatMap((c) =>
        c.pieces.map((p) => [
          p.id,
          // (a dhrupad line typed into a verse, rf, prints only with the dhrupad after every verse)
          [...(p.refrain ? p.refrain.lines : []), ...p.items.flatMap((i) => i.lines || []).filter((l) => !l.rf)]
            .flatMap((l) => String(l.en || "").split(/<br\s*\/?>/))
            .map((t) =>
              t
                .replace(/<[^>]+>/g, "")
                .replace(/\u200b/g, "")
                .trim(),
            )
            .filter(Boolean),
        ]),
      ),
    ),
  );
}
