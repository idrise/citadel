# Settings Restart

The scene-rendered Settings panel now offers **Resume** and **Restart** side by side. Restart returns directly to the title screen with a fresh attempt ready. It retains the saved level, selected player count, fortress and settings; abandoning an unfinished attempt does not add a loss. Capture, steering, timers and round statistics reset. The canvas stays mounted and the board uses its existing transition. Restart from a debug challenge exits debug mode and restores the real saved level.

[Desktop panel](reviews/m09/settings-restart/desktop-restart.png), [phone panel](reviews/m09/settings-restart/phone-restart.png), and [landscape panel](reviews/m09/settings-restart/touch-settings-844.png). The buttons share the existing bottom action row, keep separate 44px-tall hit targets, and use the same procedural lettering as the rest of Settings.

All **522 unit tests / 92 files**, full-repository **`vp check`**, and the root production build pass. Unit coverage checks button eligibility, separation and projected geometry/target alignment through rotation. All 21 selected production Chromium checks pass. Four final Settings checks additionally verify keyboard/touch activation, unchanged saved progress/choices, zeroed live state, a playable new attempt on the same canvas, and debug exit. The rotated capture waits for a frame after resize-buffer clearing.

The exact Pages viewport/refresh smoke case also passes with the software-WebGL renderer used in CI. The CI failure reported by the owner was formatting in `bot-serving/report.json`; local commit `e3a738c` reformats it with no parsed-data changes. No workflow change or remote rerun was made. Physical-device Safari validation and the existing large-bundle advisory remain open.

Refresh **http://localhost:5179/**. Pause an attempt, choose **Restart**, then **Start** to try again. All changes are local; nothing has been pushed or deployed.

**REVIEW REQUIRED — M09**
