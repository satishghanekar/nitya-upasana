// @ts-check
// A small drawing for each festival, and the flags of the public holidays (approved: the "Nitya Home cards" mockups,
// Satish, 2026-10-30). Each is drawn in a tinted circle; the tint says the kind of day: saffron festivals, indigo
// Shiva's days (Pradosh, Maha Shivratri), cream moon days (the Purnimas), red Ganesh's (Sankashti, Ganesh Chaturthi),
// grey public holidays, which show their flag (India's with "MH" or "KA" for one state's, drawn by the styles, so the
// letters are not in the page's text). Used by Home's Coming up, the calendar's 15 days, its day card and its month
// (js/features/vedic-calendar.js). Pure: strings of markup, no page.
// One part of the site script. See js/README.md.

/** @typedef {"sai" | "shi" | "moon" | "gan" | "hol"} Tint */

// The drawings, 24 × 24, in the circle's colour (currentColor); Holi's fire is its colours. Each festival has its own,
// from what is done or remembered that day (Satish, 2026-10-30: "Diwali's days all have the same icon")
/** @type {Record<string, string>} */
const DRAW = {
  // Makar Sankranti: a kite
  kite: '<path d="M12 2.5l6 7.5-6 7.5-6-7.5z"/><path d="M12 2.5v15M6 10h12"/><path d="M12 17.5c1.5 1.5-1 2.5.5 4"/>',
  // Maha Shivratri: Shiva's trishul with the damaru on it
  trishul:
    '<path d="M12 22V3"/><path d="M7 4v3a5 5 0 0 0 10 0V4"/><path d="M5.5 5.5 7 4l1.5 1.5M15.5 5.5 17 4l1.5 1.5M10.5 4.5 12 3l1.5 1.5"/><path d="M9.5 14h5l-5 4h5z"/>',
  // Pradosh: the linga
  linga: '<path d="M3 18h18l-2.5 3h-13z"/><path d="M8 18v-7a4 4 0 0 1 8 0v7"/><path d="M10 11h4M10 13h4"/>',
  // Holi (Holika Dahan): the fire over its logs
  holi: '<path d="M5 20l14-3M5 17l14 3"/><path d="M12 3c3 3 5 5.5 5 8.5a5 5 0 0 1-10 0c0-2 1-3.5 2-4.5 0 2 1 3 2 3 0-3 0-5 1-7z" fill="#f2a516" stroke="#c2410c"/>',
  // Gudi Padwa: the gudi, its pot on the pole and the cloth
  gudi: '<path d="M8 21V3"/><path d="M5.5 6.5a2.5 2.5 0 0 1 5 0z"/><path d="M8 7.5l8 2-1 6.5-7-2"/><path d="M10 10l4 1"/>',
  // Ram Navami: the bow and arrow
  bow: '<path d="M7 3c8 3 8 15 0 18"/><path d="M7 3v18"/><path d="M4 12h16M17.5 10l2.5 2-2.5 2"/>',
  // Hanuman Jayanti: the gada
  gada: '<path d="M12 2v1.5"/><path d="M8 8a4 4 0 0 1 8 0c0 2.5-1.8 4.5-4 4.5S8 10.5 8 8z"/><path d="M10.2 4.5c-.6 2.3-.6 5.5.6 7.8M13.8 4.5c.6 2.3.6 5.5-.6 7.8"/><path d="M12 12.5V21M10 21h4M10.5 15.5h3"/>',
  // Akshaya Tritiya: gold, which never wanes, and its sparkle
  coin: '<circle cx="11" cy="13" r="6"/><circle cx="11" cy="13" r="3.5"/><path d="M18 3v4M16 5h4M20 9.5v3M18.5 11h3"/>',
  // Vat Purnima: the banyan, the thread tied round its trunk
  banyan:
    '<path d="M6.5 13a3.5 3.5 0 0 1-.8-6.8A4.5 4.5 0 0 1 14 4a4 4 0 0 1 5 5.5 3.5 3.5 0 0 1-2.5 3.5z"/><path d="M10.5 13v8M13.5 13v8M6 21h12"/><path d="M7.5 13c0 3 .3 5 .8 6.5M16.5 13c0 3-.3 5-.8 6.5"/><path d="M10.5 16.5h3" stroke-width="2.2"/>',
  // Ashadhi Ekadashi: the saffron flag of the wari to Pandharpur
  pataka: '<path d="M6 21V3"/><path d="M6 4l13 4.5L6 13"/><path d="M4 21h4"/>',
  // Kartiki Ekadashi: the tulsi in its vrindavan
  tulsi: '<path d="M7 14h10l-1.2 7H8.2z"/><path d="M12 14V6"/><path d="M12 9.5C10 8.5 9 6.8 9 5c2 0 3 1.5 3 4.5zM12 8.5c2-1 3-2.7 3-4.5-2 0-3 1.5-3 4.5z"/>',
  // Guru Purnima: the guru's pothi, open
  pothi: '<path d="M12 6c-2-1.5-5-2-8-1.5v13c3-.5 6 0 8 1.5 2-1.5 5-2 8-1.5v-13c-3-.5-6 0-8 1.5z"/><path d="M12 6v13"/>',
  // Nag Panchami: the naga
  naga: '<path d="M6 20c0-3 4-3 4-6s-4-3-4-6 2.5-4.5 6-4.5"/><path d="M12 3.5c2.5 0 4 1 4 2.5s-1.5 2-3 2"/><path d="M10 20h8"/>',
  // Narali Purnima: the coconut offered to the sea
  coconut: '<circle cx="12" cy="13" r="7"/><path d="M10 11h.01M14 11h.01M12 14h.01"/><path d="M12 6c0-2 1-3 3-3.5"/>',
  // Gokulashtami: the dahi handi on its rope
  handi: '<path d="M8 8.5h8"/><path d="M8.5 8.5c-3.5 2-3.5 9 3.5 12 7-3 7-10 3.5-12"/><path d="M9.5 5.5h5v3h-5z"/><path d="M5 3.5h14"/>',
  // Ganesh Chaturthi: the modak
  modak: '<path d="M12 3C9 6.5 5 10 5 14.5 5 18 8 20 12 20s7-2 7-5.5C19 10 15 6.5 12 3z"/><path d="M12 3v17M9 8c-1.2 3-1.4 8 0 12M15 8c1.2 3 1.4 8 0 12"/>',
  // Anant Chaturdashi: Ganesh goes into the water (the modak over the waves)
  visarjan:
    '<path d="M12 3c-1.6 2-3.5 4-3.5 6.5 0 2 1.6 3 3.5 3s3.5-1 3.5-3C15.5 7 13.6 5 12 3zM12 3v9.5"/><path d="M3 17c1.5-1.5 3-1.5 4.5 0s3 1.5 4.5 0 3-1.5 4.5 0 3 1.5 4.5 0M3 21c1.5-1.5 3-1.5 4.5 0s3 1.5 4.5 0 3-1.5 4.5 0 3 1.5 4.5 0"/>',
  // Sankashti: the moon it waits for
  crescent: '<path d="M15 3.5a8.5 8.5 0 1 0 5.5 13A7 7 0 0 1 15 3.5z"/>',
  // Ghatasthapana: the ghat, with the grain sprouting on it
  ghat: '<path d="M7 12h10"/><path d="M7.5 12c-3 2-3 7.5 4.5 9 7.5-1.5 7.5-7 4.5-9"/><path d="M9.5 12c0-3-1.5-4.5-3-5.5M12 12V5.5M14.5 12c0-3 1.5-4.5 3-5.5"/>',
  // Dasara: the aapta leaves given as gold
  aapta: '<path d="M12 21v-6M12 15C6.5 15 3 11 4 5.5c3.2 0 6.2 2 8 5 1.8-3 4.8-5 8-5 1 5.5-2.5 9.5-8 9.5z"/><path d="M12 15v-5"/>',
  // Kojagiri Purnima: the full moon and the milk kept awake for it
  kojagiri: '<circle cx="12" cy="6.5" r="3.5"/><path d="M5 13h14c0 4.5-3 7-7 7s-7-2.5-7-7z"/><path d="M8 16h8"/>',
  // Narak Chaturdashi: the first light of Diwali, a phuljhadi
  phuljhadi: '<path d="M4 20l9-9"/><circle cx="15" cy="9" r="1.2"/><path d="M15 4.5V6M15 12v1.5M10.5 9H12M18 9h1.5M11.8 5.8l1 1M17.2 11.2l1 1M18.2 5.8l-1 1"/>',
  // Lakshmi Pujan: Lakshmi's lotus and her coins
  lakshmi:
    '<path d="M12 17c-4 0-8-2-9-6 3 0 6.5 1.5 9 6zM12 17c4 0 8-2 9-6-3 0-6.5 1.5-9 6z"/><path d="M12 17c-3-3-3.2-9.5 0-14 3.2 4.5 3 11 0 14z"/><circle cx="8" cy="20.5" r="1.3"/><circle cx="12" cy="20.5" r="1.3"/><circle cx="16" cy="20.5" r="1.3"/>',
  // Bali Pratipada: King Bali's crown
  crown: '<path d="M4 17 3 7l5 4 4-6 4 6 5-4-1 10z"/><path d="M4 20h16"/>',
  // Bhaubeej: the aarti thali, its lamp and the kumkum
  thali:
    '<ellipse cx="12" cy="16" rx="9" ry="3.5"/><path d="M5.5 14h4.5c0 1.2-1 2-2.25 2S5.5 15.2 5.5 14z"/><path d="M7.75 9.5c-.7.9-.9 1.6-.4 2.3.2.3.6.3.8 0 .5-.7.3-1.4-.4-2.3z"/><circle cx="15.5" cy="14.5" r="1.6"/>',
  // Tripurari Purnima: the deepmal, its tiers of lamps lit
  deepmal:
    '<path d="M9 21h6l-.6-15h-4.8z"/><path d="M8 16h8M8.5 11h7"/><path d="M7 15.5c-.6-.6-.6-1.3 0-2 .6.7.6 1.4 0 2zM17 15.5c-.6-.6-.6-1.3 0-2 .6.7.6 1.4 0 2zM7.5 10.5c-.6-.6-.6-1.3 0-2 .6.7.6 1.4 0 2zM16.5 10.5c-.6-.6-.6-1.3 0-2 .6.7.6 1.4 0 2zM12 5c-.8-.9-.8-1.8 0-2.7.8.9.8 1.8 0 2.7z"/>',
  // Datta Jayanti: Datta's kamandalu
  kamandalu: '<path d="M7 11c0 5 2 9 5 9s5-4 5-9z"/><path d="M9 11V8.5h6V11"/><path d="M8.5 8.5c0-5 7-5 7 0"/><path d="M17 13l3-2.5"/>',
  // Shri Gondavalekar Maharaj: Ram's name, the japa mala (his Jayanti); the toran of his Utsav; his samadhi
  mala: '<circle cx="12" cy="10.5" r="7" stroke-width="2.6" stroke-dasharray="0.01 3.6"/><circle cx="12" cy="18.5" r="1.4"/><path d="M12 20v2.5"/>',
  toran:
    '<path d="M3 5h18"/><path d="M6 5c-1.5 2.5-1.5 5 0 7.5 1.5-2.5 1.5-5 0-7.5zM12 5c-1.5 2.5-1.5 5 0 7.5 1.5-2.5 1.5-5 0-7.5zM18 5c-1.5 2.5-1.5 5 0 7.5 1.5-2.5 1.5-5 0-7.5z"/><circle cx="9" cy="8" r="1.3"/><circle cx="15" cy="8" r="1.3"/>',
  samadhi: '<path d="M4 21h16M6 21v-8h12v8"/><path d="M6 13c0-4 3-6 6-6s6 2 6 6"/><path d="M12 7V4M10.5 4h3"/><path d="M10 21v-4a2 2 0 0 1 4 0v4"/>',
  // Shri Swami Swarupanand: in meditation (his Jayanti); incense (his Punyatithi)
  dhyana:
    '<circle cx="12" cy="5" r="2.2"/><path d="M12 8c-2 0-3 1.5-3 4v2h6v-2c0-2.5-1-4-3-4z"/><path d="M5 18c2-2 5-2 7-1 2-1 5-1 7 1-2 1.5-5 2-7 1-2 1-5 .5-7-1z"/><path d="M9 13l-2 2.5M15 13l2 2.5"/>',
  dhoop: '<path d="M6 21h12"/><path d="M9 21l2-10M15 21l-2-10"/><path d="M11 10c-1.2-1.5.8-2.5-.2-4.5S11.6 2.6 11 2M13 10c1.2-1.5-.8-2.5.2-4.5"/>',
  // Shri Swami Samarth: his appearing, in light (Prakat Din); his paduka (Punyatithi)
  prakat: '<circle cx="12" cy="12" r="3.5"/><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1"/>',
  paduka:
    '<path d="M7.5 20.5c-2-1-2.5-4-1-8 1-2.6.5-5 2-7 1.3-1.7 3 .2 2.5 3-.5 2.6-1.5 5.5-1 8 .3 1.7-.5 3.4-2.5 4z"/><path d="M16.5 20.5c2-1 2.5-4 1-8-1-2.6-.5-5-2-7-1.3-1.7-3 .2-2.5 3 .5 2.6 1.5 5.5 1 8-.3 1.7.5 3.4 2.5 4z"/>',
  // Shri Nana Maharaj Taranekar: the palna of a Jayanti; the garland of his Punyatithi
  palna: '<path d="M4 3h16"/><path d="M8 3 6 12M16 3l2 9"/><path d="M5 12c0 4 3 7 7 7s7-3 7-7z"/><path d="M8 21h8"/>',
  haar: '<path d="M5 3c0 9 3 13.5 7 13.5S19 12 19 3" stroke-width="2.6" stroke-dasharray="0.01 3"/><circle cx="12" cy="19" r="2"/>',
  // a saint's day not drawn yet: a lotus
  lotus: '<path d="M12 19.5c-4 0-8-2-9-6 3 0 6.5 1.5 9 6zM12 19.5c4 0 8-2 9-6-3 0-6.5 1.5-9 6z"/><path d="M12 19.5c-3-3-3.2-9.5 0-14 3.2 4.5 3 11 0 14z"/>',
  star: '<path d="M12 3.5l2.4 5.6 6.1.5-4.6 4 1.4 6-5.3-3.2-5.3 3.2 1.4-6-4.6-4 6.1-.5z"/>',
};

// Each festival's drawing and tint, by its id in content/festivals.json; a festival not here has a saffron star
/** @type {Record<string, [string, Tint]>} */
const FEST = {
  "makar-sankranti": ["kite", "sai"],
  "gondavalekar-maharaj-jayanti": ["mala", "sai"],
  "swarupanand-jayanti": ["dhyana", "sai"],
  "maha-shivratri": ["trishul", "shi"],
  holi: ["holi", "sai"],
  "gudi-padwa": ["gudi", "sai"],
  "swami-samarth-prakat-din": ["prakat", "sai"],
  "ram-navami": ["bow", "sai"],
  "hanuman-jayanti": ["gada", "sai"],
  "swami-samarth-punyatithi": ["paduka", "sai"],
  "swarupanand-punyatithi": ["dhoop", "sai"],
  "nana-maharaj-punyatithi": ["haar", "sai"],
  "akshaya-tritiya": ["coin", "sai"],
  "vat-purnima": ["banyan", "moon"],
  "ashadhi-ekadashi": ["pataka", "sai"],
  "gondavalekar-maharaj-utsav": ["toran", "sai"],
  "guru-purnima": ["pothi", "moon"],
  "nag-panchami": ["naga", "sai"],
  "nana-maharaj-jayanti": ["palna", "sai"],
  "narali-purnima": ["coconut", "moon"],
  gokulashtami: ["handi", "sai"],
  "ganesh-chaturthi": ["modak", "gan"],
  "anant-chaturdashi": ["visarjan", "gan"],
  ghatasthapana: ["ghat", "sai"],
  dasara: ["aapta", "sai"],
  "kojagiri-purnima": ["kojagiri", "moon"],
  "narak-chaturdashi": ["phuljhadi", "sai"],
  "lakshmi-pujan": ["lakshmi", "sai"],
  "bali-pratipada": ["crown", "sai"],
  bhaubeej: ["thali", "sai"],
  "kartiki-ekadashi": ["tulsi", "sai"],
  "tripurari-purnima": ["deepmal", "moon"],
  "datta-jayanti": ["kamandalu", "sai"],
  "gondavalekar-maharaj-punyatithi": ["samadhi", "sai"],
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
