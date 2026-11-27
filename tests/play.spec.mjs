// Play mode (js/features/play.js; Satish, 2026-11-26: a recording opened YouTube in a window of its own, out of the app;
// as in Sankathara Chaturthi it plays here now): the ▶ on a Listen card plays the text's recording above it, the player
// bar's ❚❚ and ■ Stop; in a session being read it plays on through the session, ⏮ ⏭, texts with no recording passed
// over; Back stops it. YouTube's script is a stand-in here (STUB), so the tests never reach YouTube: it plays at once and
// lets a test end a video (__yt.end()) or fail one (__yt.fail(code)).
import { test, expect } from "@playwright/test";
import { openSite, readText, SETUPS, TEST_ROUTINE } from "./helpers.mjs";

const STUB = `
(function () {
  var all = [];
  function Player(el, o) {
    var me = this;
    me.o = o; me.state = -1; me.video = ""; me.start = 0; me.loads = 0;
    window.__yt = {
      player: me,
      end: function () { me.state = 0; me.o.events.onStateChange({ data: 0 }); },
      fail: function (code) { me.o.events.onError({ data: code }); },
    };
    all.push(me);
    setTimeout(function () { o.events.onReady({ target: me }); }, 10);
  }
  Player.prototype.emit = function (d) { this.state = d; this.o.events.onStateChange({ data: d }); };
  Player.prototype.loadVideoById = function (v) {
    var me = this;
    me.video = v.videoId; me.start = v.startSeconds || 0; me.loads++;
    me.emit(-1);
    setTimeout(function () { me.emit(1); }, 20);
  };
  Player.prototype.playVideo = function () { this.emit(1); };
  Player.prototype.pauseVideo = function () { this.emit(2); };
  Player.prototype.stopVideo = function () { this.emit(5); };
  Player.prototype.getPlayerState = function () { return this.state; };
  Player.prototype.getCurrentTime = function () { return this.start + 5; };
  Player.prototype.getDuration = function () { return 300; };
  window.YT = { Player: Player };
  if (window.onYouTubeIframeAPIReady) window.onYouTubeIframeAPIReady();
})();
`;

/** YouTube's script answered by the stand-in, anything else of YouTube's refused; the requests to YouTube counted */
async function stubYouTube(page) {
  const asked = [];
  await page.route(/youtube(-nocookie)?\.com|ytimg\.com/, (r) => {
    asked.push(r.request().url());
    if (r.request().url() === "https://www.youtube.com/iframe_api") return r.fulfill({ contentType: "application/javascript", body: STUB });
    return r.abort();
  });
  return asked;
}

const video = (page) => page.evaluate(() => window.__yt && window.__yt.player.video);
/** The video loaded is playing (only an end after it has played counts, js/features/youtube.js) */
const playing = (page) => expect.poll(() => page.evaluate(() => window.__yt && window.__yt.player.state)).toBe(1);
const shown = (loc) => loc.evaluate((e) => e.innerText.replace(/\s+/g, " ").trim());

/** Settings → Reading → Play in the app turned on (P.yt; off on a new phone) */
const ON = { ...SETUPS.marathi, yt: 1 };
const VANDE = "bhajan-vande-ganapati";
const GAIYE = "bhajan-gaiye-ganapati-jagvandan";

test("a text on its own: ▶ plays it here, ❚❚ and ▶, it ends and Play mode stops; nothing reaches YouTube before a tap @mobile", async ({ page }) => {
  const errors = [];
  const asked = await stubYouTube(page);
  await openSite(page, ON, { errors });
  await readText(page, VANDE);
  const sec = page.locator("#" + VANDE);
  const play = sec.locator(".listen-play");
  await expect(play).toBeVisible();
  await expect(play).toHaveAccessibleName("Play here: Jagjit Singh");
  // the card's link still opens YouTube, for whoever wants it there
  await expect(sec.locator(".listen-card")).toHaveAttribute("href", "https://www.youtube.com/watch?v=mt-vSIgsaxU&t=15");
  expect((await play.boundingBox()).height).toBeGreaterThanOrEqual(44);
  expect(asked).toEqual([]);
  await play.click();
  const bar = page.locator("#play-bar");
  await expect(bar).toBeVisible();
  await expect(page.locator("#asc")).toBeHidden();
  await expect(page.locator("#play-video")).toBeVisible();
  await expect.poll(() => video(page)).toBe("mt-vSIgsaxU");
  await expect.poll(() => page.evaluate(() => window.__yt.player.start)).toBe(15);
  await playing(page);
  await expect(page.locator("#play-count")).toHaveText("Playing");
  await expect(page.locator("#play-title")).toHaveText("Vande Ganapati Vighnavinashan");
  // one recording: no ⏮ ⏭
  await expect(page.locator("#play-prev")).toBeHidden();
  await expect(page.locator("#play-next")).toBeHidden();
  // the video's place is YouTube's minimum at least, and above the text
  const box = await page.locator("#play-video").boundingBox();
  expect(box.height).toBeGreaterThanOrEqual(199);
  expect(box.y).toBeLessThan((await sec.locator("header").boundingBox()).y);
  await page.locator("#play-toggle").click();
  await expect(page.locator("#play-toggle")).toHaveAttribute("aria-label", "Play");
  await expect(page.locator("#play-count")).toHaveText("Paused");
  await page.locator("#play-toggle").click();
  await expect(page.locator("#play-toggle")).toHaveAttribute("aria-label", "Pause");
  for (const b of await bar.locator("button:visible").all()) expect((await b.boundingBox()).height).toBeGreaterThanOrEqual(44);
  // it ends: Play mode stops by itself, the text stays
  await playing(page);
  await page.evaluate(() => window.__yt.end());
  await expect(bar).toBeHidden();
  await expect(page.locator("#play-video")).toBeHidden();
  await expect(page.locator("#asc")).toBeVisible();
  await expect(sec).toBeVisible();
  await expect(page.locator("html")).not.toHaveAttribute("data-playing", /.*/);
  expect(errors).toEqual([]);
});

test("■ Stop and Back stop it; a video that can't play is said @mobile", async ({ page }) => {
  await stubYouTube(page);
  await openSite(page, ON);
  await readText(page, GAIYE);
  const play = page.locator("#" + GAIYE + " .listen-play");
  await play.click();
  await expect.poll(() => video(page)).toBe("aASYnk-eaXI");
  await page.locator("#play-stop").click();
  await expect(page.locator("#play-bar")).toBeHidden();
  await expect(page.locator("#fl")).toHaveText("Stopped · tap ▶ to carry on");
  await expect(page.locator("#" + GAIYE)).toBeVisible();
  await play.click();
  await expect(page.locator("#play-bar")).toBeVisible();
  await page.goBack();
  await expect(page.locator("#play-bar")).toBeHidden();
  await expect(page.locator("#" + GAIYE)).toBeVisible();
  await play.click();
  await playing(page);
  await page.evaluate(() => window.__yt.fail(150));
  await expect(page.locator("#fl")).toHaveText("Can’t play Gaiye Ganapati Jagavandan here now");
  await expect(page.locator("#play-bar")).toBeHidden({ timeout: 9000 });
});

test("in a session: on through its recordings, the text with none passed over, ⏮ ⏭, all played @mobile", async ({ page }) => {
  // a Morning of two bhajans with an aarti between them (no recording)
  const morning = { mode: "fixed", texts: [VANDE, "aarti-sukhkarta", GAIYE] };
  await stubYouTube(page);
  await page.route("**/content/routines.json", (r) =>
    r.fulfill({ contentType: "application/json", body: JSON.stringify({ short: { ...TEST_ROUTINE, morning } }) }),
  );
  await openSite(page, ON);
  await page.locator("#tsl a.tgo").first().click();
  const sec = page.locator("#" + VANDE);
  await expect(sec).toBeVisible();
  await sec.locator(".listen-play").click();
  await expect.poll(() => video(page)).toBe("mt-vSIgsaxU");
  // the session's first text: its video turned to, just above it
  await expect(page.locator("#play-video")).toBeInViewport();
  await expect(page.locator("#play-count")).toHaveText("Playing 1 of 2");
  await expect(page.locator("#play-title")).toHaveText("Vande Ganapati Vighnavinashan · next: Gaiye Ganapati Jagavandan");
  await expect(page.locator("#play-prev")).toBeDisabled();
  // it ends: the next with a recording, the aarti passed over and said so, the page turned to it
  await playing(page);
  await page.evaluate(() => window.__yt.end());
  await expect.poll(() => video(page)).toBe("aASYnk-eaXI");
  await expect(page.locator("#play-count")).toHaveText("Playing 2 of 2");
  await expect(page.locator("#fl")).toHaveText(/^Skipped, no recording: /);
  await expect(page.locator("#play-title")).toHaveText("Gaiye Ganapati Jagavandan · the last one");
  await expect(page.locator("#" + GAIYE + " header")).toBeInViewport();
  await expect(page.locator("#play-next")).toBeDisabled();
  // ⏮ back to the first
  await page.locator("#play-prev").click();
  await expect.poll(() => video(page)).toBe("mt-vSIgsaxU");
  await page.locator("#play-next").click();
  await expect.poll(() => video(page)).toBe("aASYnk-eaXI");
  await playing(page);
  await page.evaluate(() => window.__yt.end());
  await expect(page.locator("#play-bar")).toBeHidden();
  await expect(page.locator("#fl")).toHaveText("All 2 recordings played");
});

test("Play mode's words in Marathi menus @mobile", async ({ page }) => {
  await stubYouTube(page);
  await openSite(page, { ...SETUPS["marathi-menus"], yt: 1 });
  await readText(page, VANDE);
  await page.locator("#" + VANDE + " .listen-play").click();
  await expect(page.locator("#play-count")).toHaveText("वाजत आहे");
  await expect(page.locator("#play-stop")).toHaveText("■ बंद करा");
});

test("a text with no recording has no ▶ @mobile", async ({ page }) => {
  await openSite(page, ON);
  await readText(page, "a1");
  await expect(page.locator("#a1 .listen-card")).toHaveCount(0);
  await expect(page.locator("#a1 .listen-play")).toHaveCount(0);
});

// Off unless turned on (Satish, 2026-11-27: the whole of it, no YouTube): no Listen card and no recording line under the
// credit; Settings → Reading → Play in the app brings them, the card itself playing here; off again
// takes them away
test("Play in the app: off on a new phone, no recording shown; turned on, the card plays here; off again @mobile", async ({ page }) => {
  const asked = await stubYouTube(page);
  await openSite(page, SETUPS.marathi);
  await readText(page, VANDE);
  const sec = page.locator("#bhajan-vande-ganapati");
  await expect(sec.locator(".listen-card")).toBeHidden();
  await expect(sec.locator(".cr .rec")).toBeHidden();
  await page.locator("#aa").click();
  const sw = page.locator("#play-setting");
  await expect(sw).toHaveAttribute("aria-pressed", "false");
  await expect(sw).toHaveAccessibleName(/^Play in the app/);
  await sw.click();
  await expect(sw).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator("html")).toHaveAttribute("data-yt", "");
  await sw.click();
  await expect(page.locator("html")).not.toHaveAttribute("data-yt", /.*/);
  await sw.click();
  await page.keyboard.press("Escape");
  await expect(sec.locator(".listen-play")).toHaveCount(1);
  // a tap on the card plays here, never a page of YouTube's
  const opened = [];
  page.context().on("page", (p) => opened.push(p.url()));
  await sec.locator(".listen-card").click();
  await expect(page.locator("#play-bar")).toBeVisible();
  await expect.poll(() => video(page)).toBeTruthy();
  expect(opened).toEqual([]);
  expect(asked.filter((u) => !u.endsWith("/iframe_api"))).toEqual([]);
});
