// @ts-check
// Where an English line may break on a narrow screen (js/text/line-breaks.js, enCut)
import { describe, expect, test } from "vitest";
import { enCut } from "../../js/text/line-breaks.js";

describe("enCut: where an English line breaks", () => {
  test("after a single | or a comma, the spaces kept with the part before", () => {
    expect(enCut("Tun Keval Mata | Sarvatha Tun ||")).toEqual(["Tun Keval Mata | ", "Sarvatha Tun ||"]);
    expect(enCut("Aarti Kariton, Guruvar |")).toEqual(["Aarti Kariton, ", "Guruvar |"]);
  });
  test("never inside || or at its end", () => {
    expect(enCut("Shriguru Datta || Dhr. ||")).toEqual(["Shriguru Datta || Dhr. ||"]);
  });
  test("at a ¦ typed in the line (a zero-width space by then), which is dropped", () => {
    expect(enCut("Papam Tapam Dainyam ​Bhitim Klesham |")).toEqual(["Papam Tapam Dainyam ", "Bhitim Klesham |"]);
  });
});
