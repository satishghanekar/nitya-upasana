// The Vedic calendar (js/core/panchang.js), checked against:
// - the Swiss Ephemeris (the ephemeris Drik Panchang uses): every 11th day 2020–2032 at Pune and Columbus, Ohio
//   (fixtures/panchang-swisseph.json, made by tools/panchang-reference.py);
// - NASA's new and full moon times for 2026 (Espenak, "Six Millennium Catalog of Phases of the Moon", UT), which the
//   Swiss Ephemeris reproduces to the minute;
// - 2026 festival dates in Maharashtra (Pune): Gudi Padwa 19 Mar, Ganesh Chaturthi 14 Sep, Dasara 20 Oct,
//   Lakshmi Pujan 8 Nov, Bali Pratipada 10 Nov, and Adhika Jyeshtha 17 May – 15 Jun;
// - the app's own Sankashti days (js/features/astronomy.js), which must not move.
import { readFileSync } from "node:fs";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { BORDERLINE_MIN, dayPanchang, fullMoonAfter, monthPanchang, newMoonAfter, tithiAt } from "../../js/core/panchang.js";
import * as N from "../../js/core/panchang-names.js";
import { init, SK } from "../../js/features/astronomy.js";

const REF = JSON.parse(readFileSync(new URL("./fixtures/panchang-swisseph.json", import.meta.url), "utf8"));
const PUNE = { lat: 18.52, lon: 73.86, tz: "Asia/Kolkata" };
const COLUMBUS = { lat: 39.96, lon: -83.0, tz: "America/New_York" };
const MIN = 60000;
const mins = (a, b) => Math.abs(a - b) / MIN;
/** "Mon 01:22" on the place's clock */
const clock = (d, tz) => d.toLocaleString("en-GB", { timeZone: tz, weekday: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).replace(",", "");

// The Sankashti card works in the phone's time zone; these tests set it, and put it back after.
const TZ0 = process.env.TZ;
afterAll(() => {
  if (TZ0 === undefined) delete process.env.TZ;
  else process.env.TZ = TZ0;
});

describe("against the Swiss Ephemeris, 2020–2032 (Lahiri)", () => {
  for (const [name, place] of Object.entries(REF.places)) {
    test(`${name}: sunrise, sunset and the end times agree within a few minutes`, () => {
      const worst = { sunrise: 0, sunset: 0, tithi: 0, nakshatra: 0, yoga: 0 };
      for (const [date, sr, ss, ti, tiEnd, nk, nkEnd, yg, ygEnd] of place.days) {
        const p = dayPanchang(date, place);
        worst.sunrise = Math.max(worst.sunrise, mins(p.sunrise, sr * 1000));
        worst.sunset = Math.max(worst.sunset, mins(p.sunset, ss * 1000));
        for (const [k, n, end] of [
          ["tithi", ti, tiEnd],
          ["nakshatra", nk, nkEnd],
          ["yoga", yg, ygEnd],
        ]) {
          if (p[k].n === n) worst[k] = Math.max(worst[k], mins(p[k].endsAt, end * 1000));
          // a different one only when a boundary is within a couple of minutes of sunrise
          else expect(Math.min(mins(p[k].endsAt, sr * 1000), mins(end * 1000, sr * 1000)), `${name} ${date} ${k}`).toBeLessThan(3);
        }
      }
      expect(worst.sunrise).toBeLessThan(0.5);
      expect(worst.sunset).toBeLessThan(0.5);
      expect(worst.tithi).toBeLessThan(2);
      expect(worst.nakshatra).toBeLessThan(1);
      expect(worst.yoga).toBeLessThan(2);
    });
  }
});

describe("18 October 2026, Columbus, Ohio", () => {
  const p = dayPanchang("2026-10-18", COLUMBUS);
  const tz = COLUMBUS.tz;
  test("sun and moon", () => {
    // Swiss Ephemeris: sunrise 07:45:46, sunset 18:47:53 EDT
    expect(clock(p.sunrise, tz)).toBe("Sun 07:45");
    expect(clock(p.sunset, tz)).toBe("Sun 18:47");
    // Swiss Ephemeris: moonrise 15:05:51 EDT
    expect(mins(p.moonrise, Date.parse("2026-10-18T15:05:51-04:00"))).toBeLessThan(1);
    expect(p.vara).toEqual({ n: 0, name: { mr: "रविवार", en: "Sunday" } });
  });
  test("आश्विन शुद्ध अष्टमी, ending Monday about 01:22", () => {
    expect(p.tithi.n).toBe(8);
    expect(p.tithi.paksha).toBe("shukla");
    expect(p.tithi.pakshaName.mr).toBe("शुद्ध");
    expect(p.tithi.name.mr).toBe("अष्टमी");
    expect(p.tithi.borderline).toBe(false);
    expect(mins(p.tithi.endsAt, Date.parse("2026-10-19T01:22:16-04:00"))).toBeLessThan(2);
    expect(p.masa).toMatchObject({ n: 7, adhika: false, adhikaName: null, name: { mr: "आश्विन", en: "Ashvin" } });
  });
  test("nakshatra, yoga, karana", () => {
    expect(p.nakshatra.n).toBe(21);
    expect(p.nakshatra.name.mr).toBe("उत्तराषाढा");
    expect(mins(p.nakshatra.endsAt, Date.parse("2026-10-19T06:08:51-04:00"))).toBeLessThan(1);
    expect(p.yoga.name).toEqual({ mr: "सुकर्मा", en: "Sukarma" });
    expect(mins(p.yoga.endsAt, Date.parse("2026-10-18T14:26:08-04:00"))).toBeLessThan(2);
    // the first half of shukla ashtami is विष्टि (bhadra)
    expect(p.karana.name.en).toBe("Vishti");
    expect(clock(p.karana.endsAt, tz)).toMatch(/^Sun 12:1\d$/);
  });
  test("year, season and ayana", () => {
    expect(p.samvatsara).toEqual({ shaka: 1948, n: 40, name: { mr: "पराभव", en: "Parabhava" } });
    expect(p.ritu.name.mr).toBe("शरद");
    expect(p.ayana.key).toBe("dakshinayana");
    // the month began at the new moon of 10 October, 15:50 UT
    expect(mins(p.masa.startsAt, Date.parse("2026-10-10T15:50Z"))).toBeLessThan(2);
  });
});

describe("new and full moons of 2026 (NASA, UT)", () => {
  const NEW = "01-18T19:52 02-17T12:01 03-19T01:23 04-17T11:52 05-16T20:01 06-15T02:54 07-14T09:44 08-12T17:37 09-11T03:27 10-10T15:50 11-09T07:02 12-09T00:52";
  const FULL =
    "01-03T10:03 02-01T22:09 03-03T11:38 04-02T02:12 05-01T17:23 05-31T08:45 06-29T23:57 07-29T14:36 08-28T04:18 09-26T16:49 10-26T04:12 11-24T14:53 12-24T01:28";
  for (const [label, list, next] of [
    ["new", NEW, newMoonAfter],
    ["full", FULL, fullMoonAfter],
  ]) {
    test(`${label} moons within 2 minutes`, () => {
      let t = new Date("2026-01-01T00:00Z");
      for (const s of list.split(" ")) {
        t = next(t);
        expect(mins(t, Date.parse(`2026-${s}Z`)), s).toBeLessThan(2);
      }
    });
  }
});

describe("2026 in Pune", () => {
  const month = (m) => monthPanchang(2026, m, PUNE);
  const at = (date, hhmm) => new Date(`${date}T${hhmm}:00+05:30`);
  test("Gudi Padwa, 19 March: Chaitra pratipada begins after sunrise and is over before the next (kshaya)", () => {
    const [d19, d20] = month(3).slice(18, 20);
    expect(d19.tithi.n).toBe(30);
    expect(d19.masa.n).toBe(12);
    expect(d19.kshaya).toEqual([1]);
    expect(d20.tithi.n).toBe(2);
    expect(d20.masa.n).toBe(1);
    expect(dayPanchang("2026-03-18", PUNE).samvatsara).toMatchObject({ shaka: 1947, name: { en: "Vishvavasu" } });
    expect(dayPanchang("2026-03-20", PUNE).samvatsara).toMatchObject({ shaka: 1948, name: { en: "Parabhava" } });
    expect(dayPanchang("2026-03-20", PUNE).ritu.name.en).toBe("Vasanta");
  });
  test("Adhika Jyeshtha, 17 May – 15 June (no sankranti between the new moons of 16 May and 15 June)", () => {
    const may = month(5),
      june = month(6);
    expect(may[15].masa).toMatchObject({ n: 2, adhika: false }); // 16 May: वैशाख अमावास्या
    expect(may[16].masa).toMatchObject({ n: 3, adhika: true, adhikaName: { mr: "अधिक" } });
    expect(may[16].tithi.n).toBe(1);
    expect(june[14].masa).toMatchObject({ n: 3, adhika: true }); // 15 June: still the adhika month at sunrise
    expect(june[15].masa).toMatchObject({ n: 3, adhika: false }); // 16 June: निज ज्येष्ठ
    expect(dayPanchang("2026-05-17", PUNE).masa.name.mr).toBe("ज्येष्ठ");
    expect(dayPanchang("2026-07-01", PUNE).masa).toMatchObject({ n: 3, adhika: false });
  });
  test("Ganesh Chaturthi, 14 September: Bhadrapada shukla chaturthi at midday", () => {
    expect(tithiAt(at("2026-09-14", "12:30")).n).toBe(4);
    expect(dayPanchang("2026-09-14", PUNE).masa.name.en).toBe("Bhadrapad");
    expect(tithiAt(at("2026-09-13", "12:30")).n).toBe(3);
  });
  test("Dasara, 20 October: Ashvin shukla dashami in the afternoon", () => {
    expect(tithiAt(at("2026-10-20", "15:00")).n).toBe(10);
    expect(dayPanchang("2026-10-20", PUNE).masa.name.en).toBe("Ashvin");
    expect(tithiAt(at("2026-10-19", "15:00")).n).toBe(9);
  });
  test("Lakshmi Pujan, 8 November: Ashvin amavasya at sunset; Bali Pratipada 10 November", () => {
    const p = dayPanchang("2026-11-08", PUNE);
    expect(p.tithi.n).toBe(29);
    expect(tithiAt(p.sunset).n).toBe(30);
    // Naraka Chaturdashi: chaturdashi from the 7th's late morning to the 8th's
    expect(tithiAt(dayPanchang("2026-11-07", PUNE).sunset).n).toBe(29);
    const nov = month(11);
    expect(nov[8]).toMatchObject({ amavasya: true });
    expect(nov[9].tithi.n).toBe(1);
    expect(nov[9].masa.name.en).toBe("Kartik");
  });
  test("October: a repeated saptami (vriddhi), purnima, ekadashis and amavasya", () => {
    const oct = month(10);
    expect(oct.length).toBe(31);
    expect(oct.filter((d) => d.vriddhi).map((d) => d.date)).toEqual(["2026-10-18"]);
    expect(oct[17].tithi.n).toBe(7);
    expect(oct.filter((d) => d.purnima).map((d) => d.date)).toEqual(["2026-10-26"]);
    expect(oct.filter((d) => d.amavasya).map((d) => d.date)).toEqual(["2026-10-10"]);
    for (const d of oct.filter((d) => d.ekadashi)) expect([11, 26]).toContain(d.tithi.n);
    // every sunrise has one tithi; a step of two means a kshaya tithi on that day
    for (let i = 1; i < oct.length; i++) {
      const step = (oct[i].tithi.n - oct[i - 1].tithi.n + 30) % 30;
      expect(step).toBe(oct[i - 1].kshaya.length + 1 - (oct[i].vriddhi ? 1 : 0));
    }
  });
});

describe("Sankashti days are the app's own", () => {
  // the app's Sankashti days in 2026 (unchanged by the moonrise fix of October 2026)
  const DAYS_2026 = {
    Pune: "01-06 02-05 03-06 04-05 05-05 06-03 07-03 08-02 08-31 09-29 10-29 11-27 12-26",
    Columbus: "01-06 02-04 03-06 04-05 05-04 06-03 07-03 08-01 08-31 09-29 10-28 11-27 12-26",
  };
  for (const [label, place] of [
    ["Pune", PUNE],
    ["Columbus", COLUMBUS],
  ]) {
    test(`${label}, 2026 dates`, () => {
      process.env.TZ = place.tz;
      init();
      const ours = [];
      for (let m = 1; m <= 12; m++) for (const d of monthPanchang(2026, m, place)) if (d.sankashti) ours.push(d.date.slice(5));
      expect(ours.join(" ")).toBe(DAYS_2026[label]);
    });
  }
  test("moonrise on Sankashti, 28 October 2026 in Columbus: 8:09–8:10 pm (Swiss Ephemeris 20:10:04 EDT)", () => {
    process.env.TZ = COLUMBUS.tz;
    init();
    const p = dayPanchang("2026-10-28", COLUMBUS);
    expect(mins(p.moonrise, Date.parse("2026-10-28T20:10:04-04:00"))).toBeLessThan(1);
    const card = SK.upcoming(new Date(2026, 9, 28).getTime(), COLUMBUS.lat, COLUMBUS.lon, 1)[0];
    expect(Math.abs(card.rise - p.moonrise.getTime())).toBeLessThan(1000);
  });
  for (const [label, place] of [
    ["Pune", PUNE],
    ["Columbus", COLUMBUS],
  ]) {
    test(`${label}, 2026–2027`, () => {
      process.env.TZ = place.tz;
      init();
      const app = SK.upcoming(new Date(2026, 0, 1).getTime(), place.lat, place.lon, 26)
        .map((o) => new Date(o.day))
        .filter((d) => d.getFullYear() < 2028)
        .map((d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`);
      const ours = [];
      for (const y of [2026, 2027]) for (let m = 1; m <= 12; m++) for (const d of monthPanchang(y, m, place)) if (d.sankashti) ours.push(d);
      expect(ours.map((d) => d.date)).toEqual(app);
      expect(app.length).toBeGreaterThanOrEqual(24);
      // a krishna tritiya or chaturthi at sunrise (chaturthi at moonrise)
      for (const d of ours) expect([18, 19]).toContain(d.tithi.n);
    });
  }
});

describe("edge cases", () => {
  beforeAll(() => {
    process.env.TZ = "Asia/Kolkata";
  });
  test("a tithi boundary within a few minutes of sunrise is flagged", () => {
    // Pune, 16 July 2021: shashthi ends minutes after sunrise (the Swiss Ephemeris has saptami at sunrise)
    const p = dayPanchang("2021-07-16", PUNE);
    expect(p.tithi.borderline).toBe(true);
    expect(mins(p.tithi.endsAt, p.sunrise)).toBeLessThan(BORDERLINE_MIN);
    expect(dayPanchang("2021-07-17", PUNE).tithi.borderline).toBe(false);
  });
  test("where the sun does not rise, the day is read at 06:00", () => {
    const p = dayPanchang("2026-06-21", { lat: 78.2, lon: 15.6, tz: "Europe/Oslo" });
    expect(p.sunrise).toBe(null);
    expect(p.sunset).toBe(null);
    expect(p.tithi.n).toBeGreaterThan(0);
  });
  test("a Date is read as its calendar day at the place; no tz means the phone's", () => {
    const d = new Date("2026-10-18T23:30:00-04:00"); // already 19 October in India
    expect(dayPanchang(d, COLUMBUS).date).toBe("2026-10-18");
    expect(dayPanchang(d, PUNE).date).toBe("2026-10-19");
    expect(dayPanchang(d, { lat: PUNE.lat, lon: PUNE.lon }).date).toBe("2026-10-19");
  });
  test("each month's days line up across a year, east and west of Greenwich", () => {
    for (const place of [PUNE, COLUMBUS]) {
      let prev = null;
      for (let m = 1; m <= 12; m++)
        for (const d of monthPanchang(2027, m, place)) {
          if (prev) expect((d.tithi.n - prev.tithi.n + 30) % 30).toBe(prev.kshaya.length + (d.vriddhi ? 0 : 1));
          prev = d;
        }
    }
  });
});

describe("names", () => {
  test("every list is complete", () => {
    expect(N.TITHI.length).toBe(15);
    expect(N.MASA.length).toBe(12);
    expect(N.NAKSHATRA.length).toBe(27);
    expect(N.YOGA.length).toBe(27);
    expect(N.KARANA.length).toBe(11);
    expect(N.VARA.length).toBe(7);
    expect(N.SAMVATSARA.length).toBe(60);
    expect(N.RITU.length).toBe(6);
  });
  test("Marathi spellings", () => {
    expect(N.tithiName(15).mr).toBe("पौर्णिमा");
    expect(N.tithiName(30).mr).toBe("अमावास्या");
    expect(N.tithiName(19).mr).toBe("चतुर्थी");
    expect(N.PAKSHA.krishna.mr).toBe("वद्य");
    expect(N.MASA[6].mr).toBe("आश्विन");
    expect(N.MASA[8].mr).toBe("मार्गशीर्ष");
    expect(N.NAKSHATRA[20].mr).toBe("उत्तराषाढा");
    expect(N.NAKSHATRA[18].mr).toBe("मूळ");
    expect(N.NAKSHATRA[10].mr).toBe("पूर्वा फाल्गुनी");
    expect(N.VARA[2].mr).toBe("मंगळवार");
    expect(N.SAMVATSARA[38].mr).toBe("विश्वावसु");
    expect(N.SAMVATSARA[39].mr).toBe("पराभव");
    expect(N.AYANA.dakshinayana.mr).toBe("दक्षिणायन");
    for (const list of [N.TITHI, N.MASA, N.NAKSHATRA, N.YOGA, N.KARANA, N.VARA, N.SAMVATSARA, N.RITU])
      for (const n of list) {
        expect(n.mr).toMatch(/^[ऀ-ॿ ]+$/);
        expect(n.en).toMatch(/^[A-Za-z ]+$/);
      }
  });
});
