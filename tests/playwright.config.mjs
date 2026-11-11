// Playwright configuration for the site's regression suite (see tests/README.md).
//
// Projects:
//   chromium      desktop Chrome / Edge engine; runs every suite, including print PDFs and screenshots
//   firefox       desktop Firefox; smoke, layout and interactions
//   webkit        desktop Safari engine; smoke, layout, interactions, accessibility, screenshots
//   iphone        WebKit with iPhone 13 touch emulation (closest automatable stand-in for iOS Safari)
//   ipad          WebKit with iPad (gen 7) touch emulation
//   pixel         Chromium with Pixel 7 emulation (Android Chrome)
//
// Everything test-related lives in tests/ (including package.json), so the repository root has no
// package.json and Cloudflare Pages keeps publishing the site files as they are, with no install step.
//
// Locally only Chromium may be installed: set PW_PROJECTS=chromium (the default when CI is unset).
// PW_CHROMIUM_PATH points Chromium at a pre-installed browser instead of Playwright's own download.
import { defineConfig, devices } from "@playwright/test";
// Same rule as SNAP_ENV in helpers.mjs (kept here so the config does not load the test helpers)
const SNAP_ENV = process.env.SNAPSHOT_ENV || "ci";

// PW_PORT serves this checkout on another port, so a server left running by another checkout on 4173 is never reused
const PORT = Number(process.env.PW_PORT || 4173);
const exe = process.env.PW_CHROMIUM_PATH;
const chromiumLaunch = exe ? { launchOptions: { executablePath: exe } } : {};
// Which suites each engine runs (2026-11-11: two thirds of every CI run repeated, in other engines, tests of plain
// JavaScript that no engine can make differ, the calendar's sums, the Library's categories, the builder's lists):
// - ENGINE, how the page is drawn and printed, where engines do differ: every engine runs them;
// - FLOWS, reading, Home, the bars, accessibility and offline: WebKit too, Safari's engine, as most readers are on
//   iPhones and iPads (the iPhone runs every @mobile test, as before);
// - the rest is logic, run once, in Chromium.
const ENGINE = /(smoke|layout|text-size|edge|compat|print-view|fonts)\.spec\.mjs$/;
const FLOWS = /(smoke|layout|text-size|edge|compat|print-view|fonts|interactions|a11y|offline|reading|today|welcome)\.spec\.mjs$/;
const all = {
  chromium: { use: { ...devices["Desktop Chrome"], ...chromiumLaunch } },
  firefox: { use: { ...devices["Desktop Firefox"] }, grepInvert: /@chromium-only/, testMatch: ENGINE },
  webkit: { use: { ...devices["Desktop Safari"] }, grepInvert: /@chromium-only/, testMatch: FLOWS },
  iphone: { use: { ...devices["iPhone 13"] }, grep: /@mobile/ },
  ipad: { use: { ...devices["iPad (gen 7)"] }, grep: /@mobile/, testMatch: FLOWS },
  pixel: { use: { ...devices["Pixel 7"], ...chromiumLaunch }, grep: /@mobile/, testMatch: /(smoke|layout|text-size|edge|compat|interactions)\.spec\.mjs$/ },
};
const wanted = (process.env.PW_PROJECTS || (process.env.CI ? Object.keys(all).join(",") : "chromium")).split(",");

export default defineConfig({
  testDir: ".",
  testMatch: /.*\.spec\.mjs$/,
  timeout: 60_000,
  expect: {
    timeout: 10_000,
    // Screenshots: the fonts are served from the site, so pixels are stable; allow for anti-aliasing only
    toHaveScreenshot: {
      maxDiffPixelRatio: 0.002,
      animations: "disabled",
      caret: "hide",
      // hides the short note that comes and goes on a timer (see screenshot.css)
      stylePath: "./screenshot.css",
      // Pixels differ slightly between machines (font smoothing), so each machine type keeps its own set
      pathTemplate: `__snapshots__/{testFilePath}/{projectName}/${SNAP_ENV}/{arg}{ext}`,
    },
  },
  // Snapshots are shared by every OS (text) or kept per browser (screenshots, which differ by engine)
  snapshotPathTemplate: "__snapshots__/{testFilePath}/{projectName}/{arg}{ext}",
  fullyParallel: true,
  // GitHub's Linux machines have 4 cores for a public repository (2 left them half idle: a run took 15 minutes)
  workers: process.env.CI ? 4 : undefined,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : [["list"]],
  use: {
    baseURL: `http://localhost:${PORT}/`,
    // The service worker is blocked except in the offline tests, so every test sees the files on disk
    serviceWorkers: "block",
    locale: "en-US",
    timezoneId: "America/New_York",
    trace: "retain-on-failure",
  },
  projects: wanted.map((name) => ({ name, ...all[name] })),
  webServer: {
    command: "node serve.mjs",
    env: { PORT: String(PORT) },
    url: `http://localhost:${PORT}/`,
    reuseExistingServer: !process.env.CI,
  },
});
