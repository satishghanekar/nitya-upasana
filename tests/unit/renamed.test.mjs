// Texts renamed (js/text/renamed.js): what a phone or a backup file saved under an old id comes back under the new one
import { describe, expect, test } from "vitest";
import { readFileSync } from "node:fs";
import { RENAMED, lineId, textId } from "../../js/text/renamed.js";
import { cleanRoutine } from "../../js/core/routine.js";
import { cleanLocal } from "../../js/core/library.js";
import { cleanChecklist } from "../../js/store/profiles.js";
import { migratePrefs } from "../../js/store/migrate.js";

const lib = JSON.parse(readFileSync(new URL("../../content/library.json", import.meta.url), "utf8"));
const ids = lib.texts.map((t) => t.id);
const PHONE = { desk: false, fs: 21 };

describe("the list of renamed texts", () => {
  test("every new id is a text in the library, and no old one is", () => {
    for (const [old, now] of Object.entries(RENAMED)) {
      expect(ids, old).toContain(now);
      expect(ids, old).not.toContain(old);
    }
  });
  test("every text's id and file name start with its category", () => {
    for (const t of lib.texts) {
      expect(t.id.startsWith(t.category + "-"), t.id).toBe(true);
      expect(t.file).toBe("texts/" + t.id + ".txt");
    }
  });
  test("an old id becomes the new one; any other id is left as it is", () => {
    expect(textId("sukhkarta")).toBe("aarti-sukhkarta");
    expect(textId("aarti-sukhkarta")).toBe("aarti-sukhkarta");
    expect(textId("a1")).toBe("a1");
    expect(textId("toString")).toBe("toString");
    expect(lineId("shree-rudra.12")).toBe("vedic-chant-shree-rudra.12");
    expect(lineId("aarti-belaguve.3")).toBe("aarti-belaguve.3");
    expect(lineId("s1l4")).toBe("s1l4");
    expect(lineId("")).toBe("");
  });
});

describe("saved data under old ids", () => {
  test("a routine", () => {
    const r = cleanRoutine({
      morning: { mode: "fixed", texts: ["atharvashirsha", "sukhkarta", "aarti-sukhkarta"] },
      evening: { mode: "weekday", days: { mon: ["ghalin-lotangan"] } },
    });
    expect(r.morning.texts).toEqual(["vedic-chant-atharvashirsha", "aarti-sukhkarta"]);
    expect(r.evening.days.mon).toEqual(["aarti-ghalin-lotangan"]);
  });
  test("today's ticks", () => {
    expect(cleanChecklist({ date: "2026-10-18", done: { evening: ["sukhkarta", "aarti-belaguve"] } }).done.evening).toEqual([
      "aarti-sukhkarta",
      "aarti-belaguve",
    ]);
  });
  test("a text moved to another category", () => {
    expect(cleanLocal({ added: [], renames: {}, moves: { "ghalin-lotangan": "bhajan" } }).moves).toEqual({ "aarti-ghalin-lotangan": "bhajan" });
  });
  test("the highlighted line, folded pieces and autoscroll speeds (a text without a legacy-id uses its own id)", () => {
    const { prefs, changed } = migratePrefs({ sv: 6, hl: "shree-rudra.12", af: ["shri-sukta", "a1"], asp: { "purusha-suktam": 4, a2: 6 } }, PHONE);
    expect(prefs).toMatchObject({ hl: "vedic-chant-shree-rudra.12", af: ["vedic-chant-shri-sukta", "a1"], asp: { "vedic-chant-purusha-suktam": 4, a2: 6 } });
    expect(changed).toBe(true);
    // and settings with nothing to rename are not changed
    expect(migratePrefs({ sv: 6, hl: "s1l4", af: ["a1"], asp: { a2: 6 } }, PHONE).changed).toBe(false);
  });
});
