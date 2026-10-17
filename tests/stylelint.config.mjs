// Compatibility lint for css/: any CSS feature that the oldest supported browsers (.browserslistrc)
// lack is reported, unless it is in the ignore list below because it has a fallback or degrades well.
import { readFileSync } from "node:fs";

// the support floor, shared with the JavaScript lint (eslint.config.mjs)
const browsers = readFileSync(new URL(".browserslistrc", import.meta.url), "utf8")
  .split("\n")
  .map((l) => l.replace(/#.*/, "").trim())
  .filter(Boolean);

export default {
  plugins: ["stylelint-no-unsupported-browser-features"],
  rules: {
    "plugin/no-unsupported-browser-features": [
      true,
      {
        severity: "error",
        browsers,
        ignorePartialSupport: true,
        ignore: [
          // has a fallback for iOS 15 in the "Fallbacks for browsers without color-mix()" block
          "css-color-function",
          // progressive enhancement only: where unsupported the rule is skipped and the layout still works
          "css-has",
          "css-container-queries",
          "css-content-visibility",
          "css-text-wrap-balance",
          // vendor-prefixed duplicates are present where needed
          "css-backdrop-filter",
          "css-masks",
          "text-size-adjust",
          "css-touch-action",
          "css-overscroll-behavior",
          "css-scrollbar",
          "css-initial-letter",
          "css-print-color-adjust",
          "css-page-break",
          "css-zoom",
          // @page size/margins: Safari ignores them and prints with its own margins; the print layout allows for that
          "css-paged-media",
          // grab / zoom-in cursors are a desktop nicety; other browsers show the normal cursor
          "css3-cursors-grab",
          "css3-cursors-newer",
        ],
      },
    ],
  },
};
