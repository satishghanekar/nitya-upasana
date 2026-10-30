// @ts-check
// A small drawing for each festival, and the flags of the public holidays (approved: the "Nitya Home cards" mockups,
// Satish, 2026-10-30). Each is drawn in a tinted circle; the tint says the kind of day: saffron festivals, indigo
// Shiva's days (Pradosh, Maha Shivratri), cream moon days (the Purnimas), red Ganesh's (Sankashti, Ganesh Chaturthi),
// grey public holidays, which show their flag (India's with "MH" or "KA" for one state's, drawn by the styles, so the
// letters are not in the page's text). Used by Home's Coming up, the calendar's 15 days, its day card and its month
// (js/features/vedic-calendar.js). Pure: strings of markup, no page.
// One part of the site script. See js/README.md.

/** @typedef {"sai" | "shi" | "moon" | "gan" | "hol"} Tint */

// The drawings, 24 × 24, in the circle's colour (currentColor); Holi's are its colours
/** @type {Record<string, string>} */
const DRAW = {
  diya: '<path d="M4 13h16c0 3.5-3.6 5.5-8 5.5S4 16.5 4 13z"/><path d="M12 4c-1.6 2-2.2 3.6-1.1 5.1.6.8 1.6.8 2.2 0C14.2 7.6 13.6 6 12 4z"/><path d="M9 21h6"/>',
  aapta: '<path d="M12 21v-6M12 15C6.5 15 3 11 4 5.5c3.2 0 6.2 2 8 5 1.8-3 4.8-5 8-5 1 5.5-2.5 9.5-8 9.5z"/><path d="M12 15v-5"/>',
  gudi: '<path d="M8 21V3"/><path d="M5.5 6.5a2.5 2.5 0 0 1 5 0z"/><path d="M8 7.5l8 2-1 6.5-7-2"/><path d="M10 10l4 1"/>',
  kite: '<path d="M12 2.5l6 7.5-6 7.5-6-7.5z"/><path d="M12 2.5v15M6 10h12"/><path d="M12 17.5c1.5 1.5-1 2.5.5 4"/>',
  kalash: '<path d="M8 9h8"/><path d="M8.5 9C5 11 5 18 12 20.5 19 18 19 11 15.5 9"/><path d="M9 9c0-2.5 1.2-4 3-5.5C13.8 5 15 6.5 15 9"/><path d="M10 14h4"/>',
  lotus: '<path d="M12 19.5c-4 0-8-2-9-6 3 0 6.5 1.5 9 6zM12 19.5c4 0 8-2 9-6-3 0-6.5 1.5-9 6z"/><path d="M12 19.5c-3-3-3.2-9.5 0-14 3.2 4.5 3 11 0 14z"/>',
  paduka:
    '<path d="M7.5 20.5c-2-1-2.5-4-1-8 1-2.6.5-5 2-7 1.3-1.7 3 .2 2.5 3-.5 2.6-1.5 5.5-1 8 .3 1.7-.5 3.4-2.5 4z"/><path d="M16.5 20.5c2-1 2.5-4 1-8-1-2.6-.5-5-2-7-1.3-1.7-3 .2-2.5 3 .5 2.6 1.5 5.5 1 8-.3 1.7.5 3.4 2.5 4z"/>',
  tulsi: '<path d="M7 14h10l-1.2 7H8.2z"/><path d="M12 14V6"/><path d="M12 9.5C10 8.5 9 6.8 9 5c2 0 3 1.5 3 4.5zM12 8.5c2-1 3-2.7 3-4.5-2 0-3 1.5-3 4.5z"/>',
  bow: '<path d="M7 3c8 3 8 15 0 18"/><path d="M7 3v18"/><path d="M4 12h16M17.5 10l2.5 2-2.5 2"/>',
  gada: '<circle cx="12" cy="7.5" r="4.5"/><path d="M12 12v9M10 21h4M8 7.5h8"/>',
  handi: '<path d="M8 8.5h8"/><path d="M8.5 8.5c-3.5 2-3.5 9 3.5 12 7-3 7-10 3.5-12"/><path d="M9.5 5.5h5v3h-5z"/><path d="M5 3.5h14"/>',
  holi: '<circle cx="8" cy="9" r="3.5" fill="#d9467a" stroke="none"/><circle cx="15.5" cy="8" r="3" fill="#f2a516" stroke="none"/><circle cx="12" cy="15" r="4" fill="#2f8f5b" stroke="none"/><circle cx="18" cy="15" r="1.6" fill="#3a6fd8" stroke="none"/>',
  naga: '<path d="M6 20c0-3 4-3 4-6s-4-3-4-6 2.5-4.5 6-4.5"/><path d="M12 3.5c2.5 0 4 1 4 2.5s-1.5 2-3 2"/><path d="M10 20h8"/>',
  coconut: '<circle cx="12" cy="13" r="7"/><path d="M10 11h.01M14 11h.01M12 14h.01"/><path d="M12 6c0-2 1-3 3-3.5"/>',
  banyan: '<circle cx="12" cy="8" r="5"/><path d="M12 13v8M9 21c1-1 1-4 1-6M15 21c-1-1-1-4-1-6"/>',
  modak: '<path d="M12 3C9 6.5 5 10 5 14.5 5 18 8 20 12 20s7-2 7-5.5C19 10 15 6.5 12 3z"/><path d="M12 3v17M9 8c-1.2 3-1.4 8 0 12M15 8c1.2 3 1.4 8 0 12"/>',
  linga: '<path d="M3 18h18l-2.5 3h-13z"/><path d="M8 18v-7a4 4 0 0 1 8 0v7"/><path d="M10 11h4M10 13h4"/>',
  moon: '<circle cx="12" cy="12" r="8"/><circle cx="9.5" cy="10" r="1.4"/><circle cx="14.5" cy="14" r="1.8"/>',
  star: '<path d="M12 3.5l2.4 5.6 6.1.5-4.6 4 1.4 6-5.3-3.2-5.3 3.2 1.4-6-4.6-4 6.1-.5z"/>',
};

// Each festival's drawing and tint, by its id in content/festivals.json; a festival not here has a saffron star
/** @type {Record<string, [string, Tint]>} */
const FEST = {
  "makar-sankranti": ["kite", "sai"],
  "maha-shivratri": ["linga", "shi"],
  holi: ["holi", "sai"],
  "gudi-padwa": ["gudi", "sai"],
  "ram-navami": ["bow", "sai"],
  "hanuman-jayanti": ["gada", "sai"],
  "akshaya-tritiya": ["kalash", "sai"],
  "vat-purnima": ["banyan", "sai"],
  "ashadhi-ekadashi": ["tulsi", "sai"],
  "guru-purnima": ["moon", "moon"],
  "nag-panchami": ["naga", "sai"],
  "narali-purnima": ["coconut", "sai"],
  gokulashtami: ["handi", "sai"],
  "ganesh-chaturthi": ["modak", "gan"],
  "anant-chaturdashi": ["modak", "gan"],
  ghatasthapana: ["kalash", "sai"],
  dasara: ["aapta", "sai"],
  "kojagiri-purnima": ["moon", "moon"],
  "narak-chaturdashi": ["diya", "sai"],
  "lakshmi-pujan": ["diya", "sai"],
  "bali-pratipada": ["diya", "sai"],
  bhaubeej: ["diya", "sai"],
  "kartiki-ekadashi": ["tulsi", "sai"],
  "tripurari-purnima": ["moon", "moon"],
  pradosh: ["linga", "shi"],
};

/**
 * A festival's drawing and tint: a saint's Jayanti (or Prakat Din, or Utsav) a lotus, a Punyatithi the paduka
 * @param {string} id  its id in content/festivals.json
 * @returns {[string, Tint]}
 */
export function festLook(id) {
  if (FEST[id]) return FEST[id];
  if (/punyatithi/.test(id)) return ["paduka", "sai"];
  if (/jayanti|prakat|utsav/.test(id)) return ["lotus", "sai"];
  return ["star", "sai"];
}

/**
 * The drawing in its tinted circle (css/12-calendar.css .fi)
 * @param {string} name  a drawing (DRAW) @param {Tint} tint
 */
export function iconHtml(name, tint) {
  return (
    '<span class="fi ' +
    tint +
    '" aria-hidden="true"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">' +
    (DRAW[name] || DRAW.star) +
    "</svg></span>"
  );
}

/** A festival in its circle @param {string} id */
export function festIcon(id) {
  var l = festLook(id);
  return iconHtml(l[0], l[1]);
}

/** A festival's drawing alone, small, in the text's colour: before its name in a day of the month @param {string} id */
export function festMark(id) {
  return (
    '<svg class="fm" viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    (DRAW[festLook(id)[0]] || DRAW.star) +
    "</svg>"
  );
}

// The flags, 16 × 11
const US =
  '<svg class="flag" viewBox="0 0 19 10" width="22" height="15"><rect width="19" height="10" fill="#fff"/><path d="M0 .38h19M0 1.92h19M0 3.46h19M0 5h19M0 6.54h19M0 8.08h19M0 9.62h19" stroke="#b22234" stroke-width=".77"/><rect width="7.6" height="5.38" fill="#3c3b6e"/></svg>';
const IN =
  '<svg class="flag" viewBox="0 0 16 11" width="22" height="15"><rect width="16" height="11" fill="#fff"/><rect width="16" height="3.67" fill="#f93"/><rect y="7.33" width="16" height="3.67" fill="#138808"/><circle cx="8" cy="5.5" r="1.4" fill="none" stroke="#008" stroke-width=".6"/></svg>';

/**
 * A public holiday in its circle: the country's flag, and for one state's (Maharashtra, Karnataka) India's flag with
 * the state's letters on its corner; a holiday kept in both countries (Christmas) shows the first group's
 * @param {string[]} groups  its groups in content/holidays.json: "us", "in", "mh", "ka"
 */
export function holIcon(groups) {
  var g = groups[0] || "in",
    state = g === "mh" || g === "ka";
  return (
    '<span class="fi hol" aria-hidden="true">' +
    (g === "us" ? US : IN) +
    (state ? '<span class="fst" data-s="' + g.toUpperCase() + '"></span>' : "") +
    "</span>"
  );
}

/** A holiday's flag alone, small: before its name in a day of the month @param {string[]} groups */
export function holMark(groups) {
  return (groups[0] === "us" ? US : IN).replace('class="flag"', 'class="fm" aria-hidden="true"').replace('width="22" height="15"', 'width="13" height="9"');
}
