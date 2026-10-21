// Features held back for a later release
// One part of the site script; js/main.js runs each part's init() in order. See js/README.md.
// (Autoscroll and Tilt to scroll were built and held back here until v1.20; Satish removed them for now on
// 2026-10-21. They are in git history, should they come back, for example with Recital mode.)

export var FEAT_SW;

export function init() {
  // Sideways (landscape) printed pages: the Upright / Sideways choice in the Print pop-up. Released (Satish,
  // 2026-10-17). With FEAT_SW false the choice is hidden and every printout is upright, whatever was saved
  // (P.por is kept), should it need holding back again.
  FEAT_SW = true;
}
