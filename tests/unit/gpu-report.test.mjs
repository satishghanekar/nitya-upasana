// Fast mode's report (js/core/gpu-report.js): the check sound, how alike two runs' choices are, and the text shared
import { describe, expect, test } from "vitest";
import { readFileSync } from "node:fs";
import { ALIKE_LEAST, alike, checkSound, reportText, subgroupsTrusted } from "../../js/core/gpu-report.js";
import { choices } from "../../js/core/hearing.js";

describe("the check sound", () => {
  test("is 3 s at 16 kHz, as check.json says, and the same sound the Listen tests hear", () => {
    const a = checkSound();
    const check = JSON.parse(readFileSync(new URL("../../models/chant-v7-q4/check.json", import.meta.url), "utf8"));
    expect(a.length).toBe(check.seconds * 16000);
    const t = 1234 / 16000;
    expect(a[1234]).toBeCloseTo(0.3 * Math.sin(2 * Math.PI * (220 + 60 * t) * t) + 0.2 * Math.sin(2 * Math.PI * 440 * t) * Math.cos(2 * Math.PI * 0.5 * t), 6);
    // (the model gives a choice for every 20 ms step, but the last)
    expect(check.ids.length).toBe(149);
  });
});

describe("alike", () => {
  test("the share of steps whose choice is the same; nothing when the lengths differ", () => {
    expect(alike([1, 2, 3, 4], [1, 2, 3, 4])).toBe(1);
    expect(alike([1, 2, 0, 4], [1, 2, 3, 4])).toBe(0.75);
    expect(alike([1, 2, 3], [1, 2, 3, 4])).toBe(0);
    expect(alike([], [])).toBe(0);
    expect(ALIKE_LEAST).toBeGreaterThan(0.9);
  });
  test("the model's own scores at check.json's steps give its own choices there", () => {
    const check = JSON.parse(readFileSync(new URL("../../models/chant-v7/check.json", import.meta.url), "utf8"));
    for (const [step, row] of Object.entries(check.scores)) expect(choices(Float32Array.from(row), row.length)[0]).toBe(check.ids[Number(step)]);
  });
});

describe("the report shared", () => {
  const r = {
    status: "failed",
    step: "starting the model",
    at: "2026-11-21T00:42:00.000Z",
    tz: "Asia/Kolkata",
    app: "1.78.6",
    model: "chant-v7-q4",
    ort: "1.23.0",
    error: "Error: failed to compile MatMulNBits",
    stack: "at create (ort.webgpu.bundle.min.mjs:6:100)",
    log: ["+0 ms fast mode tried", "+4200 ms starting the model", "+4900 ms failed: Error: failed to compile MatMulNBits"],
    gpu: {
      vendor: "qualcomm",
      architecture: "adreno-7xx",
      description: "Adreno (TM) 750",
      fallback: false,
      limits: { maxBufferSize: 1073741824, maxComputeWorkgroupStorageSize: 32768, maxComputeInvocationsPerWorkgroup: 1024 },
      features: ["subgroups", "shader-f16"],
    },
    phone: {
      model: "SM-S928B",
      platform: "Android",
      platformVersion: "17.0.0",
      cores: 8,
      memory: 8,
      browser: "Google Chrome 158.0.8127.42",
      installed: true,
      isolated: true,
      screen: "412×915 @3.5",
      ua: "Mozilla/5.0 (Linux; Android 10; K)",
    },
    check: { ms: 210, alike: 0.42, far: 9.1 },
    timings: { "download or cache": 4100, "starting the model": 700 },
    cpu: "standard mode (CPU) started and works",
  };
  test("says, in one message, everything needed to find out why", () => {
    const t = reportText(r);
    for (const want of [
      "Nitya Upasana 1.78.6: Follow fast mode report",
      "When: 2026-11-21T00:42:00.000Z (Asia/Kolkata)",
      "What happened: fast mode failed while starting the model",
      "Error: Error: failed to compile MatMulNBits",
      "Where: at create",
      "Model: chant-v7-q4, ONNX Runtime 1.23.0",
      "Check sound: 210 ms, 42% of steps right, scores off by up to 9.1",
      "Times: download or cache 4100 ms, starting the model 700 ms",
      "GPU: qualcomm · adreno-7xx · Adreno (TM) 750",
      "maxBufferSize 1024 MB",
      "maxComputeWorkgroupStorageSize 32 KB",
      "maxComputeInvocationsPerWorkgroup 1024",
      "Features: shader-f16, subgroups",
      "Phone: SM-S928B, Android 17.0.0, 8 cores, 8 GB memory",
      "Browser: Google Chrome 158.0.8127.42, installed app, cross-origin isolated",
      "Screen: 412×915 @3.5",
      "User agent: Mozilla/5.0",
      "  +4900 ms failed",
      "Then: standard mode (CPU) started and works",
    ])
      expect(t).toContain(want);
  });
  test("the subgroups, and an earlier try, are told", () => {
    const t = reportText({
      ...r,
      subgroups: "off",
      gpu: { ...r.gpu, subgroupMinSize: 64, subgroupMaxSize: 128 },
      before: "Nitya Upasana 1.78.7: Follow fast mode report\nSubgroups: used",
    });
    expect(t).toContain("Subgroups: turned off for this try");
    expect(t).toContain("Adreno (TM) 750, subgroup size 64 to 128");
    expect(t).toContain("Earlier try:\n  Nitya Upasana 1.78.7: Follow fast mode report\n  Subgroups: used");
  });
  test("a page that closed while the GPU worked says so, and what is missing still reads", () => {
    const t = reportText({ status: "closed", step: "hearing the check sound", at: "x", tz: "", app: "1", model: "m", ort: "", log: [] });
    expect(t).toContain("What happened: the app closed (crashed) while fast mode was hearing the check sound");
    expect(t).toContain("Then: standard mode (CPU) is used from now on");
    expect(t).not.toContain("undefined");
  });
});

describe("the GPU's subgroups", () => {
  test("are used only on Apple's GPUs, where ONNX Runtime's 4-bit path has been checked", () => {
    expect(subgroupsTrusted({ vendor: "apple", architecture: "common-3" })).toBe(true);
    expect(subgroupsTrusted({ vendor: "Apple" })).toBe(true);
    // a Galaxy's Adreno (subgroups of 64 to 128), a Pixel's Mali, a laptop's, and the software GPU: without them
    for (const vendor of ["qualcomm", "arm", "intel", "nvidia", "amd", "google", "testvendor"]) expect(subgroupsTrusted({ vendor })).toBe(false);
    // a GPU that doesn't say whose it is: without them too
    for (const info of [undefined, null, {}, { vendor: "" }]) expect(subgroupsTrusted(info)).toBe(false);
  });
});
