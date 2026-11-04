// @ts-check
// Listen test (step 0 of "where are we in the chanting?"; Satish, 2026-11-04): a page for trying the phone's own
// speech recognition on chanting, before anything is built on it. Opened only by the address …/#listen-test. It shows
// exactly what the phone heard (every alternative, with its confidence), and every start, stop and error, with a Copy
// button, so the transcripts can be brought back and used to build and test the matching. Nothing is matched here.
// A test page for Satish only, reached by no button or menu: its words are English only and its look is set here.
// Take it out (main.js, parts.js, index.html's modulepreload) once the matching is built on what it found.

/** @type {HTMLElement | null} */
var box = null;
/** @type {any} */
var rec = null;
var on = false,
  t0 = 0,
  restarts = 0,
  lang = "mr-IN";
/** @type {string[]} */
var log = [];

export function init() {
  window.addEventListener("hashchange", check);
  check();
}

function check() {
  if (location.hash === "#listen-test") show();
  else if (box) hide();
}

/** The recogniser the browser has, or null (Firefox has none) */
function Recogniser() {
  /** @type {any} */
  var w = window;
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

/** @param {string} tag @param {Record<string, string>} [css] @param {string} [text] */
function el(tag, css, text) {
  var e = document.createElement(tag);
  if (css) Object.assign(e.style, css);
  if (text) e.textContent = text;
  return e;
}

/** @param {string} label @param {() => void} fn */
function button(label, fn) {
  var b = /** @type {HTMLButtonElement} */ (
    el(
      "button",
      {
        minHeight: "44px",
        minWidth: "44px",
        padding: "0 14px",
        margin: "4px 6px 4px 0",
        font: "inherit",
        borderRadius: "10px",
        border: "1px solid var(--line, #ccc)",
        background: "var(--card, #fff)",
        color: "var(--ink, #222)",
      },
      label,
    )
  );
  b.type = "button";
  b.addEventListener("click", fn);
  return b;
}

/** @type {HTMLElement} */ var now;
/** @type {HTMLElement} */ var list;
/** @type {HTMLButtonElement} */ var go;
/** @type {HTMLInputElement} */ var what;
/** @type {HTMLInputElement} */ var again;
/** @type {HTMLElement} */ var langs;

function show() {
  if (box) return;
  box = el("div", {
    position: "fixed",
    inset: "0",
    zIndex: "9999",
    overflow: "auto",
    padding: "16px 16px 40px",
    background: "var(--bg, #fff)",
    color: "var(--ink, #222)",
    font: "16px/1.45 var(--lat, system-ui)",
  });
  box.setAttribute("role", "dialog");
  box.setAttribute("aria-modal", "true");
  box.setAttribute("aria-label", "Listen test");
  box.lang = "en";
  box.appendChild(el("h2", { margin: "0 0 8px", fontSize: "22px" }, "Listen test"));
  var R = Recogniser();
  /** @type {any} */
  var nav = navigator;
  var standalone = nav.standalone === true || matchMedia("(display-mode: standalone)").matches;
  box.appendChild(
    el(
      "p",
      { margin: "0 0 10px", color: "var(--muted, #666)", fontSize: "14px" },
      (R ? "Speech recognition: available" : "Speech recognition: NOT available in this browser") +
        " · " +
        (standalone ? "home-screen app" : "browser tab") +
        " · " +
        (navigator.onLine ? "online" : "offline"),
    ),
  );
  what = /** @type {HTMLInputElement} */ (
    el("input", {
      width: "100%",
      minHeight: "44px",
      font: "inherit",
      padding: "0 10px",
      boxSizing: "border-box",
      margin: "0 0 8px",
    })
  );
  what.placeholder = "What I'm chanting (e.g. Sukhkarta, noisy room)";
  what.setAttribute("aria-label", "What I'm chanting");
  box.appendChild(what);
  langs = el("div", { margin: "0 0 4px" });
  ["mr-IN", "hi-IN", "en-IN", "sa-IN"].forEach(function (l) {
    var b = button(l, function () {
      lang = l;
      mark();
    });
    b.dataset.l = l;
    langs.appendChild(b);
  });
  box.appendChild(langs);
  var opt = el("label", {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    minHeight: "44px",
  });
  again = /** @type {HTMLInputElement} */ (el("input"));
  again.type = "checkbox";
  again.checked = true;
  opt.appendChild(again);
  opt.appendChild(document.createTextNode("Start again by itself when it stops"));
  box.appendChild(opt);
  go = button("Start listening", toggle);
  go.style.fontWeight = "700";
  box.appendChild(go);
  box.appendChild(button("Copy", copy));
  box.appendChild(button("Clear", clear));
  box.appendChild(
    button("Close", function () {
      history.replaceState(null, "", location.pathname + location.search);
      hide();
    }),
  );
  now = el("p", {
    minHeight: "3em",
    margin: "12px 0",
    padding: "8px 10px",
    borderRadius: "10px",
    background: "var(--card, #f6f6f6)",
    fontSize: "20px",
  });
  now.setAttribute("aria-live", "polite");
  now.lang = "mr";
  box.appendChild(now);
  list = el("pre", {
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
    font: "14px/1.5 var(--lat, system-ui)",
    margin: "0",
  });
  box.appendChild(list);
  document.body.appendChild(box);
  mark();
  if (!R) go.disabled = true;
  go.focus();
}

function hide() {
  stop();
  if (box) box.remove();
  box = null;
}

function mark() {
  [].forEach.call(langs.children, function (/** @type {HTMLButtonElement} */ b) {
    var sel = b.dataset.l === lang;
    b.setAttribute("aria-pressed", String(sel));
    b.style.background = sel ? "var(--accent, #8a1c1c)" : "var(--card, #fff)";
    b.style.color = sel ? "#fff" : "var(--ink, #222)";
  });
}

/** @param {string} s */
function add(s) {
  var t = ((Date.now() - t0) / 1000).toFixed(1).padStart(5, " ");
  log.push(t + "s  " + s);
  list.textContent = log.join("\n");
}

function toggle() {
  if (on) stop();
  else start();
}

function start() {
  var R = Recogniser();
  if (!R) return;
  on = true;
  restarts = 0;
  t0 = Date.now();
  log = [];
  add("=== " + (what.value || "(not named)") + " · " + lang + " · " + new Date().toString());
  add(navigator.userAgent);
  go.textContent = "Stop";
  begin(R);
}

/** One run of the recogniser; started again when it stops, while on */
function begin(/** @type {any} */ R) {
  rec = new R();
  rec.lang = lang;
  rec.continuous = true;
  rec.interimResults = true;
  rec.maxAlternatives = 5;
  ["start", "audiostart", "soundstart", "speechstart", "speechend", "soundend", "audioend"].forEach(function (k) {
    rec.addEventListener(k, function () {
      add("· " + k);
    });
  });
  rec.addEventListener("result", function (/** @type {any} */ e) {
    var live = [];
    for (var i = e.resultIndex; i < e.results.length; i++) {
      var r = e.results[i];
      if (r.isFinal) {
        var alts = [];
        for (var j = 0; j < r.length; j++) alts.push("   " + (j + 1) + ". " + r[j].transcript + "  (" + (r[j].confidence || 0).toFixed(2) + ")");
        add("FINAL #" + i + "\n" + alts.join("\n"));
      } else live.push(r[0].transcript);
    }
    now.textContent = live.join(" ") || now.textContent;
    if (live.length) add("… " + live.join(" "));
  });
  rec.addEventListener("nomatch", function () {
    add("· nomatch");
  });
  rec.addEventListener("error", function (/** @type {any} */ e) {
    add("ERROR " + e.error + (e.message ? ": " + e.message : ""));
    // the microphone refused, or the language not there: starting again would only repeat it
    if (e.error === "not-allowed" || e.error === "service-not-allowed" || e.error === "language-not-supported") stop();
  });
  rec.addEventListener("end", function () {
    add("· end");
    if (on && again.checked && restarts < 30) {
      restarts++;
      add("· starting again (" + restarts + ")");
      begin(R);
    } else if (on) stop();
  });
  try {
    rec.start();
  } catch (err) {
    add("ERROR on start: " + err);
    stop();
  }
}

function stop() {
  var r = rec;
  on = false;
  rec = null;
  if (go) go.textContent = "Start listening";
  if (r) {
    try {
      r.stop();
    } catch (err) {
      // already stopped
    }
  }
}

function copy() {
  var text = log.join("\n");
  if (navigator.clipboard)
    navigator.clipboard.writeText(text).then(
      function () {
        now.textContent = "Copied: paste it into a message to Claude.";
      },
      function () {
        now.textContent = "Copy failed: select the text below and copy it by hand.";
      },
    );
}

function clear() {
  log = [];
  list.textContent = "";
  now.textContent = "";
}
