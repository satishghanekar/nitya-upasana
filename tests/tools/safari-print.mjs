// npm run safari-print: the printout as real Safari draws it (Safari's own WebDriver, safaridriver: no Playwright, whose
// WebKit is not Safari). For each combination below it opens the site from the test server, prints from the Print
// pop-up with Safari's print dialog stubbed out (it would stop the run), applies the print styles to the screen and
// photographs each part of the printout (cover, contents, every text, closing page) into tests/safari-prints/.
// It fails on a script error, on a printout that is not cover, contents, texts and closing page in that order, or on
// its English font not loaded. What it cannot do: open Safari's print sheet itself, or break the pages as Safari's
// printing does (that stays a manual check: README.md, "What automation can't cover").
//
// Once on a Mac: Safari → Settings → Advanced → "Show features for web developers"; Settings → Developer → "Allow
// remote automation"; and in Terminal, `safaridriver --enable`. Then run it after any change to the printout.

import { spawn } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const TESTS = fileURLToPath(new URL("..", import.meta.url));
const OUT = TESTS + "safari-prints/";
const PORT = 4198;
const WD = "http://localhost:4444";
const SITE = `http://localhost:${PORT}/`;

// name, settings (over the tests' BASE_PREFS), the texts (Library ids), the width of a page's text in mm
const RUNS = [
  ["marathi-traditional", { lang: "mr", lead: "mr", l2: "en" }, ["aarti-sukhkarta", "vedic-chant-durga-suktam", "aarti-devi"], 178],
  ["english-iast", { lang: "en", lead: "mr", l2: "en", tr: "iast" }, ["vedic-chant-durga-suktam", "aarti-sukhkarta"], 178],
  ["both-bold", { lang: "both", lead: "mr", l2: "en", pfn: "bold" }, ["aarti-sukhkarta", "aarti-devi"], 241],
  ["kannada-modern", { lang: "mr", lead: "mr", l2: "en", ind: "kn", pfn: "std" }, ["aarti-sukhkarta", "vedic-chant-shri-sukta"], 178],
  ["one-text", { lang: "mr", lead: "mr", l2: "en" }, ["vedic-chant-shri-sukta"], 178],
];

/** @param {string} method @param {string} path @param {any} [body] */
async function call(method, path, body) {
  const r = await fetch(WD + path, { method, headers: { "Content-Type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`${method} ${path}: ${JSON.stringify(j.value || j)}`);
  return j.value;
}
const sleep = (ms) => new Promise((ok) => setTimeout(ok, ms));
/** @param {string} sid @param {string} script @param {any[]} [args] */
const js = (sid, script, args = []) => call("POST", `/session/${sid}/execute/sync`, { script, args });
/** @param {string} sid @param {string} script @param {any[]} [args] */
const jsAsync = (sid, script, args = []) => call("POST", `/session/${sid}/execute/async`, { script, args });
/** @param {string} sid @param {string} cond */
async function until(sid, cond, secs = 30) {
  for (const end = Date.now() + secs * 1000; Date.now() < end; await sleep(250)) if (await js(sid, `return !!(${cond})`)) return;
  throw new Error("timed out waiting for " + cond);
}
/** @param {string} sid @param {number} ms */
const fontsIn = (sid, ms) => jsAsync(sid, `var done = arguments[arguments.length - 1]; document.fonts.ready.then(function () { setTimeout(done, ${ms}); });`);

// every rule inside @media print, as the printer sees them, applied to the screen, the print view as wide as a page's text
const APPLY_PRINT = `
var out = [];
[].forEach.call(document.styleSheets, function (sh) {
  try { [].forEach.call(sh.cssRules, function (r) { if (r.type === 4 && /print/.test(r.media.mediaText)) [].forEach.call(r.cssRules, function (x) { out.push(x.cssText); }); }); } catch (e) {}
});
var st = document.createElement("style");
st.textContent = out.join("\\n") + "\\nhtml, body { background: #fff !important; } #pv { width: " + arguments[0] + "mm !important; margin: 0 auto !important; padding: 10mm 0 !important; }";
document.head.appendChild(st);
scrollTo(0, 0);`;

/** @param {string} cmd @param {string[]} args @param {Record<string, string>} [env] */
const start = (cmd, args, env) => spawn(cmd, args, { cwd: TESTS, env: { ...process.env, ...env }, stdio: "ignore" });

async function main() {
  mkdirSync(OUT, { recursive: true });
  const server = start("node", ["serve.mjs"], { PORT: String(PORT) });
  const driver = start("safaridriver", ["-p", "4444"]);
  /** @type {string[]} */
  const failed = [];
  let sid = "";
  try {
    for (let i = 0; i < 40; i++) {
      const up = await Promise.all([
        fetch(SITE).then(
          (r) => r.ok,
          () => false,
        ),
        fetch(WD + "/status").then(
          (r) => r.ok,
          () => false,
        ),
      ]);
      if (up.every(Boolean)) break;
      await sleep(250);
    }
    sid = (await call("POST", "/session", { capabilities: { alwaysMatch: { browserName: "safari" } } })).sessionId;
    await call("POST", `/session/${sid}/window/rect`, { width: 1400, height: 1000, x: 0, y: 0 });
    for (const [name, prefs, ids, width] of RUNS) {
      // a clean start: no saved copy of the site (service worker, caches), the settings as given
      await call("POST", `/session/${sid}/url`, { url: SITE });
      await jsAsync(
        sid,
        "var done = arguments[arguments.length - 1]; Promise.all([navigator.serviceWorker ? navigator.serviceWorker.getRegistrations().then(function (rs) { return Promise.all(rs.map(function (r) { return r.unregister(); })); }) : 0, caches.keys().then(function (ks) { return Promise.all(ks.map(function (k) { return caches.delete(k); })); })]).then(function () { done(); }, function () { done(); });",
      );
      await js(sid, "localStorage.clear(); localStorage.setItem('aarti2-prefs', arguments[0]); localStorage.setItem('nitya-welcome', '2');", [
        JSON.stringify({ sv: 6, wake: 0, upf: 2, ...prefs }),
      ]);
      await call("POST", `/session/${sid}/url`, { url: SITE + "#" + name });
      await call("POST", `/session/${sid}/refresh`, {});
      await until(sid, "document.documentElement.hasAttribute('data-ready')");
      // Safari's print dialog would stop the run: Print counts instead
      await js(
        sid,
        "window.__errs = []; addEventListener('error', function (e) { window.__errs.push(String(e.message)); }); window.print = function () { window.__printed = (window.__printed || 0) + 1; }; document.dispatchEvent(new CustomEvent('nitya-print', { detail: { ids: arguments[0] } }));",
        [ids],
      );
      await until(sid, "!document.getElementById('prm').hidden");
      await js(sid, "var n = document.getElementById('prnx'); if (n && n.offsetParent) n.click();");
      await until(sid, "document.getElementById('prgp').offsetParent");
      await fontsIn(sid, 500); // (the fonts the pop-up asked for, as a reader's tap comes a moment later)
      await js(sid, "document.getElementById('prgp').click();");
      await until(sid, "window.__printed > 0");
      await fontsIn(sid, 300);
      await js(sid, APPLY_PRINT, [width]);
      await fontsIn(sid, 800);
      const info = await js(
        sid,
        `var pv = document.getElementById("pv");
        return {
          parts: [].map.call(pv.children, function (s) { return s.classList.contains("pvs") ? "text" : s.className; }),
          garamond: document.fonts.check('16px "EB Garamond"') && document.fonts.check('italic 16px "EB Garamond"'),
          errors: window.__errs,
        };`,
      );
      const els = await call("POST", `/session/${sid}/elements`, { using: "css selector", value: "#pv > section" });
      for (const [i, el] of els.slice(0, 8).entries()) {
        await js(sid, "arguments[0].scrollIntoView();", [el]);
        const png = await call("GET", `/session/${sid}/element/${Object.values(el)[0]}/screenshot`);
        writeFileSync(`${OUT}${name}-${i + 1}.png`, Buffer.from(png, "base64"));
      }
      // what must be so: no script error; more than one text, cover · contents · texts · closing page; one text, just it;
      // the English font loaded (printing asks for it in every font: the page number is in it)
      const want = ids.length > 1 ? ["pvcover", "pvcov", ...ids.map(() => "text"), "pvclose"] : ["text"];
      const bad = [];
      if (info.errors.length) bad.push("script errors: " + info.errors.join(" | "));
      if (JSON.stringify(info.parts) !== JSON.stringify(want)) bad.push(`parts ${info.parts.join(", ")}, not ${want.join(", ")}`);
      if (!info.garamond) bad.push("EB Garamond not loaded");
      console.log(`${bad.length ? "✗" : "✓"} ${name}: ${els.length} parts photographed${bad.length ? " · " + bad.join(" · ") : ""}`);
      if (bad.length) failed.push(name);
    }
  } finally {
    if (sid) await call("DELETE", `/session/${sid}`).catch(() => {});
    driver.kill();
    server.kill();
  }
  console.log(failed.length ? `Failed: ${failed.join(", ")}` : `All ${RUNS.length} printouts drawn by Safari: tests/safari-prints/`);
  process.exit(failed.length ? 1 : 0);
}

main().catch((e) => {
  console.error(String(e && e.message ? e.message : e));
  console.error("Is Safari's remote automation on? (this file's notes, at the top)");
  process.exit(1);
});
