// Settings → About → Follow: Check Follow on this phone (js/features/follow-check.js). Hidden until five taps on the
// version line; it asks before the GPU's download, tries the GPU a few ways, one per opening of the app, and the
// results are shared in English. Chromium's software GPU (SwiftShader) stands in for a phone's, as in
// listen-gpu.spec.mjs; a made-up GPU that gives no device stands in for one that fails.
import { test, expect } from "@playwright/test";
import { openSite, settle, SETUPS } from "./helpers.mjs";

test.use({
  launchOptions: { args: ["--use-fake-device-for-media-stream", "--use-fake-ui-for-media-stream", "--enable-unsafe-webgpu"] },
  permissions: ["microphone"],
});

/** About opened, and the version line tapped five times */
async function unlock(page) {
  await page.locator("#aa").click();
  await page.locator('#spv [data-v="about"]').click();
  await expect(page.locator("#follow-check")).toBeHidden();
  for (let i = 0; i < 5; i++) await page.locator("#ver").click();
  await expect(page.locator("#follow-check")).toBeVisible();
  await expect(page.locator("#follow-check-said")).toHaveText("The Follow check is now available below.");
}

test("the check of this phone: hidden until five taps, asks before downloading, tries the GPU each way and shares the results @chromium-only", async ({
  page,
}) => {
  test.setTimeout(900_000);
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "share", { value: (d) => ((window.__shared = d), Promise.resolve()), configurable: true });
  });
  await openSite(page, SETUPS.english);
  const gpu = await page.evaluate(async () => !!(navigator.gpu && (await navigator.gpu.requestAdapter())));
  test.skip(!gpu, "no WebGPU adapter in this browser");
  await unlock(page);
  const row = page.locator("#follow-check");
  await expect(row).toContainText("Check Follow on this phone");
  await expect(row).toContainText("Takes about 2 minutes.");
  // the GPU's download isn't here: asked first, and Cancel goes back
  await page.locator("#follow-check-start").click();
  await expect(row).toContainText("This needs a 117 MB download first.");
  await page.locator("#follow-check-cancel").click();
  await expect(page.locator("#follow-check-start")).toBeFocused();
  await page.locator("#follow-check-start").click();
  // the tries: the app opens again for each, back on About, and says how far it has come
  await Promise.all([page.waitForEvent("load"), page.locator("#follow-check-go").click()]);
  const tries = await page.evaluate(() => JSON.parse(localStorage.getItem("nitya-follow-check")).tries);
  // (the software GPU offers subgroups and isn't Apple's: as the app runs it, no extra features, then with subgroups)
  expect(tries).toEqual(["app", "none", "on"]);
  await expect(page.locator("#follow-check-title")).toHaveText(/Checking… [123] of 3/);
  await expect(page.locator("#follow-check-title")).toHaveText("Check finished", { timeout: 800_000 });
  await expect(row).toContainText("Thank you! Please share the results.");
  await page.locator("#follow-check-share").click();
  const shared = await page.waitForFunction(() => window.__shared).then((h) => h.jsonValue());
  expect(shared.title).toBe("Nitya Upasana: Follow check");
  for (const want of [
    "Step 1, as the app runs it: works",
    "Step 2, no extra GPU features: works",
    "Step 3, with subgroups: works",
    "features asked: none",
    "ONNX Runtime 1.",
    "GPU: ",
  ])
    expect(shared.text).toContain(want);
  // the check changed nothing for Follow: no fast-mode report, nothing remembered about subgroups
  expect(await page.evaluate(() => [localStorage.getItem("nitya-fast-mode"), localStorage.getItem("nitya-gpu-no-subgroups")])).toEqual([null, null]);
});

test("a try that brings the app down is found out on the next opening; a GPU that fails is told as failed @chromium-only", async ({ page }) => {
  test.setTimeout(400_000);
  await page.addInitScript(() => {
    const adapter = {
      info: { vendor: "qualcomm", architecture: "adreno-7xx", description: "Adreno (TM) 750", subgroupMinSize: 64, subgroupMaxSize: 128 },
      limits: { maxBufferSize: 268435456 },
      features: new Set(["subgroups", "shader-f16"]),
      requestDevice: () => Promise.reject(new Error("this test GPU gives no device")),
    };
    Object.defineProperty(navigator, "gpu", {
      value: { requestAdapter: () => Promise.resolve(adapter), getPreferredCanvasFormat: () => "rgba8unorm" },
      configurable: true,
    });
    Object.defineProperty(navigator, "share", { value: (d) => ((window.__shared = d), Promise.resolve()), configurable: true });
  });
  await openSite(page, SETUPS.english);
  // the check under way, its first try still marked: the app went down during it
  await page.evaluate(() => {
    localStorage.setItem("nitya-follow-check-on", "1");
    localStorage.setItem(
      "nitya-follow-check",
      JSON.stringify({
        at: "2026-11-21T10:00:00Z",
        app: "test",
        model: "chant-v7-q4",
        tries: ["on", "none"],
        results: [],
        next: 0,
        inTry: 0,
        gpu: {},
        phone: {},
      }),
    );
  });
  await page.reload();
  await settle(page);
  // back on About by itself, the second try run, then finished
  await expect(page.locator("#follow-check")).toBeVisible();
  await expect(page.locator("#follow-check-title")).toHaveText("Check finished", { timeout: 360_000 });
  await page.locator("#follow-check-share").click();
  const shared = await page.waitForFunction(() => window.__shared).then((h) => h.jsonValue());
  expect(shared.text).toContain("Step 1, with subgroups: failed, error: the app or the GPU stopped during this try");
  expect(shared.text).toContain("Step 2, no extra GPU features: failed");
  expect(shared.text).toMatch(/Step 2, no extra GPU features: failed, error: (ONNX Runtime error|.*this test GPU gives no device)/);
  // five more taps start it afresh
  for (let i = 0; i < 5; i++) await page.locator("#ver").click();
  await expect(page.locator("#follow-check-start")).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem("nitya-follow-check"))).toBeNull();
});
