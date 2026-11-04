// The Listen test page (js/features/listen-test.js): opened only by #listen-test, it shows what the recogniser heard.
// The browser's recogniser is replaced by one that "hears" a line, so the test needs no microphone.
import { test, expect } from "@playwright/test";
import { openSite, SETUPS } from "./helpers.mjs";

test("#listen-test shows the words heard and logs every alternative; Close takes it away", async ({ page }) => {
  await page.addInitScript(() => {
    class Fake extends EventTarget {
      start() {
        setTimeout(() => {
          this.dispatchEvent(new Event("start"));
          const alt = (t, c) => ({ transcript: t, confidence: c });
          const r = Object.assign([alt("सुखकर्ता दुखहर्ता वार्ता विघ्नाची", 0.8), alt("सुख करता दुख हरता", 0.4)], { isFinal: true });
          const e = new Event("result");
          Object.assign(e, { resultIndex: 0, results: [r] });
          this.dispatchEvent(e);
        }, 10);
      }
      stop() {}
    }
    window.SpeechRecognition = window.webkitSpeechRecognition = Fake;
  });
  await openSite(page, SETUPS.marathi);
  await expect(page.getByRole("dialog", { name: "Listen test" })).toHaveCount(0);
  await page.evaluate(() => (location.hash = "#listen-test"));
  const box = page.getByRole("dialog", { name: "Listen test" });
  await expect(box).toBeVisible();
  await expect(box).toContainText("Speech recognition: available");
  await box.getByRole("button", { name: "Start listening" }).click();
  await expect(box.locator("pre")).toContainText("1. सुखकर्ता दुखहर्ता वार्ता विघ्नाची (0.80)");
  await expect(box.locator("pre")).toContainText("2. सुख करता दुख हरता (0.40)");
  await box.getByRole("button", { name: "Close" }).click();
  await expect(box).toHaveCount(0);
});
