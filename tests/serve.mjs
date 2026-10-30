// A tiny static server for the tests (no dependencies). It serves the repository root exactly as
// Cloudflare Pages does: the files as they are, no build step, text compressed. Port: PORT or 4173.
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";

const ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));
const PORT = Number(process.env.PORT || 4173);
// the Content-Security-Policy _headers gives every file (Cloudflare Pages sends it), so the tests run under it too
const CSP = (/^\/\*\n(?:  .*\n)*?  Content-Security-Policy: (.+)$/m.exec(await readFile(join(ROOT, "_headers"), "utf8")) || [])[1];
const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".woff2": "font/woff2",
  ".pdf": "application/pdf",
};

createServer(async (req, res) => {
  try {
    let path = decodeURIComponent(new URL(req.url, "http://x").pathname);
    if (path.endsWith("/")) path += "index.html";
    const file = normalize(join(ROOT, path));
    // never serve anything outside the repository, nor the test tooling itself
    if (!file.startsWith(ROOT) || /[\\/](node_modules|\.git)[\\/]/.test(file)) throw new Error("forbidden");
    if (!(await stat(file)).isFile()) throw new Error("not a file");
    const type = TYPES[extname(file)] || "application/octet-stream";
    let body = await readFile(file);
    const headers = { "Content-Type": type, "Cache-Control": "no-cache" };
    if (CSP) headers["Content-Security-Policy"] = CSP;
    // Cloudflare compresses text files, so Lighthouse here should see the same transfer sizes
    if (/^(text|application\/(json|manifest))|svg/.test(type) && /\bgzip\b/.test(req.headers["accept-encoding"] || "")) {
      body = gzipSync(body);
      headers["Content-Encoding"] = "gzip";
      headers["Vary"] = "Accept-Encoding";
    }
    res.writeHead(200, headers);
    res.end(body);
  } catch {
    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("Not found");
  }
}).listen(PORT, () => console.log(`Serving ${ROOT} at http://localhost:${PORT}/`));
