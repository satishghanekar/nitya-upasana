// The print builder's What step (js/print/what.js): the pages a printout takes, from each text's pages in the plan of
// the whole Library
import { describe, expect, it } from "vitest";
import { pagesFor } from "../../js/print/what.js";

describe("pagesFor", () => {
  const counts = { a1: 3, a2: 1, a3: 8 };
  it("adds the contents page when more than one text is printed", () => {
    expect(pagesFor(["a1", "a2"], counts, 1)).toBe(5);
    expect(pagesFor(["a1", "a2", "a3"], counts, 2)).toBe(14);
  });
  it("prints one text on its own, without contents", () => {
    expect(pagesFor(["a3"], counts, 1)).toBe(8);
  });
  it("is not known while the plan is not laid out, or for a text it lacks", () => {
    expect(pagesFor(["a1"], null, 1)).toBe(null);
    expect(pagesFor(["a1", "a9"], counts, 1)).toBe(null);
  });
  it("is nothing for nothing chosen", () => {
    expect(pagesFor([], counts, 1)).toBe(null);
  });
});
