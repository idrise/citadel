# M08 — desktop MVP candidate

**Current presentation:** [procedural scene title, victory fireworks and ownership feedback](SCENE_PRESENTATION_REVIEW.md)
replaces the landing/result panels described in this original handoff. Advanced
settings remain in Pause by the user's choice. Current checks and media are in that review.

Status: **Awaiting review**, 11 November 2026. The local desktop implementation
and scripted gate are ready. External tester feedback, a public deployment and
the decision to proceed to mobile remain pending; this is not an approved release.

## Delivered

- Minimal Play landing menu with quick 2–6-player selection. Settings retain
  fortress, difficulty, assistance, music and effects choices. How to play and
  version/build information stay in menus; active gameplay remains pure canvas.
- Restart preserves the opening seed; Rematch advances it and resets counters.
  Results show personal returns, rival pieces broken, survival time and standings.
- Versioned, validated local preferences survive refresh. Corrupt, unsupported,
  blocked and quota-limited storage fall back safely. No account or telemetry.
- **Export round** in pause/results downloads JSON on click. It includes version,
  seed, initial/current settings, duration, standings, personal returns/damage,
  eliminations, peak balls and collision-cap diagnostics. It is a local summary,
  not an input replay, and uploads nothing. Read-only event attribution also fixes
  success audio without adding a simulation dependency.
- Version **0.1.0**; CI builds embed the short `GITHUB_SHA`, local builds say
  `local`. No dependencies or external assets added.

[Start](reviews/m08/desktop-start.png) · [Help](reviews/m08/desktop-help.png) ·
[Settings](reviews/m08/desktop-settings.png) · [Results](reviews/m08/desktop-results.png) ·
[32-second native gameplay with sound](reviews/m08/desktop-gameplay.mp4).
The game capture uses the default 15-second additions/four-ball cap with ordinary
player inputs and no state editing. It is demonstration evidence, not a skill or
retention study. [Capture log](reviews/m08/desktop-capture.json).

## Fresh six-seat acceptance round

The new production-browser test opens `/citadel/` in a fresh desktop context,
chooses six players and human seat 5, opens help, starts via keyboard activation
with pointer capture, steers through ordinary input, lets the actual match finish,
downloads its result and rematches. No state edits, account or backend.

[Exported result](reviews/m08/six-seat-round.json): seed 2026, **67.69 playing
seconds**, winner seat 0, 47 pieces lost, 73 returns, peak four balls and **zero
collision caps**. The scripted human seat placed fifth, survived **57.58s**, made
six returns and broke five rival pieces. Per-seat lost counts reconcile with
global damage. Rematch resets counters and retains the roster.

This uses emulated browser time and sparse scripted input; music is muted and
reduced effects is on for repeatability. It is a completed one-human-seat versus
five-bot flow, **not a human playtest** and not evidence for the two-minute pacing
target. Separate native gameplay and audio renders cover presentation.

## Checks actually run

- Vite+ formatting, lint and strict TypeScript checks pass without warnings.
- **258 unit tests / 44 files pass**. Covers preferences, export isolation and
  attribution, lifecycle and pooled effects alongside physics/rules/replay.
- **25 production native Chromium checks pass** using the actual project base.
  New checks cover completed six-seat export/rematch, reload persistence, all
  three quality modes with no HUD, blocked storage and an ongoing game after
  network disconnection. Existing tests include twelve complete scripted rounds
  across 2–6 seats, captured controls, pause/focus and actual audio pause/mute.
- Three focused software-WebGL checks pass across an initial run and a rerun.
  The quality smoke test originally timed out at 60s; its countdown now uses Low,
  followed by bounded full-preset samples and a 180s allowance. It also asserts
  actual simulation progress after disconnection. Full-size bloom and camera
  independence pass on software WebGL; the full software suite remains unverified.
- Pages build passes: initial JS **907.55 kB / 249.25 kB gzip**; lazy Tone chunk
  **272.98 kB / 66.93 kB gzip**. Existing >500 kB chunk warning remains.
- M07's [review](M07_REVIEW.md) records matched 2/4/6 edge captures, isolated audio
  and the native frame-time sample. Browser capture has no breaking console
  errors; existing shadow fallback and Tone timing advisories remain.

## Pages readiness and publishing status

The actual remote is `idrise/citadel`, default branch `main`. Read-only
[repository metadata](https://api.github.com/repos/idrise/citadel) reported
`has_pages: false` on 11 November 2026. There is no enabled public Pages build to
validate. No repository settings, remote refs or workflows were triggered.

The existing workflow remains suitable: default-branch push/manual triggers,
Configure Pages supplies the base path, checks/tests/build/browser validation
precede upload, deploy requires the build, and only deploy receives `pages:write`
and `id-token:write` in the `github-pages` environment. These follow
[GitHub's custom workflow requirements](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages).
All referenced action tags were verified to exist: checkout v7.0.1, setup-vp
v1.22.0, configure-pages v6.0.0, upload-pages-artifact v5.0.0 and deploy-pages
v5.0.1. No speculative workflow upgrade was needed. `/citadel/` assets and flows
were tested from a production preview, not just Vite's development root.

Publishing still requires the repository's one-time Pages source configuration
and an explicitly authorised push or manual deployment. This task has made local
commits only; no `gh`, push or deployment. No extra release approval mechanism was
added. Once published, repeat the fresh URL / Play / complete round / Rematch /
export check on the actual site before calling that acceptance item complete.

## Review and next step

Local implementation checkpoints: `f729bd1` scoring sounds/attribution,
`0c84d6b` M07 edges/effects, `c916b98` M08 menus/preferences/export. The evidence
and software-test budget adjustment are recorded in the accompanying review commit.

Use [PLAYTEST.md](PLAYTEST.md) for recorded feedback, exact reproduction commands
and the optional three-round tester protocol. No external testers were contacted
or invented. M06's comparative pacing study remains unstarted. M09/mobile is not
authorised by this handoff.

Try a scored bank shot, compare its sound with your own breach, watch the left
outer-wall diagonals, then finish and export a six-player round. Human decisions
still needed: edge fidelity at speed, whether the score feels rewarding, and
whether the core loop earns more scope.

**REVIEW REQUIRED — M08.**
