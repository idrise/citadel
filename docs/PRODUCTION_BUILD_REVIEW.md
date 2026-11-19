# Production optimisation audit — 19 November

The live site redirects from the repository Pages URL to
https://citadel.davidjelliott.com/. Its downloaded entry is minified and includes
production React error messages, with no React development/DevTools marker, HMR
client or source map reference. At audit time it serves revision `9b9366b`, build
`3f8796979c3490e1`; it does not contain the newer local CI/diagnostic hardening.
See [the recorded audit](reviews/m09/production-build/audit.json) for the exact
asset URL and resolved release configuration.

The standard compiler optimisations were already active. They are now explicit:
OXC JavaScript minification, CSS minification/splitting, tree shaking, no source
maps, and the existing modern-browser compatibility target. Both Actions workflows
already force production mode and NODE_ENV=production. The browser startup gate
now inspects entry and preloaded chunks for development React or HMR, alongside
the existing Settings checks.

One avoidable runtime cost remained: all sessions allocated the rolling 1,800-frame
recorder, captured per-frame evidence/markers and constructed pause snapshots even
with Report/Test hidden. Release sessions now create no recorder, retain no debug
frame/marker/spike buffers, take no diagnostic pause snapshot and expose no
`__citadelPerformance` hook. Development and local-debug keep those facilities.
Unit coverage verifies disabled capture does not even construct/validate a buffer,
while enabled local capture remains bounded and independently owned.

Timing required by adaptive resolution remains. The existing quality slider,
mobile pixel-ratio/sample budgets, shadow-map disablement, pooled effects and lazy
Tone-engine loading remain. High graphics still intentionally enables bloom and
reflections; build optimisation does not make those effects free. No gameplay,
fixed simulation rate, audio settings or default quality has changed.

Validation: all 714 unit tests/124 files and format/lint/types pass. Root release
and optimised local builds pass with the existing large-chunk advisory. Five
release Chromium checks cover the capture hook's absence, clean production assets,
startup/refresh, real play/pause and desktop/touch settings. Three local checks
confirm the hook exists and real frame capture, report download and Test navigation
still work. Adaptive-resolution unit checks pass. Browser device layouts use the
host GPU; physical devices and the reported Windows machine remain unverified.

This removes debug work; it is not a measured FPS claim or a guarantee against
all browser/GPU issues. Large music/Three chunks still trigger the build advisory.
The live-site observations predate these local changes. No push, remote workflow
or deployment was performed. M09 remains awaiting review.

Local diagnostic demo: http://127.0.0.1:5182/. Rebuild it using `pnpm build:local`
and `pnpm preview:local`. The capture guide now uses that optimised diagnostic
build rather than asking the public release for a disabled hook.

REVIEW REQUIRED — M09.
