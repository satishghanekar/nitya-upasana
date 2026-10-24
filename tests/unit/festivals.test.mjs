// Festival days (js/core/festivals.js, rules in content/festivals.json).
// Expected dates: Maharashtra (Pune, IST) as Kalnirnay / Drik Panchang print them, each also worked through by hand from
// the engine's tithi times (which agree with the Swiss Ephemeris within a minute or two; see panchang.test.mjs). The
// tithi times in the comments are IST from the Swiss Ephemeris (Lahiri).
// Columbus (America/New_York) uses the same rules at its own sunrise, midday, dusk and midnight, so some festivals fall
// a day earlier there; those dates are the engine's, checked against the rule by hand.
import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import { festivalsBetween, festivalsFor, festivalsInMonth, kalaWindow, KALAS } from "../../js/core/festivals.js";
import { dayTimes, tithiAt } from "../../js/core/panchang.js";

const LIST = JSON.parse(readFileSync(new URL("../../content/festivals.json", import.meta.url), "utf8"));
const PUNE = { lat: 18.52, lon: 73.86, tz: "Asia/Kolkata" };
const COLUMBUS = { lat: 39.96, lon: -83.0, tz: "America/New_York" };
const year = (y, place) => Object.fromEntries(festivalsBetween(`${y}-01-01`, `${y}-12-31`, place, LIST).map((f) => [f.id, f.date]));

describe("content/festivals.json", () => {
  test("every festival has Marathi and English names, a short label and a valid rule", () => {
    expect(LIST.version).toBe(1);
    expect(LIST.adhika).toBe("nija");
    const ids = new Set();
    for (const f of LIST.festivals) {
      expect(ids.has(f.id), f.id).toBe(false);
      ids.add(f.id);
      expect(f.mr, f.id).toMatch(/[ऀ-ॿ]/);
      expect(f.en, f.id).toMatch(/^[A-Z][A-Za-z ()·/{}-]+$/);
      expect(f.short.mr, f.id).toMatch(/[ऀ-ॿ]/);
      expect(f.short.en, f.id).toMatch(/^[A-Z]/);
      const r = f.rule;
      if ("before" in r) {
        expect(Object.keys(r).sort()).toEqual(["before", "days"]);
        expect(LIST.festivals.map((x) => x.id)).toContain(r.before);
        expect(f.en + f.mr + f.short.en + f.short.mr, f.id).toMatch(/^([^{]*\{n\}){4}[^{]*$/);
      } else if ("rashi" in r) {
        expect(Object.keys(r)).toEqual(["rashi"]);
        expect(r.rashi).toBeGreaterThanOrEqual(1);
        expect(r.rashi).toBeLessThanOrEqual(12);
      } else {
        expect(Object.keys(r).sort()).toEqual(["kala", "masa", "paksha", "tie", "tithi"]);
        expect(r.masa).toBeGreaterThanOrEqual(1);
        expect(r.masa).toBeLessThanOrEqual(12);
        expect(["shukla", "krishna"]).toContain(r.paksha);
        expect(r.tithi).toBeGreaterThanOrEqual(1);
        expect(r.tithi).toBeLessThanOrEqual(15);
        expect(KALAS).toContain(r.kala);
        expect(["first", "second"]).toContain(r.tie);
      }
    }
    // (25, then Shri Gondavalekar Maharaj's, Shri Swami Samarth's, Shri Nana Maharaj Taranekar's and Shri Swami Swarupanand Ji's days, and the Utsav before Guru Purnima, 2026-10-24)
    expect(LIST.festivals.length).toBe(34);
  });
});

describe("2026 in Pune (IST)", () => {
  const got = year(2026, PUNE);
  test.each([
    // confirmed by the panchang-core work (and in panchang.test.mjs)
    ["gudi-padwa", "2026-03-19"], // Chaitra pratipada 06:53 19 Mar → 04:52 20 Mar: at no sunrise (kshaya), so its own day
    ["ganesh-chaturthi", "2026-09-14"], // chaturthi 07:07 14 Sep → 07:44 15 Sep: midday on the 14th only
    ["dasara", "2026-10-20"], // dashami 12:50 20 Oct → 14:12 21 Oct: afternoon on both days, the first is taken
    ["lakshmi-pujan", "2026-11-08"], // amavasya 11:28 8 Nov → 12:32 9 Nov: at dusk on the 8th only
    ["bali-pratipada", "2026-11-10"], // Kartik pratipada at sunrise on the 10th
    // more, each worked through from the tithi times
    ["makar-sankranti", "2026-01-14"], // the sun enters sidereal Makara at 15:07 (Swiss Ephemeris), before sunset
    ["maha-shivratri", "2026-02-15"], // Magh krishna chaturdashi 17:06 15 Feb → 17:35 16 Feb: midnight of the 15th
    ["ram-navami", "2026-03-26"], // navami 11:49 26 Mar → 10:07 27 Mar: midday on the 26th only
    ["hanuman-jayanti", "2026-04-02"], // Chaitra purnima 07:06 1 Apr → 07:42 2 Apr: at sunrise on the 2nd
    ["vat-purnima", "2026-06-29"], // nija Jyeshtha purnima (not Adhika Jyeshtha's, 31 May)
    ["ashadhi-ekadashi", "2026-07-25"], // ekadashi 09:13 24 Jul → 11:34 25 Jul: at sunrise on the 25th
    ["guru-purnima", "2026-07-29"],
    ["nag-panchami", "2026-08-17"],
    ["narali-purnima", "2026-08-28"], // purnima 09:09 27 Aug → 09:48 28 Aug: at sunrise on the 28th (Raksha Bandhan)
    ["gokulashtami", "2026-09-04"], // ashtami 02:25 4 Sep → 00:14 5 Sep: midnight of the 4th
    ["anant-chaturdashi", "2026-09-25"],
    ["ghatasthapana", "2026-10-11"],
    ["kojagiri-purnima", "2026-10-25"], // purnima 11:56 25 Oct → 09:41 26 Oct: midnight of the 25th
    ["narak-chaturdashi", "2026-11-08"], // chaturdashi 10:48 7 Nov → 11:28 8 Nov: at moonrise before dawn on the 8th
    ["bhaubeej", "2026-11-11"], // dvitiya 14:00 10 Nov → 15:53 11 Nov: the afternoon of both, the second is taken
    ["kartiki-ekadashi", "2026-11-20"], // ekadashi 07:16 20 Nov → 06:31 21 Nov: at no sunrise (kshaya), its own day
    ["tripurari-purnima", "2026-11-24"],
    ["datta-jayanti", "2026-12-23"],
  ])("%s on %s", (id, date) => {
    expect(got[id]).toBe(date);
  });
  // (with 2026's Adhika Jyeshtha, Margashirsha vadya dashami, Shri Gondavalekar Maharaj's Punyatithi, falls on 2 Jan 2027)
  test("every festival once in 2026 (the Utsav nine times) but the Maharaj Punyatithi (2 Jan 2027), none in Adhika Jyeshtha (17 May – 15 June)", () => {
    const all = festivalsBetween("2026-01-01", "2026-12-31", PUNE, LIST);
    expect(all.filter((f) => f.id === "gondavalekar-maharaj-utsav")).toHaveLength(9);
    expect([...new Set(all.map((f) => f.id))].sort()).toEqual(LIST.festivals.map((f) => f.id).filter((id) => id !== "gondavalekar-maharaj-punyatithi").sort());
    expect(festivalsBetween("2027-01-01", "2027-01-10", PUNE, LIST).map((f) => f.date + " " + f.id)).toEqual(["2027-01-02 gondavalekar-maharaj-punyatithi"]);
    expect(all.filter((f) => f.date >= "2026-05-17" && f.date <= "2026-06-15")).toEqual([]);
  });
  test("the tithi each festival is kept for", () => {
    const d = festivalsFor("2026-10-20", PUNE, LIST);
    expect(d.map((f) => [f.id, f.mr, f.en, f.short])).toEqual([["dasara", "दसरा", "Dasara (Vijayadashami)", { mr: "दसरा", en: "Dasara" }]]);
    expect(tithiAt(new Date((d[0].from.getTime() + d[0].to.getTime()) / 2)).n).toBe(10);
    expect(festivalsFor("2026-10-19", PUNE, LIST)).toEqual([]);
    expect(festivalsFor("2026-11-08", PUNE, LIST).map((f) => f.id)).toEqual(["narak-chaturdashi", "lakshmi-pujan"]);
  });
});

describe("2024 in Pune: the tie rules against printed dates", () => {
  const got = year(2024, PUNE);
  test.each([
    ["ram-navami", "2024-04-17"], // navami at midday on 16 (from 13:23) and 17 Apr: the second (ashtami-mixed avoided)
    ["vat-purnima", "2024-06-21"], // purnima at midday on the 21st; at sunrise on the 22nd for only half an hour
    ["lakshmi-pujan", "2024-11-01"], // amavasya at dusk on 31 Oct and 1 Nov: the second (Kalnirnay)
    ["bhaubeej", "2024-11-03"],
    ["gudi-padwa", "2024-04-09"],
    ["ganesh-chaturthi", "2024-09-07"],
    ["dasara", "2024-10-12"],
    ["makar-sankranti", "2024-01-15"], // the sankranti in the small hours of the 15th, after the 14th's sunset
  ])("%s on %s", (id, date) => {
    expect(got[id]).toBe(date);
  });
});

describe("2026 in Columbus, Ohio (America/New_York)", () => {
  const got = year(2026, COLUMBUS);
  test("the same day as Pune for most; a day earlier where the tithi's part of the day comes earlier there", () => {
    const pune = year(2026, PUNE);
    const earlier = Object.keys(pune).filter((id) => got[id] !== pune[id]);
    expect(earlier.sort()).toEqual(
      ["akshaya-tritiya", "ashadhi-ekadashi", "bali-pratipada", "bhaubeej", "gokulashtami", "gondavalekar-maharaj-jayanti", "hanuman-jayanti", "narak-chaturdashi", "narali-purnima", "swarupanand-punyatithi", "tripurari-purnima"].sort(),
    );
    for (const id of earlier) {
      const a = new Date(pune[id]),
        b = new Date(got[id]);
      expect((a - b) / 86400000, id).toBe(1);
    }
  });
  test.each([
    ["dasara", "2026-10-20"], // dashami 3:20 am 20 Oct → 4:41 am 21 Oct EDT: the afternoon of the 20th
    ["kojagiri-purnima", "2026-10-25"], // purnima 2:26 am 25 Oct → 0:11 am 26 Oct: at neither midnight; the 25th, its daylight
    ["lakshmi-pujan", "2026-11-08"],
    ["narak-chaturdashi", "2026-11-07"],
    ["bali-pratipada", "2026-11-09"],
    ["bhaubeej", "2026-11-10"],
    ["ganesh-chaturthi", "2026-09-14"],
    ["makar-sankranti", "2026-01-14"], // about 4:35 am EST on the 14th, in the night before: kept on the 14th
  ])("%s on %s", (id, date) => {
    expect(got[id]).toBe(date);
  });
  test("a month at a time, and a Date read on the place's clock", () => {
    const oct = festivalsInMonth(2026, 10, COLUMBUS, LIST);
    expect(Object.fromEntries(Object.entries(oct).map(([k, v]) => [k, v.map((f) => f.id)]))).toEqual({
      "2026-10-11": ["ghatasthapana"],
      "2026-10-20": ["dasara"],
      "2026-10-25": ["kojagiri-purnima"],
    });
    expect(festivalsFor(new Date("2026-10-20T23:30:00-04:00"), COLUMBUS, LIST).map((f) => f.id)).toEqual(["dasara"]);
    expect(festivalsFor(new Date("2026-10-21T00:30:00-04:00"), COLUMBUS, LIST)).toEqual([]);
  });
});

describe("the parts of the day", () => {
  test("madhyahna, aparahna, pradosh and nishita divide the day and night into fifths and fifteenths", () => {
    const d = dayTimes("2026-10-20", PUNE),
      sr = d.sunrise.getTime(),
      ss = d.sunset.getTime(),
      nx = d.next.getTime();
    expect(kalaWindow(d, "sunrise")).toEqual([sr, sr]);
    expect(kalaWindow(d, "madhyahna")).toEqual([sr + (2 * (ss - sr)) / 5, sr + (3 * (ss - sr)) / 5]);
    expect(kalaWindow(d, "aparahna")).toEqual([sr + (3 * (ss - sr)) / 5, sr + (4 * (ss - sr)) / 5]);
    expect(kalaWindow(d, "pradosh")).toEqual([ss, ss + (nx - ss) / 5]);
    const [a, b] = kalaWindow(d, "nishita");
    // around midnight on the place's clock (Pune's mean noon is ~12:35 IST, so midnight ~00:35)
    const mid = new Date((a + b) / 2).toLocaleTimeString("en-GB", { timeZone: "Asia/Kolkata", hour12: false });
    expect(mid >= "00:15" && mid <= "00:55").toBe(true);
    expect(kalaWindow(d, "moonrise")[0]).toBe(d.moonrise.getTime());
  });
  test("no list, an empty list or a wrong range gives nothing", () => {
    expect(festivalsFor("2026-10-20", PUNE, null)).toEqual([]);
    expect(festivalsFor("2026-10-20", PUNE, [])).toEqual([]);
    expect(festivalsBetween("2026-10-21", "2026-10-20", PUNE, LIST)).toEqual([]);
  });
});

describe("Gondhavlekar Maharaj Utsav: the nine days before Guru Purnima", () => {
  const days = (y, place) => festivalsBetween(y + "-06-01", y + "-08-31", place, LIST).filter((f) => f.id === "gondavalekar-maharaj-utsav");
  test("2026 in Pune: Day 1 on 20 July … Day 9 on 28 July, Guru Purnima on the 29th", () => {
    const d = days(2026, PUNE);
    expect(d.map((f) => f.date)).toEqual(["2026-07-20", "2026-07-21", "2026-07-22", "2026-07-23", "2026-07-24", "2026-07-25", "2026-07-26", "2026-07-27", "2026-07-28"]);
    expect(d[0].en).toBe("Gondhavlekar Maharaj Utsav · Day 1");
    expect(d[8].short).toEqual({ mr: "उत्सव ९", en: "Utsav 9" });
    expect(d[2].mr).toBe("गोंदवलेकर महाराज उत्सव — दिवस ३");
  });
  test("a range that ends inside the Utsav still finds its days (Guru Purnima is after it)", () => {
    expect(festivalsBetween("2026-07-25", "2026-07-25", PUNE, LIST).map((f) => f.short.en)).toContain("Utsav 6");
  });
});
