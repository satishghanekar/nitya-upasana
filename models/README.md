# The chanting models

Each `chant-vN/` is a model that hears chanting and writes it as plain Devanagari, so the app can follow along
(Follow, Listen until 2026-11-11). They are trained, tested and packed in the shravan-model repository (`scripts/train_ctc.py`,
`scripts/export.py`, `scripts/to_site.py`), never here; only the packed folder is copied in.

| File | What |
|---|---|
| `model.onnx` (and `.2` … `.6`), or `model.ort` | the model (a CTC model, wav2vec2 base, int8 or 4-bit; `.ort` in ONNX Runtime's own format, `"format": "ort"` in `model.json`), cut into pieces of at most 20,000,000 bytes: Cloudflare Pages serves no file over 25 MiB; `model.json` lists them with each piece's SHA-256 |
| `letters.json` | each of the model's outputs as its letter: `"|"` the word break, `""` the tokens that are not letters |
| `model.json` | the pieces, the sample rate (16 kHz), the ms of sound each output covers (20), the blank and the word break |
| `check.json` | what the model gives for a check sound (its choice at each step, its scores at three steps, and each output's mean over every step): the unit tests and Follow's test compare against it |

A model is downloaded only when Follow is first used, never with the page (about 120 MB with the library).

The starting model's Hugging Face page names no licence (checked 2026-11-10); the Vakyansh project's repositories on
GitHub are MIT. These weights are fine-tuned partly on published recordings as well as the family's.

## chant-v7 and chant-v7-q4 (2026-11-21)

chant-v6's settings, trained on every recording not held out, now with a published chorus (Shant Ho Shriguru Datta, its
refrains) and RG's Martand Bavani. The same two forms, sizes and speed as chant-v6: `chant-v7` (8-bit, `.onnx`) for a
phone's CPU and `chant-v7-q4` (4-bit, `model.ort`) for its GPU. Against chant-v6 in the same form on recordings
neither trained on, at 3 s (8-bit): a temple's Lalita Sahasranama, three voices on one microphone, followed in 94 units
of 100 (87); the same temple's Pancharatnam, two voices, 4 units of 5 (3); RG's Rudrashtakam in a car 7 of 8 (5); AG's
Hanuman Chalisa every unit (41 of 42). Letters wrong within a point either way, the one-voice Lalita a point worse; found
after a jump about as often. The full table: shravan-model `results/README.md`, ctc-v7. chant-v6 is in git history (a
phone that has it downloads chant-v7 the next time Follow starts, and the old pieces are taken out of its cache).

## chant-v6 and chant-v6-q4 (2026-11-16)

chant-v4's settings, trained on every recording not held out, now with the family's Saturday and Sunday aartis,
ashtaks and stotras, the Vishnu Sahasranama and a published Ram Raksha. The same two forms, sizes and speed as chant-v4:
`chant-v6` (8-bit, `.onnx`) for a phone's CPU and `chant-v6-q4` (4-bit, `model.ort`) for its GPU. Against chant-v4
(4-bit) on recordings neither trained on: AG's Hanuman Chalisa, a voice no model had heard, followed in 41 units of 42
(39) and found after a jump 36 times in 100 (19); SG's Saturday ashtak and stotra followed in every unit (98.5%); SG's
Sunday Purusha Suktam found after a jump 96 times in 100 (80); the published Pavamana recordings found after a jump 92
times in 100 (94-95), a point more letters wrong. The full table: shravan-model `results/README.md`, chant-v6.
chant-v4 is in git history (a phone that has it downloads chant-v6 the next time Follow starts, and the old pieces are
taken out of its cache).

## chant-v4-q4 in ONNX Runtime's own format (2026-11-15)

The same 4-bit model, written as `model.ort` (`scripts/to_site.py --ort` in shravan-model: basic optimizations done
once, the rest left to the phone), which ONNX Runtime Web loads like an `.onnx`. Safari closed the page and opened it
again as Follow started, on an iPhone 16 Pro too. On the GPU's way (Chromium's software GPU) this form, with one thread
for the library there (`js/features/listen.js`), started Follow with about 100 MB less in the page (810 MB at the
peak, from 915) and 150 MB less in the GPU's process (210 MB, from 357), in half the time (0.57 s, from 1.15), and gave
the same letters for the check sound. On the CPU's way it saved nothing, so `chant-v4` stays an `.onnx`. (Its options
to use the weights where they lie, `use_ort_model_bytes_for_initializers`, can't be used: ONNX Runtime Web frees the
model's bytes once the session is made.)

## chant-v4 and chant-v4-q4 (2026-11-09)

The same model, trained on every recording not held out, in two forms: `chant-v4` (8-bit, 103 MB) for a phone's CPU and
`chant-v4-q4` (4-bit, 90 MB) for its GPU, three times quicker on an iPhone. Scores, and how to rebuild it: the
shravan-model README, "The current model".

## chant-v3 (2026-11-07)

Vakyansh's Sanskrit wav2vec2 (`Harveenchadha/vakyansh-wav2vec2-sanskrit-sam-60`) trained on the same recordings as
chant-v2. Letters wrong on recordings it never trained on: Pavamana hymns 61–63 11.9%, SG's Purusha Suktam 15.4%
(chant-v2: 24.6%), SJ's Lalita Sahasranama 38.5%; the right place found within 3 seconds, following: 100%, 100%,
96.6%. It hears 4 s of sound in about a quarter of the time Whisper took for a window, so Follow hears every half
second instead of every two (on the Mac's CPU, 4 threads: 112 ms against 398 ms).

## chant-v2 (2026-11-05, replaced)

Whisper base, 76 MB. Too slow on a phone to follow along (about 1.7 s for each 5 s window on an iPhone), and it
wrote only about 18 letters a window. In git history.
