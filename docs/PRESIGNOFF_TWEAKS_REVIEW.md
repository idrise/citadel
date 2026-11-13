# Pre-signoff TODO tweaks

The five new TODO entries are authorised for incremental local review. The owner selected symmetrical level-specific shapes. M09 remains awaiting review; these tweaks do not authorise publishing or a later milestone.

## 1. Elimination feedback — ready for review

Every eliminated fortress now produces a larger pooled breakup: glowing solid fragments, a brief local core and an expanding ground shockwave. Twelve/22/32 instanced fragments follow the effect budget; reduced motion retains a quieter stationary fading ring. Effects freeze on pause, expire in 1.25 seconds and clear on a new round.

A generated low bass impact and filtered brown noise replace the small elimination tone. There are no recorded sound assets. Simultaneous deaths coalesce the monophonic impact; mute, volume, existing audio scheduling and the limiter remain in place. [Rival eliminated](reviews/m09/elimination/rival-eliminated.wav) and [player loss](reviews/m09/elimination/player-loss.wav) are review exports, not runtime assets. Both actual-graph renders are audible and peak below 0.32 without browser errors.

A kill credited to the human's last-struck ball triggers three short victory-style fireworks above the eliminated side. Bank shots retain credit; bot kills and self eliminations do not trigger the player reward. The existing four-burst firework pool is reused. A final winning kill proceeds into the full victory celebration.

[Desktop player kill](reviews/m09/elimination/desktop-4-player.png), [phone player kill](reviews/m09/elimination/phone-6-player.png), [bot kill](reviews/m09/elimination/desktop-4-bot.png), and [reduced effects](reviews/m09/elimination/phone-4-player-reduced.png) are authored real last-container impacts through damage, attribution and presentation code. Ten renders cover desktop/phone 2/4/6, bot credit and reduced effects. Their [report](reviews/m09/elimination/report.json) records zero browser errors and collision caps.

Unit tests cover pool bounds, event immutability, pause/expiry/reset, reduced and low budgets, last-striker attribution through banks, the short firework lifecycle and synth scheduling/coalescing/disposal. Final check counts are recorded in PLAN.md.

## Remaining entries

- Paddle front curvature and skill-based impact aiming.
- Held-ball threat presentation.
- Continuous transitions between title, live board and victory star.
- Symmetrical level-specific arena variants.

Local demo: `http://localhost:5177/`.

**REVIEW REQUIRED — M09**
