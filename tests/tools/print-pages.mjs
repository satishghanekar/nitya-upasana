// npm run print-pages [-- --update]: every text's page count, alone, in nine combinations, against the baseline
// (tools/print-pages.json), or, with --update, recorded as the new baseline. The counting is tests/print-pages.spec.mjs;
// this runs it (Chrome, five at a time) and, on --update, joins the combinations' counts into one file.

import { spawnSync } from "node:child_process";
import { readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const TESTS = fileURLToPath(new URL("..", import.meta.url));
const TOOLS = fileURLToPath(new URL(".", import.meta.url));
const update = process.argv.includes("--update");

const r = spawnSync("npx", ["playwright", "test", "print-pages.spec.mjs", "--workers=5", "--reporter=line"], {
  cwd: TESTS,
  stdio: "inherit",
  env: { ...process.env, PW_PROJECTS: "chromium", PRINT_PAGES: "1", ...(update ? { PRINT_PAGES_UPDATE: "1" } : {}) },
});

if (update && r.status === 0) {
  /** @type {Record<string, Record<string, number>>} */
  const all = {};
  for (const f of readdirSync(TOOLS)
    .filter((x) => /^print-pages-.+\.json$/.test(x))
    .sort()) {
    all[f.replace(/^print-pages-|\.json$/g, "")] = JSON.parse(readFileSync(TOOLS + f, "utf8"));
    rmSync(TOOLS + f);
  }
  writeFileSync(TOOLS + "print-pages.json", JSON.stringify(all, null, 1) + "\n");
  console.log(`Recorded ${Object.keys(all).length} combinations in tests/tools/print-pages.json.`);
}
process.exit(r.status ?? 1);
