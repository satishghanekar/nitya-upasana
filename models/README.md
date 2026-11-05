# The chanting models

Each `chant-vN/` is a model that hears chanting and writes it as plain Devanagari, so the app can follow along
(Listen). They are trained, tested and packed in the shravan-model repository (`scripts/export.py`,
`scripts/to_site.py`), never here; only the packed folder is copied in.

| File | What |
|---|---|
| `encoder.onnx`, `decoder.onnx` (and `.2`, `.3`) | the model (Whisper base, int8), cut into pieces of at most 20,000,000 bytes: Cloudflare Pages serves no file over 25 MiB; `model.json` lists them with each piece's SHA-256 |
| `mel.bin` | the 80 mel filters (float32, 201 × 80): sound into the model's input (`js/core/hearing.js`) |
| `tokens.json` | each token's text: the model's output into letters |
| `model.json` | the pieces, the sound settings, the tokens it starts with, ends on and never writes |
| `check.json` | what a check sound must give (sound features, tokens, text): the unit tests and Listen's check compare against it |

A model is downloaded only when Listen is first used, never with the page (76 MB).

## chant-v2 (2026-11-05)

Trained on a published Pavamana Suktam recording and SG's recordings at home. On recordings it never trained on, the
right place found within 3 seconds, following: SG's Purusha Suktam 100%, SJ's Lalita Sahasranama 96.6%, Pavamana
hymns 61–63 98.7%.
