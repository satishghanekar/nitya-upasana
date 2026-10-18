// @ts-check
// The backup file (.nitya, docs/architecture.md §3.7): plain JSON with a SHA-256 checksum of its contents (Q10 in
// docs/decisions.md), holding every person on this phone with their settings and today's ticks, and the device's
// settings. Pure (no page, no storage): writing a file, reading one back with every check, saying what a restore
// would change, and when to remind about a backup. Unit-tested in tests/unit/backup.test.mjs; js/features/backup.js
// saves, shares and restores the files.
//
// {
//   "format": "nitya", "schema": 1, "kind": "backup", "app": "aarti-v1.4", "created": "2026-10-18T19:00:00.000Z",
//   "payload": { "profiles": [ … ], "activeProfile": "p…", "settings": { device settings } },
//   "sha256": "‹of JSON.stringify(payload)›"
// }
// The checksum is of the payload written without spaces, so a file re-indented by an editor still checks out, and
// any change to a value does not.

import { cleanProfile } from "./profiles.js";
import { devicePart, joinPrefs } from "./migrate.js";

/**
 * @typedef {import("./profiles.js").Profile} Profile
 * @typedef {import("./migrate.js").Env} Env
 * @typedef {import("./migrate.js").Prefs} Prefs
 * @typedef {{ profiles: Profile[], activeProfile: string, settings: Prefs }} Payload
 * @typedef {{ format: string, schema: number, kind: string, app: string, created: string, payload: Payload, sha256: string }} Backup
 * @typedef {"not-json" | "not-nitya" | "newer" | "kind" | "checksum" | "empty"} Problem
 * @typedef {{ ok: true, backup: Backup, data: Payload } | { ok: false, problem: Problem }} Read
 */

export const FORMAT = "nitya";
export const SCHEMA = 1;
export const EXT = ".nitya";
// remind when no backup was saved for this long, or (never saved) this long after the first person was made
export const REMIND_DAYS = 30;
export const FIRST_REMIND_DAYS = 14;
// "Not now" puts the reminder off for this long
export const SNOOZE_DAYS = 14;

// ---- SHA-256 (FIPS 180-4), small and synchronous, so it works the same on every browser and in Node, including
// pages opened over plain http where crypto.subtle is missing ----
var K = [
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3,
  0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13,
  0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208,
  0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
];

/**
 * The SHA-256 of a text (its UTF-8 bytes), as 64 hex digits
 * @param {string} text
 */
export function sha256(text) {
  var bytes = new TextEncoder().encode(text),
    n = bytes.length,
    len = ((n + 9 + 63) >> 6) << 6,
    m = new Uint8Array(len),
    w = new Uint32Array(64),
    h = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19],
    i,
    j;
  m.set(bytes);
  m[n] = 0x80;
  var bits = n * 8;
  m[len - 4] = (bits >>> 24) & 255;
  m[len - 3] = (bits >>> 16) & 255;
  m[len - 2] = (bits >>> 8) & 255;
  m[len - 1] = bits & 255;
  m[len - 5] = Math.floor(n / 0x20000000) & 255;
  for (i = 0; i < len; i += 64) {
    for (j = 0; j < 16; j++) w[j] = (m[i + j * 4] << 24) | (m[i + j * 4 + 1] << 16) | (m[i + j * 4 + 2] << 8) | m[i + j * 4 + 3];
    for (j = 16; j < 64; j++) {
      var a0 = w[j - 15],
        a1 = w[j - 2],
        s0 = ((a0 >>> 7) | (a0 << 25)) ^ ((a0 >>> 18) | (a0 << 14)) ^ (a0 >>> 3),
        s1 = ((a1 >>> 17) | (a1 << 15)) ^ ((a1 >>> 19) | (a1 << 13)) ^ (a1 >>> 10);
      w[j] = (w[j - 16] + s0 + w[j - 7] + s1) | 0;
    }
    var a = h[0],
      b = h[1],
      c = h[2],
      d = h[3],
      e = h[4],
      f = h[5],
      g = h[6],
      hh = h[7];
    for (j = 0; j < 64; j++) {
      var S1 = ((e >>> 6) | (e << 26)) ^ ((e >>> 11) | (e << 21)) ^ ((e >>> 25) | (e << 7)),
        ch = (e & f) ^ (~e & g),
        t1 = (hh + S1 + ch + K[j] + w[j]) | 0,
        S0 = ((a >>> 2) | (a << 30)) ^ ((a >>> 13) | (a << 19)) ^ ((a >>> 22) | (a << 10)),
        mj = (a & b) ^ (a & c) ^ (b & c),
        t2 = (S0 + mj) | 0;
      hh = g;
      g = f;
      f = e;
      e = (d + t1) | 0;
      d = c;
      c = b;
      b = a;
      a = (t1 + t2) | 0;
    }
    h[0] = (h[0] + a) | 0;
    h[1] = (h[1] + b) | 0;
    h[2] = (h[2] + c) | 0;
    h[3] = (h[3] + d) | 0;
    h[4] = (h[4] + e) | 0;
    h[5] = (h[5] + f) | 0;
    h[6] = (h[6] + g) | 0;
    h[7] = (h[7] + hh) | 0;
  }
  return h
    .map(function (x) {
      return (x >>> 0).toString(16).padStart(8, "0");
    })
    .join("");
}

/**
 * A backup of everything on this phone, ready to write to a file
 * @param {{ profiles: Profile[], activeProfile: string, device: Prefs }} data
 * @param {{ app: string, created: string }} o
 * @returns {Backup}
 */
export function makeBackup(data, o) {
  /** @type {Payload} */
  var payload = {
    profiles: JSON.parse(JSON.stringify(data.profiles)),
    activeProfile: data.activeProfile,
    settings: devicePart(data.device),
  };
  return { format: FORMAT, schema: SCHEMA, kind: "backup", app: o.app, created: o.created, payload: payload, sha256: sha256(JSON.stringify(payload)) };
}

/**
 * The file's text: readable JSON (two-space indent)
 * @param {Backup} b
 */
export function serialise(b) {
  return JSON.stringify(b, null, 2) + "\n";
}

/**
 * Read a backup file's text, with every check: is it JSON, a .nitya backup, of a version this app understands, with
 * a checksum that matches (a mismatch stops the restore), and at least one usable person in it. Settings and
 * people are cleaned (unknown or damaged values replaced by defaults), never trusted as they are.
 * @param {string} text
 * @param {Env} env
 * @returns {Read}
 */
export function parseBackup(text, env) {
  /** @type {any} */
  var b;
  try {
    b = JSON.parse(String(text).replace(/^﻿/, ""));
  } catch (e) {
    return { ok: false, problem: "not-json" };
  }
  if (!b || typeof b !== "object" || b.format !== FORMAT || typeof b.schema !== "number" || !b.payload || typeof b.payload !== "object")
    return { ok: false, problem: "not-nitya" };
  if (b.schema > SCHEMA) return { ok: false, problem: "newer" };
  if (b.kind !== "backup") return { ok: false, problem: "kind" };
  if (typeof b.sha256 !== "string" || b.sha256.toLowerCase() !== sha256(JSON.stringify(b.payload))) return { ok: false, problem: "checksum" };
  var seen = /** @type {Record<string, boolean>} */ ({}),
    names = /** @type {Record<string, boolean>} */ ({}),
    profiles = (Array.isArray(b.payload.profiles) ? b.payload.profiles : [])
      .map(function (/** @type {any} */ p) {
        return cleanProfile(p, env);
      })
      .filter(function (/** @type {Profile | null} */ p) {
        if (!p || seen[p.id] || names[p.name.toLowerCase()]) return false;
        seen[p.id] = names[p.name.toLowerCase()] = true;
        return true;
      });
  if (!profiles.length) return { ok: false, problem: "empty" };
  var active = typeof b.payload.activeProfile === "string" && seen[b.payload.activeProfile] ? b.payload.activeProfile : profiles[0].id;
  /** @type {Payload} */
  var data = { profiles: profiles, activeProfile: active, settings: devicePart(joinPrefs(null, b.payload.settings, env)) };
  return { ok: true, backup: b, data: data };
}

/**
 * What a restore will change: the people in the file who are new here, those who will be replaced by the file's
 * copy (the same person: the same id, or, on another phone, the same name), and those on this phone who are not in
 * the file and will be removed.
 * @param {Profile[]} here
 * @param {Payload} file
 * @returns {{ added: string[], replaced: string[], removed: string[], active: string }}
 */
export function describeRestore(here, file) {
  /** @param {Profile} p */
  function key(p) {
    return p.name.toLowerCase();
  }
  /** @type {Profile[]} */
  var left = here.slice(),
    /** @type {string[]} */
    added = [],
    /** @type {string[]} */
    replaced = [],
    act = file.profiles.filter(function (p) {
      return p.id === file.activeProfile;
    })[0];
  /** @param {(a: Profile, b: Profile) => boolean} same */
  function match(same) {
    file.profiles.forEach(function (f) {
      if (added.indexOf(f.name) >= 0 || replaced.indexOf(f.name) >= 0) return;
      for (var i = 0; i < left.length; i++)
        if (same(f, left[i])) {
          replaced.push(f.name);
          left.splice(i, 1);
          return;
        }
    });
  }
  // by id first, then by name, so "Me" on a new phone is shown as replaced, not as both new and removed
  match(function (a, b) {
    return a.id === b.id;
  });
  match(function (a, b) {
    return key(a) === key(b);
  });
  file.profiles.forEach(function (f) {
    if (replaced.indexOf(f.name) < 0) added.push(f.name);
  });
  return {
    added: added,
    // in the file's order
    replaced: file.profiles.map(name).filter(function (n) {
      return replaced.indexOf(n) >= 0;
    }),
    removed: left.map(name),
    active: act ? act.name : "",
  };
}

/** @param {Profile} p */
function name(p) {
  return p.name;
}

/**
 * The file's name, with the day it was saved: nitya-upasana-2026-10-18.nitya
 * @param {Date} d
 */
export function fileName(d) {
  var p = function (/** @type {number} */ n) {
    return (n < 10 ? "0" : "") + n;
  };
  return "nitya-upasana-" + d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate()) + EXT;
}

/**
 * Whether to show the gentle reminder: no backup for REMIND_DAYS (or, never saved, FIRST_REMIND_DAYS after the first
 * person was made), and not put off with "Not now" in the last SNOOZE_DAYS.
 * @param {{ since?: string, lastBackup?: string, snooze?: string }} meta
 * @param {Date} now
 */
export function needsReminder(meta, now) {
  var day = 86400000,
    t = now.getTime(),
    at = function (/** @type {string | undefined} */ s) {
      var v = s ? Date.parse(s) : NaN;
      return isNaN(v) ? NaN : v;
    },
    snooze = at(meta.snooze),
    last = at(meta.lastBackup),
    since = at(meta.since);
  if (!isNaN(snooze) && t - snooze < SNOOZE_DAYS * day) return false;
  if (!isNaN(last)) return t - last >= REMIND_DAYS * day;
  if (!isNaN(since)) return t - since >= FIRST_REMIND_DAYS * day;
  return false;
}
