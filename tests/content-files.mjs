// The site's content as the tests read it, in one place: content/library.json (the categories, each with its texts in
// reading order), content/timing.json (the chanting paces, where the app has them), content/credits.json,
// content/wiki.json, each text's file, and CONTENT built from them by the site's own code (js/text/content.js), as js/text/load.js builds it in the page. The unit tests and the browser tests
// import these, so none reads the files its own way.
import { existsSync, readFileSync } from "node:fs";
import { buildContent } from "../js/text/content.js";
import { menuWords } from "../js/core/strings.js";

const read = (p) => readFileSync(new URL("../content/" + p, import.meta.url), "utf8");

/** content/library.json */
export const LIBRARY = JSON.parse(read("library.json"));
/** content/timing.json: the chanting paces (null in an app without them, Sankathara Chaturthi) */
export const TIMING = existsSync(new URL("../content/timing.json", import.meta.url)) ? JSON.parse(read("timing.json")) : null;
/** every text's id, in reading order */
export const IDS = LIBRARY.categories.flatMap((c) => c.texts);
/** the other versions of a text sung in more than one way (library.json "versions"), each a file of its own */
export const VERSION_IDS = Object.values(LIBRARY.versions || {}).flat();
/** each text's file, by id, the other versions' too */
export const FILES = Object.fromEntries(IDS.concat(VERSION_IDS).map((id) => [id, read("texts/" + id + ".txt")]));
/** content/wiki.json: each page a link names, and its title on each Wikipedia */
export const WIKI = JSON.parse(read("wiki.json"));
/** content/credits.json: who and what the texts come from */
export const CREDITS = JSON.parse(read("credits.json"));
/** CONTENT, as the page builds it */
export const CONTENT = buildContent(LIBRARY, FILES, { wiki: WIKI, credits: CREDITS, words: menuWords, timing: TIMING });
/** each text's facts (its header, its category from the library), in reading order */
export const TEXTS = IDS.map((id) => CONTENT.texts[id]);
/** the bundled categories, numbered in order, as js/core/library.js takes them */
export const CATEGORIES = LIBRARY.categories.map((c, i) => ({ id: c.id, name: c.name, order: i + 1 }));
/** every piece, by text id */
export const PIECES = Object.fromEntries(CONTENT.categories.flatMap((c) => c.pieces).map((p) => [p.text, p]));
