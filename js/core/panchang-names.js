// @ts-check
// Names for the Vedic calendar (js/core/panchang.js), in Marathi (Devanagari, Kalnirnay usage) and plain everyday
// English (no diacritics: "Ashvin Shukla Ashtami"). The scholarly English (IAST) of a name is worked out from its
// Marathi by js/text/iast.js when that style is chosen; ia gives it where the Marathi word differs (शुद्ध: śukla).
// Each list is in its traditional order; the panchang's numbers are 1-based (tithi 1–30, nakshatra 1–27 …),
// so a name is LIST[n - 1]. Plain data, no page.

/** @typedef {{ mr: string, en: string, ia?: string }} Name */

/**
 * @param {string} mr space-separated Marathi names ("_" stands for a space inside one name)
 * @param {string} en the English names, the same way
 * @returns {Name[]}
 */
function pairs(mr, en) {
  var m = mr.split(" "),
    e = en.split(" ");
  if (m.length !== e.length) throw new Error("panchang-names: lists differ in length");
  return m.map(function (x, i) {
    return { mr: x.replace(/_/g, " "), en: e[i].replace(/_/g, " ") };
  });
}

/** The 15 tithis of a paksha; 15 is पौर्णिमा in shukla paksha, and tithi 30 is अमावास्या (AMAVASYA). */
export var TITHI = pairs(
  "प्रतिपदा द्वितीया तृतीया चतुर्थी पंचमी षष्ठी सप्तमी अष्टमी नवमी दशमी एकादशी द्वादशी त्रयोदशी चतुर्दशी पौर्णिमा",
  "Pratipada Dvitiya Tritiya Chaturthi Panchami Shashthi Saptami Ashtami Navami Dashami Ekadashi Dvadashi Trayodashi Chaturdashi Purnima",
);
/** @type {Name} */
export var AMAVASYA = { mr: "अमावास्या", en: "Amavasya" };

/** shukla (bright half) then krishna (dark half) */
export var PAKSHA = { shukla: { mr: "शुद्ध", en: "Shukla", ia: "Śukla" }, krishna: { mr: "वद्य", en: "Krishna", ia: "Kṛṣṇa" } };

/** Amanta lunar months, Chaitra first; in English as they are said in Marathi (Shravan, Bhadrapad, Ashvin) */
export var MASA = pairs(
  "चैत्र वैशाख ज्येष्ठ आषाढ श्रावण भाद्रपद आश्विन कार्तिक मार्गशीर्ष पौष माघ फाल्गुन",
  "Chaitra Vaishakh Jyeshtha Ashadh Shravan Bhadrapad Ashvin Kartik Margashirsha Paush Magh Phalgun",
);
export var ADHIKA = { mr: "अधिक", en: "Adhika" };

export var NAKSHATRA = pairs(
  "अश्विनी भरणी कृत्तिका रोहिणी मृग आर्द्रा पुनर्वसु पुष्य आश्लेषा मघा पूर्वा_फाल्गुनी उत्तरा_फाल्गुनी हस्त चित्रा स्वाती विशाखा अनुराधा ज्येष्ठा मूळ पूर्वाषाढा उत्तराषाढा श्रवण धनिष्ठा शततारका पूर्वा_भाद्रपदा उत्तरा_भाद्रपदा रेवती",
  "Ashvini Bharani Krittika Rohini Mrigashira Ardra Punarvasu Pushya Ashlesha Magha Purva_Phalguni Uttara_Phalguni Hasta Chitra Svati Vishakha Anuradha Jyeshtha Mula Purva_Ashadha Uttara_Ashadha Shravana Dhanishtha Shatabhisha Purva_Bhadrapada Uttara_Bhadrapada Revati",
);

export var YOGA = pairs(
  "विष्कंभ प्रीति आयुष्मान सौभाग्य शोभन अतिगंड सुकर्मा धृति शूल गंड वृद्धि ध्रुव व्याघात हर्षण वज्र सिद्धि व्यतीपात वरीयान परिघ शिव सिद्ध साध्य शुभ शुक्ल ब्रह्म ऐंद्र वैधृति",
  "Vishkambha Priti Ayushman Saubhagya Shobhana Atiganda Sukarma Dhriti Shula Ganda Vriddhi Dhruva Vyaghata Harshana Vajra Siddhi Vyatipata Variyana Parigha Shiva Siddha Sadhya Shubha Shukla Brahma Indra Vaidhriti",
);

/** The 11 karanas: 1–7 the repeating ones (बव … विष्टि), 8–11 the fixed ones (शकुनि … किंस्तुघ्न) */
export var KARANA = pairs(
  "बव बालव कौलव तैतिल गर वणिज विष्टि शकुनि चतुष्पाद नाग किंस्तुघ्न",
  "Bava Balava Kaulava Taitila Garaja Vanija Vishti Shakuni Chatushpada Naga Kimstughna",
);

/** Sunday first, as Date.getDay() */
export var VARA = pairs("रविवार सोमवार मंगळवार बुधवार गुरुवार शुक्रवार शनिवार", "Sunday Monday Tuesday Wednesday Thursday Friday Saturday");

/** The 60-year cycle, प्रभव first (Shaka 1948 = पराभव, the 40th) */
export var SAMVATSARA = pairs(
  "प्रभव विभव शुक्ल प्रमोद प्रजापति अंगिरा श्रीमुख भाव युवा धाता ईश्वर बहुधान्य प्रमाथी विक्रम वृष चित्रभानु स्वभानु तारण पार्थिव व्यय " +
    "सर्वजित सर्वधारी विरोधी विकृति खर नंदन विजय जय मन्मथ दुर्मुख हेमलंबी विलंबी विकारी शार्वरी प्लव शुभकृत शोभकृत क्रोधी विश्वावसु पराभव " +
    "प्लवंग कीलक सौम्य साधारण विरोधकृत परिधावी प्रमादी आनंद राक्षस नल पिंगल कालयुक्त सिद्धार्थी रौद्र दुर्मति दुंदुभि रुधिरोद्गारी रक्ताक्षी क्रोधन क्षय",
  "Prabhava Vibhava Shukla Pramoda Prajapati Angirasa Shrimukha Bhava Yuva Dhatri Ishvara Bahudhanya Pramathi Vikrama Vrisha Chitrabhanu Svabhanu Tarana Parthiva Vyaya " +
    "Sarvajit Sarvadhari Virodhi Vikriti Khara Nandana Vijaya Jaya Manmatha Durmukha Hemalambi Vilambi Vikari Sharvari Plava Shubhakrit Shobhakrit Krodhi Vishvavasu Parabhava " +
    "Plavanga Kilaka Saumya Sadharana Virodhakrit Paridhavi Pramadi Ananda Rakshasa Nala Pingala Kalayukta Siddharthi Raudra Durmati Dundubhi Rudhirodgari Raktakshi Krodhana Kshaya",
);

/** Vasanta first (Chaitra and Vaishakha) */
export var RITU = pairs("वसंत ग्रीष्म वर्षा शरद हेमंत शिशिर", "Vasanta Grishma Varsha Sharad Hemanta Shishira");

export var AYANA = {
  uttarayana: { mr: "उत्तरायण", en: "Uttarayana" },
  dakshinayana: { mr: "दक्षिणायन", en: "Dakshinayana" },
};

/**
 * The name of tithi n (1–30) without its paksha: 1–14 repeat in each half, 15 is पौर्णिमा, 30 is अमावास्या.
 * @param {number} n
 * @returns {Name}
 */
export function tithiName(n) {
  return n === 30 ? AMAVASYA : TITHI[(n - 1) % 15];
}
