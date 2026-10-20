# Makes tests/unit/fixtures/panchang-swisseph.json: reference panchang values from the Swiss Ephemeris (the
# ephemeris Drik Panchang uses), to check js/core/panchang.js against (tests/unit/panchang.test.mjs).
# Not part of the site and not run by any test; run it again only to refresh the fixture:
#   python3 -m venv /tmp/se && /tmp/se/bin/pip install pyswisseph
#   /tmp/se/bin/python tests/tools/panchang-reference.py > tests/unit/fixtures/panchang-swisseph.json
# Moshier's built-in ephemeris (no data files; the Moon to about 1"), Lahiri ayanamsha, sunrise and sunset of the
# Sun's upper limb with standard refraction, every 11th day from 2020 to 2032 at Pune and at Columbus, Ohio.
import json, sys
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo
import swisseph as swe

swe.set_sid_mode(swe.SIDM_LAHIRI)
F = swe.FLG_MOSEPH
PLACES = {
    "pune": (18.52, 73.86, "Asia/Kolkata"),
    "columbus": (39.96, -83.0, "America/New_York"),
}

def lon(jd, body, sid):
    return swe.calc_ut(jd, body, F | (swe.FLG_SIDEREAL if sid else 0))[0][0]

def tithi(jd):
    return int(((lon(jd, swe.MOON, False) - lon(jd, swe.SUN, False)) % 360) // 12)

def nak(jd):
    return int(lon(jd, swe.MOON, True) // (360 / 27))

def yoga(jd):
    return int(((lon(jd, swe.MOON, True) + lon(jd, swe.SUN, True)) % 360) // (360 / 27))

def change(f, jd):
    v, a, b = f(jd), jd, jd + 1 / 24
    while f(b) == v:
        a, b = b, b + 1 / 24
    for _ in range(30):
        m = (a + b) / 2
        if f(m) == v:
            a = m
        else:
            b = m
    return b

def sec(jd):
    return round((jd - 2440587.5) * 86400)

def event(jd0, lat, lo, kind):
    return swe.rise_trans(jd0, swe.SUN, kind, (lo, lat, 0), 1013.25, 15, F)[1][0]

out = {
    "source": "Swiss Ephemeris %s (pyswisseph, Moshier), SIDM_LAHIRI; tests/tools/panchang-reference.py" % swe.version,
    "columns": "date, sunrise, sunset (Unix s), tithi 1-30 at sunrise, its end, nakshatra 1-27, its end, yoga 1-27, its end",
    "places": {},
}
for name, (lat, lo, tz) in PLACES.items():
    rows = []
    d = datetime(2020, 1, 1)
    while d.year <= 2032:
        jd0 = datetime(d.year, d.month, d.day, tzinfo=ZoneInfo(tz)).timestamp() / 86400 + 2440587.5
        sr = event(jd0, lat, lo, swe.CALC_RISE)
        ss = event(jd0, lat, lo, swe.CALC_SET)
        rows.append([d.strftime("%Y-%m-%d"), sec(sr), sec(ss),
                     tithi(sr) + 1, sec(change(tithi, sr)), nak(sr) + 1, sec(change(nak, sr)),
                     yoga(sr) + 1, sec(change(yoga, sr))])
        d += timedelta(days=11)
    out["places"][name] = {"lat": lat, "lon": lo, "tz": tz, "days": rows}
json.dump(out, sys.stdout, separators=(",", ":"))
sys.stdout.write("\n")
