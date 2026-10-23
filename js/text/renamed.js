// @ts-check
// Texts whose id changed. On 2026-10-23 every text's id and file name came to start with its category (sukhkarta →
// aarti-sukhkarta, shree-rudra → vedic-chant-shree-rudra). What a phone or a backup file saved before still names
// the old id: a routine, today's ticks, a text moved to another category (js/core/routine.js, js/store/profiles.js,
// js/core/library.js), and the highlighted line, folded pieces, autoscroll speeds (js/store/migrate.js) and a link
// or reading position (js/core/page.js) of a text without a legacy-id, whose section and line ids are its own id.
// These turn an old id into the new one. Never remove an entry: a backup file can be restored years later.
// Pure: unit-tested in tests/unit/renamed.test.mjs.

/** @type {Record<string, string>} old text id → new text id */
export const RENAMED = {
  "atharvashirsha": "vedic-chant-atharvashirsha",
  "shree-rudra": "vedic-chant-shree-rudra",
  "shri-sukta": "vedic-chant-shri-sukta",
  "purusha-suktam": "vedic-chant-purusha-suktam",
  "lalita-sahasranama": "vedic-chant-lalita-sahasranama",
  "sukhkarta": "aarti-sukhkarta",
  "shendur-lal-chadhayo": "aarti-shendur-lal-chadhayo",
  "durge-durghat-bhari": "aarti-durge-durghat-bhari",
  "lavathavati-vikrala": "aarti-lavathavati-vikrala",
  "trigunatmak-traimurti": "aarti-trigunatmak-traimurti",
  "yei-o-vitthale": "aarti-yei-o-vitthale",
  "ghalin-lotangan": "aarti-ghalin-lotangan",
  "jai-ganesh-deva": "aarti-jai-ganesh-deva",
  "jai-jagdish-hare": "aarti-jai-jagdish-hare",
  "jaydeva-jaydeva-samartha": "aarti-jaydeva-jaydeva-samartha",
  "jay-jay-aarti-shrigururaya": "aarti-jay-jay-aarti-shrigururaya",
  "ovaloon-aarti-chaitanyabrahma": "aarti-ovaloon-aarti-chaitanyabrahma",
  "dhanya-jagin-guruvarya": "aarti-dhanya-jagin-guruvarya",
  "svastha-karin-shayan": "aarti-svastha-karin-shayan",
  "ovaloo-sapreme-aarti": "aarti-ovaloo-sapreme-aarti",
  "ananyata-maj-ghado": "ashtak-ananyata-maj-ghado",
  "anudin-anutapen": "ashtak-anudin-anutapen",
  "brahmachaitanya-sarikha": "ashtak-brahmachaitanya-sarikha",
  "haachi-subodh": "ashtak-haachi-subodh",
  "sadguru-padukashtak": "ashtak-sadguru-padukashtak",
  "swami-majha-pahila": "ashtak-swami-majha-pahila",
};

/**
 * A text id (or the section id of a text without a legacy-id) as it is now
 * @param {string} id
 * @returns {string}
 */
export function textId(id) {
  return Object.prototype.hasOwnProperty.call(RENAMED, id) ? RENAMED[id] : id;
}

/**
 * A line id as it is now: a text without line-ids in its file numbers its lines "<its id>.<n>" (aarti-belaguve.3)
 * @param {string} id
 * @returns {string}
 */
export function lineId(id) {
  var i = id.lastIndexOf(".");
  return i > 0 ? textId(id.slice(0, i)) + id.slice(i) : id;
}
