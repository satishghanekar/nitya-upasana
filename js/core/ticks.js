// @ts-check
// Each person's ticks (which texts of each session were ticked, by day) are kept in their profile as checklist
// (Profile.checklist, js/store/profiles.js) and carried in backups. Home no longer shows or sets ticks.
//
// The shape: { "date": "2026-10-18", "done": { "evening": ["aarti-sukhkarta", …] } }. Before profiles (version 1.3)
// the ticks were kept in localStorage["nitya-ticks"] as { "v": 1, "profiles": { "family": <that shape> } }; the
// first visit after moves those ticks to the first profile (startPlan, js/store/profiles.js).

export const TICKS_KEY = "nitya-ticks";
export const PROFILE = "family";
