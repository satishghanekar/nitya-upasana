// Public holidays (js/core/holidays.js, content/holidays.json): US federal, India national, Maharashtra and Karnataka
import { describe, expect, test } from "vitest";
import { readFileSync } from "node:fs";
import { civilDay, easter, holidaysBetween, holidaysInMonth } from "../../js/core/holidays.js";
import { festivalsBetween } from "../../js/core/festivals.js";

const read = (p) => JSON.parse(readFileSync(new URL("../../content/" + p, import.meta.url), "utf8"));
const H = read("holidays.json");
const F = read("festivals.json");
const PUNE = { lat: 18.5204, lon: 73.8567, tz: "Asia/Kolkata" };
const COLUMBUS = { lat: 39.9612, lon: -82.9988, tz: "America/New_York" };
const on = (id, y, place = PUNE) => holidaysBetween(y + "-01-01", y + "-12-31", place, H).filter((h) => h.id === id).map((h) => h.date);

describe("the list", () => {
  test("every holiday has names, a short name, known groups and a rule", () => {
    for (const h of H.holidays) {
      expect(h.mr && h.en && h.short.mr && h.short.en, h.id).toBeTruthy();
      expect(h.groups.length, h.id).toBeGreaterThan(0);
      for (const g of h.groups) expect(Object.keys(H.groups), h.id).toContain(g);
    }
    expect(new Set(H.holidays.map((h) => h.id)).size).toBe(H.holidays.length);
  });
});

describe("civil rules", () => {
  test("Easter Sunday (the Gregorian computus)", () => {
    expect([2024, 2025, 2026, 2027, 2038].map((y) => easter(y).toISOString().slice(0, 10))).toEqual(["2024-03-31", "2025-04-20", "2026-04-05", "2027-03-28", "2038-04-25"]);
  });
  test("a date, the nth weekday, the last weekday, days from Easter", () => {
    expect(civilDay({ date: "01-26" }, 2026)).toBe("2026-01-26");
    expect(civilDay({ month: 11, weekday: 4, nth: 4 }, 2026)).toBe("2026-11-26"); // Thanksgiving
    expect(civilDay({ month: 11, weekday: 4, nth: 4 }, 2029)).toBe("2029-11-22");
    expect(civilDay({ month: 5, weekday: 1, nth: -1 }, 2026)).toBe("2026-05-25"); // Memorial Day
    expect(civilDay({ month: 5, weekday: 1, nth: -1 }, 2027)).toBe("2027-05-31");
    expect(civilDay({ month: 9, weekday: 1, nth: 1 }, 2026)).toBe("2026-09-07"); // Labor Day
    expect(civilDay({ easter: -2 }, 2026)).toBe("2026-04-03"); // Good Friday
  });
  test("the US federal holidays of 2026", () => {
    const us = holidaysBetween("2026-01-01", "2026-12-31", COLUMBUS, H).filter((h) => h.groups.includes("us")).map((h) => h.date + " " + h.id);
    expect(us).toEqual([
      "2026-01-01 new-year", "2026-01-19 mlk-day", "2026-02-16 presidents-day", "2026-05-25 memorial-day", "2026-06-19 juneteenth",
      "2026-07-04 us-independence-day", "2026-09-07 labor-day", "2026-10-12 columbus-day", "2026-11-11 veterans-day",
      "2026-11-26 thanksgiving", "2026-12-25 christmas",
    ]);
  });
});

describe("holidays set by a tithi", () => {
  test("on the same day as the festival with the same tithi (Ugadi is Gudi Padwa, Basava Jayanti Akshaya Tritiya)", () => {
    const fest = (id) => festivalsBetween("2026-01-01", "2027-12-31", PUNE, F).filter((f) => f.id === id).map((f) => f.date);
    expect([...on("ugadi", 2026), ...on("ugadi", 2027)]).toEqual(fest("gudi-padwa"));
    expect([...on("basava-jayanti", 2026), ...on("basava-jayanti", 2027)]).toEqual(fest("akshaya-tritiya"));
  });
  test("2026 in Pune", () => {
    expect(on("mahavir-jayanti", 2026)).toEqual(["2026-03-31"]);
    expect(on("buddha-purnima", 2026)).toEqual(["2026-05-01"]);
    expect(on("guru-nanak-jayanti", 2026)).toEqual(["2026-11-24"]);
  });
  test("by month: October 2026 has Gandhi Jayanti, Columbus Day and Valmiki Jayanti", () => {
    const m = holidaysInMonth(2026, 10, PUNE, H);
    expect(Object.keys(m).sort()).toEqual(["2026-10-02", "2026-10-12", "2026-10-26"]);
  });
});
