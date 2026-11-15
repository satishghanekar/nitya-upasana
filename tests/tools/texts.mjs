// Each text's facts that come from its own lines, written into its header: "lines" (the line pairs in the file) and
// "letters" (the letters said as it is chanted, the dhrupad after every stanza included: js/core/timing.js
// chantedLetters, which a text's time is counted from). Run after adding or editing a text: npm run texts (from
// tests/). tests/unit/content.test.mjs fails when a number no longer matches its text, and names the file.
// Shared with Sankathara Chaturthi, which has no times (no js/core/timing.js): there it writes the lines alone and
// leaves a text's letters as they came (its texts are Nitya Upasana's files, copied as they are).
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { parseText } from "../../js/text/format.js";
import { toPiece } from "../../js/text/content.js";

const TIMING = new URL("../../js/core/timing.js", import.meta.url);
/** @type {((p: any) => number) | null} */
const chantedLetters = existsSync(TIMING) ? (await import(TIMING.href)).chantedLetters : null;

const content = new URL("../../content/", import.meta.url);
const library = JSON.parse(readFileSync(new URL("library.json", content), "utf8"));

/** Every text the library lists, by id, and the other versions of a text sung in more than one way */
export const IDS = library.categories.flatMap((c) => c.texts).concat(Object.values(library.versions || {}).flat());

/** What the header should say, from the text itself @param {string} raw  the file @param {string} file */
export function factsOf(raw, file) {
  const t = parseText(raw, file),
    lines = t.blocks.reduce((a, b) => a + b.lines.length, 0);
  return chantedLetters ? { lines, letters: chantedLetters(toPiece(t, 1)) } : { lines };
}

/** The file with its header's lines and letters as they should be (last in the header, as js/text/format.js orders
 * them), everything else as it was @param {string} raw @param {{ lines: number, letters?: number }} f */
export function withFacts(raw, f) {
  const at = raw.indexOf("\n---\n");
  const head = raw
    .slice(0, at)
    .split("\n")
    .filter((l) => !/^(lines|letters): /.test(l));
  // (without the times' code, the letters the file has are kept)
  const kept = raw.slice(0, at).match(/^letters: .*$/m),
    letters = f.letters ? ["letters: " + f.letters] : kept ? [kept[0]] : [];
  return [...head, "lines: " + f.lines, ...letters].join("\n") + raw.slice(at);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  let changed = 0;
  for (const id of IDS) {
    const at = new URL("texts/" + id + ".txt", content);
    const raw = readFileSync(at, "utf8");
    const next = withFacts(raw, factsOf(raw, id + ".txt"));
    if (next !== raw) {
      writeFileSync(at, next);
      changed++;
      console.log("texts/" + id + ".txt: " + next.match(/^lines: .*$/m)[0] + (chantedLetters ? ", " + next.match(/^letters: .*$/m)[0] : ""));
    }
  }
  console.log(changed ? changed + " text(s) brought up to date" : "every text is up to date");
}
