// Service worker: keeps a copy of the site on the phone so it opens without internet.
// V is the site's version (shown as "v1.9" in Settings → About). It must match <meta name="version"> in index.html; change both on a new release.
const V = "aarti-v1.38.2";
// The page's styles and scripts, the font files and the pictures to keep: one list for the page and this worker, in js/parts.js
importScripts("js/parts.js");
const PARTS = SITE_PARTS.all;
const FONTS = SITE_PARTS.fonts;
const IMAGES = SITE_PARTS.images;
// A new version (a new V) saves a whole fresh copy before it takes over. The font files never change in place, so they
// are copied from the previous version's saved copy instead of downloaded again, and so are the PDFs a reader opened
// when they are unchanged (keepPdfs). If any file can't be fetched (a weak
// connection), the install fails and the previous version stays in use until the next launch tries again, so the
// saved copy is never a mix of two versions and never missing a part.
self.addEventListener("install", (e) => {
  self.skipWaiting();
  e.waitUntil(
    (async () => {
      const c = await caches.open(V);
      const old = (await caches.keys()).filter((x) => x !== V);
      const fonts = [];
      for (const f of FONTS) {
        let m = null;
        for (const k of old) {
          m = await (await caches.open(k)).match(new URL(f, location.href).href);
          if (m) break;
        }
        if (m) await c.put(new URL(f, location.href).href, m);
        else fonts.push(f);
      }
      const all = c.addAll(["./", "manifest.json", ...IMAGES, ...PARTS, ...fonts].map((x) => new Request(x, { cache: "reload" })));
      // a first visit has no older copy to fall back on: it goes on without a file that failed, and the page saves it later
      // (js/features/offline.js)
      if (old.length) await all;
      else await all.catch(() => {});
      // the books a reader opened (content/pdfs/, kept once opened: the fetch handler below) come along too, so a new
      // version doesn't make them download again; never one that can't be checked, and never in the way of the install
      if (old.length) await keepPdfs(c, old).catch(() => {});
    })(),
  );
});
// A kept PDF is copied to the new version's copy when the new list (content/pdfs.json, saved just before) still names
// it at the same size, to the byte. A corrected PDF has another size (`npm run pdfs` writes it, and the tests fail until
// it does), so the old one stays behind and the corrected one is downloaded the next time it is opened.
async function keepPdfs(c, old) {
  const list = await c.match(new URL("content/pdfs.json", location.href).href);
  if (!list) return;
  for (const p of (await list.json()).pdfs || []) {
    if (typeof p.file !== "string" || typeof p.size !== "number") continue;
    const url = new URL("content/" + p.file, location.href).href;
    for (const k of old) {
      const m = await (await caches.open(k)).match(url);
      if (!m) continue;
      if ((await m.clone().blob()).size === p.size) await c.put(url, m);
      break;
    }
  }
}
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((k) => Promise.all(k.filter((x) => x !== V).map((x) => caches.delete(x))))
      .then(() => self.clients.claim()),
  );
});
// Same-site files come from the saved copy of this version whenever it has them, at once and without asking the
// network: the page opens as fast as the phone can read it, with or without internet. Nothing is downloaded again
// until a new version is published (sw.js changes, and the install above saves the new copy; the page in use keeps
// running and the next launch opens the new version). A file not saved yet (a first visit still saving, a font picked
// later, a PDF from the Library's Books tab) is fetched and then kept; a PDF is kept once opened and from then on
// always opened from the phone (the Books tab marks the ones kept, js/features/pdfs.js).
// "Check for updates" (js/features/offline.js) marks its requests ?fresh (Safari's worker never sees a request's cache
// mode), and the page saving missing files asks with cache 'reload': those go straight to the network.
// Nothing here may leave the page waiting: if the saved copy can't be read within 2 s, or anything
// goes wrong, the request goes straight to the network as if there were no service worker.
// (Safari on a Mac sat on a blank page with the previous version; its storage can stall.)
const wait = (p, ms) => Promise.race([p, new Promise((res) => setTimeout(() => res(null), ms))]);
self.addEventListener("fetch", (e) => {
  const r = e.request;
  if (r.method !== "GET") return;
  const u = new URL(r.url);
  if (u.origin !== location.origin) return;
  if (r.cache === "no-store" || r.cache === "reload" || u.searchParams.has("fresh")) return;
  // Saving a fetched file is handed to waitUntil now, while the event is still being dispatched
  // (Safari can refuse waitUntil once the handler has moved on).
  let done;
  const bg = new Promise((res) => (done = res));
  e.waitUntil(bg);
  // A PDF from the Library (content/pdfs/) opens in the browser's own viewer: it is a file, never the page
  const pdf = /\.pdf$/i.test(u.pathname);
  const nav = !pdf && (r.mode === "navigate" || /\/(index\.html)?$/.test(u.pathname));
  const key = nav ? new URL("./", location.href).href : u.origin + u.pathname;
  const go = async () => {
    const c = await wait(caches.open(V), 2000);
    let m = c ? await wait(c.match(key), 2000) : null;
    if (m && m.redirected) m = null; // Safari refuses a redirected copy for a page
    if (m) return m;
    const net = () =>
      fetch(nav ? key : u.origin + u.pathname, { cache: "no-cache", credentials: "same-origin" })
        .then((x) => {
          if (c && x && x.ok && !x.redirected) done(c.put(key, x.clone()).catch(() => {}));
          return x;
        })
        .catch(() => null);
    const x = await net();
    if (x) return x;
    if (c && nav) {
      const h = await wait(c.match("./", { ignoreSearch: true }), 2000);
      if (h) return h;
    }
    if (pdf)
      return new Response(
        "ही पीडीएफ अजून या फोनवर जतन झालेली नाही: इंटरनेट असताना एकदा उघडा.\nThis PDF is not saved on this phone yet: open it once with internet.",
        { status: 503, headers: { "Content-Type": "text/plain; charset=utf-8" } },
      );
    return new Response("Offline", { status: 503 });
  };
  e.respondWith(
    go()
      .catch(() => fetch(r))
      .finally(() => setTimeout(done, 0)),
  );
});
