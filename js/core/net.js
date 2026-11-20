// @ts-check
// Waiting with a limit (2026-11-20): a request on a weak connection ("lie-fi") can hang without ever failing, and a
// promise nobody limits leaves the page waiting with it: the texts never loaded and the page stayed blank, Check for
// updates stayed busy, Follow's download stopped moving with no word. Every wait on the network, or on something that
// may never answer (a GPU), goes through these, so each one ends, by itself if need be, with an error that says so.
// Pure functions: no page needed (tests/unit/net.test.mjs).

/** The error a wait that ran out of time ends with: its name is "TimeoutError", as the browser's own
 * @param {string} what  what was waited for, in words @param {number} ms */
export function timeoutError(what, ms) {
  var e = new Error(what + ": no answer in " + Math.round(ms / 1000) + " s");
  e.name = "TimeoutError";
  return e;
}

/** Whether an error is a wait that ran out of time @param {any} e */
export function timedOut(e) {
  return !!e && e.name === "TimeoutError";
}

/**
 * A promise that settles as `p` does, or fails with a TimeoutError after `ms`. `p` itself carries on (nothing can stop
 * it); `onLate` runs if the time runs out first, to let go of what it holds.
 * @template T @param {Promise<T>} p @param {number} ms @param {string} what @param {() => void} [onLate]
 * @returns {Promise<T>}
 */
export function within(p, ms, what, onLate) {
  /** @type {any} */ var timer = 0;
  var late = new Promise(function (_, no) {
    timer = setTimeout(function () {
      // (the time out first: letting go of `p` may fail it at once, with an error that would hide why)
      no(timeoutError(what, ms));
      if (onLate) onLate();
    }, ms);
  });
  return /** @type {Promise<T>} */ (Promise.race([p, late])).finally(function () {
    clearTimeout(timer);
  });
}

/**
 * fetch(), given up after `ms` with no answer (the headers; the body is read by readBody, with its own limit): the
 * request itself is stopped then, so it holds nothing on. A `signal` of the caller's own is not supported here.
 * @param {RequestInfo | URL} input @param {RequestInit} init @param {number} ms @returns {Promise<Response>}
 */
export function fetchWithin(input, init, ms) {
  var stop = typeof AbortController === "function" ? new AbortController() : null;
  var p = fetch(input, stop ? Object.assign({}, init, { signal: stop.signal }) : init);
  return within(p, ms, String(input instanceof Request ? input.url : input), function () {
    if (stop) stop.abort();
  });
}

/**
 * A response's body read piece by piece, each piece handed to `take`: fails with a TimeoutError when no piece comes for
 * `stall` ms (the download stopped coming in), and with an Error named "AbortError" as soon as `stopped()` says so.
 * Either way the body is cancelled, so the connection is let go. Resolves to the number of bytes read.
 * @param {Response} r @param {(piece: Uint8Array) => void | boolean} take  returns false to stop reading (enough came)
 * @param {{ stall: number, stopped?: () => boolean, what?: string }} o @returns {Promise<number>}
 */
export async function readBody(r, take, o) {
  if (!r.body) throw new Error((o.what || "a download") + ": no body");
  var reader = r.body.getReader(),
    n = 0;
  try {
    for (;;) {
      if (o.stopped && o.stopped()) {
        var e = new Error("stopped");
        e.name = "AbortError";
        throw e;
      }
      var x = await within(reader.read(), o.stall, o.what || "a download");
      if (x.done) return n;
      n += x.value.length;
      if (take(x.value) === false) {
        reader.cancel().catch(function () {});
        return n;
      }
    }
  } catch (e) {
    reader.cancel().catch(function () {});
    throw e;
  }
}
