// The quick check (npm run quick): the fast tests while you work, a couple of minutes instead of the full run.
//
//   npm run quick                   lint, types, every logic test, then the browser suites for what changed
//   npm run quick -- --list         only print which browser suites it would run
//   QUICK_BASE=some-branch npm run quick    compare with another branch than origin/main
//
// "What changed" is every file that differs from origin/main: commits on this branch, edits not yet committed
// and new files. Each changed file picks the browser suites that test it (SUITES below); smoke always runs. A file
// the list doesn't know picks interactions and visual, the broadest quick pair.
//
// The quick check never replaces the full run (npm run full): every change is still fully tested before it is
// merged. It only finds most mistakes sooner.
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const BASE = process.env.QUICK_BASE || "origin/main";
const listOnly = process.argv.includes("--list");

// Changed file (path from the repository root) → the suites that test it. Every matching rule adds its suites.
const SUITES = [
  // the tests themselves: a changed spec runs itself; shared test code runs everything
  [/^tests\/(\w[\w-]*)\.spec\.mjs$/, (m) => [m[1]]],
  [/^tests\/(helpers|print-helpers|playwright\.config|serve)\.mjs$|^tests\/package/, () => ["ALL"]],
  [/^tests\/__snapshots__\/(\w[\w-]*)\.spec\.mjs\//, (m) => [m[1]]],
  // texts and lists
  [/^content\/texts\//, () => ["content"]],
  [/^content\/library\.json$|^content\/categories\.json$/, () => ["content", "library"]],
  [/^content\/festivals\.json$/, () => ["calendar"]],
  [/^content\/routines\.json$/, () => ["today"]],
  // the offline copy and the files Cloudflare serves
  [/^sw\.js$|^_headers$|^manifest\.json$|^js\/parts\.js$|^js\/features\/offline\.js$/, () => ["offline", "site-files"]],
  // styles: each area's own sheet runs that area's suite; the shared sheets run the layout and screenshot suites
  [/^css\/0[0-9]-/, () => ["layout", "visual", "compat"]],
  [/^css\/01-theme\.css$/, () => ["a11y"]],
  [/^css\/03-menus-print-view\.css$/, () => ["print"]],
  [/^css\/10-today\.css$/, () => ["today", "reading"]],
  [/^css\/11-profiles\.css$/, () => ["profiles"]],
  [/^css\/12-calendar\.css$/, () => ["calendar"]],
  [/^css\/13-library\.css$/, () => ["library"]],
  [/^css\/14-builder\.css$/, () => ["builder"]],
  [/^css\/99-fallbacks\.css$/, () => ["compat"]],
  // the script, area by area
  [/^js\/print\/|^js\/features\/print\.js$/, () => ["print"]],
  // the printout builds its own copy of the pieces with these (js/print/compose.js)
  [/^js\/render\.js$|^js\/text\/(iast|layout|line-breaks|stanza-numbers|dhrupad-markers)\.js$|^js\/features\/bars\.js$/, () => ["print"]],
  [/^js\/text\/(iast|format|content|load|dhrupad-markers|stanza-numbers)\.js$/, () => ["content", "interactions"]],
  [/^js\/text\/search/, () => ["library", "interactions"]],
  [/^js\/text\/(layout|line-breaks|autofit)\.js$/, () => ["layout", "visual"]],
  [/^js\/core\/(panchang|panchang-names|festivals)\.js$|^js\/features\/(vedic-calendar|astronomy|sankashti)\.js$/, () => ["calendar"]],
  [/^js\/core\/(routine|ticks|time-of-day)\.js$|^js\/features\/(today-card|day-picture)\.js$/, () => ["today", "reading"]],
  [/^js\/features\/(routine-builder|text-picker)\.js$/, () => ["builder"]],
  [/^js\/features\/(end-card|history|bottom-bar)\.js$/, () => ["reading", "today", "interactions"]],
  [/^js\/store\/|^js\/features\/(profiles|backup)\.js$/, () => ["profiles"]],
  [/^js\/core\/library\.js$|^js\/features\/(library|contents-list|reading-sheet)\.js$/, () => ["library"]],
  // pictures and fonts
  [/\.(png|jpg|webp|svg|woff2)$/, () => ["visual"]],
];
// Changes that no browser test can see
const NO_BROWSER = /\.md$|^docs\/|^mockups\/|^originals\/|^\.github\/|^tests\/unit\/|^tests\/tools\/|^\.gitignore$/;
// Lint, types and logic tests only: these run anyway
const CHECKED_ELSEWHERE = /^tests\/(eslint|stylelint|vitest)\.config\.mjs$|^tests\/tsconfig\.json$|^tests\/quick\.mjs$/;

function git(...args) {
  return execFileSync("git", args, { cwd: ROOT, encoding: "utf8" }).split("\n").filter(Boolean);
}

function changedFiles() {
  let committed = [];
  try {
    committed = git("diff", "--name-only", `${BASE}...HEAD`);
  } catch {
    console.warn(`quick: can't compare with ${BASE} (git fetch origin main?); checking uncommitted changes only`);
  }
  const uncommitted = git("diff", "--name-only", "HEAD");
  const added = git("ls-files", "--others", "--exclude-standard");
  return [...new Set([...committed, ...uncommitted, ...added])].sort();
}

function suitesFor(files) {
  const picked = new Set(["smoke"]);
  for (const f of files) {
    if (NO_BROWSER.test(f) || CHECKED_ELSEWHERE.test(f)) continue;
    let matched = false;
    for (const [re, to] of SUITES) {
      const m = f.match(re);
      if (m) {
        matched = true;
        for (const s of to(m)) picked.add(s);
      }
    }
    // a site file the list doesn't know yet (js/main.js, index.html, a new feature…): the broadest quick pair
    if (!matched) for (const s of ["interactions", "visual"]) picked.add(s);
  }
  if (picked.has("ALL")) return ["ALL"];
  return [...picked].filter((s) => existsSync(new URL(`./${s}.spec.mjs`, import.meta.url))).sort();
}

const files = changedFiles();
const suites = suitesFor(files);
console.log(`quick: ${files.length} changed file(s) since ${BASE}`);
for (const f of files) console.log(`  ${f}`);
console.log(`quick: browser suites: ${suites.join(", ")}`);
if (listOnly) process.exit(0);

// stop at the first failing step, so the quickest failure is reported first
function run(label, cmd, args) {
  console.log(`\nquick: ${label}`);
  const r = spawnSync(cmd, args, { cwd: fileURLToPath(new URL(".", import.meta.url)), stdio: "inherit" });
  if (r.status !== 0) {
    console.error(`\nquick: ${label} failed`);
    process.exit(r.status || 1);
  }
}
run("lint", "npm", ["run", "--silent", "lint"]);
run("types", "npm", ["run", "--silent", "types"]);
run("logic tests", "npm", ["run", "--silent", "unit"]);
run("browser", "npx", ["playwright", "test", ...(suites[0] === "ALL" ? [] : suites.map((s) => `${s}.spec.mjs`))]);
console.log("\nquick: all passed. Run npm run full before merging.");
