// Sums up a print audit run (print-audit.spec.mjs) in tests/pdfs/REPORT.md: one row per printout, worst first,
// then every finding, grouped. Run by npm run print:audit after the PDFs are made.
import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("./pdfs/", import.meta.url));
const files = [];
(function walk(d) {
  for (const f of readdirSync(d)) {
    const p = join(d, f);
    if (statSync(p).isDirectory()) walk(p);
    else if (f.endsWith(".json")) files.push(p);
  }
})(root);
const runs = files.map((f) => JSON.parse(readFileSync(f, "utf8")));
const score = (r) => r.missing * 1000 + (r.overflow || 0) * 100 + r.outOfStep * 10 + r.brokeMidPhrase * 3 + r.lowFill;
runs.sort((a, b) => score(b) - score(a) || a.name.localeCompare(b.name));

const md = [];
md.push("# Print audit", "");
md.push(`${runs.length} printouts. Each passed the print checks (contents page numbers, nothing split or lost, footers) unless the test run says otherwise.`, "");
md.push("Columns: **over** = lines running past their column or the page margin; **out of step** = side-by-side rows where one side takes more lines than the other; **mid-phrase** = lines broken inside a phrase rather than at a preferred break; **wrapped** = lines that took more than their own lines (at a preferred break or not); **empty** = pages less than 45% used before a page break inside a piece; **resized** = lines set smaller to fit (smallest size in brackets).", "");
const tot = (k) => runs.reduce((s, r) => s + (r[k] || 0), 0);
md.push(`Totals: missing text ${tot("missing")}, running over ${tot("overflow")}, out of step ${tot("outOfStep")}, mid-phrase ${tot("brokeMidPhrase")}, wrapped ${tot("wrapped")}, mostly empty pages ${tot("lowFill")}, resized ${tot("resized")}.`, "");
for (const o of ["portrait", "landscape"]) {
  const rs = runs.filter((r) => r.layout === o),
    t = (k) => rs.reduce((s, r) => s + (r[k] || 0), 0);
  if (rs.length) md.push(`- ${o}: ${rs.length} printouts; running over ${t("overflow")}, out of step ${t("outOfStep")}, mid-phrase ${t("brokeMidPhrase")}, wrapped ${t("wrapped")}, pages ${t("pages")}`);
}
md.push("");
md.push("| Printout | Pages | Missing | Over | Out of step | Mid-phrase | Wrapped | Empty | Resized |", "|---|---|---|---|---|---|---|---|---|");
for (const r of runs)
  md.push(`| ${r.name} | ${r.pages} | ${r.missing || ""} | ${r.overflow || ""} | ${r.outOfStep || ""} | ${r.brokeMidPhrase || ""} | ${r.wrapped || ""} | ${r.lowFill || ""} | ${r.resized ? `${r.resized} (${r.smallest}%)` : ""} |`);
md.push("", "## Findings", "");
const kinds = {};
for (const r of runs) for (const f of r.findings) (kinds[f.kind] = kinds[f.kind] || []).push({ ...f, run: r.name });
for (const [k, list] of Object.entries(kinds)) {
  md.push(`### ${k} (${list.length})`, "");
  // the same line in many printouts is one problem: group by piece and text
  const by = {};
  for (const f of list) {
    const key = `${f.sid} · ${f.text}`;
    (by[key] = by[key] || []).push(f.run + (f.lines ? ` (${f.lines})` : ""));
  }
  for (const [key, where] of Object.entries(by).sort((a, b) => b[1].length - a[1].length))
    md.push(`- **${key}**: ${where.length} printout${where.length > 1 ? "s" : ""}${where.length <= 4 ? ": " + where.join("; ") : ""}`);
  md.push("");
}
writeFileSync(join(root, "REPORT.md"), md.join("\n"));
console.log(`print audit: ${runs.length} printouts; running over ${tot("overflow")}, out of step ${tot("outOfStep")}, mid-phrase ${tot("brokeMidPhrase")}, missing ${tot("missing")}, empty pages ${tot("lowFill")} → tests/pdfs/REPORT.md`);
