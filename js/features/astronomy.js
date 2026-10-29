// Astronomy for the Next Sankathara Chaturthi card
// One part of the site script; js/main.js runs each part's init() in order. See js/README.md.

export var SK;

export function init() {
  // Low-precision sun & moon positions (Meeus, Astronomical Algorithms ch. 25 & 47, main terms),
  // lunar day (tithi), moonrise, and the Sankashti rule: Krishna-paksha Chaturthi prevailing at moonrise.
  SK = (function () {
    var D2R = Math.PI / 180;
    function jd(t) {
      return t / 86400000 + 2440587.5;
    }
    function n360(x) {
      x %= 360;
      return x < 0 ? x + 360 : x;
    }
    function sunLon(T) {
      var L0 = 280.46646 + 36000.76983 * T + 0.0003032 * T * T,
        M = (357.52911 + 35999.05029 * T - 0.0001537 * T * T) * D2R;
      var C = (1.914602 - 0.004817 * T - 0.000014 * T * T) * Math.sin(M) + (0.019993 - 0.000101 * T) * Math.sin(2 * M) + 0.000289 * Math.sin(3 * M);
      var om = (125.04 - 1934.136 * T) * D2R;
      return n360(L0 + C - 0.00569 - 0.00478 * Math.sin(om));
    }
    // longitude terms: [D,M,M',F,coef(1e-6 deg)]
    var LT = [
      [0, 0, 1, 0, 6288774],
      [2, 0, -1, 0, 1274027],
      [2, 0, 0, 0, 658314],
      [0, 0, 2, 0, 213618],
      [0, 1, 0, 0, -185116],
      [0, 0, 0, 2, -114332],
      [2, 0, -2, 0, 58793],
      [2, -1, -1, 0, 57066],
      [2, 0, 1, 0, 53322],
      [2, -1, 0, 0, 45758],
      [0, 1, -1, 0, -40923],
      [1, 0, 0, 0, -34720],
      [0, 1, 1, 0, -30383],
      [2, 0, 0, -2, 15327],
      [0, 0, 1, 2, -12528],
      [0, 0, 1, -2, 10980],
      [4, 0, -1, 0, 10675],
      [0, 0, 3, 0, 10034],
      [4, 0, -2, 0, 8548],
      [2, 1, -1, 0, -7888],
      [2, 1, 0, 0, -6766],
      [1, 0, -1, 0, -5163],
      [1, 1, 0, 0, 4987],
      [2, -1, 1, 0, 4036],
      [2, 0, 2, 0, 3994],
      [4, 0, 0, 0, 3861],
      [2, 0, -3, 0, 3665],
      [0, 1, -2, 0, -2689],
      [2, 0, -1, 2, -2602],
      [2, -1, -2, 0, 2390],
      [1, 0, 1, 0, -2348],
      [2, -2, 0, 0, 2236],
      [0, 1, 2, 0, -2120],
      [0, 2, 0, 0, -2069],
      [2, -2, -1, 0, 2048],
      [2, 0, 1, -2, -1773],
      [2, 0, 0, 2, -1595],
      [4, -1, -1, 0, 1215],
      [0, 0, 2, 2, -1110],
      [3, 0, -1, 0, -892],
      [2, 1, 1, 0, -810],
      [4, -1, -2, 0, 759],
      [0, 2, -1, 0, -713],
      [2, 2, -1, 0, -700],
      [2, 1, -2, 0, 691],
      [2, -1, 0, -2, 596],
      [4, 0, 1, 0, 549],
      [0, 0, 4, 0, 537],
      [4, -1, 0, 0, 520],
      [1, 0, -2, 0, -487],
    ];
    var BT = [
      [0, 0, 0, 1, 5128122],
      [0, 0, 1, 1, 280602],
      [0, 0, 1, -1, 277693],
      [2, 0, 0, -1, 173237],
      [2, 0, -1, 1, 55413],
      [2, 0, -1, -1, 46271],
      [2, 0, 0, 1, 32573],
      [0, 0, 2, 1, 17198],
      [2, 0, 1, -1, 9266],
      [0, 0, 2, -1, 8822],
      [2, -1, 0, -1, 8216],
      [2, 0, -2, -1, 4324],
      [2, 0, 1, 1, 4200],
      [2, 1, 0, -1, -3359],
      [2, -1, -1, 1, 2463],
      [2, -1, 0, 1, 2211],
      [2, -1, -1, -1, 2065],
      [0, 1, -1, -1, -1870],
      [4, 0, -1, -1, 1828],
      [0, 1, 0, 1, -1794],
    ];
    function moon(T) {
      var Lp = n360(218.3164477 + 481267.88123421 * T - 0.0015786 * T * T),
        D = n360(297.8501921 + 445267.1114034 * T - 0.0018819 * T * T),
        M = n360(357.5291092 + 35999.0502909 * T),
        Mp = n360(134.9633964 + 477198.8675055 * T + 0.0087414 * T * T),
        F = n360(93.272095 + 483202.0175233 * T - 0.0036539 * T * T),
        E = 1 - 0.002516 * T;
      var sl = 0,
        sb = 0;
      LT.forEach(function (t) {
        var a = (t[0] * D + t[1] * M + t[2] * Mp + t[3] * F) * D2R,
          e = Math.abs(t[1]) === 1 ? E : Math.abs(t[1]) === 2 ? E * E : 1;
        sl += t[4] * e * Math.sin(a);
      });
      BT.forEach(function (t) {
        var a = (t[0] * D + t[1] * M + t[2] * Mp + t[3] * F) * D2R,
          e = Math.abs(t[1]) === 1 ? E : Math.abs(t[1]) === 2 ? E * E : 1;
        sb += t[4] * e * Math.sin(a);
      });
      var A1 = (119.75 + 131.849 * T) * D2R,
        A2 = (53.09 + 479264.29 * T) * D2R,
        A3 = (313.45 + 481266.484 * T) * D2R;
      sl += 3958 * Math.sin(A1) + 1962 * Math.sin(Lp * D2R - F * D2R) + 318 * Math.sin(A2);
      sb +=
        -2235 * Math.sin(Lp * D2R) +
        382 * Math.sin(A3) +
        175 * Math.sin(A1 - F * D2R) +
        175 * Math.sin(A1 + F * D2R) +
        127 * Math.sin(Lp * D2R - Mp * D2R) -
        115 * Math.sin(Lp * D2R + Mp * D2R);
      var om = (125.04452 - 1934.136261 * T) * D2R;
      return { lon: n360(Lp + sl / 1e6 - 0.00478 * Math.sin(om)), lat: sb / 1e6 };
    }
    function T(t) {
      return (jd(t) - 2451545) / 36525;
    }
    // elongation of moon from sun, 0..360 (tithi = floor(elong/12))
    function elong(t) {
      var x = T(t);
      return n360(moon(x).lon - sunLon(x));
    }
    function altMoon(t, lat, lon) {
      var x = T(t),
        m = moon(T(t + (63.8 + 0.2 * (t / 31557600000 - 30)) * 1000)), // the moon at TT = UT + ΔT (~69 s)
        eps = (23.439291 - 0.0130042 * x) * D2R,
        l = m.lon * D2R,
        b = m.lat * D2R;
      var ra = Math.atan2(Math.sin(l) * Math.cos(eps) - Math.tan(b) * Math.sin(eps), Math.cos(l)),
        dec = Math.asin(Math.sin(b) * Math.cos(eps) + Math.cos(b) * Math.sin(eps) * Math.sin(l));
      var gmst = n360(280.46061837 + 360.98564736629 * (jd(t) - 2451545) + 0.000387933 * x * x),
        H = (gmst + lon) * D2R - ra,
        p = lat * D2R;
      return Math.asin(Math.sin(p) * Math.sin(dec) + Math.cos(p) * Math.cos(dec) * Math.cos(H)) / D2R;
    }
    // moonrise within [t0,t1): first upward crossing of +0.125 deg geocentric altitude of the centre (upper limb on the
    // horizon with refraction, semidiameter and parallax); within ~0.5 min of the Swiss Ephemeris, 2020-2032
    function rise(t0, t1, lat, lon) {
      var h0 = 0.125,
        st = 10 * 60000,
        a = altMoon(t0, lat, lon) - h0;
      for (var t = t0 + st; t <= t1; t += st) {
        var b = altMoon(t, lat, lon) - h0;
        if (a < 0 && b >= 0) {
          var lo = t - st,
            hi = t;
          for (var i = 0; i < 12; i++) {
            var m = (lo + hi) / 2;
            if (altMoon(m, lat, lon) - h0 < 0) lo = m;
            else hi = m;
          }
          return hi;
        }
        a = b;
      }
      return null;
    }
    // Sankashti = Krishna Chaturthi (elongation 216-228 deg). Observed on the local date whose moonrise falls inside it
    // (first such date if two); if no moonrise falls inside, the date on which it is in effect at sunrise (~06:30).
    // Dates and times use the device's own time zone.
    function cross(a, b, target) {
      for (var i = 0; i < 30; i++) {
        var m = (a + b) / 2;
        if (n360(elong(m) - target + 180) - 180 < 0) a = m;
        else b = m;
      }
      return b;
    }
    function mid(t) {
      var d = new Date(t);
      return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    }
    function addDay(m) {
      var d = new Date(m);
      return new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1).getTime();
    }
    function upcoming(from, lat, lon, count) {
      var out = [],
        t = from - 3 * 86400000,
        end = from + (count + 1) * 31 * 86400000,
        h = 3600000,
        p = elong(t);
      for (; t < end && out.length < count + 1; t += h) {
        var e = elong(t + h);
        if (p < 216 && e >= 216 && e < 240) {
          var s = cross(t, t + h, 216),
            en = s;
          var q = s;
          while (elong(q) < 228 && q - s < 3 * 86400000) q += h;
          en = cross(q - h, q, 228);
          var pick = null,
            rs = null;
          for (var d = mid(s) - 86400000; d < en; d = addDay(d)) {
            var r = rise(d + 12 * h, addDay(d) + 12 * h, lat, lon);
            if (r !== null && r >= s && r < en) {
              pick = d;
              rs = r;
              break;
            }
          }
          if (pick === null) {
            for (var d2 = mid(s); d2 < en; d2 = addDay(d2)) {
              var sr = d2 + 6.5 * h;
              if (sr >= s && sr < en) {
                pick = d2;
                break;
              }
            }
            if (pick === null) pick = mid(en);
            rs = rise(pick + 12 * h, addDay(pick) + 12 * h, lat, lon);
          }
          if (addDay(pick) > from) out.push({ day: pick, rise: rs, start: s, end: en, atRise: rs !== null && rs >= s && rs < en });
        }
        p = e;
      }
      return out.slice(0, count);
    }
    // moonLon / sunLon: apparent tropical ecliptic longitudes (degrees) at time t (ms), for js/core/panchang.js
    return {
      elong: elong,
      rise: rise,
      upcoming: upcoming,
      moonLon: function (t) {
        return moon(T(t)).lon;
      },
      sunLon: function (t) {
        return sunLon(T(t));
      },
    };
  })();
}
