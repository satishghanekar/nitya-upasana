// More (⋯ in the top bar): App, Share, QR and Help in a small menu under the button, on every page (Print is in the bottom bar)
// One part of the site script; js/main.js runs each part's init() in order. See js/README.md.

export function init() {
  var mb = /** @type {HTMLElement} */ (document.getElementById("tmb")),
    row = /** @type {HTMLElement} */ (document.getElementById("shr"));
  if (!mb || !row) return;
  var more = mb,
    menu = row;
  // opened: under the button, its right edge on the button's (the bar sits at the top, so the menu never runs off)
  function place() {
    var r = more.getBoundingClientRect();
    menu.style.top = Math.round(r.bottom + 6) + "px";
    menu.style.right = Math.max(8, Math.round(document.documentElement.clientWidth - r.right)) + "px";
  }
  function show(open, focusBack) {
    more.setAttribute("aria-expanded", String(open));
    menu.hidden = !open;
    if (open) {
      place();
      var first = /** @type {HTMLElement | null} */ (menu.querySelector("button:not([hidden])"));
      if (first) first.focus();
    } else if (focusBack) more.focus();
  }
  more.addEventListener("click", function () {
    show(menu.hidden, false);
  });
  // a choice closes the menu first, with focus on ⋯ (its pop-up, Help or the share sheet then opens over the page,
  // and gives focus back to ⋯ when it closes)
  menu.addEventListener(
    "click",
    function (e) {
      if (/** @type {HTMLElement} */ (e.target).closest("button")) show(false, true);
    },
    true,
  );
  // a tap anywhere else, Escape, or the page moving under it closes it
  document.addEventListener(
    "pointerdown",
    function (e) {
      var t = /** @type {HTMLElement} */ (e.target);
      if (!menu.hidden && !menu.contains(t) && !more.contains(t)) show(false, false);
    },
    true,
  );
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && !menu.hidden) {
      e.stopPropagation();
      show(false, true);
    }
  });
  addEventListener("resize", function () {
    if (!menu.hidden) show(false, false);
  });
  // Tab past the last item leaves the menu: close it so it never stays open behind the focus
  menu.addEventListener("focusout", function (e) {
    var t = /** @type {Node | null} */ (e.relatedTarget);
    if (t && !menu.contains(t) && t !== more) show(false, false);
  });
}

/**
 * Focus goes back to the button a pop-up was opened from, or to ⋯ when that button is in the closed More menu.
 * @param {HTMLElement | null} b
 */
export function focusBack(b) {
  var to = b && b.getClientRects().length ? b : document.getElementById("tmb");
  if (to) to.focus();
}
