// @ts-check
// Sankashti (Sankathara Chaturthi), worked out on this device (js/features/astronomy.js; nothing is sent anywhere).
// One part of the site script; js/main.js runs each part's init() in order. See js/README.md.
//
// Home v2: the home page no longer has the date card. On a Sankashti day only, one
// small line under the date says so, with tonight's moonrise and the place (#skt): "Sankashti Chaturthi today ·
// Moonrise 8:09 pm · Columbus, OH". The next Sankashti is still worked out on every visit for the Share message
// (js/features/share.js reads skCache), which is unchanged.
// The place: the reader's own (Settings → Place for moonrise, "Use my location", kept on this device as P.loc and
// named from the built-in list below), else a city for the phone's time zone.

import { flash } from "../core/page.js";
import { P, change } from "../core/state.js";
import { SK } from "./astronomy.js";
import { DAYS, MONTHS, dv } from "../core/words.js";

/** The next Sankashti, worked out once a day for the place (read by js/features/share.js), or null */
/** @type {{ key: string, list: Sankashti[], ni: number, sel: number } | null} */
export var skCache = null;
// the day and place the Home line was last drawn for
var skKey = "";

/**
 * @typedef {{ lat: number, lon: number, mr: string, en: string, own?: number }} Place
 * @typedef {{ day: number, rise: number | null, start: number, end: number, atRise: boolean }} Sankashti
 */

/** Default place for each time zone: [latitude, longitude, Marathi name, English name] */
/** @type {Record<string, [number, number, string, string]>} */
const TZ = {
  "America/New_York": [39.96, -83.0, "कोलंबस", "Columbus, OH"],
  "America/Detroit": [42.33, -83.05, "डेट्रॉइट", "Detroit, MI"],
  "America/Toronto": [43.65, -79.38, "टोरोंटो", "Toronto, ON"],
  "America/Chicago": [41.88, -87.63, "शिकागो", "Chicago, IL"],
  "America/Denver": [39.74, -104.99, "डेन्व्हर", "Denver, CO"],
  "America/Phoenix": [33.45, -112.07, "फिनिक्स", "Phoenix, AZ"],
  "America/Los_Angeles": [34.05, -118.24, "लॉस एंजेलिस", "Los Angeles, CA"],
  "America/Vancouver": [49.28, -123.12, "व्हँकुव्हर", "Vancouver, BC"],
  "Europe/London": [51.51, -0.13, "लंडन", "London, UK"],
  "Asia/Kolkata": [18.52, 73.86, "पुणे", "Pune, Maharashtra"],
  "Asia/Calcutta": [18.52, 73.86, "पुणे", "Pune, Maharashtra"],
  "Asia/Dubai": [25.2, 55.27, "दुबई", "Dubai, UAE"],
  "Asia/Singapore": [1.35, 103.82, "सिंगापूर", "Singapore"],
  "Australia/Sydney": [-33.87, 151.21, "सिडनी", "Sydney, NSW"],
  "Australia/Melbourne": [-37.81, 144.96, "मेलबर्न", "Melbourne, VIC"],
  "Pacific/Auckland": [-36.85, 174.76, "ऑकलंड", "Auckland, New Zealand"],
};
/** Nearest city to the saved location, from a built-in list (nothing is sent anywhere): a suburb when inside its
 * radius (5th value, km); else a city within 40 km, "near …" within 120 km, otherwise "your location" */
/** @type {Array<[number, number, string, string, number?]>} */
const CITY = [
  [39.96, -83.00, "कोलंबस", "Columbus, OH"],
  [40.10, -83.11, "डब्लिन", "Dublin, OH", 7],
  [40.20, -83.01, "लुईस सेंटर", "Lewis Center, OH", 7],
  [40.16, -83.08, "पॉवेल", "Powell, OH", 6],
  [40.13, -82.93, "वेस्टरव्हिल", "Westerville, OH", 7],
  [40.09, -83.02, "वर्दिंग्टन", "Worthington, OH", 4],
  [40.30, -83.07, "डेलावेअर", "Delaware, OH", 7],
  [40.03, -83.16, "हिलियर्ड", "Hilliard, OH", 6],
  [39.99, -83.06, "अपर आर्लिंग्टन", "Upper Arlington, OH", 4],
  [39.98, -83.04, "ग्रँडव्ह्यू हाइट्स", "Grandview Heights, OH", 2],
  [39.97, -82.94, "बेक्सली", "Bexley, OH", 2],
  [40.02, -82.88, "गहाना", "Gahanna, OH", 5],
  [40.08, -82.81, "न्यू अल्बानी", "New Albany, OH", 6],
  [39.95, -82.81, "रेनॉल्ड्सबर्ग", "Reynoldsburg, OH", 5],
  [39.88, -82.75, "पिकरिंग्टन", "Pickerington, OH", 6],
  [39.84, -82.80, "कॅनाल विंचेस्टर", "Canal Winchester, OH", 5],
  [39.85, -82.88, "ग्रोव्हपोर्ट", "Groveport, OH", 4],
  [39.88, -83.09, "ग्रोव्ह सिटी", "Grove City, OH", 6],
  [40.11, -83.27, "प्लेन सिटी", "Plain City, OH", 5],
  [40.24, -83.37, "मेरीसव्हिल", "Marysville, OH", 6],
  [40.24, -82.86, "सनबरी", "Sunbury, OH", 5],
  [40.22, -82.88, "गलेना", "Galena, OH", 3],
  [39.10, -84.51, "सिनसिनाटी", "Cincinnati, OH"],
  [41.50, -81.69, "क्लीव्हलँड", "Cleveland, OH"],
  [39.76, -84.19, "डेटन", "Dayton, OH"],
  [41.65, -83.54, "टोलीडो", "Toledo, OH"],
  [41.08, -81.52, "ॲक्रन", "Akron, OH"],
  [40.44, -79.99, "पिट्सबर्ग", "Pittsburgh, PA"],
  [42.33, -83.05, "डेट्रॉइट", "Detroit, MI"],
  [42.28, -83.74, "ॲन आर्बर", "Ann Arbor, MI"],
  [39.77, -86.16, "इंडियानापोलिस", "Indianapolis, IN"],
  [38.25, -85.76, "लुईव्हिल", "Louisville, KY"],
  [38.04, -84.50, "लेक्सिंग्टन", "Lexington, KY"],
  [41.88, -87.63, "शिकागो", "Chicago, IL"],
  [41.75, -88.15, "नेपरव्हिल", "Naperville, IL", 10],
  [43.04, -87.91, "मिलवॉकी", "Milwaukee, WI"],
  [43.07, -89.40, "मॅडिसन", "Madison, WI"],
  [44.98, -93.27, "मिनियापोलिस", "Minneapolis, MN"],
  [38.63, -90.20, "सेंट लुईस", "St. Louis, MO"],
  [39.10, -94.58, "कॅन्सस सिटी", "Kansas City, MO"],
  [41.26, -95.93, "ओमाहा", "Omaha, NE"],
  [41.59, -93.62, "डेस मॉइन", "Des Moines, IA"],
  [40.71, -74.01, "न्यूयॉर्क", "New York, NY"],
  [40.73, -74.08, "जर्सी सिटी", "Jersey City, NJ", 10],
  [40.52, -74.41, "एडिसन", "Edison, NJ", 10],
  [40.36, -74.67, "प्रिन्स्टन", "Princeton, NJ"],
  [39.95, -75.17, "फिलाडेल्फिया", "Philadelphia, PA"],
  [42.36, -71.06, "बॉस्टन", "Boston, MA"],
  [41.76, -72.69, "हार्टफर्ड", "Hartford, CT"],
  [41.05, -73.54, "स्टॅमफर्ड", "Stamford, CT"],
  [42.65, -73.76, "अल्बानी", "Albany, NY"],
  [42.89, -78.88, "बफेलो", "Buffalo, NY"],
  [43.16, -77.61, "रॉचेस्टर", "Rochester, NY"],
  [43.05, -76.15, "सिरॅक्यूज", "Syracuse, NY"],
  [38.91, -77.04, "वॉशिंग्टन डी.सी.", "Washington, DC"],
  [39.29, -76.61, "बाल्टिमोर", "Baltimore, MD"],
  [37.54, -77.44, "रिचमंड", "Richmond, VA"],
  [35.78, -78.64, "रॅले", "Raleigh, NC"],
  [35.99, -78.90, "डरहॅम", "Durham, NC"],
  [35.23, -80.84, "शार्लट", "Charlotte, NC"],
  [35.72, -77.92, "विल्सन", "Wilson, NC"],
  [36.07, -79.79, "ग्रीन्सबरो", "Greensboro, NC"],
  [33.75, -84.39, "अटलांटा", "Atlanta, GA"],
  [36.16, -86.78, "नॅशव्हिल", "Nashville, TN"],
  [35.15, -90.05, "मेम्फिस", "Memphis, TN"],
  [33.52, -86.80, "बर्मिंगहॅम", "Birmingham, AL"],
  [30.33, -81.66, "जॅक्सनव्हिल", "Jacksonville, FL"],
  [28.54, -81.38, "ऑर्लँडो", "Orlando, FL"],
  [27.95, -82.46, "टॅम्पा", "Tampa, FL"],
  [25.76, -80.19, "मायामी", "Miami, FL"],
  [29.95, -90.07, "न्यू ऑर्लिन्स", "New Orleans, LA"],
  [29.76, -95.37, "ह्यूस्टन", "Houston, TX"],
  [32.78, -96.80, "डॅलस", "Dallas, TX"],
  [33.02, -96.70, "प्लेनो", "Plano, TX", 10],
  [30.27, -97.74, "ऑस्टिन", "Austin, TX"],
  [29.42, -98.49, "सॅन अँटोनियो", "San Antonio, TX"],
  [35.47, -97.52, "ओक्लाहोमा सिटी", "Oklahoma City, OK"],
  [39.74, -104.99, "डेन्व्हर", "Denver, CO"],
  [40.76, -111.89, "सॉल्ट लेक सिटी", "Salt Lake City, UT"],
  [33.45, -112.07, "फिनिक्स", "Phoenix, AZ"],
  [35.08, -106.65, "आल्बुकर्की", "Albuquerque, NM"],
  [36.17, -115.14, "लास व्हेगस", "Las Vegas, NV"],
  [34.05, -118.24, "लॉस एंजेलिस", "Los Angeles, CA"],
  [33.68, -117.83, "अर्व्हाइन", "Irvine, CA", 10],
  [32.72, -117.16, "सॅन डिएगो", "San Diego, CA"],
  [37.34, -121.89, "सॅन होजे", "San Jose, CA"],
  [37.55, -121.99, "फ्रिमॉन्ट", "Fremont, CA", 10],
  [37.77, -122.42, "सॅन फ्रान्सिस्को", "San Francisco, CA"],
  [38.58, -121.49, "सॅक्रामेंटो", "Sacramento, CA"],
  [36.74, -119.79, "फ्रेस्नो", "Fresno, CA"],
  [45.52, -122.68, "पोर्टलंड", "Portland, OR"],
  [47.61, -122.33, "सिॲटल", "Seattle, WA"],
  [21.31, -157.86, "होनोलुलु", "Honolulu, HI"],
  [43.65, -79.38, "टोरोंटो", "Toronto, ON"],
  [45.42, -75.70, "ओटावा", "Ottawa, ON"],
  [45.50, -73.57, "मॉन्ट्रियल", "Montreal, QC"],
  [49.90, -97.14, "विनिपेग", "Winnipeg, MB"],
  [51.05, -114.07, "कॅलगरी", "Calgary, AB"],
  [53.55, -113.49, "एडमंटन", "Edmonton, AB"],
  [49.28, -123.12, "व्हँकुव्हर", "Vancouver, BC"],
  [51.51, -0.13, "लंडन", "London, UK"],
  [52.49, -1.89, "बर्मिंगहॅम", "Birmingham, UK"],
  [52.64, -1.13, "लेस्टर", "Leicester, UK"],
  [53.48, -2.24, "मँचेस्टर", "Manchester, UK"],
  [53.35, -6.26, "डब्लिन", "Dublin, Ireland"],
  [48.86, 2.35, "पॅरिस", "Paris, France"],
  [52.37, 4.90, "ॲमस्टरडॅम", "Amsterdam, Netherlands"],
  [50.11, 8.68, "फ्रँकफर्ट", "Frankfurt, Germany"],
  [52.52, 13.40, "बर्लिन", "Berlin, Germany"],
  [47.38, 8.54, "झुरिक", "Zurich, Switzerland"],
  [25.20, 55.27, "दुबई", "Dubai, UAE"],
  [24.45, 54.38, "अबू धाबी", "Abu Dhabi, UAE"],
  [25.29, 51.53, "दोहा", "Doha, Qatar"],
  [23.59, 58.41, "मस्कत", "Muscat, Oman"],
  [1.35, 103.82, "सिंगापूर", "Singapore"],
  [3.14, 101.69, "क्वालालंपूर", "Kuala Lumpur, Malaysia"],
  [22.32, 114.17, "हाँगकाँग", "Hong Kong"],
  [35.68, 139.69, "टोकियो", "Tokyo, Japan"],
  [-33.87, 151.21, "सिडनी", "Sydney, NSW"],
  [-37.81, 144.96, "मेलबर्न", "Melbourne, VIC"],
  [-27.47, 153.03, "ब्रिस्बेन", "Brisbane, QLD"],
  [-34.93, 138.60, "ॲडलेड", "Adelaide, SA"],
  [-31.95, 115.86, "पर्थ", "Perth, WA"],
  [-36.85, 174.76, "ऑकलंड", "Auckland, New Zealand"],
  [19.08, 72.88, "मुंबई", "Mumbai, Maharashtra"],
  [19.22, 72.98, "ठाणे", "Thane, Maharashtra", 10],
  [19.03, 73.03, "नवी मुंबई", "Navi Mumbai, Maharashtra", 10],
  [18.52, 73.86, "पुणे", "Pune, Maharashtra"],
  [20.00, 73.79, "नाशिक", "Nashik, Maharashtra"],
  [21.15, 79.09, "नागपूर", "Nagpur, Maharashtra"],
  [19.88, 75.34, "छत्रपती संभाजीनगर", "Chhatrapati Sambhajinagar, Maharashtra"],
  [16.70, 74.24, "कोल्हापूर", "Kolhapur, Maharashtra"],
  [17.66, 75.91, "सोलापूर", "Solapur, Maharashtra"],
  [16.85, 74.58, "सांगली", "Sangli, Maharashtra"],
  [17.68, 74.02, "सातारा", "Satara, Maharashtra"],
  [16.99, 73.31, "रत्नागिरी", "Ratnagiri, Maharashtra"],
  [19.09, 74.74, "अहिल्यानगर", "Ahilyanagar, Maharashtra"],
  [20.93, 77.75, "अमरावती", "Amravati, Maharashtra"],
  [20.70, 77.00, "अकोला", "Akola, Maharashtra"],
  [21.00, 75.56, "जळगाव", "Jalgaon, Maharashtra"],
  [18.40, 76.56, "लातूर", "Latur, Maharashtra"],
  [19.15, 77.31, "नांदेड", "Nanded, Maharashtra"],
  [15.49, 73.83, "पणजी", "Panaji, Goa"],
  [15.85, 74.50, "बेळगाव", "Belagavi, Karnataka"],
  [12.97, 77.59, "बंगळुरू", "Bengaluru, Karnataka"],
  [12.30, 76.64, "म्हैसूर", "Mysuru, Karnataka"],
  [17.39, 78.49, "हैदराबाद", "Hyderabad, Telangana"],
  [13.08, 80.27, "चेन्नई", "Chennai, Tamil Nadu"],
  [9.93, 76.27, "कोची", "Kochi, Kerala"],
  [28.61, 77.21, "दिल्ली", "Delhi"],
  [28.46, 77.03, "गुरुग्राम", "Gurugram, Haryana", 10],
  [28.54, 77.39, "नोएडा", "Noida, Uttar Pradesh", 10],
  [23.02, 72.57, "अहमदाबाद", "Ahmedabad, Gujarat"],
  [22.31, 73.18, "वडोदरा", "Vadodara, Gujarat"],
  [21.17, 72.83, "सुरत", "Surat, Gujarat"],
  [22.72, 75.86, "इंदूर", "Indore, Madhya Pradesh"],
  [23.26, 77.41, "भोपाळ", "Bhopal, Madhya Pradesh"],
  [26.91, 75.79, "जयपूर", "Jaipur, Rajasthan"],
  [26.85, 80.95, "लखनौ", "Lucknow, Uttar Pradesh"],
  [25.32, 82.97, "वाराणसी", "Varanasi, Uttar Pradesh"],
  [22.57, 88.36, "कोलकाता", "Kolkata, West Bengal"]
];
const MOON = '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a7 7 0 0 0 10.5 10.5z" fill="currentColor"/></svg>';

/**
 * Name for a location, with own = 1 when no listed city is close
 * @param {number} lat
 * @param {number} lon
 * @returns {Place}
 */
function near(lat, lon) {
  /** @type {[number, number, string, string, number?] | null} */
  var best = null,
    sub = null;
  var bd = 1e9,
    sd = 1e9,
    r = Math.PI / 180;
  CITY.forEach(function (c) {
    var a = Math.sin(((c[0] - lat) * r) / 2),
      b = Math.sin(((c[1] - lon) * r) / 2),
      d = 12742 * Math.asin(Math.sqrt(a * a + Math.cos(lat * r) * Math.cos(c[0] * r) * b * b));
    if (c[4]) {
      if (d <= c[4] && d < sd) {
        sd = d;
        sub = c;
      }
    } else if (d < bd) {
      bd = d;
      best = c;
    }
  });
  /** @type {Place} */
  var o = { lat: lat, lon: lon, mr: "तुमचे ठिकाण", en: "Your location", own: 1 };
  var s = /** @type {[number, number, string, string, number?] | null} */ (sub),
    bb = /** @type {[number, number, string, string, number?] | null} */ (best);
  if (s) {
    o.mr = s[2];
    o.en = s[3];
  } else if (bb && bd <= 40) {
    o.mr = bb[2];
    o.en = bb[3];
  } else if (bb && bd <= 120) {
    o.mr = bb[2] + " जवळ";
    o.en = "near " + bb[3];
  }
  return o;
}

/**
 * The place moonrise is worked out for: the reader's own, else the time zone's city, else null
 * @returns {Place | null}
 */
export function skLoc() {
  if (P.loc && typeof P.loc.lat === "number") return near(P.loc.lat, P.loc.lon);
  var z = "";
  try {
    z = Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch (e) {}
  var c = TZ[z];
  return c ? { lat: c[0], lon: c[1], mr: c[2], en: c[3] } : null;
}

/**
 * Midnight at the start of a day (today when t is left out)
 * @param {number} [t]
 */
export function skMid(t) {
  var d = t ? new Date(t) : new Date();
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

/**
 * Date (with the year when it is not this year) and moonrise text for one Sankashti, in Marathi and English
 * @param {Sankashti} o
 */
export function skFmt(o) {
  var d = new Date(o.day),
    yr = d.getFullYear() !== new Date().getFullYear(),
    r = o.rise ? new Date(o.rise) : null,
    h = r ? r.getHours() : 0,
    mi = r ? ("0" + r.getMinutes()).slice(-2) : "",
    h12 = r ? ((h + 11) % 12) + 1 : 0,
    late = !!r && r.getDate() !== d.getDate();
  return {
    d: d,
    ang: d.getDay() === 2,
    dmr: DAYS.mr[d.getDay()] + ", " + dv(d.getDate()) + " " + MONTHS.mr[d.getMonth()] + (yr ? " " + dv(d.getFullYear()) : ""),
    den: d.toLocaleDateString(
      "en-US",
      yr ? { weekday: "short", day: "numeric", month: "short", year: "numeric" } : { weekday: "short", day: "numeric", month: "short" },
    ),
    tmr: r ? (h >= 20 || h < 4 ? "रात्री " : h >= 16 ? "सायं. " : "") + dv(h12) + ":" + dv(mi) + (late ? " (मध्यरात्रीनंतर)" : "") : "—",
    ten: r ? h12 + ":" + mi + (h >= 12 ? " pm" : " am") + (late ? " (after midnight)" : "") : "—",
  };
}

/**
 * True within 120 km of Bharatiya Hindu Temple, Powell OH, where the group meets 7:00–8:30 pm (the Share message)
 * @param {Place} L
 */
export function skTemple(L) {
  var r0 = Math.PI / 180,
    a = Math.sin(((L.lat - 40.2148) * r0) / 2),
    b = Math.sin(((L.lon + 83.1067) * r0) / 2);
  return 12742 * Math.asin(Math.sqrt(a * a + Math.cos(L.lat * r0) * Math.cos(40.2148 * r0) * b * b)) <= 120;
}

/**
 * The next Sankashti (today's, on the day) for the place, worked out once per place and day and kept in
 * skCache as { key, list, ni, sel } (the shape js/features/share.js reads)
 * @returns {Sankashti | null}
 */
export function skNext() {
  var L = skLoc();
  if (!L) return null;
  var key = L.lat + "," + L.lon + "," + new Date().toDateString();
  if (!skCache || skCache.key !== key) {
    try {
      var first = SK.upcoming(Date.now(), L.lat, L.lon, 1);
    } catch (e) {
      return null;
    }
    if (!first[0]) return null;
    skCache = { key: key, list: first, ni: 0, sel: 0 };
  }
  return skCache.list[skCache.ni] || null;
}

/** The Sankashti line on the home page (#skt): shown on the day only; re-drawn when the day or menu language changes */
export function skRender() {
  var box = document.getElementById("skt");
  if (!box) return;
  var o = skNext(),
    L = skLoc();
  if (!o || !L || Math.round((o.day - skMid()) / 86400000) !== 0) {
    box.hidden = true;
    box.innerHTML = "";
    return;
  }
  var f = skFmt(o),
    mr = P.ui === "mr";
  box.lang = mr ? "mr" : "en";
  // three parts, each kept whole on a narrow phone
  box.innerHTML =
    MOON +
    "<span>" +
    '<span class="skp">' +
    (mr ? (f.ang ? "अंगारकी " : "") + "संकष्टी चतुर्थी आज" : "Sankashti Chaturthi today" + (f.ang ? " (Angaraki)" : "")) +
    '</span><span aria-hidden="true"> · </span><span class="skp">' +
    (mr ? "चंद्रोदय <b>" + f.tmr + "</b>" : "Moonrise <b>" + f.ten + "</b>") +
    '</span><span aria-hidden="true"> · </span><span class="skp">' +
    (mr ? L.mr : L.en) +
    "</span></span>";
  box.hidden = false;
}

/** Settings → Place for moonrise: the place's name */
function placeShow() {
  var v = document.getElementById("slocv"),
    L = skLoc();
  if (v) v.textContent = L ? (P.ui === "mr" ? L.mr : L.en) : "—";
}

/** Re-draw for the menu language and the day (called by apply(), js/features/bars.js) */
export function skLang() {
  var k = P.ui + new Date().toDateString() + JSON.stringify(P.loc || null);
  placeShow();
  if (k === skKey) return;
  skKey = k;
  skRender();
}

export function init() {
  skCache = null;
  skKey = "";
  // the day can change while the page is open: check again when it comes back into view
  document.addEventListener("visibilitychange", function () {
    if (!document.hidden) skLang();
  });
  // Settings → Place for moonrise: "Use my location" (asked of the phone once; only the rounded place is kept)
  var b = document.getElementById("sloc");
  if (b)
    b.addEventListener("click", function () {
      if (!navigator.geolocation) {
        flash("हे ब्राउझर ठिकाण देऊ शकत नाही", "Location is not available in this browser");
        return;
      }
      navigator.geolocation.getCurrentPosition(
        function (p) {
          change({ loc: { lat: Math.round(p.coords.latitude * 100) / 100, lon: Math.round(p.coords.longitude * 100) / 100 } });
          skCache = null;
          skLang();
          flash("ठिकाण: " + ((skLoc() || { mr: "" }).mr), "Place: " + ((skLoc() || { en: "" }).en));
        },
        function () {
          flash("ठिकाण मिळाले नाही", "Could not get your location");
        },
        { timeout: 15000, maximumAge: 86400000 },
      );
    });
}
