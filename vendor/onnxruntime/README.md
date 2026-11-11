# ONNX Runtime Web 1.30.0

Microsoft's library for running a model in the browser (MIT licence, `LICENSE`), copied here unchanged from the npm
package `onnxruntime-web@1.30.0` (`dist/`). It runs the chanting model (`models/chant-vN/`, `js/core/hearing.js`).

**The one exception to "no runtime packages" (CLAUDE.md), agreed 2026-11-05:** a model can't run in a page without a
runtime like this, and writing one is out of reach. It is kept to two builds, served from this site like everything
else, with no npm, no bundler and no build step; it is loaded only when Follow (Listen until 2026-11-11) is used, never with the page, and a
phone downloads only the build it uses (`WAYS` in `js/features/listen.js`).

| File | What |
|---|---|
| `ort.wasm.bundle.min.mjs` | the library, with its WebAssembly loader inside: the CPU build, without WebGPU |
| `ort-wasm-simd-threaded.wasm` | its WebAssembly, 14.2 MB, handed to the library (`env.wasm.wasmBinary`); SHA-256: `3398c10d07d229bd91b364548e130e0e51a8e5704b88c7c083ebbeb78842dee2` |
| `ort.webgpu.bundle.min.mjs` | the WebGPU build, with its loader inside: for a phone whose browser has WebGPU |
| `ort-wasm-simd-threaded.asyncify.wasm`, `….wasm.2` | its WebAssembly, 26.8 MB in two pieces; SHA-256 of the whole: `39f9f0894d478800487ed9f7dbe92618498db320cf55c8e3d89adff8dce658da` |

The WebGPU build again (2026-11-09): on an iPhone (Safari 27) the 4-bit model (`models/chant-v4-q4/`) took 233 ms a
hearing on the GPU against 712 ms for the 8-bit model on the CPU, and picked the same letters as the model's Python
side. (On 2026-11-07 the older WebGPU build, `ort.bundle.min.mjs` with `ort-wasm-simd-threaded.jsep.wasm`, computed
nonsense with the 8-bit model on an iPhone and was slower, so Listen had used the CPU build only.) To update:
`npm pack onnxruntime-web@<version>` (a version at least two weeks old), copy the same files from `dist/` (a
WebAssembly over 20,000,000 bytes is cut with `split -b 20000000`: Cloudflare Pages serves no file over 25 MiB; `WAYS`
in `js/features/listen.js` lists the pieces), and update the version and hashes here and in the code.
WebAssembly needs `'wasm-unsafe-eval'` in the Content-Security-Policy (`_headers`).
