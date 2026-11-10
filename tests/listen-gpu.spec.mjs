// Listen on a GPU (js/features/listen.js, WAYS.gpu): where the browser has WebGPU, the 4-bit model runs on the GPU
// through ONNX Runtime's WebGPU build. Here Chromium's software GPU (SwiftShader, --enable-unsafe-webgpu) stands in for
// the phone's; the other Listen tests have no WebGPU, so they take the CPU's way (listen.spec.mjs).
import { test, expect } from "@playwright/test";
import { openSite, SETUPS } from "./helpers.mjs";

test.use({
  launchOptions: { args: ["--use-fake-device-for-media-stream", "--use-fake-ui-for-media-stream", "--enable-unsafe-webgpu"] },
  permissions: ["microphone"],
});

test("the GPU's way: the 4-bit model and the library's WebGPU build, kept, and hearing as the Mac does @chromium-only", async ({ page }) => {
  // (Satish, 2026-11-09: on an iPhone a hearing took 233 ms on the GPU against 712 on the CPU)
  test.setTimeout(300_000);
  const errors = [];
  await openSite(page, SETUPS.english, { errors });
  // (a browser with no GPU to give at all, even the software one: nothing to test here; the CPU's way is listen.spec.mjs)
  const gpu = await page.evaluate(async () => !!(navigator.gpu && (await navigator.gpu.requestAdapter())));
  test.skip(!gpu, "no WebGPU adapter in this browser");
  const panel = page.locator("#lsn");
  await page.locator("#lsb").click();
  await expect(panel.getByRole("status")).toContainText("117 MB");
  await panel.getByRole("button", { name: "Download" }).click();
  await expect(panel.getByRole("status")).toHaveText("Listening…", { timeout: 240_000 });
  const kept = await page.evaluate(async () => (await (await caches.open("nitya-listen")).keys()).map((k) => new URL(k.url).pathname));
  expect(kept).toEqual(
    expect.arrayContaining([
      "/models/chant-v4-q4/model.onnx",
      "/models/chant-v4-q4/model.onnx.5",
      "/vendor/onnxruntime/ort.webgpu.bundle.min.mjs",
      "/vendor/onnxruntime/ort-wasm-simd-threaded.asyncify.wasm",
      "/vendor/onnxruntime/ort-wasm-simd-threaded.asyncify.wasm.2",
    ]),
  );
  expect(kept).not.toContain("/models/chant-v4/model.onnx");
  // (stopped first: on the software GPU each hearing is slow, and the model hears one window at a time)
  await panel.getByRole("button", { name: "Stop" }).click();
  const got = await page.evaluate(async () => {
    const check = await (await fetch("models/chant-v4-q4/check.json")).json();
    const a = new Float32Array(48000);
    for (let i = 0; i < a.length; i++) {
      const t = i / 16000;
      a[i] = 0.3 * Math.sin(2 * Math.PI * (220 + 60 * t) * t) + 0.2 * Math.sin(2 * Math.PI * 440 * t) * Math.cos(2 * Math.PI * 0.5 * t);
    }
    const [m, h] = await Promise.all(["js/features/listen.js", "js/core/hearing.js"].map((f) => import(new URL(f, document.baseURI).href)));
    const t0 = performance.now();
    const out = await m.scores(a);
    console.log("GPU hearing ms", Math.round(performance.now() - t0));
    const data = out.data || (await out.getData());
    const n = out.dims[2];
    let far = 0;
    for (const [step, row] of Object.entries(check.scores)) row.forEach((v, o) => (far = Math.max(far, Math.abs(data[Number(step) * n + o] - v))));
    // each output's mean over every step: a difference at a step the three above leave out shows here. Averaged, the
    // rounding of 8-bit arithmetic mostly cancels out: 0.1 apart in WebAssembly on chant-v4 (2026-11-10)
    const sum = new Float64Array(n);
    data.forEach((v, at) => (sum[at % n] += v));
    const offMean = Math.max(...check.means.map((v, o) => Math.abs((sum[o] * n) / data.length - v)));
    return { way: await m.way(), same: JSON.stringify(h.choices(data, n)) === JSON.stringify(check.ids), far, offMean };
  });
  expect(got.way).toBe("gpu");
  expect(got.same).toBe(true);
  expect(got.far).toBeLessThan(0.4);
  expect(got.offMean).toBeLessThan(0.15);
  expect(errors).toEqual([]);
});
