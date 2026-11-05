# ONNX Runtime Web 1.30.0

Microsoft's library for running a model in the browser (MIT licence, `LICENSE`), copied here unchanged from the npm
package `onnxruntime-web@1.30.0` (`dist/`). It runs the chanting model (`models/chant-vN/`, `js/core/hearing.js`).

**The one exception to "no runtime packages" (CLAUDE.md), agreed 2026-11-05:** a model can't run in a page without a
runtime like this, and writing one is out of reach. It is kept to two files, served from this site like everything
else, with no npm, no bundler and no build step; it is loaded only when Listen is used, never with the page.

| File | What |
|---|---|
| `ort.bundle.min.mjs` | the library, with its WebAssembly loader inside (runs on the CPU, or on the GPU through WebGPU) |
| `ort-wasm-simd-threaded.jsep.wasm`, `….wasm.2` | its WebAssembly, 28.3 MB, cut in two at 20,000,000 bytes: Cloudflare Pages serves no file over 25 MiB. Joined again before use and handed to the library (`env.wasm.wasmBinary`); SHA-256 of the whole: `3ad23231b5bd6d9dda55a7f84606315e0bf35b6750c28ee993c987c54cacab0f` |

To update: `npm pack onnxruntime-web@<version>` (a version at least two weeks old), copy the same files from `dist/`,
cut the `.jsep.wasm` the same way (`split -b 20000000`), and update the version and hash here and in the code.
WebAssembly needs `'wasm-unsafe-eval'` in the Content-Security-Policy (`_headers`).
