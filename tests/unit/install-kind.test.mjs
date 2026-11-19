// Which way a device and browser installs the site (js/core/install-kind.js): the install page shows that one way.
import { describe, expect, test } from "vitest";
import { addLink, arrowAt, chromeIntent, hasAdd, installKind, ios17, oneTap, safariLink, withoutAdd } from "../../js/core/install-kind.js";

const UA = {
  ios26: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Mobile/15E148 Safari/604.1",
  ios18: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1",
  ios16: "Mozilla/5.0 (iPhone; CPU iPhone OS 16_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1",
  // an iPad asks for the desktop site
  ipad: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Safari/605.1.15",
  chromeIos: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/130.0.6723.90 Mobile/15E148 Safari/604.1",
  instagram: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/22B83 Instagram 350.0.0.0",
  gmailIos: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148",
  googleApp: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) GSA/340.0.1 Mobile/15E148 Safari/604.1",
  android: "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36",
  samsung: "Mozilla/5.0 (Linux; Android 14; SM-S921B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/26.0 Chrome/122.0.0.0 Mobile Safari/537.36",
  firefoxAndroid: "Mozilla/5.0 (Android 14; Mobile; rv:132.0) Gecko/132.0 Firefox/132.0",
  facebook:
    "Mozilla/5.0 (Linux; Android 14; Pixel 8; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/130.0.0.0 Mobile Safari/537.36 [FB_IAB/FB4A;FBAV/480.0.0.0;]",
  webview: "Mozilla/5.0 (Linux; Android 14; Pixel 8; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/130.0.0.0 Mobile Safari/537.36",
  chromeMac: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
  edgeWin: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36 Edg/130.0.0.0",
  safariMac: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Safari/605.1.15",
  firefoxWin: "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:132.0) Gecko/20100101 Firefox/132.0",
};

describe("installKind", () => {
  test.each([
    ["ios26", "ios26"],
    ["ios18", "ios"],
    ["ios16", "ios"],
    ["chromeIos", "iosBrowser"],
    ["instagram", "iosInApp"],
    ["gmailIos", "iosInApp"],
    ["googleApp", "iosInApp"],
    ["android", "android"],
    ["samsung", "samsung"],
    ["firefoxAndroid", "androidFirefox"],
    ["facebook", "androidInApp"],
    ["webview", "androidInApp"],
    ["chromeMac", "desktop"],
    ["edgeWin", "desktop"],
    ["safariMac", "mac"],
    ["firefoxWin", "firefox"],
  ])("%s → %s", (ua, kind) => {
    expect(installKind(UA[ua], { platform: /Mac/.test(UA[ua]) ? "MacIntel" : "Linux", touch: 0 })).toBe(kind);
  });
  test("an iPad asking for the desktop site is told by its touch screen", () => {
    expect(installKind(UA.ipad, { platform: "MacIntel", touch: 5 })).toBe("ipad");
    expect(installKind(UA.ipad, { platform: "MacIntel", touch: 0 })).toBe("mac");
  });
  test("opened from the icon: nothing to install", () => {
    expect(installKind(UA.ios26, { standalone: true })).toBe("app");
    expect(installKind(UA.android, { standalone: true })).toBe("app");
  });
});

test("the arrow points at the browser's button, and only the browsers with a prompt get one tap", () => {
  expect(arrowAt("ios26")).toBe("bottom");
  expect(arrowAt("ios")).toBe("bottom");
  expect(arrowAt("ipad")).toBe("top-right");
  expect(arrowAt("android")).toBe("top-right");
  expect(arrowAt("samsung")).toBe("bottom-right");
  expect(arrowAt("iosInApp")).toBe("");
  expect(arrowAt("mac")).toBe("");
  expect(["android", "samsung", "desktop"].every(oneTap)).toBe(true);
  expect(["ios26", "ios", "ipad", "iosBrowser", "androidFirefox", "mac", "firefox", "iosInApp", "androidInApp"].some(oneTap)).toBe(false);
});

test("the ways out of an app's own browser", () => {
  const u = "https://nitya-upasana.pages.dev/?add";
  expect(safariLink(u)).toBe("x-safari-https://nitya-upasana.pages.dev/?add");
  expect(chromeIntent(u)).toBe(
    "intent://nitya-upasana.pages.dev/?add#Intent;scheme=https;package=com.android.chrome;S.browser_fallback_url=https%3A%2F%2Fnitya-upasana.pages.dev%2F%3Fadd;end",
  );
  expect(ios17(UA.ios18)).toBe(true);
  expect(ios17(UA.ios16)).toBe(false);
});

test("the ?add mark: added to the shared link, found, and taken out leaving the rest", () => {
  expect(addLink("https://nitya-upasana.pages.dev", "/")).toBe("https://nitya-upasana.pages.dev/?add");
  expect(hasAdd("?add")).toBe(true);
  expect(hasAdd("?x=1&add")).toBe(true);
  expect(hasAdd("?add=1")).toBe(true);
  expect(hasAdd("?address=1")).toBe(false);
  expect(hasAdd("")).toBe(false);
  expect(withoutAdd("?add")).toBe("");
  expect(withoutAdd("?print=1&add")).toBe("?print=1");
  expect(withoutAdd("?address=2")).toBe("?address=2");
});
