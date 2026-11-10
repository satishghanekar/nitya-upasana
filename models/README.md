# The chanting models

Each `chant-vN/` is a model that hears chanting and writes it as plain Devanagari, so the app can follow along
(Listen). They are trained, tested and packed in the shravan-model repository (`scripts/train_ctc.py`,
`scripts/export.py`, `scripts/to_site.py`), never here; only the packed folder is copied in.

| File | What |
|---|---|
| `model.onnx` (and `.2` … `.6`) | the model (a CTC model, wav2vec2 base, int8), cut into pieces of at most 20,000,000 bytes: Cloudflare Pages serves no file over 25 MiB; `model.json` lists them with each piece's SHA-256 |
| `letters.json` | each of the model's outputs as its letter: `"|"` the word break, `""` the tokens that are not letters |
| `model.json` | the pieces, the sample rate (16 kHz), the ms of sound each output covers (20), the blank and the word break |
| `check.json` | what the model gives for a check sound (its choice at each step, its scores at three steps, and each output's mean over every step): the unit tests and Listen's test compare against it |

A model is downloaded only when Listen is first used, never with the page (about 120 MB with the library).

The starting model's Hugging Face page names no licence (checked 2026-11-10); the Vakyansh project's repositories on
GitHub are MIT. These weights are fine-tuned partly on published recordings as well as the family's.

## chant-v4 and chant-v4-q4 (2026-11-09)

The same model, trained on every recording not held out, in two forms: `chant-v4` (8-bit, 103 MB) for a phone's CPU and
`chant-v4-q4` (4-bit, 90 MB) for its GPU, three times quicker on an iPhone. Scores, and how to rebuild it: the
shravan-model README, "The current model".

## chant-v3 (2026-11-07)

Vakyansh's Sanskrit wav2vec2 (`Harveenchadha/vakyansh-wav2vec2-sanskrit-sam-60`) trained on the same recordings as
chant-v2. Letters wrong on recordings it never trained on: Pavamana hymns 61–63 11.9%, SG's Purusha Suktam 15.4%
(chant-v2: 24.6%), SJ's Lalita Sahasranama 38.5%; the right place found within 3 seconds, following: 100%, 100%,
96.6%. It hears 4 s of sound in about a quarter of the time Whisper took for a window, so Listen hears every half
second instead of every two (on the Mac's CPU, 4 threads: 112 ms against 398 ms).

## chant-v2 (2026-11-05, replaced)

Whisper base, 76 MB. Too slow on a phone to follow along (about 1.7 s for each 5 s window on an iPhone), and it
wrote only about 18 letters a window. In git history.
