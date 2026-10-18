// Which picture the app shows, and which weekday star is ringed, for a given moment (js/core/time-of-day.js).
// Sessions as in docs/decisions.md: Morning before 12:00, Afternoon 12:00–17:00, Evening from 17:00.
// Dates are made with the local-time constructor, so the tests mean the same in any time zone.
import { describe, expect, test } from "vitest";
import { nextChange, pictureAt, sessionAt, STARS } from "../../js/core/time-of-day.js";

// 18 October 2026 is a Sunday
const at = (day, h, m = 0, s = 0) => new Date(2026, 9, day, h, m, s);

describe("session and picture by the clock", () => {
  test.each([
    [0, 0, "morning", "sunrise"],
    [6, 30, "morning", "sunrise"],
    [11, 59, "morning", "sunrise"],
    [12, 0, "afternoon", "midday"],
    [14, 0, "afternoon", "midday"],
    [16, 59, "afternoon", "midday"],
    [17, 0, "evening", "sunset"],
    [21, 30, "evening", "sunset"],
    [23, 59, "evening", "sunset"],
  ])("%i:%i is %s → %s", (h, m, session, picture) => {
    expect(sessionAt(at(18, h, m))).toBe(session);
    expect(pictureAt(at(18, h, m))).toMatchObject({ session, picture });
  });
  test("the last second before a change still shows the earlier picture", () => {
    expect(pictureAt(at(18, 11, 59, 59)).picture).toBe("sunrise");
    expect(pictureAt(at(18, 16, 59, 59)).picture).toBe("midday");
  });
});

describe("files and words", () => {
  test("each picture has its card and full-screen files", () => {
    expect(pictureAt(at(18, 8))).toMatchObject({ small: "picture-sunrise-360.webp", large: "picture-sunrise.webp", favicon: "icon-32.png" });
    expect(pictureAt(at(18, 13))).toMatchObject({ small: "picture-midday-360.webp", large: "picture-midday.webp", favicon: "favicon-midday-32.png" });
    expect(pictureAt(at(18, 19))).toMatchObject({ small: "picture-sunset-360.webp", large: "picture-sunset.webp", favicon: "favicon-sunset-32.png" });
  });
  test("the label names the picture and today's star", () => {
    expect(pictureAt(at(18, 8)).label).toBe("Sunrise picture, Sunday star marked");
    expect(pictureAt(at(20, 13)).label).toBe("Midday picture, Tuesday star marked");
    expect(pictureAt(at(24, 19)).label).toBe("Sunset picture, Saturday star marked");
  });
});

describe("today's weekday star", () => {
  test.each([
    [18, 0, "Sunday"],
    [19, 1, "Monday"],
    [20, 2, "Tuesday"],
    [21, 3, "Wednesday"],
    [22, 4, "Thursday"],
    [23, 5, "Friday"],
    [24, 6, "Saturday"],
  ])("18–24 Oct: the %ith is star %i (%s)", (d, day, name) => {
    const p = pictureAt(at(d, 9));
    expect(p.day).toBe(day);
    expect(p.dayName).toBe(name);
    expect(p.star).toEqual(STARS.sunrise[day]);
  });
  test("the star is read off the picture shown at that time", () => {
    expect(pictureAt(at(22, 13)).star).toEqual(STARS.midday[4]);
    expect(pictureAt(at(22, 18)).star).toEqual(STARS.sunset[4]);
  });
  test("the stars run left to right in an arch, Wednesday (बु) at the top centre", () => {
    for (const list of Object.values(STARS)) {
      expect(list).toHaveLength(7);
      const xs = list.map((s) => s[0]);
      expect(xs).toEqual([...xs].sort((a, b) => a - b));
      expect(list[3][0]).toBeCloseTo(50, 0);
      expect(Math.min(...list.map((s) => s[1]))).toBe(list[3][1]);
      for (const [x, y] of list) {
        expect(x).toBeGreaterThan(5);
        expect(x).toBeLessThan(95);
        expect(y).toBeGreaterThan(5);
        expect(y).toBeLessThan(50);
      }
    }
  });
});

describe("when the picture next changes", () => {
  test.each([
    [at(18, 8, 15), at(18, 12)],
    [at(18, 0, 0), at(18, 12)],
    [at(18, 12, 0), at(18, 17)],
    [at(18, 16, 59, 59), at(18, 17)],
    [at(18, 17, 0), at(19, 0)],
    [at(18, 23, 59), at(19, 0)],
    [at(31, 20), new Date(2026, 10, 1)], // month end
  ])("after %s: %s", (now, next) => {
    expect(nextChange(now).getTime()).toBe(next.getTime());
  });
  test("at the change the new picture shows", () => {
    const now = at(18, 23, 0);
    expect(pictureAt(nextChange(now))).toMatchObject({ picture: "sunrise", day: 1 });
  });
});
