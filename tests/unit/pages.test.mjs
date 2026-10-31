// About how many pages a printout takes (js/print/pages.js): the four rules of css/15-print.css, page by page
import { describe, expect, it } from "vitest";
import { countPages } from "../../js/print/pages.js";

// blocks one under another from the top, each [height] or [height, { keep, line }], with a gap between them
function col(list, gap = 10) {
  let y = 0;
  return list.map(([hgt, o]) => {
    const b = { top: y, bottom: y + hgt, ...o };
    y += hgt + gap;
    return b;
  });
}

describe("countPages", () => {
  it("counts nothing for nothing", () => {
    expect(countPages([], 1000)).toBe(0);
    expect(countPages([[]], 1000)).toBe(0);
  });

  it("starts every text on a new page", () => {
    expect(countPages([col([[100]]), col([[100]]), col([[100]])], 1000)).toBe(3);
  });

  it("never splits a block: one that does not fit goes to the next page", () => {
    // 400 + 400 fit (with the gap, 810); the third ends at 1220
    expect(countPages([col([[400], [400], [400]])], 1000)).toBe(2);
    expect(countPages([col([[300], [300], [300]])], 1000)).toBe(1);
  });

  it("keeps a title with the block after it", () => {
    // the title fits at the foot of page 1, its stanza does not: both go to page 2, then the last stanza to page 3
    const bs = col([[700], [50, { keep: true }], [400], [700]]);
    expect(countPages([bs], 1000)).toBe(3);
  });

  it("splits a long paragraph between lines, two lines at least on either side", () => {
    // 900 then 40 lines of 20: 4 lines fit under the first block (to 1000), the rest run on to page 2
    const bs = col([[900], [800, { line: 20 }]], 0);
    expect(countPages([bs], 1000)).toBe(2);
    // only one line fits at the foot: the paragraph moves whole to page 2 (800 fits there)
    const one = col([[975], [800, { line: 20 }]], 0);
    expect(countPages([one], 1000)).toBe(2);
    // a paragraph three pages long fills them
    expect(countPages([col([[3000, { line: 20 }]])], 1000)).toBe(3);
  });

  it("runs a block taller than a page over as many pages as it needs, from a page of its own", () => {
    expect(countPages([col([[100], [2500]])], 1000)).toBe(4);
    expect(countPages([col([[2500]])], 1000)).toBe(3);
  });
});
