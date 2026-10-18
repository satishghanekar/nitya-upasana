/* =====================================================================
   SITE SCRIPT: start-up order
   The behaviour is split into parts (ES modules), one per topic, in the
   folders core/ (settings and apply()), text/ (what happens to the
   verse text) and features/ (each menu, button and gesture).
   Settings live in P (core/state.js) and are saved on this device
   only (localStorage key "aarti2-prefs"); apply() (core/apply.js) turns
   P into the data-* switches on <html> that the styles react to.

   Loading a part only defines its functions. Its init() does what the
   part needs at start-up (reads the page, adds listeners), and the
   parts start in the order below, which is the order they ran in when
   they were one file. Moving a line changes which part is ready first.
   The pieces themselves are put into the page earlier, by render.js
   (a plain script). The page is kept hidden until every part has
   started (data-ready, below), so it never jumps while settling.
   ===================================================================== */

import { init as startPage } from "./core/page.js";
import { init as startState } from "./core/state.js";
import { init as startFeatures } from "./core/features.js";
import { init as startIast } from "./text/iast.js";
import { init as startLayout } from "./text/layout.js";
import { init as startAstronomy } from "./features/astronomy.js";
import { init as startDateCard } from "./features/date-card.js";
import { init as startDhrupadMarkers } from "./text/dhrupad-markers.js";
import { init as startStanzaNumbers } from "./text/stanza-numbers.js";
import { init as startLineBreaks } from "./text/line-breaks.js";
import { init as startAutofit } from "./text/autofit.js";
import { init as startApply } from "./core/apply.js";
import { init as startBottomBar } from "./features/bottom-bar.js";
import { init as startTilt } from "./features/tilt.js";
import { init as startBars } from "./features/bars.js";
import { init as startSettingsPanel } from "./features/settings-panel.js";
import { init as startDhrupadButton } from "./features/dhrupad-button.js";
import { init as startReadingSheet } from "./features/reading-sheet.js";
import { init as startWakeLock } from "./features/wake-lock.js";
import { init as startHistory } from "./features/history.js";
import { init as startLanguages } from "./features/languages.js";
import { init as startContentsList } from "./features/contents-list.js";
import { init as startClicks } from "./features/clicks.js";
import { init as startPinch } from "./features/pinch.js";
import { init as startSearch } from "./text/search.js";
import { init as startStartup } from "./core/startup.js";
import { init as startPictureViewer } from "./features/picture-viewer.js";
import { init as startHelp } from "./features/help.js";
import { init as startPrint } from "./features/print.js";
import { init as startShare } from "./features/share.js";
import { init as startOffline } from "./features/offline.js";

try {
  startPage(); // Page basics: the <html> element, the language button icons, the short message (flash)
  startState(); // Settings (P), loaded from this device
  startFeatures(); // Features held back for a later release
  startIast(); // IAST transliteration (Devanagari → Latin with diacritics, Vedic accents as marks)
  startLayout(); // Layout helpers that run once
  startAstronomy(); // Astronomy for the Next Sankathara Chaturthi card
  startDateCard(); // Next Sankathara Chaturthi card (computed on this device; works offline)
  startDhrupadMarkers(); // Tappable dhrupad markers (Aartis 1–5, 7 and 9)
  startStanzaNumbers(); // Stanza numbers
  startLineBreaks(); // Preferred line breaks
  startAutofit(); // Auto-fit text size
  startApply(); // Current piece, menus and apply()
  startBottomBar(); // Bottom bar (#asc) and autoscroll
  startTilt(); // Tilt to scroll (bottom bar, phones and tablets)
  startBars(); // Bars tuck away while reading (CSS: "Bars tuck away while reading")
  startSettingsPanel(); // Settings panel
  startDhrupadButton(); // Dhrupad button: toggle once / after every stanza, keeping the reader's place
  startReadingSheet(); // Reading sheet: Aa in the bottom bar slides up language, text size and dhrupad
  startWakeLock(); // Keep the screen on (Wake Lock). Browsers drop the lock when the page is hidden, so it is re-requested.
  startHistory(); // Back button
  startLanguages(); // Settings page: languages
  startContentsList(); // Contents list inside the contents + search overlay (built from the home page contents)
  startClicks(); // Clicks: contents links (data-go) jump to a piece; tapping a verse line highlights it
  startPinch(); // Pinch with two fingers to change the text size (the page itself never zooms)
  startSearch(); // Search: every Marathi line with its English line; matches ignore svara marks and punctuation
  startStartup(); // Start-up
  startPictureViewer(); // Full-screen picture (#pzv): pinch or double-tap to zoom (1x to 5x), drag to move
  startHelp(); // Help: opens over the page; the phone's Back button closes it
  startPrint(); // Print
  startShare(); // Share, QR code and the Add to Home Screen buttons
  startOffline(); // Offline use: home-screen app details and the service worker (sw.js)
} finally {
  // Show the page (see "data-ready" in css/02-core.css), even if a part failed to start
  document.documentElement.setAttribute("data-ready", "");
}
