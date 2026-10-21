// The Today card's logic (js/core/routine.js, js/core/ticks.js): which session it is now, which texts a session
// has on a given day, the week row, walking through a session in order, and the ticks kept for one day.
// Dates are made with the local-time constructor, so the tests mean the same in any time zone.
import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import { pictureAt, pictureFor, sessionAt } from "../../js/core/time-of-day.js";
import { dateKey, firstUndone, SESSIONS, stepInSession, textsFor, weekOf } from "../../js/core/routine.js";
import { createTicks, PROFILE, TICKS_KEY } from "../../js/core/ticks.js";

const ROUTINE = JSON.parse(readFileSync(new URL("../../content/routines.json", import.meta.url), "utf8"));
const LIBRARY = JSON.parse(readFileSync(new URL("../../content/library.json", import.meta.url), "utf8"));
// 18 October 2026 is a Sunday
const at = (day, h = 9, m = 0) => new Date(2026, 9, day, h, m);

// A stand-in for localStorage
function memory() {
  const m = new Map();
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => m.set(k, String(v)),
    raw: m,
  };
}

describe("which session it is now (docs/decisions.md: Morning < 12:00, Afternoon 12:00–17:00, Evening ≥ 17:00)", () => {
  test.each([
    [5, 0, "morning"],
    [11, 59, "morning"],
    [12, 0, "afternoon"],
    [16, 59, "afternoon"],
    [17, 0, "evening"],
    [23, 59, "evening"],
  ])("%i:%i → %s", (h, m, s) => {
    expect(sessionAt(at(18, h, m))).toBe(s);
  });
  test("the three sessions, in the order of the day", () => {
    expect(SESSIONS).toEqual(["morning", "afternoon", "evening"]);
  });
});

describe("the picture for the day and session picked on the card", () => {
  test("Thursday morning: sunrise, Thursday's star", () => {
    expect(pictureFor("morning", 4)).toMatchObject({ picture: "sunrise", day: 4, label: "Sunrise picture, Thursday star marked" });
  });
  test("Wednesday afternoon: midday; Sunday evening: sunset", () => {
    expect(pictureFor("afternoon", 3).picture).toBe("midday");
    expect(pictureFor("evening", 0)).toMatchObject({ picture: "sunset", small: "picture-sunset-360.webp" });
  });
  test("the same as the clock's picture for the session and day now", () => {
    expect(pictureFor("evening", 0)).toEqual(pictureAt(at(18, 19)));
  });
});

describe("the default routine (content/routines.json)", () => {
  const DAYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
  test("Morning: Ganapati Atharvashirsha first, then Shree Rudra (Sat, Sun, Mon), Purusha Suktam (Mon, Wed) and Shri Sukta (Wed), then the Ganapati and Devi aartis", () => {
    const vedic = { 0: ["shree-rudra"], 1: ["shree-rudra", "purusha-suktam"], 3: ["purusha-suktam", "shri-sukta"], 6: ["shree-rudra"] };
    for (let d = 0; d < 7; d++) {
      expect(textsFor(ROUTINE, d, "morning"), DAYS[d]).toEqual(["atharvashirsha", ...(vedic[d] || []), "sukhkarta", "durge-durghat-bhari"]);
    }
  });
  test("Evening: the Ganapati and Devi aartis, Shankar's on Monday only, Ghalin Lotangan, then the day's ashtak last", () => {
    const days = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
    for (let d = 0; d < 7; d++) {
      const shankar = d === 1 ? ["lavathavati-vikrala"] : [];
      expect(textsFor(ROUTINE, d, "evening"), DAYS[d]).toEqual(["sukhkarta", "durge-durghat-bhari", ...shankar, "ghalin-lotangan", "ashtak-" + days[d]]);
    }
  });
  test("Afternoon is empty", () => {
    for (let d = 0; d < 7; d++) expect(textsFor(ROUTINE, d, "afternoon")).toEqual([]);
  });
  test("every text the routine names is in content/library.json", () => {
    const ids = new Set(LIBRARY.texts.map((t) => t.id));
    for (const s of SESSIONS) for (let d = 0; d < 7; d++) for (const id of textsFor(ROUTINE, d, s)) expect(ids.has(id), id).toBe(true);
  });
});

describe("routine lookup", () => {
  const weekly = {
    morning: { mode: "weekday", days: { mon: ["a"], thu: ["b", "c"] } },
    afternoon: { mode: "fixed", texts: [] },
    evening: { mode: "fixed", texts: ["x", "y", "x"] },
  };
  test("a weekday plan gives that day's list; a day with no list is empty", () => {
    expect(textsFor(weekly, 1, "morning")).toEqual(["a"]);
    expect(textsFor(weekly, 4, "morning")).toEqual(["b", "c"]);
    expect(textsFor(weekly, 0, "morning")).toEqual([]);
  });
  test("a text appears only once, where it first stands", () => {
    expect(textsFor(weekly, 3, "evening")).toEqual(["x", "y"]);
  });
  test("a missing or broken routine gives an empty session, never an error", () => {
    expect(textsFor(null, 1, "evening")).toEqual([]);
    expect(textsFor({}, 1, "evening")).toEqual([]);
    expect(textsFor({ evening: { mode: "fixed", texts: "x" } }, 1, "evening")).toEqual([]);
    expect(textsFor({ evening: { mode: "other" } }, 1, "evening")).toEqual([]);
  });
  test("the list returned is a copy", () => {
    const l = textsFor(weekly, 4, "morning");
    l.push("z");
    expect(textsFor(weekly, 4, "morning")).toEqual(["b", "c"]);
  });
});

describe("the week row: Monday to Sunday of this week", () => {
  test("on a Sunday, the week is the Monday before to that Sunday", () => {
    const w = weekOf(at(18, 20));
    expect(w.map(dateKey)).toEqual(["2026-10-12", "2026-10-13", "2026-10-14", "2026-10-15", "2026-10-16", "2026-10-17", "2026-10-18"]);
    expect(w.map((d) => d.getDay())).toEqual([1, 2, 3, 4, 5, 6, 0]);
  });
  test("on a Monday, the week starts that day; across a month end", () => {
    expect(weekOf(at(19)).map(dateKey)[0]).toBe("2026-10-19");
    expect(weekOf(new Date(2026, 9, 30)).map(dateKey)).toEqual(["2026-10-26", "2026-10-27", "2026-10-28", "2026-10-29", "2026-10-30", "2026-10-31", "2026-11-01"]);
  });
  test("each day is at local midnight", () => {
    for (const d of weekOf(at(15, 23, 30))) expect([d.getHours(), d.getMinutes()]).toEqual([0, 0]);
  });
  test("dateKey is the local date", () => {
    expect(dateKey(new Date(2026, 0, 5, 23, 59))).toBe("2026-01-05");
  });
});

describe("walking through a session", () => {
  const ids = ["a", "b", "c"];
  test("the first text not yet ticked", () => {
    expect(firstUndone(ids, [])).toBe(0);
    expect(firstUndone(ids, ["a"])).toBe(1);
    expect(firstUndone(ids, ["a", "c"])).toBe(1);
    expect(firstUndone(ids, ["a", "b", "c"])).toBe(-1);
    expect(firstUndone([], [])).toBe(-1);
  });
  test("Next goes to the following text, and after the last one the session ends", () => {
    expect(stepInSession(ids, "a", 1)).toEqual({ to: "b" });
    expect(stepInSession(ids, "b", 1)).toEqual({ to: "c" });
    expect(stepInSession(ids, "c", 1)).toEqual({ end: true });
  });
  test("Prev goes back, and has nothing before the first text", () => {
    expect(stepInSession(ids, "c", -1)).toEqual({ to: "b" });
    expect(stepInSession(ids, "a", -1)).toBeNull();
  });
  test("a text outside the session leaves Prev and Next to the library order", () => {
    expect(stepInSession(ids, "z", 1)).toBeNull();
    expect(stepInSession([], "a", 1)).toBeNull();
  });
});

describe("ticks: kept on this device for one day", () => {
  test("a tick is kept for its day and session", () => {
    const s = memory(),
      t = createTicks(s);
    t.set("2026-10-18", "evening", "sukhkarta", true);
    t.set("2026-10-18", "evening", "durge-durghat-bhari", true);
    expect(t.done("2026-10-18", "evening")).toEqual(["sukhkarta", "durge-durghat-bhari"]);
    expect(t.done("2026-10-18", "morning")).toEqual([]);
  });
  test("ticks survive a reload (a new reader of the same storage)", () => {
    const s = memory();
    createTicks(s).set("2026-10-18", "morning", "atharvashirsha", true);
    expect(createTicks(s).done("2026-10-18", "morning")).toEqual(["atharvashirsha"]);
  });
  test("unticking removes it; ticking twice keeps one", () => {
    const t = createTicks(memory());
    t.set("2026-10-18", "evening", "a", true);
    t.set("2026-10-18", "evening", "a", true);
    expect(t.done("2026-10-18", "evening")).toEqual(["a"]);
    t.set("2026-10-18", "evening", "a", false);
    expect(t.done("2026-10-18", "evening")).toEqual([]);
  });
  test("the next day starts with no ticks, and a tick that day drops yesterday's", () => {
    const s = memory(),
      t = createTicks(s);
    t.set("2026-10-18", "evening", "a", true);
    expect(t.done("2026-10-19", "evening")).toEqual([]);
    t.set("2026-10-19", "morning", "b", true);
    expect(t.done("2026-10-19", "evening")).toEqual([]);
    expect(t.done("2026-10-18", "evening")).toEqual([]);
    expect(JSON.parse(s.getItem(TICKS_KEY)).profiles[PROFILE]).toEqual({ date: "2026-10-19", done: { morning: ["b"] } });
  });
  test("prune clears an older day's ticks from storage", () => {
    const s = memory(),
      t = createTicks(s);
    t.set("2026-10-18", "evening", "a", true);
    t.prune("2026-10-19");
    expect(JSON.parse(s.getItem(TICKS_KEY)).profiles[PROFILE]).toEqual({ date: "2026-10-19", done: {} });
    t.set("2026-10-19", "evening", "a", true);
    t.prune("2026-10-19");
    expect(t.done("2026-10-19", "evening")).toEqual(["a"]);
  });
  test("ticks belong to the person reading: each has their own, the same storage", () => {
    const s = memory();
    let who = "pa";
    const t = createTicks(s, undefined, () => who);
    t.set("2026-10-18", "evening", "a", true);
    who = "pb";
    expect(t.done("2026-10-18", "evening")).toEqual([]);
    t.set("2026-10-18", "evening", "b", true);
    who = "pa";
    expect(t.done("2026-10-18", "evening")).toEqual(["a"]);
    expect(Object.keys(JSON.parse(s.getItem(TICKS_KEY)).profiles).sort()).toEqual(["pa", "pb"]);
    // no one named yet: the family's
    who = "";
    expect(t.done("2026-10-18", "evening")).toEqual([]);
  });
  test("the old single list's key and name (read once, when moving ticks into the first person)", () => {
    expect(TICKS_KEY).toBe("nitya-ticks");
    expect(PROFILE).toBe("family");
  });
  test("broken or missing storage never throws, and ticks then last for this visit", () => {
    const bad = memory();
    bad.setItem(TICKS_KEY, "{not json");
    expect(createTicks(bad).done("2026-10-18", "evening")).toEqual([]);
    const off = {
      getItem() {
        throw new Error("blocked");
      },
      setItem() {
        throw new Error("blocked");
      },
    };
    const t = createTicks(off);
    expect(() => t.set("2026-10-18", "evening", "a", true)).not.toThrow();
    expect(t.done("2026-10-18", "evening")).toEqual(["a"]);
    expect(createTicks(null).done("2026-10-18", "evening")).toEqual([]);
  });
});
