// The page planner (js/print/pages.js): how a text's blocks are put on pages, in one column or two, and the size and
// layout chosen. Pure arithmetic on the blocks' heights, so it runs here without a browser; the print tests check the
// same rules on paper.
import { describe, expect, test } from "vitest";
import { balance, plan, choose } from "../../js/print/pages.js";

const blocks = (...hs) => hs.map((h) => ({ h }));
const ids = (pages) => pages.map((rows) => rows.map((r) => ("span" in r ? "s" + r.span : r.cols.map((c) => c.join(",")).join("|"))));

describe("balance: a run of stanzas between two columns", () => {
  test("the taller column as short as it can be, the left one the longer on a tie", () => {
    expect(balance([10, 10, 10, 10])).toEqual({ j: 2, h: 20 });
    expect(balance([10, 10, 10])).toEqual({ j: 2, h: 20 });
    expect(balance([30, 10, 10])).toEqual({ j: 1, h: 30 });
    expect(balance([10])).toEqual({ j: 1, h: 10 });
  });
});

describe("plan: one column", () => {
  test("stanzas are never split: one that does not fit starts the next page", () => {
    const r = plan(blocks(40, 40, 40), 100, 1);
    expect(r.n).toBe(2);
    expect(ids(r.pages)).toEqual([["0,1"], ["2"]]);
  });
  test("a title is kept with the stanza after it", () => {
    const items = [{ h: 50 }, { h: 10, span: true, keep: true }, { h: 45 }];
    const r = plan(items, 100, 1);
    expect(ids(r.pages)).toEqual([["0"], ["s1", "2"]]);
  });
  test("a paragraph that runs on fills the page and carries on overleaf", () => {
    const items = [{ h: 30 }, { h: 150, flow: true }];
    const r = plan(items, 100, 1);
    expect(r.n).toBe(2);
    expect(r.last).toBeCloseTo(0.8, 2);
  });
  test("a paragraph starts on the next page when not even two of its lines fit below", () => {
    const items = [{ h: 90 }, { h: 150, flow: true }];
    expect(plan(items, 100, 1).n).toBe(3);
    expect(ids(plan(items, 100, 1).pages)[1]).toEqual(["1"]);
  });
  test("a block taller than a page counts for every page it takes", () => {
    expect(plan(blocks(250), 100, 1).n).toBe(3);
  });
});

describe("plan: two columns", () => {
  test("a run of stanzas fills the left column, then the right, balanced on its last page", () => {
    const items = [{ h: 10, span: true, keep: true }, ...blocks(30, 30, 30, 30, 30, 30, 30, 30)];
    const r = plan(items, 100, 2);
    expect(r.n).toBe(2);
    expect(ids(r.pages)).toEqual([["s0", "1,2,3|4,5,6"], ["7|8"]]);
  });
  test("a block too wide for a column runs across both, between balanced runs (Ananyata's closing line)", () => {
    const items = [{ h: 10, span: true, keep: true }, ...blocks(20, 20, 20, 20), { h: 10, span: true }, ...blocks(20, 20)];
    const r = plan(items, 100, 2);
    expect(r.n).toBe(1);
    expect(ids(r.pages)).toEqual([["s0", "1,2|3,4", "s5", "6|7"]]);
  });
});

describe("choose: the size and layout of a text", () => {
  // a title and 8 stanzas of 30px on pages of 100px: 3 pages in one column at its own size, 2 in two
  const items = [{ h: 10, span: true, keep: true }, ...blocks(30, 30, 30, 30, 30, 30, 30, 30)];
  const at = (k, c, wide) => (c === 2 && wide ? null : plan(items, 100 / k, c));
  test("fewest pages first, then the largest size, then one column", () => {
    expect(choose((k, c) => at(k, c), [1.2, 1, 0.9, 0.8])).toMatchObject({ cols: 2, n: 2, k: 1.2 });
    // one column only: smaller still takes 3 pages, so it is not set smaller for nothing
    expect(choose((k, c) => (c === 1 ? at(k, c) : null), [1, 0.8])).toMatchObject({ cols: 1, n: 3, k: 1 });
  });
  test("no two columns where a line is too wide for one", () => {
    expect(choose((k, c) => at(k, c, true), [1, 0.8])).toMatchObject({ cols: 1 });
  });
  test("a text set larger never takes more pages than at its own size", () => {
    const one = [{ h: 10, span: true }, ...blocks(30, 30)];
    expect(choose((k, c) => (c === 1 ? plan(one, 100 / k, 1) : null), [1.6, 1.4, 1], 1)).toMatchObject({ k: 1.4, n: 1 });
  });
});
