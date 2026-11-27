// Play mode's order (js/core/play-queue.js): which texts have a recording, where it starts, what comes next and what
// was passed over
import { describe, expect, test } from "vitest";
import { clock, placeOf, playable, skipped, startAt, step, trackOf } from "../../js/core/play-queue.js";

const LINES = {
  a: "",
  b: "[Jagjit Singh](https://www.youtube.com/watch?v=2zOJ9aZR-08&t=10)",
  c: "",
  d: "[Jagjit Singh](https://www.youtube.com/watch?v=mt-vSIgsaxU&t=15&end=320), [Someone](https://www.youtube.com/watch?v=aASYnk-eaXI)",
  e: "[A Choir](https://www.youtube.com/watch?v=aASYnk-eaXI)",
};
const IDS = ["a", "b", "c", "d", "e"];
const track = (id) => trackOf(LINES[id]);

describe("Play mode's order", () => {
  test("a recording's video, start and end; the first of two; none without one", () => {
    expect(track("b")).toEqual({ who: "Jagjit Singh", video: "2zOJ9aZR-08", start: 10, end: 0 });
    expect(track("d")).toEqual({ who: "Jagjit Singh", video: "mt-vSIgsaxU", start: 15, end: 320 });
    expect(track("e")).toEqual({ who: "A Choir", video: "aASYnk-eaXI", start: 0, end: 0 });
    expect(track("a")).toBeNull();
    expect(trackOf(undefined)).toBeNull();
    expect(trackOf("[x](https://example.com/watch?v=2zOJ9aZR-08)")).toBeNull();
  });
  test("the texts with a recording, in order; where it starts, from the top or from a text", () => {
    expect(playable(IDS, track)).toEqual(["b", "d", "e"]);
    expect(startAt(IDS, track)).toBe(1);
    expect(startAt(IDS, track, "c")).toBe(3);
    expect(startAt(IDS, track, "e")).toBe(4);
    expect(startAt(["a", "c"], track)).toBe(-1);
  });
  test("next and previous pass over the texts with no recording, and end at the ends", () => {
    expect(step(IDS, track, 1, 1)).toBe(3);
    expect(step(IDS, track, 3, 1)).toBe(4);
    expect(step(IDS, track, 4, 1)).toBe(-1);
    expect(step(IDS, track, 3, -1)).toBe(1);
    expect(step(IDS, track, 1, -1)).toBe(-1);
  });
  test("what was passed over, its place among those with a recording, and the clock", () => {
    expect(skipped(IDS, 1, 3)).toEqual(["c"]);
    expect(skipped(IDS, 3, 4)).toEqual([]);
    expect(placeOf(IDS, track, 3)).toEqual([2, 3]);
    expect(clock(118.7)).toBe("1:58");
    expect(clock(5)).toBe("0:05");
    expect(clock(-3)).toBe("0:00");
  });
});
