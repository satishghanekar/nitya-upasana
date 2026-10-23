# Manual checks for a release

Automation covers the engines (Chromium, Firefox, WebKit) and emulated phones and tablets. These need a real device or a person, and take about 20 minutes. Tick them on the pull request.

## Devices

| Device | Browser | Check |
|---|---|---|
| iPhone (current iOS) | Safari | Open, Add to Home Screen, open from the icon, turn on Airplane mode and reopen. Print (⋯ More) → pick a few texts → Save as PDF in Portrait and in Landscape; the contents numbers match. From the Home Screen app, Print goes to Open in Safari, and the choices carry over (a Routine printout too: page 1 shows the week at a glance). |
| iPhone with a notch or Dynamic Island | Safari | **Pinch** (the tests can only simulate it in Chromium): on a verse the text grows and shrinks and the page never zooms; on Home nothing happens; the size bubble and then Default size appear below the top bar, also at the very end of a piece, and Default size can be tapped. Turn the phone sideways: Help's ✕, the picture's ✕ and the bottom bar buttons are clear of the notch, and Home is in two columns. |
| iPhone | WhatsApp link preview and in-app viewer | The preview shows the picture and title; the page opens and reads. |
| Older iPad or iPhone on iOS 15 | Safari | Home, the session switch, Settings switches (on/off visible), the calendar and the search highlight all show their colours. |
| Android phone | Chrome | Install from the App button; reopen offline; pinch; Print → Save as PDF (A4). Settings → About shows the version and "Offline ready"; a tap on it shows Checking…, then Up to date. |
| Android phone | Samsung Internet | Opens and reads; Settings; dark theme. |
| Windows PC | Edge | Home's column and the text beside it sit right (the scrollbar doesn't push them); Ctrl + / −; Print (Letter) in Portrait and in Landscape. Settings → Accessibility → Contrast themes on: buttons, icons and the focus ring stay visible. |
| Mac | Safari | Print → PDF in Portrait and in Landscape (pick Landscape in Safari's dialog too); a changed print Language, Font or Dhrupad prints, and the reading page keeps its own; File → Add to Dock. |
| iPad | Safari | Upright: Home with the picture large on top. Sideways: Home stays on the left while a text is read on the right. Print from the Home Screen app goes to Open in Safari. |
| Large monitor (≥ 2560 px) | any | The page uses the width without stretching lines. |

## Screen readers

| Reader | Check |
|---|---|
| VoiceOver (iPhone) | Swipe through Home and an aarti: Marathi lines read in a Marathi or Hindi voice, English lines in English. Fold states are announced ("collapsed / expanded"). |
| VoiceOver (iPhone) | Home: Morning, Afternoon and Evening are read as tabs, the one picked as selected; a title opens the session in one scroll; Next and Prev move through the session and never leave it. |
| TalkBack (Android) | Same as above; the bottom bar buttons have names. |
| VoiceOver (Mac) or NVDA (Windows) | Tab through Settings to the end and back; Escape closes it and returns to the ⚙ button. Search: results are announced. |

## Keyboard only (any computer)

The first Tab shows "Skip to the texts". Every button can be reached and used with Tab, Enter and Escape, and the focus ring is always visible.
