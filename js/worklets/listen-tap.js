// @ts-check
// Listen's microphone tap (js/features/listen.js): an AudioWorklet, run on the phone's sound thread, so no sound is
// lost while the model is busy on the page's own thread (a ScriptProcessor, run there, drops what comes meanwhile).
// It hands the sound on in pieces of 4096 samples. Loaded only when Listen starts, so it is not in js/parts.js; it is
// kept for offline use with the model, in the "nitya-listen" cache (sw.js).

/** @type {any} */ var g = globalThis;

g.registerProcessor(
  "listen-tap",
  class extends g.AudioWorkletProcessor {
    constructor() {
      super();
      this.buf = new Float32Array(4096);
      this.n = 0;
    }
    /** @param {Float32Array[][]} inputs */
    process(inputs) {
      var ch = inputs[0] && inputs[0][0];
      if (ch)
        for (var i = 0; i < ch.length; i++) {
          this.buf[this.n++] = ch[i];
          if (this.n === this.buf.length) {
            this.port.postMessage(this.buf);
            this.buf = new Float32Array(4096);
            this.n = 0;
          }
        }
      return true;
    }
  },
);
