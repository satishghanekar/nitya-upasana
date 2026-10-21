// The shared helpers for writing words on the page (js/core/words.js), once copied into each part that builds HTML.
import { afterEach, describe, expect, test } from "vitest";
import { DAYS, MONTHS, dv, esc, lead, mrLang, num, scr, scrKey, second, ui } from "../../js/core/words.js";

describe("esc", () => {
  test("makes text safe in an element and in an attribute", () => {
    expect(esc('<b class="x">A & B</b>')).toBe("&lt;b class=&quot;x&quot;&gt;A &amp; B&lt;/b&gt;");
  });
  test("leaves Devanagari and svara marks alone", () => {
    expect(esc("ॐ ग॒णाना॑म्")).toBe("ॐ ग॒णाना॑म्");
  });
  test("accepts a number", () => {
    expect(esc(/** @type {any} */ (12))).toBe("12");
  });
});

describe("digits", () => {
  test("dv writes Devanagari digits and leaves everything else", () => {
    expect(dv(2026)).toBe("२०२६");
    expect(dv("18 ऑक्टोबर 2026")).toBe("१८ ऑक्टोबर २०२६");
  });
  test("num follows the menu language: English when no settings are loaded", () => {
    expect(num(18)).toBe("18");
  });
});

describe("names", () => {
  test("twelve months and seven days, January and Sunday first", () => {
    expect(MONTHS.mr).toHaveLength(12);
    expect(MONTHS.en).toHaveLength(12);
    expect(DAYS.mr).toHaveLength(7);
    expect(DAYS.en).toHaveLength(7);
    expect([MONTHS.mr[0], MONTHS.en[9], DAYS.mr[0], DAYS.en[1]]).toEqual(["जानेवारी", "October", "रविवार", "Monday"]);
  });
});

describe("languages, before any settings are loaded", () => {
  test("menus in English, texts in Marathi, no second language", () => {
    expect(ui()).toBe("en");
    expect(lead()).toBe("mr");
    expect(second()).toBe("");
  });
});

describe("the chosen script (SCR in js/render.js)", () => {
  afterEach(() => {
    delete globalThis.window;
  });
  test("without a page: as written", () => {
    expect(scr("गणपती")).toBe("गणपती");
    expect(scrKey()).toBe("");
    expect(mrLang()).toBe("mr");
  });
  test("as written when no script is chosen", () => {
    globalThis.window = { SCR: { k: "", to: () => "changed" } };
    expect(scr("गणपती")).toBe("गणपती");
    expect(mrLang()).toBe("mr");
  });
  test("in Kannada letters when chosen", () => {
    globalThis.window = { SCR: { k: "kn", to: (s) => "kn:" + s } };
    expect(scr("गणपती")).toBe("kn:गणपती");
    expect(scrKey()).toBe("kn");
    expect(mrLang()).toBe("kn");
  });
});
