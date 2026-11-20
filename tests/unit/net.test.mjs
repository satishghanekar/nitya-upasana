// js/core/net.js: every wait ends (2026-11-20). A promise that never settles fails with a TimeoutError after its time;
// a body that stops coming in fails the same way and is cancelled; a body read while nobody wants it any more stops.
import { describe, expect, test } from "vitest";
import { readBody, timedOut, timeoutError, within } from "../../js/core/net.js";

/** A response whose body gives `pieces`, then waits for ever (hang) or ends @param {number[][]} pieces @param {boolean} hang */
function body(pieces, hang) {
  let cancelled = false;
  const stream = new ReadableStream({
    pull(c) {
      const p = pieces.shift();
      if (p) c.enqueue(new Uint8Array(p));
      else if (!hang) c.close();
      else return new Promise(() => {});
    },
    cancel() {
      cancelled = true;
    },
  });
  return { r: new Response(stream), cancelled: () => cancelled };
}

describe("within", () => {
  test("a promise that settles in time settles as it does", async () => {
    await expect(within(Promise.resolve(7), 50, "x")).resolves.toBe(7);
    await expect(within(Promise.reject(new Error("no")), 50, "x")).rejects.toThrow("no");
  });
  test("one that never settles fails with a TimeoutError naming what was waited for, and lets go of it", async () => {
    let let_go = false;
    const e = await within(new Promise(() => {}), 20, "the GPU", () => (let_go = true)).catch((x) => x);
    expect(e.name).toBe("TimeoutError");
    expect(e.message).toContain("the GPU");
    expect(timedOut(e)).toBe(true);
    expect(let_go).toBe(true);
  });
  test("letting go of it may fail it at once: the time out is still why it failed", async () => {
    let no;
    const p = new Promise((_, n) => (no = n));
    const e = await within(p, 20, "a file", () => no(Object.assign(new Error("aborted"), { name: "AbortError" }))).catch((x) => x);
    expect(e.name).toBe("TimeoutError");
  });
  test("timedOut tells a time out from any other error", () => {
    expect(timedOut(timeoutError("x", 1000))).toBe(true);
    expect(timedOut(new Error("x"))).toBe(false);
    expect(timedOut(null)).toBe(false);
  });
});

describe("readBody", () => {
  test("hands each piece on and counts the bytes", async () => {
    const got = [];
    const b = body([[1, 2], [3]], false);
    await expect(readBody(b.r, (x) => void got.push(...x), { stall: 100 })).resolves.toBe(3);
    expect(got).toEqual([1, 2, 3]);
  });
  test("a body that stops coming in fails with a TimeoutError and is cancelled", async () => {
    const b = body([[1]], true);
    const e = await readBody(b.r, () => {}, { stall: 30, what: "model.onnx.2" }).catch((x) => x);
    expect(e.name).toBe("TimeoutError");
    expect(e.message).toContain("model.onnx.2");
    expect(b.cancelled()).toBe(true);
  });
  test("stops with an AbortError once nobody wants it, and is cancelled", async () => {
    let n = 0;
    const b = body([[1], [2], [3]], false);
    const e = await readBody(b.r, () => void n++, { stall: 100, stopped: () => n >= 1 }).catch((x) => x);
    expect(e.name).toBe("AbortError");
    expect(n).toBe(1);
    expect(b.cancelled()).toBe(true);
  });
  test("stops early, without an error, when the reader says enough came", async () => {
    const b = body([[1], [2], [3]], false);
    await expect(readBody(b.r, () => false, { stall: 100 })).resolves.toBe(1);
    expect(b.cancelled()).toBe(true);
  });
});
