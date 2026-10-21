// @ts-check
// "Add texts": every text in the library, with search and a checkbox each (ticked = in the list being edited). Used by
// the routine builder (js/features/routine-builder.js): beside its list on wide screens (from 1024px), and on phones
// and tablets a sheet over it (a dialog: focus moves in, Tab stays inside, Done, Escape, the phone's Back or a tap
// outside closes it and focus returns to Add texts). A tick adds the text at the end of the list at once; taking it
// off removes it.
// Kept on its own so it can later gain category filters (the Library's categories): the texts come in through
// options.texts(), with their category, and the rows are drawn by options.name().
// No init(): the builder creates it (createPicker) when it starts, and gives it the phone's Back step for the sheet
// (ovSub / ovSubDone in js/features/history.js), so this file touches no other part and its search is unit-tested in
// Node (tests/unit/routine.test.mjs).

/**
 * @typedef {{ id: string, title: string, titleEn: string, language: string, category: string }} PickText
 * @typedef {{
 *   heading: string, search: string, none: string, done: string,
 *   found: (n: number) => string, cats?: Record<string, string>
 * }} PickWords
 * @typedef {{
 *   texts: () => PickText[],
 *   isOn: (id: string) => boolean,
 *   toggle: (id: string, on: boolean) => void,
 *   name: (t: PickText) => string,
 *   words: () => PickWords,
 *   lang: () => string,
 *   back?: { push: (close: () => void) => void, done: () => void }
 * }} PickOptions
 * @typedef {{ render: () => void, sync: () => void, open: (from: HTMLElement | null) => void, close: () => void,
 *   isSheet: () => boolean, isOpen: () => boolean }} Picker
 */

// Beside the list from this width (css/14-builder.css); below it, a sheet
const WIDE = "(min-width: 1024px)";

/** @param {string} s */
function esc(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/**
 * What a search compares: lower case, without accents (ā → a), Devanagari vowel signs and nukta kept, spaces and
 * punctuation dropped, so "ghalin", "Ghālin" and "घालीन" each find घालीन लोटांगण
 * @param {string} s
 */
export function searchKey(s) {
  return String(s || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[\s.,;:!?'"()\-–—·।॥]+/g, "");
}

/**
 * Whether a text matches what was typed
 * @param {PickText} t
 * @param {string} q  searchKey() of the query
 */
export function matches(t, q) {
  return !q || searchKey(t.title).indexOf(q) >= 0 || searchKey(t.titleEn).indexOf(q) >= 0;
}

/**
 * @param {HTMLElement} el  the empty container (#tpk)
 * @param {PickOptions} o
 * @returns {Picker}
 */
export function createPicker(el, o) {
  var back = o.back || { push: function () {}, done: function () {} },
    mq = typeof matchMedia === "function" ? matchMedia(WIDE) : null,
    open = false,
    /** @type {HTMLElement | null} */
    from = null,
    q = "";

  function wide() {
    return !!(mq && mq.matches);
  }

  // A sheet (phones, tablets) is a modal dialog, shown only when open; beside the list it is a plain region
  function mode() {
    var sheet = !wide();
    el.classList.toggle("sheet", sheet);
    if (sheet) {
      el.setAttribute("role", "dialog");
      el.setAttribute("aria-modal", "true");
      el.hidden = !open;
    } else {
      el.setAttribute("role", "region");
      el.removeAttribute("aria-modal");
      el.hidden = false;
      if (open) {
        open = false;
        back.done();
      }
    }
    var b = document.getElementById("rtadd");
    if (b) b.setAttribute("aria-expanded", String(sheet && open));
  }

  function render() {
    var w = o.words(),
      texts = o.texts();
    el.lang = o.lang();
    el.innerHTML =
      '<div class="tpkin">' +
      '<div class="tpkhd"><h3 id="tpkt" tabindex="-1">' + esc(w.heading) + "</h3>" +
      '<button type="button" class="tpkx">' + esc(w.done) + "</button></div>" +
      '<input type="search" class="tpkq" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="' + esc(w.search) + '" aria-label="' + esc(w.search) + '">' +
      '<ul class="tpkl">' +
      texts
        .map(function (t) {
          var cat = (w.cats && w.cats[t.category]) || "";
          return (
            '<li data-id="' + esc(t.id) + '"><label class="tpkr"><input type="checkbox" value="' + esc(t.id) + '"' + (o.isOn(t.id) ? " checked" : "") + ">" +
            '<span class="tpkc" aria-hidden="true"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg></span>' +
            '<span class="tt">' + o.name(t) + "</span>" +
            (cat ? '<span class="ttg">' + esc(cat) + "</span>" : "") +
            "</label></li>"
          );
        })
        .join("") +
      "</ul>" +
      '<p class="tpkn" hidden>' + esc(w.none) + "</p>" +
      '<p class="tpks sr" role="status"></p>' +
      "</div>";
    var input = /** @type {HTMLInputElement} */ (el.querySelector(".tpkq"));
    input.value = q;
    if (q) filter(false);
    mode();
  }

  /** Show only the texts that match; say how many (not on the first draw) @param {boolean} say */
  function filter(say) {
    var key = searchKey(q),
      texts = o.texts(),
      n = 0;
    texts.forEach(function (t) {
      var li = /** @type {HTMLElement | null} */ (el.querySelector('li[data-id="' + t.id + '"]')),
        ok = matches(t, key);
      if (li) li.hidden = !ok;
      if (ok) n++;
    });
    var none = /** @type {HTMLElement} */ (el.querySelector(".tpkn"));
    none.hidden = n > 0;
    if (say) /** @type {HTMLElement} */ (el.querySelector(".tpks")).textContent = o.words().found(n);
  }

  /** The ticks follow the list (a text removed or added in the builder) */
  function sync() {
    [].forEach.call(el.querySelectorAll(".tpkl input"), function (/** @type {HTMLInputElement} */ x) {
      x.checked = o.isOn(x.value);
    });
  }

  /** @param {HTMLElement | null} f  where focus returns when the sheet closes */
  function show(f) {
    if (wide()) {
      // beside the list: Add texts takes you to the search box
      var input = /** @type {HTMLElement | null} */ (el.querySelector(".tpkq"));
      if (input) input.focus();
      return;
    }
    if (open) return;
    open = true;
    from = f;
    mode();
    back.push(function () {
      hide(true);
    });
    var h = /** @type {HTMLElement | null} */ (el.querySelector("#tpkt"));
    // the heading takes focus, not the search box: on a phone that would bring the keyboard up over the list
    if (h)
      try {
        h.focus({ preventScroll: true });
      } catch (e) {}
  }

  /** @param {boolean} [fromPop] closed by the phone's Back (its Back step is already gone) */
  function hide(fromPop) {
    if (!open) return;
    open = false;
    mode();
    if (!fromPop) back.done();
    var f = from;
    from = null;
    if (f && f.isConnected && f.getClientRects().length)
      try {
        f.focus({ preventScroll: true });
      } catch (e) {}
  }

  el.addEventListener("change", function (e) {
    var x = /** @type {HTMLInputElement} */ (e.target);
    if (x.type !== "checkbox") return;
    o.toggle(x.value, x.checked);
  });
  el.addEventListener("input", function (e) {
    var x = /** @type {HTMLInputElement} */ (e.target);
    if (!x.classList.contains("tpkq")) return;
    q = x.value;
    filter(true);
  });
  el.addEventListener("click", function (e) {
    var t = /** @type {HTMLElement} */ (e.target);
    if (t === el && open) hide();
    else if (t.closest(".tpkx")) hide();
  });
  // Escape closes the sheet only (the builder stays); Tab stays inside it
  el.addEventListener("keydown", function (e) {
    if (!open) return;
    if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      hide();
      return;
    }
    if (e.key !== "Tab") return;
    /** @type {HTMLElement[]} */
    var f = [].filter.call(el.querySelectorAll("button,input"), function (/** @type {HTMLElement} */ x) {
      return x.getClientRects().length > 0;
    });
    if (!f.length) return;
    var i = f.indexOf(/** @type {HTMLElement} */ (document.activeElement));
    if (e.shiftKey ? i <= 0 : i === f.length - 1 || i < 0) {
      e.preventDefault();
      /** @type {HTMLElement} */ (f[e.shiftKey ? f.length - 1 : 0]).focus();
    }
  });
  if (mq) {
    var onMq = function () {
      mode();
    };
    if (mq.addEventListener) mq.addEventListener("change", onMq);
    else if (mq.addListener) mq.addListener(onMq);
  }

  return {
    render: render,
    sync: sync,
    open: show,
    close: function () {
      hide();
    },
    isSheet: function () {
      return !wide();
    },
    isOpen: function () {
      return open;
    },
  };
}
