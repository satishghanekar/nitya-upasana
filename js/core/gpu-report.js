// @ts-check
// Fast mode's report (Follow on the phone's GPU, js/features/listen.js): the check sound the model hears before it is
// trusted on a GPU, how alike its answers are to the model's own (models/chant-vN/check.json), and the report a reader
// shares when fast mode did not work on their phone, as plain text. It holds everything needed to find out why without
// asking the reader again (Satish, 2026-11-20: a Galaxy S24 Ultra, far away, whose GPU failed with no error kept): what
// happened and at which step, the error and where it came from, the GPU's name, limits and features, the phone and
// browser, the check sound's answers and times, and what happened on the CPU after. Nothing personal: no place, name,
// profile or text read. No init(): nothing here touches the page (tests/unit/gpu-report.test.mjs).

/** The check sound: 3 s at 16 kHz, a rising tone and a slowly beating one, as the model's Python side made it for
 * check.json (shravan-model, scripts/to_site.py) @returns {Float32Array} */
export function checkSound() {
  var a = new Float32Array(48000);
  for (var i = 0; i < a.length; i++) {
    var t = i / 16000;
    a[i] = 0.3 * Math.sin(2 * Math.PI * (220 + 60 * t) * t) + 0.2 * Math.sin(2 * Math.PI * 440 * t) * Math.cos(2 * Math.PI * 0.5 * t);
  }
  return a;
}

/** How many of the model's choices, step by step, are the expected ones (0 to 1; 0 when the lengths differ)
 * @param {number[]} got @param {number[]} want */
export function alike(got, want) {
  if (!want.length || got.length !== want.length) return 0;
  var same = 0;
  for (var i = 0; i < want.length; i++) if (got[i] === want[i]) same++;
  return same / want.length;
}

/** The fewest of the check sound's steps that must match for the GPU to be trusted: on SwiftShader and the M4 every
 * step matches (the first choice leads the second by 7 or more at each step), so a GPU off by more is computing wrong */
export var ALIKE_LEAST = 0.95;

/**
 * @typedef {{ status: "trying" | "failed" | "closed", step: string, at: string, tz: string, app: string, model: string,
 *   ort: string, error?: string, stack?: string, log: string[], gpu?: Record<string, any>, phone?: Record<string, any>,
 *   check?: { ms: number, alike: number, far: number }, timings?: Record<string, number>, cpu?: string,
 *   subgroups?: "on" | "off" | "none", before?: string }} Report
 */

/** A number of bytes in MB or KB, as people read them @param {number} n */
function size(n) {
  return n >= 1048576 ? Math.round(n / 1048576) + " MB" : n >= 1024 ? Math.round(n / 1024) + " KB" : String(n);
}

/** What happened, in words @param {Report} r */
function happened(r) {
  if (r.status === "closed") return "the app closed (crashed) while fast mode was " + r.step;
  if (r.status === "failed") return "fast mode failed while " + r.step;
  return "fast mode was still " + r.step;
}

/**
 * The report as the text shared (WhatsApp, a message), in English: for whoever fixes it, whatever the menu language
 * @param {Report} r
 * @returns {string}
 */
export function reportText(r) {
  var g = r.gpu || {},
    p = r.phone || {},
    lines = ["Nitya Upasana " + r.app + ": Follow fast mode report", "When: " + r.at + " (" + r.tz + ")", "What happened: " + happened(r)];
  if (r.error) lines.push("Error: " + r.error);
  if (r.stack) lines.push("Where: " + r.stack);
  lines.push("Model: " + r.model + ", ONNX Runtime " + r.ort);
  // (ONNX Runtime's 4-bit kernel uses the GPU's subgroups when it has them; tried once more without them where it failed)
  if (r.subgroups) lines.push("Subgroups: " + { on: "used", off: "turned off for this try", none: "not offered by this GPU" }[r.subgroups]);
  if (r.check)
    lines.push("Check sound: " + r.check.ms + " ms, " + Math.round(r.check.alike * 1000) / 10 + "% of steps right, scores off by up to " + r.check.far);
  if (r.timings)
    lines.push(
      "Times: " +
        Object.keys(r.timings)
          .map(function (k) {
            return k + " " + /** @type {Record<string, number>} */ (r.timings)[k] + " ms";
          })
          .join(", "),
    );
  lines.push(
    "GPU: " +
      [g.vendor, g.architecture, g.device, g.description]
        .filter(function (x) {
          return x;
        })
        .join(" · ") +
      (g.fallback ? " (a fallback adapter)" : "") +
      (g.subgroupMinSize ? ", subgroup size " + g.subgroupMinSize + " to " + g.subgroupMaxSize : ""),
  );
  if (g.limits)
    lines.push(
      "Limits: " +
        Object.keys(g.limits)
          .sort()
          .map(function (k) {
            var v = g.limits[k];
            return k + " " + (/Size$/.test(k) ? size(v) : v);
          })
          .join(", "),
    );
  if (g.features) lines.push("Features: " + (g.features.length ? g.features.slice().sort().join(", ") : "none"));
  lines.push(
    "Phone: " +
      (p.model || "?") +
      ", " +
      (p.platform || "?") +
      " " +
      (p.platformVersion || "") +
      ", " +
      (p.cores || "?") +
      " cores, " +
      (p.memory ? p.memory + " GB memory" : "memory ?"),
  );
  lines.push(
    "Browser: " + (p.browser || "?") + (p.installed ? ", installed app" : ", in the browser") + (p.isolated ? ", cross-origin isolated" : ", not isolated"),
  );
  if (p.screen) lines.push("Screen: " + p.screen);
  if (p.ua) lines.push("User agent: " + p.ua);
  if (r.log.length) {
    lines.push("Log:");
    r.log.forEach(function (x) {
      lines.push("  " + x);
    });
  }
  lines.push("Then: " + (r.cpu || "standard mode (CPU) is used from now on"));
  if (r.before) {
    lines.push("", "Earlier try:");
    r.before.split("\n").forEach(function (x) {
      lines.push("  " + x);
    });
  }
  return lines.join("\n");
}
