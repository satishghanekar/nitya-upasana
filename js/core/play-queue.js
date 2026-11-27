// @ts-check
// Play mode's order (js/features/play.js; Satish, 2026-11-26: on a Sankathara evening with no one to sing, the
// recordings played one after another): which of a list's texts have a recording, where playing starts, what comes
// before and after, and what was passed over. Pure functions, no page: unit-tested in tests/unit/play-queue.test.mjs.
// No init().

/** A recording's place in a text's header line (js/text/format.js RECORDING), with the video's id, the second the text
 * starts (t=) and, where the line has one, the second it ends (end=) */
var ONE = /^\[([^\]]+)\]\(https:\/\/www\.youtube\.com\/watch\?v=([\w-]{11})(?:&t=(\d+))?(?:&end=(\d+))?\)$/;

/**
 * @typedef {{ who: string, video: string, start: number, end: number }} Track
 *   a recording to play: the chanters' names, the YouTube video's id, its start and its end in seconds (0: to the end)
 */

/**
 * The first recording on a text's header line ("[Jagjit Singh](https://www.youtube.com/watch?v=…&t=15), [...]"), or
 * null: the first is the one played
 * @param {string | undefined} line
 * @returns {Track | null}
 */
export function trackOf(line) {
  if (!line) return null;
  var m = ONE.exec(line.split(", ")[0]);
  return m ? { who: m[1], video: m[2], start: Number(m[3] || 0), end: Number(m[4] || 0) } : null;
}

/**
 * The texts of a list that have a recording, in the list's order
 * @param {string[]} ids
 * @param {(id: string) => Track | null} track
 * @returns {string[]}
 */
export function playable(ids, track) {
  return ids.filter(function (id) {
    return !!track(id);
  });
}

/**
 * Where playing starts: the first text with a recording at or after the one given (or from the top), or -1 when none
 * is left
 * @param {string[]} ids
 * @param {(id: string) => Track | null} track
 * @param {string} [from]
 * @returns {number}  its place in ids
 */
export function startAt(ids, track, from) {
  var i = from ? Math.max(0, ids.indexOf(from)) : 0;
  for (; i < ids.length; i++) if (track(ids[i])) return i;
  return -1;
}

/**
 * The next (dir 1) or previous (dir -1) text with a recording from place i, or -1 at the end (or the start)
 * @param {string[]} ids
 * @param {(id: string) => Track | null} track
 * @param {number} i
 * @param {1 | -1} dir
 * @returns {number}
 */
export function step(ids, track, i, dir) {
  for (var j = i + dir; j >= 0 && j < ids.length; j += dir) if (track(ids[j])) return j;
  return -1;
}

/**
 * The texts passed over going from place a to place b (later in the list): those between them, which have no
 * recording
 * @param {string[]} ids
 * @param {number} a
 * @param {number} b
 * @returns {string[]}
 */
export function skipped(ids, a, b) {
  return b > a + 1 ? ids.slice(a + 1, b) : [];
}

/**
 * "2 of 4": a text's place among the list's texts with a recording, counted from 1, and how many they are
 * @param {string[]} ids
 * @param {(id: string) => Track | null} track
 * @param {number} i
 * @returns {[number, number]}
 */
export function placeOf(ids, track, i) {
  var all = playable(ids, track);
  return [all.indexOf(ids[i]) + 1, all.length];
}

/**
 * A time in minutes and seconds ("1:58")
 * @param {number} s
 */
export function clock(s) {
  var t = Math.max(0, Math.floor(s || 0));
  return Math.floor(t / 60) + ":" + String(t % 60).padStart(2, "0");
}
