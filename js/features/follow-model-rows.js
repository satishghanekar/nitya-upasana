// @ts-check
// Settings → About → Follow: Follow's model on this phone (Satish, 2026-11-20, for a phone low on memory or space).
// - Keep on this phone (#follow-model-download): a switch, the download's state under it. Off takes the download off the phone; on downloads it ahead, so
//   Follow starts without waiting. Locked while Follow is on.
// - Free memory (#follow-model-memory): shown only while the model is loaded, its title the link (Using memory now, plain,
//   while Follow listens). It is let go by itself
//   anyway, two minutes after Follow stops or when the app is put away (js/features/follow-model.js), so this is for
//   the moment the reader wants it now. No Load: loading ahead saves a few seconds at the start and holds the memory.
// - Each asks first, in a pop-up (#follow-model-ask), which says what it frees or costs.
// One part of the site script; js/main.js runs each part's init() in order. See js/README.md.

import { byId, note, warn } from "../core/page.js";
import { menuWords } from "../core/strings.js";
import { num } from "../core/words.js";
import { ovDone, ovPush } from "./history.js";
import * as models from "./follow-model.js";

/** the download is on this phone (read again when About opens, and after each change) */
var saved = false;
/** About's Download, how far it has come (percent) */
var pct = 0;
/** what the pop-up asks: remove, download or free @type {"" | "remove" | "download" | "free"} */
var asking = "";
/** the control that opened the pop-up, for focus to go back to @type {HTMLElement | null} */
var from = null;

/** The rows, as the model is now (saved read again first when `fresh`) @param {boolean} [fresh] */
async function show(fresh) {
  var dl = document.getElementById("follow-model-download");
  if (!dl || !models.supported()) return;
  await models.way();
  if (fresh) saved = await models.stored();
  paint();
}

/** The rows as the model is now, with the download's state as last read (way() has run) */
function paint() {
  var dl = byId("follow-model-download"),
    w = menuWords("listen"),
    st = models.state(),
    mb = num(models.chosen().mb),
    sw = byId("follow-model-switch"),
    mem = byId("follow-model-memory");
  sw.setAttribute("aria-checked", saved || st.fetching ? "true" : "false");
  // (aria-disabled, not disabled: a control that loses focus as it is disabled leaves Settings with none, which closes it)
  sw.setAttribute("aria-disabled", st.follow || st.fetching ? "true" : "false");
  byId("follow-model-download-note").textContent = st.fetching ? w.dlBusy(num(pct)) : saved ? w.dlOn(mb) : w.dlOff(mb);
  byId("follow-model-busy").hidden = !st.follow;
  // (Using memory now going while focus is in it, by itself or by Free memory: focus moves to the rows' title, as a
  // focused control that disappears leaves Settings with none, which closes it)
  var focused = mem.contains(document.activeElement);
  mem.hidden = !st.loaded;
  if (focused && mem.hidden) byId("follow-model-download-title").focus();
  byId("follow-model-memory-note").textContent = st.follow ? w.memUse : w.memNote;
  // (Free memory is the row's title, a link; while Follow listens it can't be freed, and the title is plain words)
  byId("follow-model-free").hidden = st.follow;
  byId("follow-model-memory-title").hidden = !st.follow;
  dl.hidden = false;
}

/** The pop-up, asking before the switch or Free memory acts @param {"remove" | "download" | "free"} what
 * @param {HTMLElement} opener */
function ask(what, opener) {
  var w = menuWords("listen"),
    mb = num(models.chosen().mb),
    /** @type {Record<string, [string, string, string]>} */ words = {
      remove: [w.askRemove, w.askRemoveText(mb), w.remove],
      download: [w.askDownload, w.askDownloadText(mb), w.download],
      free: [w.askFree, w.askFreeText, w.freeMemory],
    };
  asking = what;
  from = opener;
  byId("follow-model-ask-title").textContent = words[what][0];
  byId("follow-model-ask-text").textContent = words[what][1];
  byId("follow-model-yes").textContent = words[what][2];
  byId("follow-model-no").textContent = w.cancel;
  ovPush();
  byId("follow-model-ask").hidden = false;
  byId("follow-model-ask-title").focus();
}

/** The pop-up closed (Cancel, the dimmed page around it, Escape, the phone's Back, or after its action) */
function shut() {
  var d = byId("follow-model-ask");
  if (d.hidden) return;
  d.hidden = true;
  asking = "";
  ovDone();
  // (focus back where it was, or on the row's title if that control is gone now)
  var to = from && from.getClientRects().length ? from : byId("follow-model-download-title");
  to.focus();
}

/** The pop-up's action, then the rows again */
function act() {
  var what = asking,
    w = menuWords("listen"),
    mb = num(models.chosen().mb);
  if (what === "free") {
    // (let go first, so the pop-up closing finds Free memory gone and puts focus on the rows' title instead)
    models.release();
    paint();
    shut();
    note(w.freed);
    return;
  }
  shut();
  if (what === "remove")
    models.remove().then(function (gone) {
      if (gone) note(w.removed(mb));
      show(true);
    });
  else if (what === "download") {
    pct = 0;
    models
      .fetchFiles(function (p) {
        pct = p;
        paint();
      })
      .then(
        function () {
          note(w.doneDownload);
        },
        function (/** @type {any} */ e) {
          if (e && e.name === "AbortError") return;
          console.warn("Follow's download:", e);
          warn(models.whyFailed(e));
        },
      )
      .then(function () {
        show(true);
      });
  }
}

export function init() {
  var found = document.getElementById("follow-model-download");
  if (!found) return;
  var dl = found;
  document.addEventListener("nitya-settings", function () {
    show(true);
  });
  // the model loaded, let go, downloaded or removed, or Follow started or stopped: the rows follow, if they show
  document.addEventListener("nitya-follow-model", function () {
    if (!dl.hidden) show(true);
  });
  var sw = byId("follow-model-switch");
  sw.addEventListener("click", function () {
    if (sw.getAttribute("aria-disabled") === "true") return;
    ask(sw.getAttribute("aria-checked") === "true" ? "remove" : "download", sw);
  });
  var free = byId("follow-model-free");
  free.addEventListener("click", function () {
    ask("free", free);
  });
  byId("follow-model-yes").addEventListener("click", act);
  byId("follow-model-no").addEventListener("click", shut);
  var d = byId("follow-model-ask");
  d.addEventListener("click", function (e) {
    if (e.target === d) shut();
  });
  // (caught on the way down, so Escape closes only the pop-up and not Settings under it)
  document.addEventListener(
    "keydown",
    function (e) {
      if (e.key !== "Escape" || d.hidden) return;
      e.preventDefault();
      e.stopPropagation();
      shut();
    },
    true,
  );
  // the phone's Back hides it (js/features/overlays.js, LAYERS): what it asked is forgotten
  addEventListener("popstate", function () {
    if (d.hidden) asking = "";
  });
}
