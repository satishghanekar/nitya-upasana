// Listen (js/features/listen.js): the ear in the bottom bar. In Chromium, under the site's own security policy
// (tests/serve.mjs), with Chromium's fake microphone (a beep): the question before the one-time download, the download
// kept in its own cache, listening and Stop, and what the model would write found in the texts, the text opened and
// its line marked. (No real chanting here: the family's recordings stay private; the model's own tests, in the
// shravan-model repository, hear real chanting.)
import { test, expect } from "@playwright/test";
import { buildAll, openSite, SETUPS } from "./helpers.mjs";

// (launchOptions here replace the config's, so the pre-installed Chromium, PW_CHROMIUM_PATH, is named again)
test.use({
  launchOptions: {
    args: ["--use-fake-device-for-media-stream", "--use-fake-ui-for-media-stream"],
    ...(process.env.PW_CHROMIUM_PATH ? { executablePath: process.env.PW_CHROMIUM_PATH } : {}),
  },
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
  await expect(panel.getByRole("status")).toContainText("122 MB");
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
  expect(kept).toEqual(
    expect.arrayContaining([
      "/models/chant-v4/model.onnx",
      "/models/chant-v4/model.onnx.6",
      "/models/chant-v4/letters.json",
      "/vendor/onnxruntime/ort.wasm.bundle.min.mjs",
      "/vendor/onnxruntime/ort-wasm-simd-threaded.wasm",
    ]),
  );
  // the model, run by ONNX Runtime Web here, scores the check sound as the model's Python side did (check.json): the
  // same choice at every step, and scores within 0.4 of its own, which run from about -14 to 11 (the int8 arithmetic
  // rounds a little differently in WebAssembly: chant-v3 up to 0.18 apart, chant-v4 0.31, 2026-11-09; at every step
  // of the check sound the first choice is at least 7 above the second, so this never changes what is heard)
  const got = await page.evaluate(async () => {
    const check = await (await fetch("models/chant-v4/check.json")).json();
    const a = new Float32Array(48000);
    for (let i = 0; i < a.length; i++) {
      const t = i / 16000;
      a[i] = 0.3 * Math.sin(2 * Math.PI * (220 + 60 * t) * t) + 0.2 * Math.sin(2 * Math.PI * 440 * t) * Math.cos(2 * Math.PI * 0.5 * t);
    }
    const [m, h] = await Promise.all(["js/features/listen.js", "js/core/hearing.js"].map((f) => import(new URL(f, document.baseURI).href)));
    const out = await m.scores(a);
    const n = out.dims[2];
    let far = 0;
    for (const [step, row] of Object.entries(check.scores)) row.forEach((v, o) => (far = Math.max(far, Math.abs(out.data[Number(step) * n + o] - v))));
    return { same: JSON.stringify(h.choices(out.data, n)) === JSON.stringify(check.ids), far };
  });
  expect(got.same).toBe(true);
  expect(got.far).toBeLessThan(0.4);
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
    // (heard as ending a little later than now: the mark moves on at the chanting's pace from when the sound ended, and
    // what was heard ends on the verse's last letter, so a slow machine could carry it into the next line meanwhile)
    m.follow(heard, performance.now() + 5000);
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

test("another text heard while reading one: its text unfolds and the page goes to the line being chanted @chromium-only", async ({ page }) => {
  // (Satish, 2026-11-09: the panel said Following and named the right text, but a folded text on the page stayed
  // folded and the screen stayed where it was)
  await openSite(page, { ...SETUPS.marathi, af: ["vedic-chant-pavamana-suktam"] }, { hash: "#aarti-sukhkarta" });
  const r = await page.evaluate(async () => {
    const p = window.CONTENT.categories.flatMap((c) => c.pieces).find((x) => x.text === "vedic-chant-pavamana-suktam");
    const lines = p.items.flatMap((i) => i.lines || []);
    const at = lines.findIndex((l) => l.mr.includes("९.००१.०२"));
    const heard = (lines[at - 1].mr + " " + lines[at].mr).replace(/<[^>]*>/g, "").replace(/[॑-॔᳐-᳿।॥०-९.]/g, "");
    const m = await import(new URL("js/features/listen.js", document.baseURI).href);
    m.follow(heard, performance.now() + 5000);
    return p.id;
  });
  const line = page.locator(".verse .mr p.lsn");
  await expect(line).toHaveCount(1);
  await expect(line).toBeVisible();
  await expect(line).toBeInViewport();
  await expect(line).toContainText("९.००१.०२");
  // as if the reader had gone to it: the address names it, so Back returns to the text before
  expect(new URL(page.url()).hash).toBe("#" + r);
});

test("a Library text heard while the day's routine is read: the session is left and the text shown, its line marked @chromium-only", async ({ page }) => {
  // (Satish, 2026-11-09: in the routine, chanting a text from the Library, the panel said Following and named it, but
  // the page showed only the session's texts, so the text stayed hidden and the screen stuck)
  await page.setViewportSize({ width: 390, height: 844 });
  await openSite(page, SETUPS.marathi);
  await page.locator("a.tgo:visible").first().click();
  await expect(page.locator("html")).toHaveAttribute("data-run", "1");
  const inRun = await page.evaluate(() => [...document.querySelectorAll(".ash.inrun")].map((x) => x.id));
  expect(inRun).not.toContain("vedic-chant-pavamana-suktam");
  await page.evaluate(async () => {
    const p = window.CONTENT.categories.flatMap((c) => c.pieces).find((x) => x.text === "vedic-chant-pavamana-suktam");
    const lines = p.items.flatMap((i) => i.lines || []);
    const at = lines.findIndex((l) => l.mr.includes("९.००१.०२"));
    const heard = (lines[at - 1].mr + " " + lines[at].mr).replace(/<[^>]*>/g, "").replace(/[॑-॔᳐-᳿।॥०-९.]/g, "");
    const m = await import(new URL("js/features/listen.js", document.baseURI).href);
    m.follow(heard, performance.now() + 5000);
  });
  const line = page.locator(".verse .mr p.lsn");
  await expect(line).toBeVisible();
  await expect(line).toBeInViewport();
  await expect(line).toContainText("९.००१.०२");
  await expect(page.locator("html")).not.toHaveAttribute("data-run", "1");
});

test("after 5 minutes with no chanting followed, Listen stops by itself and says so @chromium-only", async ({ page }) => {
  // (Satish, 2026-11-09: a phone left listening runs its battery down; the fake microphone's beep is not chanting)
  test.setTimeout(240_000);
  const errors = [];
  await openSite(page, SETUPS.english, { errors, running: true });
  const panel = page.locator("#lsn");
  await page.locator("#lsb").click();
  await panel.getByRole("button", { name: "Download" }).click();
  await expect(panel.getByRole("status")).toHaveText("Listening…", { timeout: 180_000 });
  await page.clock.fastForward("04:30");
  await expect(panel.getByRole("status")).toHaveText("Listening…");
  await page.clock.fastForward("01:00");
  await expect(panel.getByRole("status")).toHaveText("Listen stopped: no chanting heard for 5 minutes. Tap Listen to start again.");
  await expect(page.locator("#lsb")).toHaveAttribute("aria-pressed", "false");
  await panel.getByRole("button", { name: "Close" }).click();
  await expect(panel).toBeHidden();
  expect(errors).toEqual([]);
});

test("follow() says whether what was heard was found, so the newest letters alone are tried before the whole window @chromium-only", async ({ page }) => {
  await openSite(page, SETUPS.marathi);
  const r = await page.evaluate(async () => {
    const p = window.CONTENT.categories.flatMap((c) => c.pieces).find((x) => x.text === "vedic-chant-pavamana-suktam");
    const lines = p.items.flatMap((i) => i.lines || []);
    const at = lines.findIndex((l) => l.mr.includes("९.००१.०२"));
    const heard = (lines[at - 1].mr + " " + lines[at].mr).replace(/<[^>]*>/g, "").replace(/[॑-॔᳐-᳿।॥०-९.]/g, "");
    const m = await import(new URL("js/features/listen.js", document.baseURI).href);
    return { found: m.follow(heard, performance.now()), nothing: m.follow("क्ष्क्ष्क्ष्क्ष्क्ष्क्ष्क्ष्क्ष्क्ष्क्ष्", performance.now()) };
  });
  expect(r).toEqual({ found: true, nothing: false });
});

test("while listening, the page's own thread stays free: the model runs in a worker @chromium-only", async ({ page }) => {
  // (Satish, 2026-11-09: scrolling felt stuck while Listen was on; each hearing held the page for up to half a second)
  test.setTimeout(240_000);
  await openSite(page, SETUPS.english);
  const panel = page.locator("#lsn");
  await page.locator("#lsb").click();
  await panel.getByRole("button", { name: "Download" }).click();
  await expect(panel.getByRole("status")).toHaveText("Listening…", { timeout: 180_000 });
  const long = await page.evaluate(
    () =>
      new Promise((done) => {
        const seen = [];
        const o = new PerformanceObserver((l) => l.getEntries().forEach((e) => seen.push(Math.round(e.duration))));
        o.observe({ type: "longtask" });
        setTimeout(() => (o.disconnect(), done(seen)), 5000);
      }),
  );
  expect(long.filter((ms) => ms > 100)).toEqual([]);
  await page.locator("#lsb").click();
});

test("Settings → About says where Listen runs its model: the CPU here, the GPU where the browser gives one @chromium-only", async ({ page }) => {
  const errors = [];
  await openSite(page, SETUPS.english, { errors });
  // (headless Chromium gives no GPU adapter: the CPU)
  await expect(page.locator("#lswr")).not.toHaveAttribute("hidden", "");
  await expect(page.locator("#lswr")).toHaveAttribute("data-way", "cpu");
  await expect(page.locator("#lsw")).toHaveText("Listen: CPU");
  await expect(page.locator("#lswn")).toHaveText("Works on every phone, uses more battery");
  await expect(page.locator("#lswb")).toHaveText("Standard");
  // the Listen line comes before the version, which is last in About
  expect(await page.evaluate(() => document.getElementById("lswr").nextElementSibling.id)).toBe("upr");
  expect(await page.evaluate(() => document.getElementById("upr").nextElementSibling)).toBeNull();
  expect(errors).toEqual([]);
});

test("Settings → About says the GPU when the browser has WebGPU and an adapter @chromium-only", async ({ page }) => {
  const errors = [];
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "gpu", { value: { requestAdapter: () => Promise.resolve({}) }, configurable: true });
  });
  await openSite(page, SETUPS.english, { errors });
  await expect(page.locator("#lswr")).toHaveAttribute("data-way", "gpu");
  await expect(page.locator("#lsw")).toHaveText("Listen: GPU");
  await expect(page.locator("#lswn")).toHaveText("About 3× faster, lighter on battery");
  await expect(page.locator("#lswb")).toHaveText("Optimized");
  // only the GPU's icon (the chip with a bolt) shows
  await expect(page.locator("#lswr .lsw-gpu")).not.toHaveCSS("display", "none");
  await expect(page.locator("#lswr .lsw-cpu")).toHaveCSS("display", "none");
  expect(errors).toEqual([]);
});
