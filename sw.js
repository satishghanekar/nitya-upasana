// Service worker: keeps a copy of the site on the phone so it opens without internet.
// V is the site's version (shown as "v1.9" in Settings → About). It must match <meta name="version"> in index.html; change both on a new release.
const V='aarti-v1.36.3';
// The page's styles and scripts, the font files and the pictures to keep: one list for the page and this worker, in js/parts.js
importScripts('js/parts.js');
const PARTS=SITE_PARTS.all;
const FONTS=SITE_PARTS.fonts;
const IMAGES=SITE_PARTS.images;
self.addEventListener('install',e=>{self.skipWaiting();e.waitUntil(caches.open(V).then(c=>c.addAll(['./','manifest.json',...IMAGES,...PARTS,...FONTS].map(x=>new Request(x,{cache:'reload'}))).catch(()=>{})))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==V).map(x=>caches.delete(x)))).then(()=>self.clients.claim()))});
// Same-site files: the page itself, its style and script files and the texts (content/) are fetched fresh when possible
// (3 s limit, 1 s for the texts, then the saved copy), so the page never runs with an older copy of its parts; everything else is
// answered from the saved copy and refreshed in the background. A PDF from the Library's Books tab is kept once it
// has been opened and from then on always opened from the phone, never downloaded again, until the next version
// (V) clears the saved copies (the Books tab marks the ones kept, js/features/pdfs.js).
// Nothing here may leave the page waiting: if the saved copy can't be read within 2 s, or anything
// goes wrong, the request goes straight to the network as if there were no service worker.
// (Safari on a Mac sat on a blank page with the previous version; its storage can stall.)
const wait=(p,ms)=>Promise.race([p,new Promise(res=>setTimeout(()=>res(null),ms))]);
self.addEventListener('fetch',e=>{
  const r=e.request;if(r.method!=='GET')return;
  const u=new URL(r.url);
  if(u.origin!==location.origin)return;
  // Background refreshes are collected here and handed to waitUntil now, while the event is
  // still being dispatched (Safari can refuse waitUntil once the handler has moved on).
  let done;const bg=new Promise(res=>done=res);e.waitUntil(bg);
  // A PDF from the Library (content/pdfs/) opens in the browser's own viewer: it is a file, never the page
  const pdf=/\.pdf$/i.test(u.pathname);
  const nav=!pdf&&(r.mode==='navigate'||/\/(index\.html)?$/.test(u.pathname));
  const key=nav?new URL('./',location.href).href:u.origin+u.pathname;
  const fresh=nav||!pdf&&/\.(js|css)$|\/content\//.test(u.pathname);
  const go=async()=>{
    const c=await wait(caches.open(V),2000);
    let m=c?await wait(c.match(key),2000):null;
    if(m&&m.redirected)m=null; // Safari refuses a redirected copy for a page
    if(m&&(pdf||u.pathname.includes('/fonts/')))return m; // font files never change; a PDF is kept as first opened
    const net=()=>fetch(nav?key:u.origin+u.pathname,{cache:'no-cache',credentials:'same-origin'}).then(x=>{
      if(c&&x&&x.ok&&!x.redirected)c.put(key,x.clone()).catch(()=>{});return x}).catch(()=>null);
    // the texts (content/) wait 1 s, not 3: start-up reads the list and then every text, one wait after the other, so
    // on a weak connection the page sat hidden for 6 s with every text already saved
    if(fresh&&m){const n=net();const x=await wait(n,u.pathname.includes('/content/')?1000:3000);if(x&&x.ok)return x;done(n);return m}
    if(m){done(net());return m}
    const x=await net();if(x)return x;
    if(c&&nav){const h=await wait(c.match('./',{ignoreSearch:true}),2000);if(h)return h}
    if(pdf)return new Response('ही पीडीएफ अजून या फोनवर जतन झालेली नाही: इंटरनेट असताना एकदा उघडा.\nThis PDF is not saved on this phone yet: open it once with internet.',{status:503,headers:{'Content-Type':'text/plain; charset=utf-8'}});
    return new Response('Offline',{status:503})
  };
  e.respondWith(go().catch(()=>fetch(r)).finally(()=>setTimeout(done,0)));
});
