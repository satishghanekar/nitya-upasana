// Do the sister apps still match? Nitya Upasana and Sankathara Chaturthi share one architecture, and many of their
// files are the same or nearly so. This compares every file the two have in common (the scripts, the styles, the
// service worker and the tests) and checks each against tools/sister-baseline.json: how many lines differed when the
// two were last brought in line. A file that now differs by more has drifted: most often a fix made in one app and not
// yet in the other. A file that differs by less has come closer, and its number can go down (--update).
// This file and the baseline are the same in both apps.
//
//   cd tests && npm run sister                 # the other app beside this one (../nitya-upasana or ../sankathara-chaturthi)
//   cd tests && npm run sister -- ../../other  # or where it is
//   cd tests && npm run sister -- --update     # once the two are back in line: record how far apart they are now
import { readFileSync, writeFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { basename, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const APPS = ["nitya-upasana", "sankathara-chaturthi"];
const here = resolve(fileURLToPath(new URL("../..", import.meta.url)));
const args = process.argv.slice(2);
const update = args.includes("--update");
const other = resolve(args.find((a) => !a.startsWith("--")) || join(here, "..", APPS.find((a) => a !== basename(here)) || APPS[0]));
const BASE = fileURLToPath(new URL("sister-baseline.json", import.meta.url));

if (!existsSync(join(other, "js", "main.js"))) {
  console.error("The other app is not at " + other + ": give its folder, as in  npm run sister -- ../../nitya-upasana");
  process.exit(2);
}

// The files to compare: the site's scripts and styles, the service worker, and the tests (not their screenshots)
const SKIP = new Set(["node_modules", "__snapshots__", "test-results", "playwright-report", "pdfs", ".lighthouseci"]);
function list(root, dir) {
  const d = join(root, dir);
  if (!existsSync(d)) return [];
  return readdirSync(d).flatMap((f) => {
    const p = dir + "/" + f;
    if (SKIP.has(f)) return [];
    if (statSync(join(root, p)).isDirectory()) return list(root, p);
    return /\.(m?js|css)$/.test(f) ? [p] : [];
  });
}
const files = (root) => new Set(["sw.js", ...list(root, "js"), ...list(root, "css"), ...list(root, "tests")].filter((f) => existsSync(join(root, f))));
const mine = files(here),
  theirs = files(other);
const shared = [...mine].filter((f) => theirs.has(f)).sort();

// Lines that differ: those taken out plus those put in, as git counts them (the same seen from either app)
function apart(f) {
  let out = "";
  try {
    out = execFileSync("git", ["diff", "--no-index", "--numstat", "--", join(other, f), join(here, f)], { encoding: "utf8" });
  } catch (e) {
    out = e.stdout || ""; // exit code 1: they differ
  }
  const m = /^(\d+)\s+(\d+)/.exec(out);
  return m ? +m[1] + +m[2] : 0;
}
const now = Object.fromEntries(shared.map((f) => [f, apart(f)]));
/** @param {number} n */
const lines = (n) => n + (n === 1 ? " line" : " lines") + " apart";

if (update) {
  writeFileSync(BASE, JSON.stringify(now, null, 1) + "\n");
  const same = shared.filter((f) => !now[f]).length;
  console.log("Recorded " + shared.length + " shared files (" + same + " the same) in tools/sister-baseline.json. Copy it to the other app too.");
  process.exit(0);
}

const base = existsSync(BASE) ? JSON.parse(readFileSync(BASE, "utf8")) : {};
const drift = [],
  closer = [],
  added = [];
for (const f of shared) {
  if (!(f in base)) added.push(f + " (" + lines(now[f]) + ")");
  else if (now[f] > base[f]) drift.push(f + ": " + lines(now[f]) + ", was " + base[f] + (base[f] ? "" : " (the same)"));
  else if (now[f] < base[f]) closer.push(f + ": " + lines(now[f]) + ", was " + base[f]);
}
const gone = Object.keys(base).filter((f) => !now.hasOwnProperty(f));
const show = (title, xs) => xs.length && console.log("\n" + title + "\n  " + xs.join("\n  "));
const same = shared.filter((f) => !now[f]).length;
console.log(shared.length + " files in both apps, " + same + " of them the same. Compared with " + other);
show("Drifted apart (bring the change to the other app, or record it with --update if it is meant):", drift);
show("Closer than before (record it with --update):", closer);
show("New in both apps (record it with --update):", added);
show("No longer in both apps (record it with --update):", gone);
if (!drift.length && !closer.length && !added.length && !gone.length) console.log("As the baseline: nothing has drifted.");
process.exit(drift.length ? 1 : 0);
