// The festivals' drawings and the holidays' flags (js/core/fest-icons.js; the "Nitya Home cards" mockups, Satish,
// 2026-10-30)
import { describe, expect, test } from "vitest";
import { readFileSync } from "node:fs";
import { festIcon, festLook, festMark, holIcon, holMark, iconHtml } from "../../js/core/fest-icons.js";

const read = (p) => JSON.parse(readFileSync(new URL("../../content/" + p, import.meta.url), "utf8"));
const F = read("festivals.json");
const H = read("holidays.json");

describe("festival drawings", () => {
  test("every festival has its own drawing, none the fallback star", () => {
    for (const f of F.festivals) expect(festLook(f.id)[0], f.id).not.toBe("star");
  });

  test("the tint says the kind of day", () => {
    expect(festLook("dasara")).toEqual(["aapta", "sai"]);
    expect(festLook("pradosh")).toEqual(["linga", "shi"]);
    expect(festLook("maha-shivratri")).toEqual(["linga", "shi"]);
    expect(festLook("kojagiri-purnima")).toEqual(["moon", "moon"]);
    expect(festLook("ganesh-chaturthi")).toEqual(["modak", "gan"]);
    expect(festLook("lakshmi-pujan")).toEqual(["diya", "sai"]);
  });

  test("a saint's Jayanti is a lotus, a Punyatithi the paduka, anything new a star", () => {
    expect(festLook("datta-jayanti")[0]).toBe("lotus");
    expect(festLook("swami-samarth-punyatithi")[0]).toBe("paduka");
    expect(festLook("someone-new")).toEqual(["star", "sai"]);
  });

  test("the circle is hidden from screen readers and carries its tint", () => {
    expect(festIcon("dasara")).toMatch(/^<span class="fi sai" aria-hidden="true"><svg /);
    expect(iconHtml("modak", "gan")).toMatch(/^<span class="fi gan"/);
    expect(festMark("dasara")).toMatch(/^<svg class="fm" [^>]*aria-hidden="true"/);
  });
});

describe("holiday flags", () => {
  test("every holiday group has a flag: the US's, India's, India's with the state's letters", () => {
    expect(new Set(H.holidays.flatMap((h) => h.groups))).toEqual(new Set(["us", "in", "mh", "ka"]));
    expect(holIcon(["us"])).toContain('fill="#3c3b6e"');
    expect(holIcon(["in"])).toContain('fill="#138808"');
    expect(holIcon(["in"])).not.toContain("fst");
    expect(holIcon(["ka"])).toContain('data-s="KA"');
    expect(holIcon(["mh"])).toContain('data-s="MH"');
  });

  test("the state's letters are drawn by the styles, not written in the page", () => {
    expect(holIcon(["ka"]).replace(/<[^>]*>/g, "")).toBe("");
  });

  test("the month's mark is the flag alone, small and hidden from screen readers", () => {
    expect(holMark(["us"])).toMatch(/^<svg class="fm" aria-hidden="true" viewBox="0 0 19 10" width="13" height="9">/);
  });
});
