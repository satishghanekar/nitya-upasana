// The routine builder (design A, "List per day", Satish 2026-10-19; js/features/routine-builder.js and the Add texts
// picker, js/features/text-picker.js): opened by Edit beside the session on Home, Add texts in an empty session and
// Settings → Routine; the same every day or different by weekday, Copy to other days…, ↑ ↓ ✕ and Alt+↑/↓, the picker
// (a sheet on phones, beside the list on wide screens); Home follows the reading person's routine for the weekday and
// session; it is kept after a reload and in backups; axe in every theme; names follow the reading languages.
// 19 Oct 2026 is a Monday, 22 Oct a Thursday, 20 Oct a Tuesday. The tests run on a fixed routine (TEST_ROUTINE in
// helpers.mjs: Morning = Atharvashirsha, Evening = the ten aartis, the same every day), whatever Satish's schedule is.
import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { readFileSync } from "node:fs";
import { openSite, settle, SETUPS, useTestRoutine } from "./helpers.mjs";

const LIB = JSON.parse(readFileSync(new URL("../content/library.json", import.meta.url), "utf8"));
const T = Object.fromEntries(LIB.texts.map((t) => [t.id, t]));
const TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"];
const MON_EVENING = new Date("2026-10-19T19:00:00-04:00");
const PHONE = { width: 390, height: 844 };

test.beforeEach(async ({ page }) => useTestRoutine(page));

const rows = (page) => page.locator("#tsl li");
const items = (page) => page.locator("#rtl li");
const pick = (page, id) => page.locator(`#tpk input[value="${id}"]`);
const btn = (page, id, a) => page.locator(`#rtl li[data-id="${id}"] button[data-a="${a}"]`);
const ids = (page) => items(page).evaluateAll((l) => l.map((x) => x.dataset.id));
const homeIds = (page) =>
  rows(page).evaluateAll((l) => l.map((x) => x.querySelector("input").dataset.t));

// the builder is a page over Home: what is under it is checked by the Home tests
async function axe(page, sel) {
  const b = new AxeBuilder({ page });
  if (sel) b.include(sel);
  const r = await b.withTags(TAGS).disableRules(["label-content-name-mismatch"]).analyze();
  return r.violations.map((v) => `${v.id} (${v.impact}): ${v.nodes.map((n) => n.target.join(" ")).slice(0, 5).join(", ")}`);
}

async function openBuilder(page) {
  await page.locator("#tsed").click();
  await expect(page.locator("#rtb")).toBeVisible();
}

test("Edit beside the session opens the builder for the reading person, at that session @mobile", async ({ page }) => {
  await openSite(page, SETUPS.marathi, { now: MON_EVENING });
  await expect(page.locator("#tsed")).toHaveText("Edit");
  await expect(page.locator("#tsed")).toHaveAccessibleName("Edit routine: Evening");
  await openBuilder(page);
  await expect(page.locator("#rtbt")).toBeFocused();
  await expect(page.locator("#rtbt")).toHaveText("M" + "Me’s routine");
  await expect(page.locator('#rtss [aria-checked="true"]')).toHaveText("Evening");
  await expect(page.locator('#rtmd [aria-checked="true"]')).toHaveText("Same every day");
  await expect(page.locator("#rtwk")).toBeHidden();
  await expect(page.locator("#rtsum")).toHaveText("Evening, every day · 10 texts");
  await expect(items(page)).toHaveCount(10);
  // the bottom bar and Home step aside; Back returns focus to Edit
  await page.locator("#rbk").click();
  await expect(page.locator("#rtb")).toBeHidden();
  await expect(page.locator("#tsed")).toBeFocused();
});

test("build Monday's morning: different by weekday, add with the picker, reorder with buttons and keys, remove, copy to Thursday; Home follows, after a reload too @mobile", async ({ page }) => {
  await page.setViewportSize(PHONE);
  await openSite(page, SETUPS.marathi, { now: MON_EVENING });
  await openBuilder(page);
  // Morning, different by weekday: Monday is today, every day starts with the Atharvashirsha
  await page.locator('#rtss [data-v="morning"]').click();
  await expect(page.locator('#rtss [data-v="morning"]')).toBeFocused();
  await page.locator('#rtmd [data-v="weekday"]').click();
  await expect(page.locator("#rtwk")).toBeVisible();
  await expect(page.locator('#rtwk [aria-checked="true"]')).toHaveAccessibleName("Monday 19");
  await expect(page.locator("#rtsum")).toHaveText("Monday morning · 1 text");
  await expect(page.locator("#rtcpb")).toHaveText("Copy to other days…");
  expect(await ids(page)).toEqual(["atharvashirsha"]);

  // Add texts: a sheet on a phone, focus on its heading; ticks add at the end
  await page.locator("#rtadd").click();
  await expect(page.locator("#tpk")).toBeVisible();
  await expect(page.locator("#tpk")).toHaveAttribute("aria-modal", "true");
  await expect(page.locator("#tpkt")).toBeFocused();
  await expect(page.locator("#tpkt")).toHaveText("Add texts to Monday morning");
  await expect(pick(page, "atharvashirsha")).toBeChecked();
  await expect(page.locator("#tpk li")).toHaveCount(LIB.texts.length);
  // search narrows the list
  await page.locator("#tpk .tpkq").fill("ghalin");
  await expect(page.locator("#tpk li:visible")).toHaveCount(1);
  await expect(page.locator("#tpk .tpks")).toHaveText("1 text found");
  await pick(page, "ghalin-lotangan").check();
  await page.locator("#tpk .tpkq").fill("");
  await pick(page, "sukhkarta").check();
  await expect(page.locator("#rtlive")).toHaveText(T.sukhkarta.title + " added, 3 of 3");
  await page.locator("#tpk .tpkx").click();
  await expect(page.locator("#tpk")).toBeHidden();
  await expect(page.locator("#rtadd")).toBeFocused();
  expect(await ids(page)).toEqual(["atharvashirsha", "ghalin-lotangan", "sukhkarta"]);

  // ↑ moves a text and says so; focus stays on the same button
  await btn(page, "sukhkarta", "up").click();
  expect(await ids(page)).toEqual(["atharvashirsha", "sukhkarta", "ghalin-lotangan"]);
  await expect(page.locator("#rtlive")).toHaveText(T.sukhkarta.title + " moved to 2 of 3");
  await expect(btn(page, "sukhkarta", "up")).toBeFocused();
  // at the top the ↑ can't be used, and focus goes to its ↓
  await btn(page, "sukhkarta", "up").click();
  expect(await ids(page)).toEqual(["sukhkarta", "atharvashirsha", "ghalin-lotangan"]);
  await expect(btn(page, "sukhkarta", "up")).toHaveAttribute("aria-disabled", "true");
  await expect(btn(page, "sukhkarta", "down")).toBeFocused();
  // Alt+↓ and Alt+↑ with a keyboard
  await page.keyboard.press("Alt+ArrowDown");
  await page.keyboard.press("Alt+ArrowDown");
  expect(await ids(page)).toEqual(["atharvashirsha", "ghalin-lotangan", "sukhkarta"]);
  await expect(page.locator("#rtlive")).toHaveText(T.sukhkarta.title + " moved to 3 of 3");
  await btn(page, "ghalin-lotangan", "down").focus();
  await page.keyboard.press("Alt+ArrowUp");
  expect(await ids(page)).toEqual(["ghalin-lotangan", "atharvashirsha", "sukhkarta"]);
  await expect(page.locator("#rtlive")).toHaveText(T["ghalin-lotangan"].title + " moved to 1 of 3");
  // ✕ removes; focus goes to the next text's ✕
  await btn(page, "atharvashirsha", "rm").click();
  expect(await ids(page)).toEqual(["ghalin-lotangan", "sukhkarta"]);
  await expect(page.locator("#rtlive")).toHaveText(T.atharvashirsha.title + " removed");
  await expect(btn(page, "sukhkarta", "rm")).toBeFocused();

  // Copy to other days…: Thursday gets Monday's list
  await page.locator("#rtcpb").click();
  await expect(page.locator("#rtcpf")).toBeVisible();
  await expect(page.locator("#rtcpl")).toHaveText("Copy Monday morning’s list to:");
  await expect(page.locator("#rtcpd input")).toHaveCount(6);
  await page.locator("#rtcpd label", { hasText: "Thursday" }).click();
  await page.locator("#rtcpo").click();
  await expect(page.locator("#rtcpf")).toBeHidden();
  await expect(page.locator("#rtcpb")).toBeFocused();
  await expect(page.locator("#rtlive")).toHaveText("Copied to Thursday");
  await page.locator('#rtwk [data-v="4"]').click();
  await expect(page.locator("#rtsum")).toHaveText("Thursday morning · 2 texts");
  expect(await ids(page)).toEqual(["ghalin-lotangan", "sukhkarta"]);
  await page.locator('#rtwk [data-v="2"]').click();
  expect(await ids(page)).toEqual(["atharvashirsha"]);

  // Home: Monday's morning is the new list (picked with the Morning | Afternoon | Evening switch)
  await page.locator("#rbk").click();
  await page.locator("#tss-morning").click();
  expect(await homeIds(page)).toEqual(["ghalin-lotangan", "sukhkarta"]);
  await expect(page.locator("#tst")).toHaveText("Start: Ghalin Lotangan");
  // the evening is as it was
  await page.locator("#tss-evening").click();
  await expect(rows(page)).toHaveCount(10);

  // after a reload, on Thursday morning and on Tuesday morning
  await page.clock.setFixedTime(new Date("2026-10-22T09:00:00-04:00"));
  await page.reload();
  await settle(page);
  await expect(page.locator("#tsh")).toHaveText("सकाळ · Morning");
  expect(await homeIds(page)).toEqual(["ghalin-lotangan", "sukhkarta"]);
  await page.clock.setFixedTime(new Date("2026-10-20T09:00:00-04:00"));
  await page.reload();
  await settle(page);
  expect(await homeIds(page)).toEqual(["atharvashirsha"]);
  // and the builder opens on Tuesday, different by weekday
  await openBuilder(page);
  await expect(page.locator('#rtmd [aria-checked="true"]')).toHaveText("Different by weekday");
  await expect(page.locator('#rtwk [aria-checked="true"]')).toHaveAccessibleName("Tuesday 20");
});

test("a tick on a removed text just goes; the others keep theirs", async ({ page }) => {
  await openSite(page, SETUPS.marathi, { now: MON_EVENING });
  await rows(page).nth(0).locator("input").check();
  await rows(page).nth(1).locator("input").check();
  await expect(page.locator("#tsn")).toHaveText("2 of 10 done");
  await openBuilder(page);
  await btn(page, "sukhkarta", "rm").click();
  await page.locator("#rbk").click();
  await expect(rows(page)).toHaveCount(9);
  await expect(page.locator("#tsn")).toHaveText("1 of 9 done");
  await expect(rows(page).nth(0).locator("input")).toBeChecked();
});

test("same every day again: the day's list for every day; Escape closes the builder", async ({ page }) => {
  await openSite(page, SETUPS.marathi, { now: MON_EVENING });
  await openBuilder(page);
  await page.locator('#rtmd [data-v="weekday"]').click();
  await btn(page, "sukhkarta", "rm").click();
  await page.locator('#rtmd [data-v="fixed"]').click();
  await expect(page.locator("#rtlive")).toHaveText("Monday’s list is now used every day");
  await expect(page.locator("#rtwk")).toBeHidden();
  await expect(page.locator("#rtsum")).toHaveText("Evening, every day · 9 texts");
  // the radio group: arrows choose
  await page.locator('#rtmd [data-v="fixed"]').focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.locator('#rtmd [data-v="weekday"]')).toBeFocused();
  await expect(page.locator('#rtmd [data-v="weekday"]')).toHaveAttribute("aria-checked", "true");
  await page.keyboard.press("Escape");
  await expect(page.locator("#rtb")).toBeHidden();
  await expect(page.locator("#tsed")).toBeFocused();
});

test("an empty session on Home says so, with Add texts: the builder opens there with the picker @mobile", async ({ page }) => {
  await page.setViewportSize(PHONE);
  await openSite(page, SETUPS.marathi, { now: new Date("2026-10-19T14:00:00-04:00") });
  await expect(page.locator("#tsh")).toHaveText("दुपार · Afternoon");
  await expect(page.locator("#tse")).toBeVisible();
  await expect(page.locator("#tset")).toHaveText("Nothing is planned for afternoon yet.");
  await expect(page.locator("#tsea")).toHaveText("Add texts");
  await page.locator("#tsea").click();
  await expect(page.locator("#rtb")).toBeVisible();
  await expect(page.locator('#rtss [aria-checked="true"]')).toHaveText("Afternoon");
  await expect(page.locator("#rte")).toHaveText("No texts for Afternoon, every day yet. Add texts to start.");
  await expect(page.locator("#tpk")).toBeVisible();
  await pick(page, "jai-jagdish-hare").check();
  // Escape closes the sheet only, then the builder
  await page.keyboard.press("Escape");
  await expect(page.locator("#tpk")).toBeHidden();
  await expect(page.locator("#rtb")).toBeVisible();
  await expect(page.locator("#rtadd")).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(page.locator("#rtb")).toBeHidden();
  await expect(page.locator("#tse")).toBeHidden();
  expect(await homeIds(page)).toEqual(["jai-jagdish-hare"]);
  // the button it came from has gone: focus is on the session's heading
  await expect(page.locator("#tsh")).toBeFocused();
});

test("the phone's Back closes the picker sheet, then the builder @chromium-only", async ({ page }) => {
  await page.setViewportSize(PHONE);
  await openSite(page, SETUPS.marathi, { now: MON_EVENING });
  await openBuilder(page);
  await page.locator("#rtadd").click();
  await expect(page.locator("#tpk")).toBeVisible();
  await page.goBack();
  await expect(page.locator("#tpk")).toBeHidden();
  await expect(page.locator("#rtb")).toBeVisible();
  await page.goBack();
  await expect(page.locator("#rtb")).toBeHidden();
  await expect(page.locator("#home")).toBeVisible();
});

test("on a wide screen the picker is beside the list, and the sheet's Tab trap is not in the way", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 820 });
  await openSite(page, SETUPS.marathi, { now: MON_EVENING });
  await openBuilder(page);
  await expect(page.locator("#tpk")).toBeVisible();
  await expect(page.locator("#tpk")).not.toHaveAttribute("role", "dialog");
  await expect(page.locator("#rtadd")).toBeHidden();
  const list = await page.locator("#rtl").boundingBox();
  const pk = await page.locator("#tpk").boundingBox();
  expect(pk.x).toBeGreaterThan(list.x + list.width);
  await pick(page, "atharvashirsha").check();
  await expect(items(page)).toHaveCount(11);
  await expect(items(page).last()).toHaveAttribute("data-id", "atharvashirsha");
});

test("Settings → Routine opens the builder at the session Home shows", async ({ page }) => {
  await openSite(page, SETUPS.marathi, { now: MON_EVENING });
  await page.locator("#aa").click();
  await expect(page.locator("#sprt")).toContainText("Routine");
  await page.locator("#sprt").click();
  await expect(page.locator("#panel")).toBeHidden();
  await expect(page.locator("#rtb")).toBeVisible();
  await expect(page.locator('#rtss [aria-checked="true"]')).toHaveText("Evening");
  await page.locator("#rbk").click();
  await expect(page.locator("#rtb")).toBeHidden();
  await expect(page.locator("#aa")).toBeFocused();
});

test("each person has their own routine; Save a backup file → Restore brings it back", async ({ page }, info) => {
  const errors = [];
  await openSite(page, SETUPS.marathi, { now: MON_EVENING, errors });
  await openBuilder(page);
  for (const id of ["shendur-lal-chadhayo", "durge-durghat-bhari", "lavathavati-vikrala", "trigunatmak-traimurti", "aarti-dnyanaraja", "yei-o-vitthale", "jai-ganesh-deva", "jai-jagdish-hare"])
    await btn(page, id, "rm").click();
  expect(await ids(page)).toEqual(["sukhkarta", "ghalin-lotangan"]);
  await page.locator("#rbk").click();
  expect(await homeIds(page)).toEqual(["sukhkarta", "ghalin-lotangan"]);
  // another person starts from the default routine
  await page.locator("#who").click();
  await page.locator("#pfadd").click();
  await page.locator("#pfname").fill("Aai");
  await page.locator("#pfsave").click();
  await page.locator("#pfl .pfp", { hasText: "Aai" }).click();
  await expect(page.locator("#pfm")).toBeHidden();
  await expect(rows(page)).toHaveCount(10);
  // backup
  await page.locator("#aa").click();
  const [dl] = await Promise.all([page.waitForEvent("download"), page.locator("#bks").click()]);
  const file = info.outputPath("backup.nitya");
  await dl.saveAs(file);
  const json = JSON.parse(readFileSync(file, "utf8"));
  expect(json.app).toBe(readFileSync(new URL("../index.html", import.meta.url), "utf8").match(/<meta name="version" content="([^"]+)"/)[1]);
  expect(json.payload.profiles.map((p) => [p.name, p.routine && p.routine.evening.texts])).toEqual([
    ["Me", ["sukhkarta", "ghalin-lotangan"]],
    ["Aai", null],
  ]);
  await page.locator("#xc").click();
  // Me's routine changes after the backup
  await page.locator("#who").click();
  await page.locator("#pfl .pfp", { hasText: "Me" }).click();
  await openBuilder(page);
  await btn(page, "ghalin-lotangan", "rm").click();
  await page.locator("#rbk").click();
  expect(await homeIds(page)).toEqual(["sukhkarta"]);
  // restore
  await page.locator("#aa").click();
  // (given as a buffer: the saved path, under a test-results folder named with "→", is not always accepted)
  await page.locator("#bkf").setInputFiles({ name: "b.nitya", mimeType: "application/json", buffer: Buffer.from(readFileSync(file, "utf8")) });
  expect(errors).toEqual([]);
  await expect(page.locator("#bkmd")).toContainText("Replaced by the file's copy (settings, routine and today's ticks): Me, Aai");
  await page.locator("#bkok").click();
  await expect(page.locator("#bkm")).toBeHidden();
  await page.locator("#who").click();
  await page.locator("#pfl .pfp", { hasText: "Me" }).click();
  expect(await homeIds(page)).toEqual(["sukhkarta", "ghalin-lotangan"]);
  await page.reload();
  await settle(page);
  expect(await homeIds(page)).toEqual(["sukhkarta", "ghalin-lotangan"]);
});

test("English only: titles in English, with no second line; Marathi menus say बदला @mobile", async ({ page }) => {
  await openSite(page, { lang: "en", lead: "en", l2: "", ui: "en" }, { now: MON_EVENING });
  await openBuilder(page);
  await expect(items(page).first().locator(".t1")).toHaveText("Ganapati Aarti");
  await expect(items(page).first().locator(".t1")).toHaveAttribute("lang", "en");
  await expect(items(page).locator(".t2")).toHaveCount(0);
  await expect(items(page).first().locator(".tno")).toHaveText("1.");
  await expect(btn(page, "sukhkarta", "up")).toHaveAccessibleName("Move Ganapati Aarti up");
  await expect(page.locator("#tpk li").first().locator(".t1")).toHaveText("Ganapati Atharvashirsha");
  await expect(page.locator("#tpk .t2")).toHaveCount(0);
  await btn(page, "ghalin-lotangan", "up").click();
  await expect(page.locator("#rtlive")).toHaveText("Ghalin Lotangan moved to 7 of 10");
});

test("English first, Marathi second: English titles with Marathi under them", async ({ page }) => {
  await openSite(page, SETUPS["english-main-both"], { now: MON_EVENING });
  await openBuilder(page);
  await expect(items(page).first().locator(".t1")).toHaveText("Ganapati Aarti");
  await expect(items(page).first().locator(".t2")).toHaveText(T.sukhkarta.title);
});

test("Marathi menus: बदला, and the builder's words in Marathi @mobile", async ({ page }) => {
  await openSite(page, SETUPS["marathi-menus"], { now: MON_EVENING });
  await expect(page.locator("#tsed")).toHaveText("बदला");
  await openBuilder(page);
  await expect(page.locator("#rtbt")).toContainText("दिनक्रम: Me");
  await expect(page.locator('#rtss [aria-checked="true"]')).toHaveText("सायंकाळ");
  await expect(page.locator("#rtsum")).toHaveText("रोज सायंकाळ · १० रचना");
  await expect(page.locator("#rbk")).toHaveText("मागे", { useInnerText: true });
});

for (const [name, prefs, w] of [
  ["light, phone", SETUPS.marathi, PHONE],
  ["dark, phone", { ...SETUPS.marathi, th: "dark" }, PHONE],
  ["sepia, phone", { ...SETUPS.marathi, th: "sepia" }, PHONE],
  ["high contrast, phone", { ...SETUPS.marathi, hc: 1 }, PHONE],
  ["light, wide", SETUPS.marathi, { width: 1280, height: 820 }],
  ["dark, wide", { ...SETUPS.marathi, th: "dark" }, { width: 1280, height: 820 }],
  ["high contrast, wide, English only", { lang: "en", lead: "en", l2: "", hc: 1 }, { width: 1280, height: 820 }],
]) {
  test(`axe: the builder and the picker, ${name}`, async ({ page }) => {
    await page.setViewportSize(w);
    await openSite(page, prefs, { now: MON_EVENING });
    await openBuilder(page);
    await page.locator('#rtmd [data-v="weekday"]').click();
    await page.locator("#rtcpb").click();
    await page.waitForTimeout(200);
    expect(await axe(page, "#rtb")).toEqual([]);
    await page.locator("#rtcpx").click();
    if (w.width < 1024) await page.locator("#rtadd").click();
    await page.waitForTimeout(200);
    expect(await axe(page, "#rtb")).toEqual([]);
  });
}

test("axe: an empty session on Home, dark and sepia @mobile", async ({ page }) => {
  for (const th of ["dark", "sepia"]) {
    await openSite(page, { ...SETUPS.marathi, th }, { now: new Date("2026-10-19T14:00:00-04:00") });
    await expect(page.locator("#tse")).toBeVisible();
    expect(await axe(page)).toEqual([]);
  }
});

test("44px targets in the builder and the picker @mobile", async ({ page }) => {
  await page.setViewportSize(PHONE);
  await openSite(page, SETUPS.marathi, { now: MON_EVENING });
  await openBuilder(page);
  await page.locator('#rtmd [data-v="weekday"]').click();
  const small = await page.locator("#rtb button:visible, #tsed").evaluateAll((l) =>
    l.map((b) => [b.id || b.getAttribute("aria-label") || b.textContent.trim(), b.getBoundingClientRect()]).filter(([, r]) => r.width < 44 || r.height < 44).map(([n]) => n),
  );
  expect(small).toEqual([]);
  await page.locator("#rtadd").click();
  const small2 = await page.locator("#tpk .tpkr, #tpk button, #tpk input.tpkq").evaluateAll((l) =>
    l.map((b) => [b.className, b.getBoundingClientRect()]).filter(([, r]) => r.height < 44).map(([n]) => n),
  );
  expect(small2).toEqual([]);
});

test("the sheet keeps Tab inside it", async ({ page, browserName }) => {
  test.skip(browserName === "webkit", "Safari's default Tab skips buttons");
  await page.setViewportSize(PHONE);
  await openSite(page, SETUPS.marathi, { now: MON_EVENING });
  await openBuilder(page);
  await page.locator("#rtadd").click();
  for (let i = 0; i < 16; i++) {
    await page.keyboard.press("Tab");
    expect(await page.evaluate(() => !!document.activeElement.closest("#tpk"))).toBe(true);
  }
});
