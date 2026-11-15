// Wikipedia links in every language (js/core/wiki.js; Satish, 2026-11-15): a credit's name opens the person's page on
// the reader's Wikipedia (its script's, once Kannada, Telugu or Gujarati letters are chosen, and back again), else the
// nearest there is, and a screen reader hears which; a festival's name opens its page in the menu language's Wikipedia.
import { test, expect } from "@playwright/test";
import { openSite, readText, SETUPS } from "./helpers.mjs";

const link = (page, sec) => page.locator(`#${sec} .cr .mr a[data-wiki]`).first();
const page_ = (url) => decodeURIComponent(url);

test("a credit opens the person's page in the reader's Wikipedia: Marathi, then in Kannada, Telugu and Gujarati letters @mobile", async ({ page }) => {
  await openSite(page, SETUPS.marathi);
  await readText(page, "a1");
  const a = link(page, "a1");
  await expect(a).toHaveAttribute("hreflang", "mr");
  expect(page_(await a.getAttribute("href"))).toBe("https://mr.wikipedia.org/wiki/समर्थ_रामदास_स्वामी");
  await expect(a).toHaveAttribute("target", "_blank");
  await expect(a).toHaveAccessibleName("समर्थ रामदास — विकिपीडिया (नवीन टॅबमध्ये उघडेल)");
  // the English line: English Wikipedia
  await expect(page.locator("#a1 .cr .en a[data-wiki]").first()).toHaveAttribute("href", "https://en.wikipedia.org/wiki/Samarth_Ramdas");
});

for (const [setup, lang, word, want] of [
  ["kannada", "kn", "ವಿಕಿಪೀಡಿಯ (ಹೊಸ ಟ್ಯಾಬ್‌ನಲ್ಲಿ ತೆರೆಯುತ್ತದೆ)", "https://kn.wikipedia.org/wiki/ಸಮರ್ಥ_ರಾಮದಾಸರು"],
  ["telugu", "te", "వికీపీడియా (కొత్త ట్యాబ్‌లో తెరుచుకుంటుంది)", "https://te.wikipedia.org/wiki/సమర్థ_రామదాసు"],
]) {
  test(`in ${setup[0].toUpperCase() + setup.slice(1)} letters, the credit opens that Wikipedia's page @mobile`, async ({ page }) => {
    await openSite(page, SETUPS[setup]);
    await readText(page, "a1");
    const a = link(page, "a1");
    await expect(a).toHaveAttribute("hreflang", lang);
    expect(page_(await a.getAttribute("href"))).toBe(want);
    expect(await a.getAttribute("aria-label")).toMatch(new RegExp(" — " + word.replace(/[()]/g, "\\$&") + "$"));
  });
}

test("Gujarati letters: Vasudevanand Saraswati's Gujarati page; Samarth Ramdas has none, so English, and it says so @mobile", async ({ page }) => {
  await openSite(page, SETUPS.gujarati);
  await readText(page, "stotra-shant-ho-shriguru");
  const v = link(page, "stotra-shant-ho-shriguru");
  await expect(v).toHaveAttribute("hreflang", "gu");
  expect(page_(await v.getAttribute("href"))).toBe("https://gu.wikipedia.org/wiki/વાસુદેવાનંદ_સરસ્વતી");
  await readText(page, "a1");
  const s = link(page, "a1");
  await expect(s).toHaveAttribute("hreflang", "en");
  expect(await s.getAttribute("aria-label")).toMatch(/ — અંગ્રેજી વિકિપીડિયા \(નવા ટૅબમાં ખૂલશે\)$/);
});

test("a festival opens its page in the menu language's Wikipedia: Kannada menus, Dasara's Kannada page @mobile", async ({ page }) => {
  await openSite(page, SETUPS["kannada-menus"], { now: new Date("2026-10-20T09:00:00-04:00") });
  await page.locator("#panb").click({ position: { x: 4, y: 4 } });
  await expect(page.locator("#cal")).toBeVisible();
  const a = page.locator("#cald a[hreflang]").first();
  await expect(a).toHaveAttribute("hreflang", "kn");
  expect(page_(await a.getAttribute("href"))).toBe("https://kn.wikipedia.org/wiki/ದಸರ");
  expect(await a.getAttribute("aria-label")).toMatch(/ — ವಿಕಿಪೀಡಿಯ \(ಹೊಸ ಟ್ಯಾಬ್‌ನಲ್ಲಿ ತೆರೆಯುತ್ತದೆ\)$/);
});
