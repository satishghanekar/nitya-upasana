// @ts-check
// Checks every recording a text links to (the "recording:" header line, YouTube only): each video is still there,
// with its title and channel, and lists the second each text starts at. YouTube's oEmbed answers for a public video
// and fails for one removed or made private. Run now and then (it needs the internet, unlike the tests):
// cd tests && npm run recordings
import { readdirSync, readFileSync } from "node:fs";

const dir = new URL("../../content/texts/", import.meta.url);
const links = [];
for (const f of readdirSync(dir).filter((n) => n.endsWith(".txt"))) {
  const line = readFileSync(new URL(f, dir), "utf8")
    .split("\n")
    .find((l) => l.startsWith("recording: "));
  if (!line) continue;
  for (const m of line.matchAll(/\[([^\]]+)\]\((https:\/\/www\.youtube\.com\/watch\?v=([\w-]{11})(?:&t=(\d+))?)\)/g))
    links.push({ text: f.replace(/\.txt$/, ""), who: m[1], url: m[2], id: m[3], at: Number(m[4] || 0) });
}
let bad = 0;
for (const l of links) {
  const r = await fetch("https://www.youtube.com/oembed?format=json&url=" + encodeURIComponent("https://www.youtube.com/watch?v=" + l.id));
  const at = Math.floor(l.at / 60) + ":" + String(l.at % 60).padStart(2, "0");
  if (r.ok) {
    const d = await r.json();
    console.warn("ok   " + l.text + " (" + l.who + ", from " + at + "): " + d.title + " | " + d.author_name);
  } else {
    bad++;
    console.error("GONE " + l.text + " (" + l.who + "): " + l.url + " answered " + r.status);
  }
}
console.warn(links.length + " recordings, " + bad + " gone");
process.exitCode = bad ? 1 : 0;
