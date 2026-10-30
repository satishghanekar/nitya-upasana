// @ts-check
// The menu words in Marathi (मराठी), every part's under its name, as in js/strings/en.js (js/core/strings.js).

import { MONTHS } from "../core/words.js";

export default {
  // Backup and restore (js/features/backup.js)
  backup: {
    months: MONTHS.mr,
    never: "अजून जतन केलेली नाही",
    /** @param {string} d */
    last: function (d) {
      return "शेवटची " + d + " रोजी";
    },
    saved: "बॅकअप फाइल जतन झाली",
    shared: "बॅकअप फाइल तयार",
    remindFirst: "तुमची सेटिंग्ज आणि दिनक्रम फक्त या फोनवर आहेत. फोनने वेबसाइटचा डेटा पुसला तर उपयोगी पडावी म्हणून अधूनमधून बॅकअप फाइल जतन करा.",
    /** @param {string} d */
    remind: function (d) {
      return "शेवटची बॅकअप फाइल " + d + " रोजी जतन केली होती. नवी जतन करायची?";
    },
    ask: "या फाइलमधून परत आणायचे?",
    /** @param {string} d @param {string} v */
    from: function (d, v) {
      return d + " रोजी जतन केलेली" + (v ? " (आवृत्ती " + v + ")" : "") + ".";
    },
    inFile: "फाइलमधील व्यक्ती: ",
    added: "या फोनवर नव्या: ",
    replaced: "फाइलमधील प्रतीने बदलल्या जातील (सेटिंग्ज आणि दिनक्रम): ",
    removed: "या फोनवरून काढल्या जातील: ",
    /** @param {string} n */
    then: function (n) {
      return "पुढे वाचणार: " + n + ".";
    },
    restore: "परत आणा",
    cancel: "रद्द करा",
    ok: "ठीक आहे",
    done: "बॅकअप फाइलमधून परत आणले",
    bad: "ही फाइल वापरता येत नाही",
    unsaved: "बॅकअप या फोनवर जतन होऊ शकला नाही. पुन्हा प्रयत्न करा, किंवा बॅकअप फाइल जपून ठेवा.",
    problems: {
      "not-json": "ही नित्य उपासनेची बॅकअप फाइल (.nitya) नाही.",
      "not-nitya": "ही नित्य उपासनेची बॅकअप फाइल (.nitya) नाही.",
      newer: "ही फाइल ॲपच्या नव्या आवृत्तीने जतन केली आहे. अपडेट तपासा (सेटिंग्ज → अधिक → माहिती, आवृत्तीची ओळ दाबा) आणि पुन्हा प्रयत्न करा.",
      kind: "ही .nitya फाइल पूर्ण बॅकअप नाही.",
      checksum: "जतन केल्यानंतर ही फाइल बदलली किंवा खराब झाली आहे (चेकसम जुळत नाही), त्यामुळे काहीही परत आणले नाही.",
      empty: "या बॅकअपमध्ये एकही व्यक्ती नाही.",
      read: "फाइल वाचता आली नाही.",
    },
  },
};
