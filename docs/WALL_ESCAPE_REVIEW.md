# Rounded-arena wall rallies

A ball could keep crossing the middle of a rounded arena between opposing walls,
never reaching a defence. A straight ball had no spin to disrupt the repeating
path. The authored reproduction made 21 wall contacts in 20 playing seconds
without reaching any bat or capsule.

Each ball now counts wall contacts since its last bat return or serve. Its first
four banks use the existing response exactly. The fifth adds 0.18 radians/second
of curve before wall grip; each further wall contact adds another 0.18 to that
nudge. Flight still decays spin normally. Existing spin direction is retained;
a straight ball chooses a repeatable direction from its stable ID. Combined
spin stays within the existing 1.8 radians/second limit, and wall response keeps
the ball's speed and inward departure. No RNG or shot-credit changes are needed.

Bat contacts, new balls, revenge serves and launches clear the wall count.
Pickups, shield contacts and other balls do not masquerade as wall banks.
Bots use the same response in their existing bounded forecasts. The rule applies
to every arena shape so another layout cannot retain the same deadlock.

## Try it

Run `./node_modules/.bin/vp dev --host 127.0.0.1 --port 5193 --strictPort`, then open
[the comparison](http://127.0.0.1:5193/wall-escape.html) or
[the game](http://127.0.0.1:5193/).

The comparison uses the actual rounded wall geometry, shared collision solver
and game renderer. Both sides have identical straight shots and frozen bats.
The labelled Before fixture suppresses only the new wall counter to reproduce
the previous response; the right side uses the fix. Pause or scrub the timeline.
This page is a development review entry and is excluded from the production
build inputs. It does not change saved progress or preferences.

On desktop and phone viewports, the fixed ball acquired spin on wall contact
five at 4.22 seconds, received stronger nudges on contacts six and seven, and
reached a bat at **6.85 seconds**. The old response remained untouched by any
defence after 20 seconds. Both captures recorded zero collision caps and browser
errors. These are authored physics fixtures and emulated viewports, not a claim
about physical-device performance or every possible natural rally.

- [Desktop comparison](reviews/wall-escape/desktop.png)
- [Phone comparison](reviews/wall-escape/phone.png)
- [Recorded wall times and spin](reviews/wall-escape/comparison.json)
- [Reviewed deterministic trace digests](reviews/wall-escape/replay-digests.json)

## Validation

The new regression tests first reproduced the missing fifth-bounce spin and
20-second deadlock before the fix. Coverage now includes the threshold, growing
nudges through decay, spin/speed bounds, both signed directions, reset paths,
per-ball independence, pickup/shield exclusions, immutable deterministic steps,
both collision solvers and bot forecast parity.

Historical collision logs remain identical up to the first fifth-wall contact;
cases without one retain their original trace digests. New digests cover the
intentionally changed later banks, including corner, grazing and dense ball
contacts, at 30/60/144 rendering FPS. The old golden logs remain intact.

The gameplay change can shorten seeded teaser matches. Delivered video and
screenshots are unchanged, and their reproduction notes identify commit
`e8849c4` for exact historical footage. Media selection and export checks are
manual work and do not gate the game test suite or CI/CD.

Final checks pass: 794 unit tests across 135 files, `vp check`, Pages and itch
production builds, six native-Chromium serving/version browser checks, and the
rendered desktop/phone comparison. Builds retain the existing large-chunk
advisory. After the CI test-scope correction, the default run passes 771 tests;
eight longer soak cases are opt-in and teaser tests are removed. The owner
subsequently authorised committing and pushing both corrections. The preceding
media and 1.0.1 version checkpoint is `e8849c4`; remote workflow outcomes require
separate verification after the push.
