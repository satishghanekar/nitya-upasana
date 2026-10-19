// Profiles and backup (docs/architecture.md slice 2): the profile chip and its sheet (switch, add, rename, colour,
// delete, never the last), each person's own text size, languages and ticks, the move of version 1.3's settings into
// the first person, Save a backup file and Restore from a file (download, or the share sheet on a phone), the
// warning when IndexedDB can't be opened, the backup reminder, and accessibility of the new dialogs.
import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { readFileSync } from "node:fs";
import { FIXED_NOW, openSite, PREFS_KEY, settle, SETUPS } from "./helpers.mjs";

const EVENING = new Date("2026-10-18T19:00:00-04:00"); // Sunday evening: the ten aartis
const TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"];
const fs = (page) => page.evaluate(() => parseFloat(document.documentElement.style.getPropertyValue("--fs")));
const textLang = (page) => page.locator(".wrap > .ash").first().getAttribute("data-lang");
const chipName = (page) => page.locator("#who");
const people = (page) => page.locator("#pfl .pfnm");
const rows = (page) => page.locator("#tsl li");

async function axe(page, sel) {
  const r = await new AxeBuilder({ page }).include(sel).withTags(TAGS).disableRules(["label-content-name-mismatch"]).analyze();
  return r.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).slice(0, 5).join(", ")}`);
}

async function addPerson(page, name, opt = {}) {
  if (await page.locator("#pfm").isHidden()) await page.locator("#who").click();
  await page.locator("#pfadd").click();
  await page.locator("#pfname").fill(name);
  if (opt.initials) await page.locator("#pfini").fill(opt.initials);
  if (opt.colour !== undefined) await page.locator("#pfcol input").nth(opt.colour).check();
  await page.locator("#pfsave").click();
  await expect(page.locator("#pfv1")).toBeVisible();
}

async function switchTo(page, name) {
  if (await page.locator("#pfm").isHidden()) await page.locator("#who").click();
  await page.locator("#pfl .pfp", { hasText: name }).click();
  await expect(page.locator("#pfm")).toBeHidden();
  await expect(chipName(page)).toHaveAccessibleName("Profile: " + name);
}

// What IndexedDB holds (database "nitya")
const idb = (page) =>
  page.evaluate(
    () =>
      new Promise((res, rej) => {
        const rq = indexedDB.open("nitya");
        rq.onerror = () => rej(rq.error);
        rq.onsuccess = () => {
          const db = rq.result,
            tx = db.transaction(["profiles", "meta"]),
            out = {};
          tx.objectStore("profiles").getAll().onsuccess = (e) => (out.profiles = e.target.result);
          tx.objectStore("meta").get("meta").onsuccess = (e) => (out.meta = e.target.result);
          tx.oncomplete = () => {
            db.close();
            res(out);
          };
        };
      }),
  );

test("first visit: version 1.3's settings become the first person, 'Me', shown on the chip @mobile", async ({ page }) => {
  await openSite(page, { ...SETUPS.both, fs: 30, fsu: 1, th: "sepia" });
  await expect(chipName(page)).toHaveAccessibleName("Profile: Me");
  await expect(page.locator("#who .pfa")).toHaveText("M");
  expect(await fs(page)).toBe(30);
  expect(await textLang(page)).toBe("both");
  await expect(page.locator("html")).toHaveAttribute("data-pref", "sepia");
  await expect.poll(async () => (await idb(page)).profiles?.length).toBe(1);
  const db = await idb(page);
  expect(db.profiles[0]).toMatchObject({ name: "Me", settings: { fs: 30, fsu: 1, th: "sepia", lang: "both" } });
  expect(db.meta.activeProfile).toBe(db.profiles[0].id);
  // the boot copy names the person, and still reads as version 1.3's settings
  const boot = await page.evaluate((k) => JSON.parse(localStorage.getItem(k)), PREFS_KEY);
  expect([boot.pid, boot.sv, boot.fs]).toEqual([db.profiles[0].id, 6, 30]);
});

test("first visit from an older version (settings version 4) and version 1.3's ticks", async ({ page }) => {
  await page.clock.setFixedTime(EVENING);
  await page.addInitScript(() => {
    if (sessionStorage.getItem("__seeded")) return;
    sessionStorage.setItem("__seeded", "1");
    localStorage.clear();
    localStorage.setItem("aarti2-prefs", JSON.stringify({ sv: 4, fs: 28, fsu: 1, lang: "en", ref: 0, wake: 0, ui: "en" }));
    localStorage.setItem("nitya-ticks", JSON.stringify({ v: 1, profiles: { family: { date: "2026-10-18", done: { evening: ["sukhkarta", "shendur-lal-chadhayo"] } } } }));
  });
  await page.goto("./");
  await settle(page);
  expect(await fs(page)).toBe(28);
  expect(await textLang(page)).toBe("en");
  await expect(page.locator("html")).toHaveAttribute("data-ref", "0");
  await expect(page.locator("#tsn")).toHaveText("2 of 10 done");
  const boot = await page.evaluate(() => JSON.parse(localStorage.getItem("aarti2-prefs")));
  expect([boot.sv, boot.l2]).toEqual([6, "en"]);
});

test("switching person changes the text size and language at once, and each keeps their own @mobile", async ({ page }) => {
  const errors = [];
  await openSite(page, { ...SETUPS.marathi, fs: 30, fsu: 1 }, { errors });
  await addPerson(page, "Baba");
  await expect(people(page)).toHaveText(["Me", "Baba"]);
  await page.locator("#pfx").click();
  await switchTo(page, "Baba");
  // Baba starts with the defaults; he picks English and a larger size
  expect(await textLang(page)).toBe("mr");
  await page.locator("#home-btn").evaluate((b) => b.click()); // Marathi → English (the button is in the top bar while reading)
  expect(await textLang(page)).toBe("en");
  await page.locator("#aa").click();
  for (let i = 0; i < 5; i++) await page.locator("#lg").click();
  await page.locator("#xc").click();
  const babaFs = await fs(page);
  expect(babaFs).not.toBe(30);
  // back to Me: Marathi, 30px
  await switchTo(page, "Me");
  expect(await textLang(page)).toBe("mr");
  expect(await fs(page)).toBe(30);
  // and Baba again, also after a reload
  await switchTo(page, "Baba");
  expect(await textLang(page)).toBe("en");
  expect(await fs(page)).toBe(babaFs);
  await page.reload();
  await settle(page);
  await expect(chipName(page)).toHaveAccessibleName("Profile: Baba");
  expect(await textLang(page)).toBe("en");
  expect(await fs(page)).toBe(babaFs);
  expect(errors).toEqual([]);
});

test("switching to a person who reads in Kannada letters with IAST rewrites the texts in place", async ({ page }) => {
  await openSite(page, SETUPS.both);
  await addPerson(page, "Aaji");
  await switchTo(page, "Aaji");
  await page.locator("#aa").click();
  await page.locator("#sl1s").selectOption("kn");
  await page.locator("#sl2s").selectOption("en:iast");
  await page.locator("#xc").click();
  await expect(page.locator("#a1 .verse .mr p").first()).toHaveText(/[ಀ-೿]/);
  await switchTo(page, "Me");
  await expect(page.locator("#a1 .verse .mr p").first()).toHaveText(/[ऀ-ॿ]/);
  await expect(page.locator("#a1 .verse .en p").first()).not.toHaveClass(/\bia\b/);
  await switchTo(page, "Aaji");
  await expect(page.locator("#a1 .verse .mr p").first()).toHaveText(/[ಀ-೿]/);
  await expect(page.locator("#a1 .verse .en p").first()).toHaveClass(/\bia\b/);
});

test("theme and high contrast are per person (Q4); keep the screen on stays with the device", async ({ page }) => {
  await openSite(page, { ...SETUPS.marathi, th: "dark", hc: 1, wake: 1 });
  await addPerson(page, "Baba");
  await switchTo(page, "Baba");
  await expect(page.locator("html")).not.toHaveAttribute("data-pref", "dark");
  await expect(page.locator("html")).toHaveAttribute("data-hc", "0");
  await page.locator("#aa").click();
  await expect(page.locator("#tw")).toHaveAttribute("aria-pressed", "true");
  await page.locator("#xc").click();
  await switchTo(page, "Me");
  await expect(page.locator("html")).toHaveAttribute("data-pref", "dark");
  await expect(page.locator("html")).toHaveAttribute("data-hc", "1");
});

test("add, rename, badge letters and colour; names must be filled in and different @mobile", async ({ page }) => {
  await openSite(page, SETUPS.marathi);
  await page.locator("#who").click();
  await page.locator("#pfadd").click();
  await page.locator("#pfsave").click();
  await expect(page.locator("#pferr")).toHaveText("Please type a name.");
  await expect(page.locator("#pfname")).toHaveAttribute("aria-invalid", "true");
  await expect(page.locator("#pfname")).toBeFocused();
  await page.locator("#pfname").fill("me");
  await page.locator("#pfsave").click();
  await expect(page.locator("#pferr")).toHaveText("Someone on this phone already has this name.");
  await page.locator("#pfname").fill("Aai");
  await page.locator("#pfini").fill("आई");
  await page.locator("#pfcol input").nth(3).check();
  await page.locator("#pfsave").click();
  await expect(people(page)).toHaveText(["Me", "Aai"]);
  const aai = page.locator("#pfl li").nth(1);
  await expect(aai.locator(".pfa")).toHaveText("आई");
  await expect(aai.locator(".pfa")).toHaveCSS("background-color", "rgb(47, 107, 58)");
  // rename Me
  await page.locator("#pfl .pfe").first().click();
  await expect(page.locator("#pfmt")).toHaveText("Edit: Me");
  await page.locator("#pfname").fill("Baba");
  await page.locator("#pfini").fill("");
  await page.locator("#pfsave").click();
  await expect(people(page)).toHaveText(["Baba", "Aai"]);
  await page.locator("#pfx").click();
  await expect(chipName(page)).toHaveAccessibleName("Profile: Baba");
  await expect(page.locator("#who .pfa")).toHaveText("B");
  // kept after a reload, in order
  await page.reload();
  await settle(page);
  await page.locator("#who").click();
  await expect(people(page)).toHaveText(["Baba", "Aai"]);
});

test("delete asks first, never removes the last person, and moves to another person when the reader is deleted @mobile", async ({ page }) => {
  await openSite(page, { ...SETUPS.marathi, fs: 30, fsu: 1 });
  await page.locator("#who").click();
  await page.locator("#pfl .pfe").first().click();
  await expect(page.locator("#pfdel")).toBeHidden(); // the only person
  await page.locator("#pfcan").click();
  await addPerson(page, "Baba");
  await page.locator("#pfx").click();
  await switchTo(page, "Baba");
  await page.locator("#who").click();
  await page.locator("#pfl .pfe").nth(1).click();
  await page.locator("#pfdel").click();
  await expect(page.locator("#pfdq")).toContainText("Delete Baba?");
  await expect(page.locator("#pfdn")).toBeFocused();
  // Cancel keeps him
  await page.locator("#pfdn").click();
  await expect(page.locator("#pfv2")).toBeVisible();
  await page.locator("#pfdel").click();
  await page.locator("#pfdy").click();
  await expect(people(page)).toHaveText(["Me"]);
  await expect(chipName(page)).toHaveAccessibleName("Profile: Me");
  expect(await fs(page)).toBe(30);
  await page.reload();
  await settle(page);
  await page.locator("#who").click();
  await expect(people(page)).toHaveText(["Me"]);
});

test("ticks are per person, and kept after a reload @mobile", async ({ page }) => {
  await openSite(page, SETUPS.marathi, { now: EVENING });
  await rows(page).nth(0).locator("input").check();
  await expect(page.locator("#tsn")).toHaveText("1 of 10 done");
  await addPerson(page, "Baba");
  await page.locator("#pfx").click();
  await switchTo(page, "Baba");
  await expect(page.locator("#tsn")).toHaveText("0 of 10 done");
  await rows(page).nth(1).locator("input").check();
  await rows(page).nth(2).locator("input").check();
  await switchTo(page, "Me");
  await expect(page.locator("#tsn")).toHaveText("1 of 10 done");
  await expect(rows(page).nth(0).locator("input")).toBeChecked();
  await page.reload();
  await settle(page);
  await expect(page.locator("#tsn")).toHaveText("1 of 10 done");
  await switchTo(page, "Baba");
  await expect(page.locator("#tsn")).toHaveText("2 of 10 done");
});

test("Save a backup file → Restore from it: every person, setting and tick comes back", async ({ page }, info) => {
  await openSite(page, { ...SETUPS.marathi, fs: 30, fsu: 1 }, { now: EVENING });
  await rows(page).nth(0).locator("input").check();
  await addPerson(page, "Aai", { initials: "आई", colour: 2 });
  await page.locator("#pfx").click();
  await switchTo(page, "Aai");
  await page.locator("#home-btn").evaluate((b) => b.click()); // English (the button is in the top bar while reading)
  await rows(page).nth(4).locator("input").check();
  await page.locator("#aa").click();
  await expect(page.locator("#bksv")).toHaveText("Not saved yet");
  const [dl] = await Promise.all([page.waitForEvent("download"), page.locator("#bks").click()]);
  expect(dl.suggestedFilename()).toBe("nitya-upasana-2026-10-18.nitya");
  const file = info.outputPath("backup.nitya");
  await dl.saveAs(file);
  const json = JSON.parse(readFileSync(file, "utf8"));
  expect([json.format, json.kind, json.app]).toEqual(["nitya", "backup", "aarti-v1.5"]);
  expect(json.payload.profiles.map((p) => p.name)).toEqual(["Me", "Aai"]);
  await expect(page.locator("#bksv")).toHaveText("Last saved 18 October 2026");
  await page.locator("#xc").click();

  // things change after the backup: Aai is deleted, someone else is added, Me's ticks change
  await switchTo(page, "Me");
  await rows(page).nth(0).locator("input").uncheck();
  await page.locator("#who").click();
  await page.locator("#pfl .pfe").nth(1).click();
  await page.locator("#pfdel").click();
  await page.locator("#pfdy").click();
  await addPerson(page, "Ajoba");
  await page.locator("#pfx").click();

  // restore
  await page.locator("#aa").click();
  await page.locator("#bkf").setInputFiles(file);
  await expect(page.locator("#bkm")).toBeVisible();
  await expect(page.locator("#bkmt")).toHaveText("Restore from this file?");
  await expect(page.locator("#bkmd")).toContainText("People in the file: Me, Aai");
  await expect(page.locator("#bkmd")).toContainText("New on this phone: Aai");
  await expect(page.locator("#bkmd")).toContainText("Removed from this phone: Ajoba");
  await expect(page.locator("#bkmd")).toContainText("Reading next: Aai.");
  await expect(page.locator("#bkno")).toBeFocused();
  await page.locator("#bkok").click();
  await expect(page.locator("#bkm")).toBeHidden();
  await expect(chipName(page)).toHaveAccessibleName("Profile: Aai");
  expect(await textLang(page)).toBe("en");
  await expect(page.locator("#tsn")).toHaveText("1 of 10 done");
  await expect(rows(page).nth(4).locator("input")).toBeChecked();
  await switchTo(page, "Me");
  expect(await textLang(page)).toBe("mr");
  expect(await fs(page)).toBe(30);
  await expect(rows(page).nth(0).locator("input")).toBeChecked();
  await page.locator("#who").click();
  await expect(people(page)).toHaveText(["Me", "Aai"]);
  // and after a reload
  await page.reload();
  await settle(page);
  await page.locator("#who").click();
  await expect(people(page)).toHaveText(["Me", "Aai"]);
});

test("Cancel leaves everything as it was; a changed file is refused with a plain message", async ({ page }, info) => {
  await openSite(page, SETUPS.marathi);
  await page.locator("#aa").click();
  const [dl] = await Promise.all([page.waitForEvent("download"), page.locator("#bks").click()]);
  const file = info.outputPath("b.nitya");
  await dl.saveAs(file);
  await page.locator("#bkf").setInputFiles(file);
  await page.locator("#bkno").click();
  await expect(page.locator("#bkm")).toBeHidden();
  // damaged: one value changed by hand
  const j = JSON.parse(readFileSync(file, "utf8"));
  j.payload.profiles[0].settings.fs = 50;
  await page.locator("#bkf").setInputFiles({ name: "b.nitya", mimeType: "application/json", buffer: Buffer.from(JSON.stringify(j)) });
  await expect(page.locator("#bkmt")).toHaveText("This file can't be restored");
  await expect(page.locator("#bkmd")).toContainText("checksum does not match");
  await expect(page.locator("#bkok")).toBeHidden();
  await page.locator("#bkno").click();
  // not a backup at all
  await page.locator("#bkf").setInputFiles({ name: "x.txt", mimeType: "text/plain", buffer: Buffer.from("hello") });
  await expect(page.locator("#bkmd")).toContainText("not a Nitya Upasana backup file");
  await page.keyboard.press("Escape");
  await expect(page.locator("#bkm")).toBeHidden();
});

test("on a phone the backup goes to the share sheet (Save to Files, AirDrop…) @mobile", async ({ browser }) => {
  const context = await browser.newContext({ hasTouch: true, isMobile: true, viewport: { width: 390, height: 844 }, serviceWorkers: "block" });
  const page = await context.newPage();
  await page.addInitScript(() => {
    window.__shared = [];
    navigator.canShare = (d) => !!(d && d.files && d.files.length);
    navigator.share = async (d) => {
      window.__shared.push({ name: d.files[0].name, type: d.files[0].type, text: await d.files[0].text() });
    };
  });
  await openSite(page, SETUPS.marathi);
  let downloaded = false;
  page.on("download", () => (downloaded = true));
  await page.locator("#aa").click();
  await page.locator("#bks").click();
  await expect.poll(() => page.evaluate(() => window.__shared.length)).toBe(1);
  const s = await page.evaluate(() => window.__shared[0]);
  expect(s.name).toBe("nitya-upasana-2026-10-15.nitya");
  expect(JSON.parse(s.text).payload.profiles[0].name).toBe("Me");
  await expect(page.locator("#bksv")).toHaveText("Last saved 15 October 2026");
  expect(downloaded).toBe(false);
  await context.close();
});

test("closing the share sheet without choosing saves nothing and doesn't count as a backup", async ({ browser }) => {
  const context = await browser.newContext({ hasTouch: true, isMobile: true, viewport: { width: 390, height: 844 }, serviceWorkers: "block" });
  const page = await context.newPage();
  await page.addInitScript(() => {
    navigator.canShare = () => true;
    navigator.share = () => Promise.reject(new DOMException("cancelled", "AbortError"));
  });
  await openSite(page, SETUPS.marathi);
  await page.locator("#aa").click();
  await page.locator("#bks").click();
  await page.waitForTimeout(300);
  await expect(page.locator("#bksv")).toHaveText("Not saved yet");
  await context.close();
});

test("when IndexedDB can't be opened (Safari's first-open hang), the site works and says so @mobile", async ({ page }) => {
  await page.addInitScript(() => {
    // every open request hangs, as on early iOS 15
    Object.defineProperty(window, "indexedDB", { value: { open: () => ({}) }, configurable: true });
  });
  const errors = [];
  await openSite(page, { ...SETUPS.marathi, fs: 30, fsu: 1 }, { errors });
  await expect(page.locator("#stw")).toBeVisible();
  await expect(page.locator("#stw")).toContainText("This browser can't save here. Use Save a backup file before closing.");
  expect(await fs(page)).toBe(30);
  await addPerson(page, "Baba");
  await page.locator("#pfx").click();
  await switchTo(page, "Baba");
  await page.locator("#aa").click();
  await expect(page.locator("#stw2")).toBeVisible();
  // the warning's own button saves a backup
  await page.locator("#xc").click();
  const [dl] = await Promise.all([page.waitForEvent("download"), page.locator("#stws").click()]);
  expect(dl.suggestedFilename()).toMatch(/\.nitya$/);
  expect(errors).toEqual([]);
});

test("the backup reminder: 14 days after the first visit, Not now puts it off, a backup clears it @mobile", async ({ page }) => {
  await openSite(page, SETUPS.marathi);
  await expect(page.locator("#bkn")).toBeHidden();
  await expect(page.locator("#pfnt")).toBeHidden();
  await page.clock.setFixedTime(new Date(FIXED_NOW.getTime() + 15 * 86400000));
  await page.reload();
  await settle(page);
  await expect(page.locator("#bkn")).toBeVisible();
  await expect(page.locator("#bknt")).toContainText("kept only on this phone");
  await page.locator("#bknx").click();
  await expect(page.locator("#bkn")).toBeHidden();
  await page.clock.setFixedTime(new Date(FIXED_NOW.getTime() + 30 * 86400000));
  await page.reload();
  await settle(page);
  await expect(page.locator("#bkn")).toBeVisible();
  await Promise.all([page.waitForEvent("download"), page.locator("#bkns").click()]);
  await expect(page.locator("#bkn")).toBeHidden();
});

test("keyboard: the sheet takes focus, Tab stays inside, Escape steps back and returns focus to the chip", async ({ page, browserName }) => {
  test.skip(browserName === "webkit", "Safari's default Tab skips buttons");
  await openSite(page, SETUPS.marathi);
  await page.locator("#who").focus();
  await page.keyboard.press("Enter");
  await expect(page.locator("#pfm")).toBeVisible();
  await expect(page.locator("#who")).toHaveAttribute("aria-expanded", "true");
  await expect(page.locator('#pfl .pfp[aria-current="true"]')).toBeFocused();
  for (let i = 0; i < 6; i++) {
    await page.keyboard.press("Tab");
    expect(await page.evaluate(() => !!document.activeElement.closest("#pfm"))).toBe(true);
  }
  await page.locator("#pfadd").focus();
  await page.keyboard.press("Enter");
  await expect(page.locator("#pfname")).toBeFocused();
  for (let i = 0; i < 14; i++) {
    await page.keyboard.press("Tab");
    expect(await page.evaluate(() => !!document.activeElement.closest("#pfm"))).toBe(true);
  }
  await page.keyboard.press("Escape"); // back to the list
  await expect(page.locator("#pfv1")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.locator("#pfm")).toBeHidden();
  await expect(page.locator("#who")).toBeFocused();
  await expect(page.locator("#who")).toHaveAttribute("aria-expanded", "false");
});

test("the phone's Back closes the sheet and returns focus to the chip @chromium-only", async ({ page }) => {
  await openSite(page, SETUPS.marathi);
  await page.locator("#who").focus();
  await page.keyboard.press("Enter");
  await expect(page.locator("#pfm")).toBeVisible();
  await page.goBack();
  await expect(page.locator("#pfm")).toBeHidden();
  await expect(page.locator("#who")).toBeFocused();
  expect(await page.evaluate(() => document.documentElement.style.overflow)).toBe("");
});

test("Settings → Who is reading opens the same sheet; the Settings rows show the person and the last backup", async ({ page }) => {
  await openSite(page, SETUPS["marathi-menus"]);
  await page.locator("#aa").click();
  await expect(page.locator("#spfv")).toHaveText("Me");
  await expect(page.locator("#bksv")).toHaveText("अजून जतन केलेली नाही");
  await page.locator("#spf").click();
  await expect(page.locator("#pfm")).toBeVisible();
  await expect(page.locator("#panel")).toBeHidden();
  await expect(page.locator("#pfmt")).toHaveText("कोण वाचत आहे?");
  await page.locator("#pfx").click();
  await expect(page.locator("#aa")).toBeFocused();
});

test("44px targets in the sheet and on the chip @mobile", async ({ page }) => {
  await openSite(page, SETUPS.marathi);
  await page.locator("#who").click();
  await addPerson(page, "Baba");
  await page.locator("#pfl .pfe").nth(1).click();
  const small = await page.evaluate(() =>
    [...document.querySelectorAll("#who, #pfm button:not([hidden]), #pfm input[type=text], .pfsw")]
      .filter((b) => b.getClientRects().length)
      .map((b) => ({ c: b.id || b.className, ...b.getBoundingClientRect().toJSON() }))
      .filter((r) => r.width < 40 || r.height < 44)
      .map((r) => `${r.c} ${Math.round(r.width)}×${Math.round(r.height)}`),
  );
  expect(small).toEqual([]);
});

for (const [name, prefs] of [
  ["light", SETUPS.marathi],
  ["dark", { ...SETUPS.marathi, th: "dark" }],
  ["sepia", { ...SETUPS.marathi, th: "sepia" }],
  ["high contrast", { ...SETUPS.marathi, hc: 1 }],
  ["Marathi menus", SETUPS["marathi-menus"]],
]) {
  test(`axe: the profile sheet, its edit view and the Restore dialog, ${name} @mobile`, async ({ page }, info) => {
    await openSite(page, prefs);
    await page.locator("#who").click();
    await addPerson(page, "Baba");
    expect(await axe(page, "#pfm")).toEqual([]);
    await page.locator("#pfl .pfe").nth(1).click();
    expect(await axe(page, "#pfm")).toEqual([]);
    await page.locator("#pfdel").click();
    expect(await axe(page, "#pfm")).toEqual([]);
    await page.keyboard.press("Escape");
    await page.keyboard.press("Escape");
    expect(await axe(page, ".bar")).toEqual([]);
    await page.locator("#aa").click();
    const [dl] = await Promise.all([page.waitForEvent("download"), page.locator("#bks").click()]);
    const file = info.outputPath("a.nitya");
    await dl.saveAs(file);
    await page.locator("#bkf").setInputFiles(file);
    await expect(page.locator("#bkm")).toBeVisible();
    expect(await axe(page, "#bkm")).toEqual([]);
  });
}

test("axe: the home page notes (can't save here, the reminder) @mobile", async ({ page }) => {
  await page.addInitScript(() => Object.defineProperty(window, "indexedDB", { value: undefined, configurable: true }));
  await openSite(page, SETUPS.marathi);
  await expect(page.locator("#stw")).toBeVisible();
  expect(await axe(page, "#home")).toEqual([]);
});
