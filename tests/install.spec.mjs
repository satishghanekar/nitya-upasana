// The install page (js/features/install-page.js; Satish, 2026-11-19): the shared link and the QR code (?add) open it,
// with the one way to install for this device and browser (js/core/install-kind.js): the browser's own prompt on
// Android and in Chrome or Edge (with the menu's steps until the prompt comes), the steps with an arrow on an iPhone or
// an iPad, Open in Safari / Open in Chrome from an app's own browser, and the QR code on a computer. Each device is
// its user agent, so Chromium plays them all.
import { test, expect } from "@playwright/test";
import { openSite, openMore, SETUPS, axeEveryTheme, noViolations } from "./helpers.mjs";

const UA = {
  ios26: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Mobile/15E148 Safari/604.1",
  ios18: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1",
  instagram: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/22B83 Instagram 350.0.0.0",
  android: "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36",
  facebook:
    "Mozilla/5.0 (Linux; Android 14; Pixel 8; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/130.0.0.0 Mobile Safari/537.36 [FB_IAB/FB4A;FBAV/480.0.0.0;]",
};
const PHONE = { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true };
const page$ = (page) => page.locator("#install-page");
const steps = (page) => page.locator("#install-how .install-steps li");

test.describe("iPhone, Safari on iOS 26", () => {
  test.use({ ...PHONE, userAgent: UA.ios26 });

  test("the shared link opens the steps, the arrow at the bottom, and leaves the address and the welcome card alone", async ({ page }) => {
    const errors = [];
    await openSite(page, SETUPS.english, { hash: "?add", welcome: true, errors });
    await expect(page$(page)).toBeVisible();
    await expect(page.locator("#install-title")).toBeFocused();
    await expect(steps(page)).toHaveCount(4);
    await expect(steps(page).first()).toContainText("in the address bar");
    await expect(steps(page).nth(3)).toContainText("Open as Web App");
    await expect(page.locator("#install-arrow")).toBeVisible();
    await expect(page.locator("#install-arrow")).toHaveAttribute("data-at", "bottom");
    // the mark is gone, so the icon added from here opens the site itself
    expect(new URL(page.url()).search).toBe("");
    // the welcome card waits for the Home Screen app
    await expect(page.locator("#wlc")).toBeHidden();
    // I've added it: open it from the icon
    await page.locator("#install-added").click();
    await expect(page.locator("#install-how")).toContainText("open it from its icon");
    await expect(page.locator("#install-arrow")).toBeHidden();
    // Not now: Home, with focus on it
    await expect(page.locator("#install-close")).toHaveText("Not now, read in the browser");
    await page.locator("#install-close").click();
    await expect(page$(page)).toBeHidden();
    expect(errors).toEqual([]);
  });

  test("App in the Share menu opens it, Escape and the phone's Back close it", async ({ page }) => {
    await openSite(page, SETUPS.english);
    await expect(page$(page)).toBeHidden();
    await openMore(page);
    await page.locator("#inb").click();
    await expect(page$(page)).toBeVisible();
    await expect(page.locator("#install-close")).toHaveText("Close");
    await page.keyboard.press("Escape");
    await expect(page$(page)).toBeHidden();
    await openMore(page);
    await page.locator("#inb").click();
    await expect(page$(page)).toBeVisible();
    await page.goBack();
    await expect(page$(page)).toBeHidden();
  });

  test("no accessibility problems, in every theme", async ({ page }) => {
    await openSite(page, SETUPS.english, { hash: "?add" });
    expect(await axeEveryTheme(page, "#install-page")).toEqual(noViolations());
  });

  test("Marathi menus: the page in Marathi, Safari's own words in English", async ({ page }) => {
    await openSite(page, SETUPS["marathi-menus"], { hash: "?add" });
    await expect(page$(page)).toHaveAttribute("lang", "mr");
    await expect(page.locator("#install-how h3")).toHaveText("होम स्क्रीनवर जोडा");
    await expect(steps(page).nth(1).locator('b[lang="en"]')).toHaveText("Share");
  });
});

test.describe("iPhone, a link pasted with a space at the end", () => {
  test.use({ ...PHONE, userAgent: UA.ios26 });
  test("?add%20 still opens the install page, and the address is left clean", async ({ page }) => {
    await openSite(page, SETUPS.english, { hash: "?add%20" });
    await expect(page$(page)).toBeVisible();
    expect(new URL(page.url()).search).toBe("");
  });
});

test.describe("iPhone, Safari on iOS 18", () => {
  test.use({ ...PHONE, userAgent: UA.ios18 });
  test("Share in the toolbar: three steps, the arrow at the bottom", async ({ page }) => {
    await openSite(page, SETUPS.english, { hash: "?add" });
    await expect(steps(page)).toHaveCount(3);
    await expect(page.locator("#install-arrow")).toHaveAttribute("data-at", "bottom");
  });
});

test.describe("iPhone, Instagram's own browser", () => {
  test.use({ ...PHONE, userAgent: UA.instagram });
  test("Open in Safari goes to Safari at the install page, and Copy link is there", async ({ page }) => {
    await openSite(page, SETUPS.english, { hash: "?add" });
    await expect(page.locator("#install-how h3")).toHaveText("First, open this page in Safari");
    await expect(page.locator("#install-out")).toHaveAttribute("href", /^x-safari-http:\/\/localhost:\d+\/\?add$/);
    await expect(page.locator("#install-copy")).toBeVisible();
    await expect(page.locator("#install-arrow")).toBeHidden();
  });
});

test.describe("Android, Chrome", () => {
  test.use({ ...PHONE, userAgent: UA.android });

  test("Install: the menu's steps until Chrome offers its prompt, then Chrome's own box; installed, it says so", async ({ page }) => {
    await openSite(page, SETUPS.english, { hash: "?add" });
    await expect(page.locator("#install-go")).toHaveText("Install the app");
    await expect(page.locator("#install-menu")).toBeVisible();
    await expect(page.locator("#install-arrow")).toHaveAttribute("data-at", "top-right");
    // before the prompt, Install points to the steps
    await page.locator("#install-go").click();
    await expect(page.locator("#install-menu h3")).toBeFocused();
    // Chrome offers it: the steps and the arrow go, and Install asks Chrome
    await page.evaluate(() => {
      const e = new Event("beforeinstallprompt", { cancelable: true });
      e.prompt = () => (window.__prompted = true);
      e.userChoice = Promise.resolve({ outcome: "accepted" });
      window.dispatchEvent(e);
    });
    await expect(page.locator("#install-menu")).toBeHidden();
    await expect(page.locator("#install-arrow")).toBeHidden();
    await page.locator("#install-go").click();
    expect(await page.evaluate(() => window.__prompted)).toBe(true);
    await expect(page.locator("#install-how h3")).toHaveText("It's on your home screen");
    await expect(page.locator("#inb")).toBeHidden();
  });
});

test.describe("Android, Facebook's own browser", () => {
  test.use({ ...PHONE, userAgent: UA.facebook });
  test("Open in Chrome opens the install page in Chrome", async ({ page }) => {
    await openSite(page, SETUPS.english, { hash: "?add" });
    await expect(page.locator("#install-how h3")).toHaveText("First, open this page in Chrome");
    const href = await page.locator("#install-out").getAttribute("href");
    expect(href).toMatch(/^intent:\/\/localhost:\d+\/\?add#Intent;scheme=https;package=com\.android\.chrome;S\.browser_fallback_url=.*;end$/);
  });
});

test.describe("A computer, Chrome", () => {
  test.use({ viewport: { width: 1280, height: 800 } });
  test("Install on this computer, and the QR code for the phone, which opens the install page", async ({ page }) => {
    await openSite(page, SETUPS.english, { hash: "?add" });
    await expect(page.locator("#install-go")).toHaveText("Install on this computer");
    await expect(page.locator("#install-phone")).toBeVisible();
    await expect(page.locator("#install-phone svg")).toHaveCount(1);
    await expect(page.locator("#qrm .qri svg")).toHaveAttribute("aria-label", /\?add$/);
  });
});

test("opened from the home screen icon: no install page, and no App button", async ({ page }) => {
  await page.addInitScript(() => {
    const mm = window.matchMedia.bind(window);
    window.matchMedia = (q) => (q === "(display-mode: standalone)" ? { matches: true, media: q, addEventListener() {}, removeEventListener() {} } : mm(q));
  });
  await openSite(page, SETUPS.english, { hash: "?add" });
  await expect(page$(page)).toBeHidden();
  await openMore(page);
  await expect(page.locator("#inb")).toBeHidden();
});

test("Share sends the link with ?add, and the message says what the link does", async ({ page }) => {
  await page.addInitScript(() => {
    navigator.share = (d) => {
      window.__shared = d;
      return Promise.resolve();
    };
  });
  await openSite(page, SETUPS.english);
  await openMore(page);
  await page.locator("#shb").click();
  const d = await page.evaluate(() => window.__shared);
  expect(d.url).toMatch(/\/\?add$/);
  expect(d.text).toContain("Tap the link");
});
