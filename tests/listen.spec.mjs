// Listen (js/features/listen.js): the ear in the bottom bar. In Chromium, under the site's own security policy
// (tests/serve.mjs), with Chromium's fake microphone (a beep): the question before the one-time download, the download
// kept in its own cache, listening and Stop, and what the model would write found in the texts, the text opened and
// its line marked. (No real chanting here: the family's recordings stay private; the model's own tests, in the
// shravan-model repository, hear real chanting.)
import { test, expect } from "@playwright/test";
import { buildAll, openSite, SETUPS } from "./helpers.mjs";

test.use({
  launchOptions: { args: ["--use-fake-device-for-media-stream", "--use-fake-ui-for-media-stream"] },
  permissions: ["microphone"],
});

test("Listen asks before its one-time download; Not now leaves the page as it was @chromium-only", async ({ page }) => {
  const errors = [];
  await openSite(page, SETUPS.english, { errors });
  const ear = page.locator("#lsb");
  await expect(ear).toBeVisible();
  await expect(ear).toHaveAccessibleName("Listen");
  await ear.click();
  const panel = page.locator("#lsn");
  await expect(panel.getByRole("status")).toContainText("105 MB");
  await expect(ear).toHaveAttribute("aria-pressed", "true");
  await panel.getByRole("button", { name: "Not now" }).click();
  await expect(panel).toBeHidden();
  await expect(ear).toHaveAttribute("aria-pressed", "false");
  expect(errors).toEqual([]);
});

test("Download, then listening to the microphone until Stop; the second time it starts without asking @chromium-only", async ({ page }) => {
  test.setTimeout(240_000);
  const errors = [];
  await openSite(page, SETUPS.english, { errors });
  const panel = page.locator("#lsn");
  await page.locator("#lsb").click();
  await panel.getByRole("button", { name: "Download" }).click();
  await expect(panel.getByRole("status")).toHaveText("Listening…", { timeout: 180_000 });
  // kept in its own cache, which a new version of the site leaves alone (sw.js)
  const kept = await page.evaluate(async () => (await (await caches.open("nitya-listen")).keys()).map((k) => new URL(k.url).pathname));
  expect(kept).toEqual(expect.arrayContaining(["/models/chant-v2/encoder.onnx", "/models/chant-v2/decoder.onnx.3", "/vendor/onnxruntime/ort.bundle.min.mjs"]));
  await panel.getByRole("button", { name: "Stop" }).click();
  await expect(panel).toBeHidden();
  await page.locator("#lsb").click();
  await expect(panel.getByRole("status")).toHaveText("Listening…", { timeout: 60_000 });
  await page.locator("#lsb").click();
  await expect(panel).toBeHidden();
  expect(errors).toEqual([]);
});

test("what the model heard is found: from Home, the text opens with the line being chanted marked @chromium-only", async ({ page }) => {
  await openSite(page, SETUPS.english);
  const marked = await page.evaluate(async () => {
    const C = window.CONTENT;
    const p = C.categories.flatMap((c) => c.pieces).find((x) => x.text === "vedic-chant-pavamana-suktam");
    const lines = p.items.flatMap((i) => i.lines || []);
    const at = lines.findIndex((l) => l.mr.includes("९.००१.०२"));
    // the two lines of the verse, as the model writes them: no svara marks, no verse number
    const heard = (lines[at - 1].mr + " " + lines[at].mr).replace(/<[^>]*>/g, "").replace(/[॑-॔᳐-᳿।॥०-९.]/g, "");
    const m = await import(new URL("js/features/listen.js", document.baseURI).href);
    m.follow(heard);
    await new Promise((r) => setTimeout(r, 300));
    const el = document.querySelector(".verse .mr p.lsn");
    return { id: el && el.closest(".ash").id, text: el && el.textContent, home: document.documentElement.hasAttribute("data-hv"), want: p.id };
  });
  expect(marked.id).toBe(marked.want);
  expect(marked.text).toContain("९.००१.०२");
  expect(marked.home).toBe(false);
  // (read in English, the English line is the one shown, marked with it)
  await expect(page.locator(".verse p.lsn:visible")).toHaveCount(1);
  await expect(page.locator(".verse p.lsn:visible")).toBeInViewport();
});

test("the model's delay is made up for: what was heard 10 seconds ago marks a line further on @chromium-only", async ({ page }) => {
  await openSite(page, SETUPS.marathi);
  const r = await page.evaluate(async () => {
    const p = window.CONTENT.categories.flatMap((c) => c.pieces).find((x) => x.text === "vedic-chant-pavamana-suktam");
    const lines = p.items.flatMap((i) => i.lines || []);
    const at = lines.findIndex((l) => l.mr.includes("९.००१.०२"));
    const heard = (lines[at - 1].mr + " " + lines[at].mr).replace(/<[^>]*>/g, "").replace(/[\u0951-\u0954\u1CD0-\u1CFF।॥०-९.]/g, "");
    const m = await import(new URL("js/features/listen.js", document.baseURI).href);
    m.follow(heard, performance.now() - 10_000);
    const el = document.querySelector(".verse .mr p.lsn");
    return { heardLine: lines[at].l, marked: el && el.getAttribute("data-l") };
  });
  const n = (id) => Number(id.split(".").pop());
  // at the starting pace (7 letters a second), 10 seconds is 70 letters: a verse and a half on
  expect(n(r.marked)).toBeGreaterThan(n(r.heardLine));
  expect(n(r.marked)).toBeLessThan(n(r.heardLine) + 6);
});

test("every text's lines, as Listen counts them, are the lines the page shows, in order @chromium-only", async ({ page }) => {
  await openSite(page, SETUPS.marathi);
  await buildAll(page);
  const wrong = await page.evaluate(async () => {
    const f = await import(new URL("js/core/follow.js", document.baseURI).href);
    return window.CONTENT.categories
      .flatMap((c) => c.pieces)
      .filter((p) => {
        const want = f.pieceLines(p).map((l) => f.letters(l.text));
        const shown = [...document.querySelectorAll("#" + p.id + " .verse .mr p")].map((x) => f.letters(x.textContent));
        return want.length !== shown.length || want.some((w, i) => w && !shown[i].includes(w.slice(0, 6)));
      })
      .map((p) => p.id);
  });
  expect(wrong).toEqual([]);
});
