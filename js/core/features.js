// Features held back for a later release
// One part of the site script; js/main.js runs each part's init() in order. See js/README.md.

export var FEAT_AS, FEAT_TL, FEAT_SW;

export function init() {
  // Autoscroll (the ▶ in the bottom bar, its Settings switch and its Help entry) is built and tested but not
  // released yet. With FEAT_AS false the switch and Help entry (data-feat="as") stay hidden, the ▶ never shows
  // and asStart() does nothing. A reader's saved choice (P.ason) is left as it is, so nothing is lost.
  // To release it: set FEAT_AS to true. Nothing else needs changing.
  FEAT_AS = false;
  if (FEAT_AS) show("as");
  // Tilt to scroll (the tilted-phone button in the bottom bar and its Help entry, data-feat="tl") is built and
  // tested the same way. With FEAT_TL false the button never shows (data-tilt is not set), so it can't start.
  // To release it: set FEAT_TL to true. Nothing else needs changing.
  FEAT_TL = false;
  if (FEAT_TL) show("tl");
  // Sideways (landscape) printed pages: the Upright / Sideways choice in the Print pop-up. Released (Satish,
  // 2026-10-17). With FEAT_SW false the choice is hidden and every printout is upright, whatever was saved
  // (P.por is kept), should it need holding back again.
  FEAT_SW = true;
}

// Unhide a released feature's parts, Help's included: Help's text waits in a <template> (#hlpc) until Help
// is first opened, and querySelectorAll on the page doesn't reach inside a template
function show(f) {
  var t = document.getElementById("hlpc"),
    q = '[data-feat="' + f + '"]';
  [].forEach.call(document.querySelectorAll(q), function (e) {
    e.hidden = false;
  });
  if (t)
    [].forEach.call(t.content.querySelectorAll(q), function (e) {
      e.hidden = false;
    });
}
