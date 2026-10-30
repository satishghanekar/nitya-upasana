// The Today card's logic (js/core/routine.js, js/core/ticks.js): which session it is now, which texts a session
// has on a given day, the week row, walking through a session in order, and the ticks kept for one day.
// Dates are made with the local-time constructor, so the tests mean the same in any time zone.
import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import { pictureAt, pictureFor, sessionAt } from "../../js/core/time-of-day.js";
import { dateKey, SESSIONS, stepInSession, textsFor, weekOf } from "../../js/core/routine.js";
import { PROFILE, TICKS_KEY } from "../../js/core/ticks.js";

const ROUTINE = JSON.parse(readFileSync(new URL("../../content/routines.json", import.meta.url), "utf8"));
const LIBRARY = JSON.parse(readFileSync(new URL("../../content/library.json", import.meta.url), "utf8"));
// 18 October 2026 is a Sunday
const at = (day, h = 9, m = 0) => new Date(2026, 9, day, h, m);

describe("which session it is now (Morning < 12:00, Afternoon 12:00–17:00, Evening ≥ 17:00)", () => {
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
  // (2026-10-23: the starting routine everyone gets; each person changes it in the routine builder)
  const EXPECT = {
    morning: {
      sun: [
        "vedic-chant-atharvashirsha",
        "vedic-chant-laghunyasa",
        "vedic-chant-shree-rudra",
        "vedic-chant-purusha-suktam",
        "vedic-chant-durga-suktam",
        "aarti-sukhkarta",
        "aarti-durge-durghat-bhari",
        "aarti-jaydeva-jaydeva-samartha",
        "aarti-ghalin-lotangan",
        "vedic-chant-mantra-pushpanjali",
      ],
      mon: [
        "vedic-chant-atharvashirsha",
        "vedic-chant-laghunyasa",
        "vedic-chant-shree-rudra",
        "vedic-chant-purusha-suktam",
        "vedic-chant-durga-suktam",
        "ashtak-surya-ashtakam",
        "aarti-sukhkarta",
        "aarti-durge-durghat-bhari",
        "aarti-jaydeva-jaydeva-samartha",
        "aarti-ovaloon-aarti-chaitanyabrahma",
        "aarti-ghalin-lotangan",
        "vedic-chant-mantra-pushpanjali",
      ],
      tue: [
        "vedic-chant-atharvashirsha",
        "vedic-chant-purusha-suktam",
        "vedic-chant-shri-sukta",
        "aarti-sukhkarta",
        "aarti-durge-durghat-bhari",
        "aarti-jaydeva-jaydeva-samartha",
        "aarti-kariton-guruvar",
        "aarti-ghalin-lotangan",
        "vedic-chant-mantra-pushpanjali",
      ],
      wed: [
        "vedic-chant-atharvashirsha",
        "vedic-chant-purusha-suktam",
        "vedic-chant-shri-sukta",
        "aarti-sukhkarta",
        "aarti-durge-durghat-bhari",
        "aarti-jaydeva-jaydeva-samartha",
        "aarti-belaguve",
        "aarti-ghalin-lotangan",
        "vedic-chant-mantra-pushpanjali",
      ],
      thu: [
        "vedic-chant-atharvashirsha",
        "vedic-chant-purusha-suktam",
        "vedic-chant-shri-sukta",
        "aarti-sukhkarta",
        "aarti-durge-durghat-bhari",
        "aarti-jaydeva-jaydeva-samartha",
        "aarti-belaguve",
        "aarti-ghalin-lotangan",
        "vedic-chant-mantra-pushpanjali",
      ],
      fri: [
        "vedic-chant-atharvashirsha",
        "vedic-chant-purusha-suktam",
        "vedic-chant-shri-sukta",
        "aarti-sukhkarta",
        "aarti-durge-durghat-bhari",
        "aarti-jaydeva-jaydeva-samartha",
        "aarti-ghalin-lotangan",
        "vedic-chant-mantra-pushpanjali",
      ],
      sat: [
        "vedic-chant-atharvashirsha",
        "vedic-chant-laghunyasa",
        "vedic-chant-shree-rudra",
        "vedic-chant-purusha-suktam",
        "vedic-chant-durga-suktam",
        "aarti-sukhkarta",
        "aarti-durge-durghat-bhari",
        "aarti-jaydeva-jaydeva-samartha",
        "aarti-ghalin-lotangan",
        "vedic-chant-mantra-pushpanjali",
      ],
    },
    afternoon: { sun: [], mon: [], tue: [], wed: [], thu: [], fri: [], sat: [] },
    evening: {
      sun: [
        "aarti-sukhkarta",
        "aarti-durge-durghat-bhari",
        "aarti-jay-jay-aarti-shrigururaya",
        "aarti-ghalin-lotangan",
        "vedic-chant-mantra-pushpanjali",
        "ashtak-sunday",
        "ashtak-brahmachaitanya-sarikha",
        "stotra-ram-raksha",
      ],
      mon: [
        "aarti-sukhkarta",
        "aarti-durge-durghat-bhari",
        "aarti-jay-jay-aarti-shrigururaya",
        "aarti-lavathavati-vikrala",
        "aarti-ghalin-lotangan",
        "vedic-chant-mantra-pushpanjali",
        "ashtak-monday",
        "ashtak-ananyata-maj-ghado",
      ],
      tue: [
        "aarti-sukhkarta",
        "aarti-durge-durghat-bhari",
        "aarti-jay-jay-aarti-shrigururaya",
        "aarti-shendur-lal-chadhayo",
        "aarti-kariton-guruvar",
        "aarti-ghalin-lotangan",
        "vedic-chant-mantra-pushpanjali",
        "ashtak-tuesday",
        "ashtak-anudin-anutapen",
        "stotra-maruti-stotra",
        "stotra-hanuman-chalisa",
      ],
      wed: [
        "aarti-sukhkarta",
        "aarti-durge-durghat-bhari",
        "aarti-jay-jay-aarti-shrigururaya",
        "aarti-ovaloon-aarti-chaitanyabrahma",
        "aarti-ghalin-lotangan",
        "vedic-chant-mantra-pushpanjali",
        "ashtak-wednesday",
        "ashtak-sadguru-padukashtak",
      ],
      thu: [
        "aarti-sukhkarta",
        "aarti-durge-durghat-bhari",
        "aarti-jay-jay-aarti-shrigururaya",
        "aarti-trigunatmak-traimurti",
        "aarti-ovaloo-sapreme-aarti",
        "aarti-ghalin-lotangan",
        "vedic-chant-mantra-pushpanjali",
        "ashtak-thursday",
        "stotra-shant-ho-shriguru",
        "stotra-shriguru-datta-jay",
        "stotra-jay-karunaghan-nij",
        "stotra-ghorakashtoddharan",
        "stotra-vandu-guruchya-charanarvinda",
        "stotra-martand-bavani",
        "stotra-sadguru-vandana",
      ],
      fri: [
        "aarti-sukhkarta",
        "aarti-durge-durghat-bhari",
        "aarti-jay-jay-aarti-shrigururaya",
        "aarti-ghalin-lotangan",
        "vedic-chant-mantra-pushpanjali",
        "ashtak-friday",
        "ashtak-haachi-subodh",
      ],
      sat: [
        "aarti-sukhkarta",
        "aarti-durge-durghat-bhari",
        "aarti-jay-jay-aarti-shrigururaya",
        "aarti-dhanya-jagin-guruvarya",
        "aarti-ghalin-lotangan",
        "vedic-chant-mantra-pushpanjali",
        "ashtak-saturday",
        "stotra-maruti-stotra",
        "stotra-hanuman-chalisa",
      ],
    },
  };
  test.each(["morning", "afternoon", "evening"])("%s, each day as planned", (s) => {
    for (let d = 0; d < 7; d++) expect(textsFor(ROUTINE, d, s), s + " " + DAYS[d]).toEqual(EXPECT[s][DAYS[d]]);
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
    expect(weekOf(new Date(2026, 9, 30)).map(dateKey)).toEqual([
      "2026-10-26",
      "2026-10-27",
      "2026-10-28",
      "2026-10-29",
      "2026-10-30",
      "2026-10-31",
      "2026-11-01",
    ]);
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

describe("ticks before profiles", () => {
  test("the old single list's key and name (read once, when moving ticks into the first person)", () => {
    expect(TICKS_KEY).toBe("nitya-ticks");
    expect(PROFILE).toBe("family");
  });
});
