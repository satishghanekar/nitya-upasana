// @ts-check
// Which of the app's three pictures shows at a given moment, and where today's weekday star is on it.
// Pure functions only (no page), so the unit tests (tests/unit/time-of-day.test.mjs) run them in Node;
// js/features/day-picture.js puts the answer on the page.
//
// The pictures are Satish's: ॐ, a palm-leaf book and a rosary under an arch of seven stars, one for each
// weekday (र सो मं बु गु शु श = Sunday … Saturday). They follow the default sessions:
// Morning before 12:00 → sunrise, Afternoon 12:00–17:00 → midday, Evening from 17:00 → sunset.
// The time is the phone's own clock and time zone.

/**
 * @typedef {"morning" | "afternoon" | "evening"} Session
 * @typedef {"sunrise" | "midday" | "sunset"} PictureName
 * @typedef {{
 *   session: Session, picture: PictureName, day: number, dayName: string, star: [number, number],
 *   small: string, large: string, favicon: string, label: string
 * }} Picture
 *   day: 0 Sunday … 6 Saturday; star: the centre of that day's star, per cent of the picture from its left and top;
 *   small: the 360px picture (home card, folded line); large: the full-screen one; favicon: the browser tab icon
 */

/** @type {Record<Session, PictureName>} */
const PICTURE = { morning: "sunrise", afternoon: "midday", evening: "sunset" };
/** @type {Record<PictureName, string>} */
const TITLE = { sunrise: "Sunrise", midday: "Midday", sunset: "Sunset" };
const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
// The tab icon: the sunrise one is icon-32.png, the same as the installed app icon
/** @type {Record<PictureName, string>} */
const FAVICON = { sunrise: "icon-32.png", midday: "favicon-midday-32.png", sunset: "favicon-sunset-32.png" };

/**
 * Star centres on each picture, Sunday (र) to Saturday (श), per cent of the picture-*.webp files from the left
 * and top. From the approved mockup (mockups/today-icons.html, measured on Satish's 2048px images), moved to the
 * round crop that the picture files are cut to.
 * @type {Record<PictureName, [number, number][]>}
 */
export const STARS = {
  sunrise: [
    [14.1, 40.5],
    [20.9, 26.6],
    [32.8, 16.8],
    [49.9, 13.2],
    [66.9, 16.8],
    [79.1, 26.8],
    [85.4, 40.5],
  ],
  midday: [
    [16.0, 44.3],
    [22.0, 30.0],
    [33.6, 19.9],
    [49.9, 15.8],
    [66.3, 19.9],
    [77.9, 30.3],
    [83.9, 44.5],
  ],
  sunset: [
    [13.8, 39.3],
    [21.1, 25.6],
    [33.7, 15.8],
    [49.9, 12.2],
    [66.5, 15.8],
    [79.1, 25.9],
    [86.4, 39.3],
  ],
};

/**
 * The session of the day at this moment.
 * @param {Date} now
 * @returns {Session}
 */
export function sessionAt(now) {
  const h = now.getHours();
  return h < 12 ? "morning" : h < 17 ? "afternoon" : "evening";
}

/**
 * The picture to show at this moment, with today's star.
 * @param {Date} now
 * @returns {Picture}
 */
export function pictureAt(now) {
  return pictureFor(sessionAt(now), now.getDay());
}

/**
 * The picture for a session and a weekday: what the Today card shows for the day and session picked on it.
 * @param {Session} session
 * @param {number} day  0 Sunday … 6 Saturday
 * @returns {Picture}
 */
export function pictureFor(session, day) {
  const picture = PICTURE[session];
  return {
    session,
    picture,
    day,
    dayName: DAYS[day],
    star: STARS[picture][day],
    small: "picture-" + picture + "-360.webp",
    large: "picture-" + picture + ".webp",
    favicon: FAVICON[picture],
    label: TITLE[picture] + " picture, " + DAYS[day] + " star marked",
  };
}

/**
 * The next moment the picture or the star changes: 12:00, 17:00 or midnight, whichever comes first.
 * @param {Date} now
 * @returns {Date}
 */
export function nextChange(now) {
  const h = now.getHours(),
    next = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h < 12 ? 12 : 17);
  if (h >= 17) {
    next.setDate(next.getDate() + 1);
    next.setHours(0);
  }
  return next;
}
