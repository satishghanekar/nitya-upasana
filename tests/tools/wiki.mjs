// The Wikipedia pages the site links to, in every language it is read in. A link names a page by its English Wikipedia
// title, as in its address: a person's or a source's in content/credits.json ("wiki": "Samarth_Ramdas"), a festival's
// or a holiday's ("wiki": "Vijayadashami"); a page with no English one, by its Wikidata item ("Q…").
// For each, this finds its Wikidata item and its page title on each Wikipedia the site can open (js/core/wiki.js
// LANGUAGES: Marathi, Hindi, English, Kannada, Telugu, Gujarati), and writes them into content/wiki.json, by
// the name the links use. The site never asks Wikipedia or Wikidata anything itself (it works offline, and its
// security policy allows no other site): js/core/wiki.js picks the page from that file, the reader's language first.
// Run after adding or changing a link: npm run wiki (from tests/; it needs the internet). tests/unit/wiki.test.mjs
// fails when a link names a page content/wiki.json lacks.
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { LANGUAGES } from "../../js/core/wiki.js";

const content = new URL("../../content/", import.meta.url);
const json = (f) => JSON.parse(readFileSync(new URL(f, content), "utf8"));
/** a file an app may not have (Sankathara Chaturthi has no festivals or holidays): its list, or none */
const listIn = (f, key) => (existsSync(new URL(f, content)) ? json(f)[key] : []);

/** A Wikidata item */
export const ITEM = /^Q[1-9][0-9]*$/;
/** The name a link uses: an English Wikipedia title as in its address (no spaces), or a Wikidata item */
export const NAME = /^[^\s/#?]+$/;

/** Every page the site links to, by the name the links use, with where each is used: the people and sources the texts
 * credit, the festivals and the holidays @returns {Map<string, string[]>} */
export function itemsUsed() {
  /** @type {Map<string, string[]>} */
  const used = new Map();
  const add = (q, where) => used.set(q, [...(used.get(q) || []), where]);
  const credits = existsSync(new URL("credits.json", content)) ? json("credits.json") : { people: {}, sources: {} };
  for (const g of ["people", "sources"]) for (const [k, e] of Object.entries(credits[g])) if (e.wiki) add(e.wiki, "credits.json " + k);
  for (const f of listIn("festivals.json", "festivals")) if (f.wiki) add(f.wiki, "festivals.json " + f.id);
  for (const h of listIn("holidays.json", "holidays")) if (h.wiki) add(h.wiki, "holidays.json " + h.id);
  return used;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
/** Wikipedia's or Wikidata's API, gently: they answer in plain text, not JSON, when asked too often, so wait and ask
 * again @param {string} host @param {Record<string, string>} params */
async function api(host, params) {
  for (let i = 0; i < 6; i++) {
    const r = await fetch("https://" + host + "/w/api.php?" + new URLSearchParams({ ...params, format: "json" }), {
      headers: { "User-Agent": "nitya-upasana-tools/1.0 (offline site; npm run wiki)" },
    });
    const t = await r.text();
    if (t.startsWith("{")) return JSON.parse(t);
    await sleep(5000 * (i + 1));
  }
  throw new Error(host + " did not answer; try again in a minute");
}

/** Each English title's Wikidata item (following a page moved or merged: its redirect) @param {string[]} names */
async function itemsOf(names) {
  /** @type {Record<string, string>} */
  const out = {};
  for (let i = 0; i < names.length; i += 50) {
    const titles = names.slice(i, i + 50).map((n) => n.replace(/_/g, " "));
    const w = await api("en.wikipedia.org", { action: "query", titles: titles.join("|"), redirects: "1", prop: "pageprops" });
    const norm = Object.fromEntries((w.query.normalized || []).map((x) => [x.from, x.to]));
    const moved = Object.fromEntries((w.query.redirects || []).map((x) => [x.from, x.to]));
    const item = Object.fromEntries(Object.values(w.query.pages).map((p) => [p.title, p.pageprops && p.pageprops.wikibase_item]));
    for (const t of titles) {
      const n = norm[t] || t;
      const q = item[moved[n] || n];
      if (!q) throw new Error("wiki:" + t.replace(/ /g, "_") + " is not a page on English Wikipedia");
      out[t.replace(/ /g, "_")] = q;
    }
    await sleep(1000);
  }
  return out;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const names = [...itemsUsed().keys()].sort();
  const langs = LANGUAGES;
  const item = { ...(await itemsOf(names.filter((n) => !ITEM.test(n)))), ...Object.fromEntries(names.filter((n) => ITEM.test(n)).map((n) => [n, n])) };
  const qs = [...new Set(Object.values(item))];
  /** @type {Record<string, Record<string, string>>} */
  const links = {};
  for (let i = 0; i < qs.length; i += 50) {
    const d = await api("www.wikidata.org", { action: "wbgetentities", ids: qs.slice(i, i + 50).join("|"), props: "sitelinks" });
    for (const q of qs.slice(i, i + 50)) links[q] = (d.entities[q] && d.entities[q].sitelinks) || {};
    await sleep(1000);
  }
  /** @type {Record<string, Record<string, string>>} */
  const pages = {};
  for (const n of names) {
    const sl = links[item[n]];
    pages[n] = { wikidata: item[n], ...Object.fromEntries(langs.filter((l) => sl[l + "wiki"]).map((l) => [l, sl[l + "wiki"].title])) };
    if (Object.keys(pages[n]).length < 2) throw new Error(n + " has no page on any of " + langs.join(", ") + " Wikipedia");
  }
  writeFileSync(new URL("wiki.json", content), JSON.stringify({ pages }, null, 1) + "\n");
  console.log("content/wiki.json: " + names.length + " pages, in " + langs.join(", ") + " where Wikipedia has them");
}
