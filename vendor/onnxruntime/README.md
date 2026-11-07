# ONNX Runtime Web 1.30.0

Microsoft's library for running a model in the browser (MIT licence, `LICENSE`), copied here unchanged from the npm
package `onnxruntime-web@1.30.0` (`dist/`). It runs the chanting model (`models/chant-vN/`, `js/core/hearing.js`).

**The one exception to "no runtime packages" (CLAUDE.md), agreed 2026-11-05:** a model can't run in a page without a
runtime like this, and writing one is out of reach. It is kept to two files, served from this site like everything
else, with no npm, no bundler and no build step; it is loaded only when Listen is used, never with the page.

| File | What |
|---|---|
| `ort.wasm.bundle.min.mjs` | the library, with its WebAssembly loader inside: the CPU build, without WebGPU |
| `ort-wasm-simd-threaded.wasm` | its WebAssembly, 14.2 MB, handed to the library (`env.wasm.wasmBinary`); SHA-256: `3398c10d07d229bd91b364548e130e0e51a8e5704b88c7c083ebbeb78842dee2` |

The CPU build only (2026-11-07): through WebGPU an iPhone's Safari computed nonsense with the int8 model, and was
slower, so Listen never used it; the build with WebGPU (`ort.bundle.min.mjs`, `ort-wasm-simd-threaded.jsep.wasm`) was
28.3 MB. To update: `npm pack onnxruntime-web@<version>` (a version at least two weeks old), copy the same two files
from `dist/` (a WebAssembly over 20,000,000 bytes is cut with `split -b 20000000`: Cloudflare Pages serves no file
over 25 MiB; `WASM` in `js/features/listen.js` lists the pieces), and update the version and hash here and in the code.
WebAssembly needs `'wasm-unsafe-eval'` in the Content-Security-Policy (`_headers`).
