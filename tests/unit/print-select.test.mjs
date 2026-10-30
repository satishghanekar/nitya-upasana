// Routine printouts (js/print/select.js): each text once in routine order, its tag, and the week at a glance
import { describe, expect, it } from "vitest";
import { dayList, selectRoutine, tagFor, weekGrid, weekOrder } from "../../js/print/select.js";

const WEEK = [0, 1, 2, 3, 4, 5, 6];
const ALL = ["morning", "afternoon", "evening"];

// A small routine of its own, so the tests do not change when content/routines.json does
const R = {
  morning: { mode: "weekday", days: { mon: ["a", "b"], tue: ["a"], wed: ["a", "c"], thu: ["a"], fri: ["a"], sat: ["a", "b"], sun: ["a", "b"] } },
  afternoon: { mode: "fixed", texts: [] },
  evening: { mode: "fixed", texts: ["d", "a"] },
};

describe("weekOrder", () => {
  it("puts the days Monday first, each once", () => {
    expect(weekOrder([0, 3, 1, 3])).toEqual([1, 3, 0]);
  });
});

describe("selectRoutine", () => {
  it("lists each text once, in routine order: Monday first, then the sessions in order", () => {
    expect(selectRoutine(R, WEEK, ALL).ids).toEqual(["a", "b", "d", "c"]);
  });
  it("keeps the days and sessions each text is in", () => {
    const s = selectRoutine(R, WEEK, ALL);
    expect(s.where.a).toEqual({ morning: [1, 2, 3, 4, 5, 6, 0], evening: [1, 2, 3, 4, 5, 6, 0] });
    expect(s.where.b).toEqual({ morning: [1, 6, 0] });
    expect(s.where.c).toEqual({ morning: [3] });
  });
  it("holds only the days and sessions chosen", () => {
    expect(selectRoutine(R, [3], ["morning"]).ids).toEqual(["a", "c"]);
    expect(selectRoutine(R, WEEK, ["evening"]).ids).toEqual(["d", "a"]);
    expect(selectRoutine(R, WEEK, ["afternoon"]).ids).toEqual([]);
  });
  it("leaves out a text the Library no longer has", () => {
    expect(selectRoutine(R, WEEK, ALL, (id) => id !== "b").ids).toEqual(["a", "d", "c"]);
  });
  it("is empty for no routine", () => {
    expect(selectRoutine(null, WEEK, ALL)).toEqual({ ids: [], where: {} });
  });
  it("prints each text of a routine once, Monday's Morning first", () => {
    const ids = selectRoutine(R, WEEK, ALL).ids;
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids[0]).toBe(R.morning.days.mon[0]);
  });
});

describe("dayList", () => {
  it("says Daily for all seven days", () => {
    expect(dayList(WEEK, "en")).toBe("Daily");
    expect(dayList(WEEK, "mr")).toBe("रोज");
  });
  it("writes a run of three or more days as a range, the rest one by one", () => {
    expect(dayList([1, 2, 3, 4, 5], "en")).toBe("Mon–Fri");
    expect(dayList([1, 6, 0], "en")).toBe("Mon, Sat, Sun");
    expect(dayList([5, 6, 0], "en")).toBe("Fri–Sun");
    expect(dayList([1, 2], "en")).toBe("Mon, Tue");
    expect(dayList([3], "mr")).toBe("बुध");
  });
});

describe("tags in Kannada, Telugu and Gujarati: each language's own words", () => {
  it("days, sessions and every day", () => {
    expect(dayList(WEEK, "kn")).toBe("ಪ್ರತಿದಿನ");
    expect(dayList([1, 2, 3, 4, 5], "te")).toBe("సోమ–శుక్ర");
    expect(tagFor({ morning: [1, 6, 0], evening: WEEK }, "gu")).toBe("સોમ, શનિ, રવિ · સવાર; દરરોજ · સાંજ");
  });
  it("a language with no words of its own: English", () => {
    expect(dayList(WEEK, "xx")).toBe("Daily");
  });
});

describe("tagFor", () => {
  const s = selectRoutine(R, WEEK, ALL);
  it("joins sessions that fall on the same days", () => {
    expect(tagFor(s.where.a, "en")).toBe("Daily · Morning, Evening");
    expect(tagFor(s.where.a, "mr")).toBe("रोज · सकाळ, सायंकाळ");
  });
  it("names the days of a text said on some days only", () => {
    expect(tagFor(s.where.b, "en")).toBe("Mon, Sat, Sun · Morning");
    expect(tagFor(s.where.c, "en")).toBe("Wed · Morning");
  });
  it("gives each set of days its own group", () => {
    expect(tagFor({ morning: [1, 6, 0], evening: WEEK }, "en")).toBe("Mon, Sat, Sun · Morning; Daily · Evening");
  });
  it("says only what the printout holds", () => {
    expect(tagFor(selectRoutine(R, [1, 2, 3, 4, 5], ALL).where.a, "en")).toBe("Mon–Fri · Morning, Evening");
    expect(tagFor(undefined, "en")).toBe("");
  });
});

describe("weekGrid", () => {
  it("numbers each cell's texts as the printout does, Monday first, sessions with texts only", () => {
    const s = selectRoutine(R, WEEK, ALL),
      g = weekGrid(R, WEEK, ALL, s.ids);
    expect(g.map((r) => r.session)).toEqual(["morning", "evening"]);
    expect(g[0].cells.map((c) => c.day)).toEqual([1, 2, 3, 4, 5, 6, 0]);
    expect(g[0].cells[0].nums).toEqual([1, 2]);
    expect(g[0].cells[2].nums).toEqual([1, 4]);
    expect(g[1].cells[0].nums).toEqual([3, 1]);
  });
  it("is a single column for one day", () => {
    const s = selectRoutine(R, [3], ALL),
      g = weekGrid(R, [3], ALL, s.ids);
    expect(g).toEqual([
      { session: "morning", cells: [{ day: 3, nums: [1, 2] }] },
      { session: "evening", cells: [{ day: 3, nums: [3, 1] }] },
    ]);
  });
});
