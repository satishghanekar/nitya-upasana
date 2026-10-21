// Stage 4 mockup shots: today's phone reading against one text at a time (mockups/reading-view.css + .js injected
// over the real app). Run from the repo with the site served on PORT (default 4610):
//   node mockups/shoot-reading.mjs <out-dir>
import { chromium } from "../tests/node_modules/playwright/index.mjs";

const out = process.argv[2] || ".";
const base = "http://localhost:" + (process.env.PORT || 4610) + "/";
const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM_PATH || "/opt/pw-browsers/chromium" });

async function phone() {
  const p = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  await p.goto(base);
  await p.waitForTimeout(2500);
  return p;
}
async function inject(p) {
  await p.addStyleTag({ url: base + "mockups/reading-view.css" });
  await p.addScriptTag({ url: base + "mockups/reading-view.js" });
}
// the end of one text in the middle of the screen, with the bars showing
async function atEnd(p, sec) {
  await p.evaluate((id) => {
    const s = document.getElementById(id);
    window.scrollTo(0, s.getBoundingClientRect().bottom + scrollY - 700);
  }, sec);
  await p.waitForTimeout(400);
  await p.mouse.wheel(0, -60);
  await p.waitForTimeout(700);
}
async function fromLibrary(p, sec) {
  await p.locator("#hm").click();
  await p.waitForTimeout(400);
  await p.locator(`#jl a[data-go="${sec}"]`).click();
  await p.waitForTimeout(1500);
}
async function fromSession(p, name) {
  await p.locator("#tsc").locator(`text=${name}`).first().click();
  await p.waitForTimeout(1500);
}
async function shot(p, name) {
  await p.screenshot({ path: `${out}/${name}.png` });
}

// 1. Today, from the Library: the end of Devi Aarti runs straight into Shankar Aarti
let p = await phone();
await fromLibrary(p, "a3");
await p.evaluate(() => {
  const s = document.getElementById("a4");
  window.scrollTo(0, s.getBoundingClientRect().top + scrollY - 520);
});
await p.waitForTimeout(400);
await p.mouse.wheel(0, -60);
await p.waitForTimeout(700);
await shot(p, "1-today-library");

// 2. Proposed, from the Library: the text ends; Next / Previous in the Library's order
await inject(p);
await p.evaluate(() => window.mockRead("a3", "library"));
await atEnd(p, "a3");
await shot(p, "2-new-library");
await p.close();

// 3. Today, reading the evening session: Devi Aarti runs into the session's next text
p = await phone();
await fromSession(p, "देवीची आरती");
await p.evaluate(() => {
  const s = document.getElementById("a8");
  window.scrollTo(0, s.getBoundingClientRect().top + scrollY - 520);
});
await p.waitForTimeout(400);
await p.mouse.wheel(0, -60);
await p.waitForTimeout(700);
await shot(p, "3-today-session");

// 4. Proposed, in the session: Done · next, and where you are in the session
await inject(p);
await p.evaluate(() => window.mockRead("a3", "session"));
await atEnd(p, "a3");
await shot(p, "4-new-session");

// 5. Proposed, the session's last text
const last = await p.evaluate(() => [...document.querySelectorAll("section.inrun")].pop().id);
await p.evaluate((id) => window.mockRead(id, "session"), last);
await atEnd(p, last);
await shot(p, "5-new-session-last");

// 6. Proposed, the top of a text: nothing above it when scrolling up
await p.evaluate(() => window.mockRead("a3", "session"));
await p.evaluate(() => window.scrollTo(0, document.getElementById("a3").getBoundingClientRect().top + scrollY - 140));
await p.waitForTimeout(400);
await p.mouse.wheel(0, -200);
await p.waitForTimeout(700);
await shot(p, "6-new-top");
await p.close();

await browser.close();
