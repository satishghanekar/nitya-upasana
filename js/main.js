/* =====================================================================
   SITE SCRIPT: start-up order
   The behaviour is split into parts (ES modules), one per topic, in the
   folders core/ (settings and apply()), text/ (what happens to the
   verse text) and features/ (each menu, button and gesture).
   Settings live in P (core/state.js): the settings of the person
   reading (profiles, kept with this device's settings in IndexedDB by
   store/store.js, and the active person's also in localStorage
   "aarti2-prefs"); apply() (features/bars.js) turns P into the data-*
   switches on <html> that the styles react to.

   Loading a part only defines its functions. Its init() does what the
   part needs at start-up (reads the page, adds listeners), and the
   parts start in the order below, which is the order they ran in when
   they were one file. Moving a line changes which part is ready first.
   The pieces themselves are put into the page first: text/load.js
   fetches the text files (content/texts/) and has render.js (a plain
   script) build them, and only then do the parts start. The page is
   kept hidden until every part has started (data-ready, below), so it
   never jumps while settling. The store (IndexedDB) is opened at the
   same time as the texts load; if it can't be opened within its time
   limit (twice), the parts start with the data kept in memory.
   ===================================================================== */

import { load as loadTexts } from "./text/load.js";
import { openStore } from "./store/store.js";
import { init as startPage } from "./core/page.js";
import { init as startState } from "./core/state.js";
import { init as startFeatures } from "./core/features.js";
import { init as startDayPicture } from "./features/day-picture.js";
import { init as startLibrary } from "./features/library.js";
import { init as startIast } from "./text/iast.js";
import { init as startLayout } from "./text/layout.js";
import { init as startAstronomy } from "./features/astronomy.js";
import { init as startSankashti } from "./features/sankashti.js";
import { init as startTodayCard } from "./features/today-card.js";
import { init as startVedicCalendar } from "./features/vedic-calendar.js";
import { init as startDhrupadMarkers } from "./text/dhrupad-markers.js";
import { init as startStanzaNumbers } from "./text/stanza-numbers.js";
import { init as startLineBreaks } from "./text/line-breaks.js";
import { init as startAutofit } from "./text/autofit.js";
import { init as startApply } from "./core/apply.js";
import { init as startBottomBar } from "./features/bottom-bar.js";
import { init as startBars } from "./features/bars.js";
import { init as startSettingsPanel } from "./features/settings-panel.js";
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
import { init as startMoreMenu } from "./features/more-menu.js";
import { init as startOffline } from "./features/offline.js";
import { init as startProfiles } from "./features/profiles.js";
import { init as startBackup } from "./features/backup.js";
import { init as startRoutineBuilder } from "./features/routine-builder.js";

function start() {
  try {
    startPage(); // Page basics: the <html> element and the short message (flash)
    startState(); // Settings (P), loaded from this device
    startFeatures(); // Features held back for a later release
    startDayPicture(); // The app's picture follows the time of day (sunrise, midday, sunset), today's weekday star ringed
    startLibrary(); // The Library's list by category and the categories sheet (add, rename, delete, move a text)
    startIast(); // IAST transliteration (Devanagari → Latin with diacritics, Vedic accents as marks)
    startLayout(); // Layout helpers that run once
    startAstronomy(); // Astronomy: sun and moon, tithi, moonrise and the Sankashti rule (worked out on this device)
    startSankashti(); // Sankashti: the next one (for Share) and, on the day, one line on the home page with moonrise
    startTodayCard(); // Home: the picture and date, this session's texts with ticks, another session, and Start
    startVedicCalendar(); // the Vedic calendar: the line on Home (today only, after the page shows) and its page (#cal)
    startDhrupadMarkers(); // Tappable dhrupad markers (Aartis 1–5, 7 and 9)
    startStanzaNumbers(); // Stanza numbers
    startLineBreaks(); // Preferred line breaks
    startAutofit(); // Auto-fit text size
    startApply(); // Current piece, menus and apply()
    startBottomBar(); // Bottom bar (#asc): ‹ Prev, Home, Library, Aa, Next ›
    startBars(); // Bars tuck away while reading (CSS: "Bars tuck away while reading")
    startSettingsPanel(); // Settings panel
    startReadingSheet(); // Reading sheet: Aa in the bottom bar slides up language, text size and dhrupad
    startWakeLock(); // Keep the screen on (Wake Lock). Browsers drop the lock when the page is hidden, so it is re-requested.
    startHistory(); // Back button
    startLanguages(); // Settings page: languages
    startContentsList(); // Library: every text by category, with search (#jump), opened by the book button in the top bar
    startClicks(); // Clicks: contents links (data-go) jump to a piece; tapping a verse line highlights it
    startPinch(); // Pinch with two fingers to change the text size (the page itself never zooms)
    startSearch(); // Search across the library: texts by title, id, first line and category, then every line
    startStartup(); // Start-up
    startPictureViewer(); // Full-screen picture (#pzv): pinch or double-tap to zoom (1x to 5x), drag to move
    startHelp(); // Help: opens over the page; the phone's Back button closes it
    startPrint(); // Print
    startShare(); // Share, QR code and the Add to Home Screen buttons
    startMoreMenu(); // More (⋯ in the top bar): App, Share, QR, Print and Help in a small menu
    startOffline(); // Offline use: home-screen app details and the service worker (sw.js)
    startProfiles(); // People on this phone: the profile chip in the top bar and its sheet (switch, add, edit, delete)
    startBackup(); // Save a backup file / Restore from a file, the backup reminder, keeping the data (storage.persist)
    startRoutineBuilder(); // The routine builder (#rtb): each person's texts per session, in order, with the Add texts picker
  } finally {
    // Show the page (see "data-ready" in css/02-core.css), even if a part failed to start
    document.documentElement.setAttribute("data-ready", "");
  }
}

// The texts first (the parts read them from the page) and the store (who is reading, their settings), then the
// parts. If the texts can't be loaded, the parts still start, so the home page, Settings and Help work; the store
// never fails (it falls back to memory).
Promise.all([
  loadTexts().catch(function (e) {
    console.error(e);
  }),
  openStore(),
]).then(start, start);
