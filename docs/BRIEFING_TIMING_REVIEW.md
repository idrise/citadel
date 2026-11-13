# Reading time before the first ball

Level introductions now calculate their duration from the complete visible copy: level heading, up to two challenge changes, any completed-demotion notice and the next-loss consequence. Desktop and wrapped phone layouts share that copy, so wrapping does not count words twice.

## Calculation

Use **180 words per minute (3 words/second)** as the reading baseline. [Ofcom's access-services guidelines, paragraph 1.20](https://www.ofcom.org.uk/siteassets/resources/documents/consultations/category-2-6-weeks/178126-review-of-access-services-code/associated-documents/provision-of-tv-access-services-guideline.pdf) put normal prerecorded subtitle presentation at 160–180 words/minute. This is a practical reference for short screen text, not a claim that everyone reads a game briefing at one speed.

The game adds its own allowances:

`total = round up to 0.25s (0.4s rise + max(2s, 0.5s notice + words / 3) + 0.45s sink)`

Animations sit outside the fully raised reading hold. Reduced motion retains the full duration. Pause freezes the authoritative countdown. Longer demotion copy receives more time instead of being truncated by a maximum duration.

| Copy                                                   | Words | Total duration |
| ------------------------------------------------------ | ----- | -------------- |
| Level 08 / Extra ball / Loss drops to Level 07         | 9     | 4.50s          |
| Level 08 / Extra ball / Loss retries Level 08          | 8     | 4.25s          |
| Level 08 retry / Loss drops to Level 07                | 7     | 3.75s          |
| Level 01 / One ball - wide bat / Level 01 is the floor | 11    | 5.25s          |
| The level-one introduction plus Demoted from 02        | 14    | 6.25s          |

This extends **pregame countdown**, rather than painting a long message over live action. Balls remain ready, the playing clock stays at zero, pickups do not fall, and rally/serve ages do not advance until the reading window finishes. Bat steering during the introduction remains available. The existing quarter-second serve arming window still follows the start of play.

## Testing without the system mouse

All browser specs now import `tests/fixtures.ts`. It installs a test-only document hook before the game loads; it is not part of the game bundle. Pointer lock, fullscreen and finger capture are virtual state inside the test page. `window.__citadelTestInput` dispatches relative movement, keys, clicks and touch events through the normal adapters. Automated movement uses the hook instead of `page.mouse`.

Unit tests spy on the native browser methods and verify zero native capture/fullscreen calls while exercising the real desktop adapter. A guard checks every browser spec uses the isolated fixture and rejects direct `page.mouse` usage. Real hardware capture/fullscreen remains a manual check; these tests cover the adapter/session contract with virtual browser state.

## Evidence and validation

The [render report](reviews/m09/briefing-timing/report.json) includes six desktop/phone poses across 2/4/6 players, captured just before sinking, 4–4.75 seconds after Start. The [phone timing clip](reviews/m09/briefing-timing/phone-reading-window.webm) shows the rise, reading hold and sink. These are authored fixtures using the actual countdown renderer. Browser timing tests separately check real session launch, unchanged playing time, ready balls and pause/resume.

**463 unit tests across 75 files pass.** All **65 root browser scenarios** have passing coverage: 60/65 on the first complete isolated run, followed by 5/5 on the corrected selection. Those five corrections cover resetting the virtual cursor for each capture, setting up an unclamped 100px flick, waiting for playing time before ball/pickup assertions and allowing the text-dependent countdown in a real-time audio-failure test. The final **21/21 Pages checks** pass. Both production bases build, and the test hook is confirmed absent from production bundles. Changed-code/document format, lint, type and diff checks pass. A native-input test run was stopped when the owner reported mouse disruption. Test corrections after lengthening the countdown include waiting for the actual introduction instead of fixed 1.8-second delays, allowing the existing serve arming window, valid saved-history fixtures and using the desktop pause shortcut in desktop checks. The isolated input suite replaces that interrupted run; it does not count the interrupted tests as passes.

The owner's concurrent TODO edits are preserved. Global `vp check` reports formatting in that unrelated file; scoped checks cover the changed code, tests, tooling and review docs. Physical phone readability remains for hands-on review, and the existing ~970kB main-chunk advisory remains.

Local demo: `http://localhost:5177/`.

**REVIEW REQUIRED — M09**
