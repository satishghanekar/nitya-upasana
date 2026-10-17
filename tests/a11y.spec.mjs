// Accessibility (WCAG 2.2 AA): axe-core on every screen state, plus the things axe can't see —
// keyboard-only use of every dialog, and accessible names that contain the visible label.
import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { openSite, SETUPS } from "./helpers.mjs";

const TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"];

async function axe(page) {
  const r = await new AxeBuilder({ page }).withTags(TAGS).analyze();
  return r.violations.map((v) => `${v.id} (${v.impact}): ${v.nodes.map((n) => n.target.join(" ")).slice(0, 5).join(", ")}`);
}

const STATES = [
  ["home", SETUPS.marathi],
  ["home dark", { ...SETUPS.marathi, th: "dark" }],
  ["home sepia", { ...SETUPS.marathi, th: "sepia" }],
  ["home high contrast", { ...SETUPS.marathi, hc: 1 }],
  ["home Marathi menus", SETUPS["marathi-menus"]],
  ["both languages", SETUPS.both],
  ["Kannada", SETUPS["kannada-both"]],
  ["English main", SETUPS["english-main-both"]],
  ["everything folded", { ...SETUPS.marathi, pf: 1, xf: 1, tf: 1, fold: 1 }],
  ["Settings open", SETUPS.marathi, (p) => p.locator("#aa").click()],
  ["Settings open, dark", { ...SETUPS.marathi, th: "dark" }, (p) => p.locator("#aa").click()],
  ["search open", SETUPS.marathi, async (p) => {
    await p.locator("#hm").click();
    await p.locator("#q").fill("deva");
  }],
  ["Help open", SETUPS.marathi, (p) => p.locator("#hlpb").click()],
  ["QR open", SETUPS.marathi, (p) => p.locator("#qrb").click()],
  ["Print open", SETUPS.marathi, (p) => p.locator("#prb").click()],
  ["picture open", SETUPS.marathi, (p) => p.locator("#iconb").click()],
];

for (const [name, prefs, prep] of STATES) {
  test(`axe: ${name} @mobile`, async ({ page }) => {
    await openSite(page, prefs);
    if (prep) {
      await prep(page);
      await page.waitForTimeout(300);
    }
    expect(await axe(page)).toEqual([]);
  });
}

// Every control in each dialog can be reached with Tab, and Tab stays inside the dialog.
const DIALOGS = [
  ["Settings", "#aa", "#panel"],
  ["Help", "#hlpb", "#help"],
  ["QR", "#qrb", "#qrm"],
  ["Print", "#prb", "#prm"],
];
for (const [name, opener, dialog] of DIALOGS) {
  test(`keyboard: every control in ${name} is reachable with Tab, and focus stays inside`, async ({ page, browserName }) => {
    // WebKit only tabs to links and form fields unless the "Press Tab to highlight each item" option is on
    test.skip(browserName === "webkit", "Safari's default Tab skips buttons");
    await openSite(page, SETUPS.marathi);
    await page.locator(opener).focus();
    await page.keyboard.press("Enter");
    await page.waitForTimeout(200);
    const expected = await page.locator(dialog).evaluate((d) =>
      [...d.querySelectorAll("button, a[href], input, select, textarea, [tabindex]:not([tabindex='-1'])")]
        .filter((x) => !x.disabled && x.getClientRects().length && getComputedStyle(x).visibility !== "hidden")
        .map((x) => x.id || x.textContent.trim().slice(0, 30)),
    );
    const seen = [];
    for (let i = 0; i < expected.length + 3; i++) {
      await page.keyboard.press("Tab");
      const r = await page.evaluate((sel) => {
        const a = document.activeElement;
        return { id: a.id || a.textContent.trim().slice(0, 30), inside: !!a.closest(sel) };
      }, dialog);
      expect(r.inside, `focus left the ${name} dialog`).toBe(true);
      seen.push(r.id);
    }
    const missed = expected.filter((x) => !seen.includes(x));
    expect(missed, `controls Tab never reaches in ${name}`).toEqual([]);
  });
}

test("keyboard: Escape closes Settings and returns focus to its button", async ({ page }) => {
  await openSite(page, SETUPS.marathi);
  await page.locator("#aa").focus();
  await page.keyboard.press("Enter");
  await expect(page.locator("#panel")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.locator("#panel")).toBeHidden();
  await expect(page.locator("#aa")).toBeFocused();
});

test("keyboard: the first Tab shows the skip link, which moves to the texts", async ({ page, browserName }) => {
  test.skip(browserName === "webkit", "Safari's default Tab skips links");
  await openSite(page, SETUPS.marathi);
  await page.keyboard.press("Tab");
  await expect(page.locator("#skip")).toBeFocused();
  await expect(page.locator("#skip")).toBeVisible();
});

// WCAG 2.5.3 Label in Name: a control's accessible name must contain the words shown on it, so
// voice control users can say what they see.
test("label in name: every labelled control's name contains its visible text", async ({ page }) => {
  await openSite(page, SETUPS.marathi);
  const bad = await page.evaluate(() =>
    [...document.querySelectorAll("button[aria-label], a[aria-label]")]
      .filter((b) => b.getClientRects().length)
      .map((b) => {
        // the visible words, from shown text nodes only (icons and hidden language spans excluded)
        const w = document.createTreeWalker(b, NodeFilter.SHOW_TEXT);
        let t = "", n;
        while ((n = w.nextNode())) if (n.parentElement.getClientRects().length && !n.parentElement.closest("svg")) t += n.data;
        t = t.replace(/\s+/g, " ").trim();
        const name = b.getAttribute("aria-label");
        return { id: b.id, t, name };
      })
      // compared as words only: case, spaces and arrows (‹ › ↗) don't count
      .filter((x) => {
        const w = (s) => s.toLowerCase().replace(/[\s‹›↗,.:;()—-]+/g, "");
        return w(x.t) && !w(x.name).includes(w(x.t));
      })
      .map((x) => `${x.id}: shows "${x.t}", named "${x.name}"`),
  );
  expect(bad).toEqual([]);
});

test("reduced motion: no transitions longer than 0.01s when the reader asks for less motion", async ({ browser }) => {
  const context = await browser.newContext({ reducedMotion: "reduce", serviceWorkers: "block" });
  const page = await context.newPage();
  await openSite(page, SETUPS.marathi);
  const long = await page.evaluate(() =>
    [...document.querySelectorAll("body *")]
      .filter((e) => e.getClientRects().length)
      .map((e) => getComputedStyle(e))
      .filter((s) => s.transitionDuration.split(",").some((d) => parseFloat(d) > 0.01) || (s.animationName !== "none" && parseFloat(s.animationDuration) > 0.01))
      .length,
  );
  expect(long).toBe(0);
  await context.close();
});

test("languages are marked for screen readers", async ({ page }) => {
  await openSite(page, SETUPS["kannada-both"]);
  const r = await page.evaluate(() => ({
    html: document.documentElement.lang,
    en: [...document.querySelectorAll("#a1 .verse .en")].every((e) => e.closest("[lang]").lang === "en"),
  }));
  expect(r.html).toBe("kn");
  expect(r.en).toBe(true);
});
