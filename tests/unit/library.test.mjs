// The library's categories (slice 3, js/core/library.js): the bundled ones from content/categories.json with the
// family's additions, renames and moves on top; built-in categories can be renamed here but never deleted.
import { describe, expect, test } from "vitest";
import { readFileSync } from "node:fs";
import {
  addCategory,
  categoriesOf,
  categoryOf,
  cleanLocal,
  cleanName,
  counts,
  emptyLocal,
  makeId,
  MAX_ADDED,
  moveText,
  NAME_MAX,
  nameProblem,
  removeCategory,
  renameCategory,
  resetName,
  shelves,
} from "../../js/core/library.js";

const read = (p) => readFileSync(new URL("../../" + p, import.meta.url), "utf8");
const BUNDLED = JSON.parse(read("content/categories.json"));
const lib = JSON.parse(read("content/library.json"));
// the texts in library.json's order, with their own category
const ORDER = lib.texts.map((t) => t.id);
const TEXTS = ORDER.map((id) => ({ id, category: lib.texts.find((t) => t.id === id).category }));
const ids = (cats) => cats.map((c) => c.id);
const shelf = (local, id) => shelves(TEXTS, categoriesOf(BUNDLED, local), local).find((s) => s.category.id === id).texts;

describe("the bundled library (decisions Q2)", () => {
  const cats = categoriesOf(BUNDLED, emptyLocal());
  test("categories in order, with Marathi and English names", () => {
    expect(ids(cats)).toEqual(["vedic-chant", "aarti", "stotra", "ashtak"]);
    expect(cats[0].name).toEqual({ mr: "वैदिक मंत्र", en: "Vedic Chant" });
    expect(cats[1].name).toEqual({ mr: "आरती", en: "Aarti" });
    expect(cats.every((c) => c.origin === "bundled" && c.original === null)).toBe(true);
  });
  test("every text is on its own category's shelf, in reading order; Atharvashirsha is Vedic Chant, Ghalin Lotangan is Aarti", () => {
    const sh = shelves(TEXTS, cats, emptyLocal());
    expect(sh.map((s) => [s.category.id, s.texts])).toEqual(
      ["vedic-chant", "aarti", "stotra", "ashtak"].map((c) => [c, TEXTS.filter((t) => t.category === c).map((t) => t.id)]),
    );
    expect(shelf(emptyLocal(), "vedic-chant")[0]).toBe("vedic-chant-atharvashirsha");
    expect(shelf(emptyLocal(), "aarti")).toContain("aarti-ghalin-lotangan");
    expect(Object.values(counts(sh)).reduce((a, b) => a + b, 0)).toBe(lib.texts.length);
  });
  test("every text in library.json names a bundled category", () => {
    for (const t of lib.texts) expect(ids(cats)).toContain(t.category);
  });
});

describe("names", () => {
  test("trimmed, spaces run together, one language used for both when the other is empty", () => {
    expect(cleanName({ mr: "  भजन  ", en: "" })).toEqual({ mr: "भजन", en: "भजन" });
    expect(cleanName({ mr: "", en: " Bhajan\n songs " })).toEqual({ mr: "Bhajan songs", en: "Bhajan songs" });
    expect(cleanName({ mr: " ", en: "" })).toBe(null);
    expect(cleanName(null)).toBe(null);
    expect(Array.from(cleanName({ en: "x".repeat(99) }).en).length).toBe(NAME_MAX);
  });
  test("a name already used by another category, in either language, is taken", () => {
    const cats = categoriesOf(BUNDLED, emptyLocal());
    expect(nameProblem({ mr: "आरती", en: "" }, cats)).toBe("taken");
    expect(nameProblem({ mr: "", en: "aarti " }, cats)).toBe("taken");
    expect(nameProblem({ mr: "आरती", en: "Aarti" }, cats, "aarti")).toBe(null);
    expect(nameProblem({ mr: "", en: "" }, cats)).toBe("empty");
  });
  test("readable ids from the English name, never one in use", () => {
    expect(makeId({ mr: "भजन", en: "Bhajan" }, ["aarti"])).toBe("bhajan");
    expect(makeId({ mr: "भजन", en: "Bhajan" }, ["bhajan"])).toBe("bhajan-2");
    expect(makeId({ mr: "भजन", en: "भजन" }, [])).toBe("category");
    expect(makeId({ mr: "", en: "Shlok & Mantra!" }, [])).toBe("shlok-mantra");
  });
});

describe("adding, renaming and deleting a category", () => {
  test("add: after the others, by its readable id, empty", () => {
    const r = addCategory(emptyLocal(), BUNDLED, { mr: "भजन", en: "Bhajan" });
    expect(r.ok).toBe(true);
    expect(r.id).toBe("bhajan");
    const cats = categoriesOf(BUNDLED, r.local);
    expect(ids(cats)).toEqual(["vedic-chant", "aarti", "stotra", "ashtak", "bhajan"]);
    expect(cats[4]).toMatchObject({ origin: "family", name: { mr: "भजन", en: "Bhajan" } });
    expect(shelf(r.local, "bhajan")).toEqual([]);
  });
  test("add refuses an empty or taken name, and more than the limit", () => {
    expect(addCategory(emptyLocal(), BUNDLED, { mr: "", en: " " })).toEqual({ ok: false, problem: "empty" });
    expect(addCategory(emptyLocal(), BUNDLED, { mr: "", en: "Stotra" })).toEqual({ ok: false, problem: "taken" });
    let l = emptyLocal();
    for (let i = 0; i < MAX_ADDED; i++) l = addCategory(l, BUNDLED, { en: "Mine " + i }).local;
    expect(addCategory(l, BUNDLED, { en: "One more" })).toEqual({ ok: false, problem: "full" });
  });
  test("the input is never changed", () => {
    const l = emptyLocal();
    addCategory(l, BUNDLED, { en: "Bhajan" });
    renameCategory(l, BUNDLED, "aarti", { en: "Aartis" });
    expect(l).toEqual(emptyLocal());
  });
  test("a bundled category can be renamed on this phone, and given its own name back", () => {
    const r = renameCategory(emptyLocal(), BUNDLED, "vedic-chant", { mr: "वेद", en: "Veda" });
    expect(r.ok).toBe(true);
    const c = categoriesOf(BUNDLED, r.local)[0];
    expect(c).toMatchObject({ id: "vedic-chant", name: { mr: "वेद", en: "Veda" }, original: { mr: "वैदिक मंत्र", en: "Vedic Chant" } });
    // the texts stay where they were
    expect(shelf(r.local, "vedic-chant")).toEqual(shelf(emptyLocal(), "vedic-chant"));
    expect(categoriesOf(BUNDLED, resetName(r.local, "vedic-chant"))[0].name.en).toBe("Vedic Chant");
    // typing the original name again forgets the rename
    const back = renameCategory(r.local, BUNDLED, "vedic-chant", { mr: "वैदिक मंत्र", en: "Vedic Chant" });
    expect(back.local.renames).toEqual({});
  });
  test("a family category is renamed in place", () => {
    const a = addCategory(emptyLocal(), BUNDLED, { en: "Bhajan" }).local;
    const r = renameCategory(a, BUNDLED, "bhajan", { mr: "भजने", en: "Bhajans" });
    expect(r.local.added[0]).toMatchObject({ id: "bhajan", name: { mr: "भजने", en: "Bhajans" } });
    expect(renameCategory(a, BUNDLED, "nope", { en: "x" })).toEqual({ ok: false, problem: "missing" });
    expect(renameCategory(a, BUNDLED, "bhajan", { en: "Aarti" })).toEqual({ ok: false, problem: "taken" });
  });
  test("a bundled category can't be deleted; a family one can, and its texts go back home", () => {
    expect(removeCategory(emptyLocal(), BUNDLED, "aarti")).toEqual({ ok: false, problem: "bundled" });
    expect(removeCategory(emptyLocal(), BUNDLED, "nope")).toEqual({ ok: false, problem: "missing" });
    let l = addCategory(emptyLocal(), BUNDLED, { en: "Bhajan" }).local;
    l = moveText(l, categoriesOf(BUNDLED, l), TEXTS.find((t) => t.id === "aarti-ghalin-lotangan"), "bhajan").local;
    expect(shelf(l, "bhajan")).toEqual(["aarti-ghalin-lotangan"]);
    const r = removeCategory(l, BUNDLED, "bhajan");
    expect(r.ok).toBe(true);
    expect(r.local).toEqual(emptyLocal());
    expect(shelf(r.local, "aarti")).toContain("aarti-ghalin-lotangan");
  });
});

describe("moving a text", () => {
  const gl = TEXTS.find((t) => t.id === "aarti-ghalin-lotangan");
  test("to another category, keeping reading order there", () => {
    let l = moveText(emptyLocal(), categoriesOf(BUNDLED, emptyLocal()), gl, "stotra").local;
    const atv = TEXTS.find((t) => t.id === "vedic-chant-atharvashirsha");
    l = moveText(l, categoriesOf(BUNDLED, l), atv, "stotra").local;
    // in reading order among the Stotra already there
    expect(shelf(l, "stotra")).toEqual(ORDER.filter((id) => ["vedic-chant-atharvashirsha", "aarti-ghalin-lotangan"].includes(id) || shelf(emptyLocal(), "stotra").includes(id)));
    expect(shelf(l, "aarti")).not.toContain("aarti-ghalin-lotangan");
    expect(shelf(l, "vedic-chant")).toEqual(shelf(emptyLocal(), "vedic-chant").filter((id) => id !== "vedic-chant-atharvashirsha"));
    expect(categoryOf(gl, categoriesOf(BUNDLED, l), l)).toBe("stotra");
  });
  test("back to its own category forgets the move; an unknown category is refused", () => {
    const cats = categoriesOf(BUNDLED, emptyLocal());
    const l = moveText(emptyLocal(), cats, gl, "stotra").local;
    expect(moveText(l, cats, gl, "aarti").local.moves).toEqual({});
    expect(moveText(l, cats, gl, "nope")).toEqual({ ok: false, problem: "missing" });
  });
  test("a move to a category that is gone is ignored", () => {
    const l = { added: [], renames: {}, moves: { "aarti-ghalin-lotangan": "gone" } };
    expect(categoryOf(gl, categoriesOf(BUNDLED, l), l)).toBe("aarti");
  });
});

describe("what storage or a backup file holds is checked", () => {
  test("damaged parts are dropped", () => {
    expect(cleanLocal(null)).toEqual(emptyLocal());
    expect(cleanLocal("x")).toEqual(emptyLocal());
    const l = cleanLocal({
      added: [{ id: "bhajan", name: { mr: "भजन", en: "Bhajan" }, order: 5 }, { id: "bhajan", name: { en: "Twice" } }, { id: "Bad Id", name: { en: "x" } }, { id: "noname" }],
      renames: { aarti: { mr: "आरत्या", en: "" }, "vedic-chant": 3 },
      moves: { "aarti-ghalin-lotangan": "bhajan", x: 5, "<b>": "aarti" },
    });
    expect(l).toEqual({
      added: [{ id: "bhajan", name: { mr: "भजन", en: "Bhajan" }, order: 5 }],
      renames: { aarti: { mr: "आरत्या", en: "आरत्या" } },
      moves: { "aarti-ghalin-lotangan": "bhajan" },
    });
  });
  test("a clean one comes back the same", () => {
    let l = addCategory(emptyLocal(), BUNDLED, { mr: "भजन", en: "Bhajan" }).local;
    l = renameCategory(l, BUNDLED, "aarti", { mr: "आरत्या", en: "Aartis" }).local;
    l = moveText(l, categoriesOf(BUNDLED, l), TEXTS[1], "bhajan").local;
    expect(cleanLocal(JSON.parse(JSON.stringify(l)))).toEqual(l);
  });
});
