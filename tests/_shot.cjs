const { chromium } = require("@playwright/test");
const S = "/private/tmp/claude-501/-Users-satishghanekar-Library-Mobile-Documents-com-apple-CloudDocs-development-nitya-upasana/e26a2039-48de-4b7d-9ddd-a8b920d2a49e/scratchpad/";
(async () => {
  const b = await chromium.launch();
  for (const cs of ["dark", "light"]) {
    const p = await b.newPage({ viewport: { width: 390, height: 900 }, colorScheme: cs, deviceScaleFactor: 2 });
    await p.goto("http://localhost:8000/?v=" + Date.now());
    await p.click("#panb");
    await p.waitForSelector("#calm .cd");
    await p.locator("#calm").screenshot({ path: S + "moon-" + cs + ".png" });
  }
  await b.close();
})();
