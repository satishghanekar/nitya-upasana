# v2 mockups (Step 2)

Static pages for choosing a design. **Not app code**: no logic, sample data only, and nothing links to them from the site. The text lines shown come from `tests/unit/fixtures/pieces.js` (the texts as they were before they became files in `content/texts/`; identical to them, as `tests/unit/content.test.mjs` proves), never retyped.

| Page | What it shows |
|---|---|
| `today-a.html`, `today-b.html`, `today-c.html` | Today page: A paper card, B family first, C whole day at a glance |
| `reading-a.html`, `reading-b.html` | Reading view: A one text at a time, B whole session in one scroll |
| `recital.html` | Recital mode (goes with either reading view) |
| `home-v3.html` | Home v3 sheet: Morning / Afternoon / Evening switch (A segmented, B chips with counts), only that day's texts, App/Share/QR/Print/Help under “More”. `?f=mon-am` etc. shows one phone |
| `builder-a.html`, `builder-b.html` | Routine builder: A list with move buttons, B week grid |

Add `?dark` to an address for the dark theme. Live at nitya-upasana.pages.dev/mockups/ (not linked from the app). They will be deleted once a design is chosen and built.
