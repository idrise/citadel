# Louder, distinct wall and paddle feedback

12 November 2026: the owner requested more audible effects and distinct wall/bat
bounces. Wall collisions now use a dedicated short, low FM knock; paddle returns
use a separate, brighter and longer ping. Both voices are louder on the live bus,
including rival returns, with the human bat remaining slightly foregrounded.
Music level, master volume, damage/outcome voices and simulation are unchanged.

Wall cues previously used velocity 0.1 through a quiet shared gesture synth.
They now use 0.65 through a dedicated -3 dB voice; paddles move from a -12 dB
musical-hit voice to a dedicated -3 dB voice with 0.95 human / 0.65 rival velocity.
Wall throttling now permits separate bounces on successive 32nds (about 55ms),
while coalescing simultaneous duplicates. Louder rival hits do not trigger the
human's musical answer. The existing compressor and limiter remain in the mix.

Auditions at the same 45% master volume:

- [Wall before](reviews/m09/bounce-audio/wall-before.mp3) /
  [wall knock after](reviews/m09/bounce-audio/wall-after.mp3)
- [Paddle before](reviews/m09/bounce-audio/paddle-before.mp3) /
  [paddle ping after](reviews/m09/bounce-audio/paddle-after.mp3)
- [Alternating wall/bat returns against four-ball drop music](reviews/m09/bounce-audio/rally-after.mp3)

The [uncompressed render report](reviews/m09/bounce-audio/report.json) measures
isolated RMS gains of about 21.5 dB for walls and 11.4 dB for paddles. Dense mix
peak is 0.430, below digital clipping. These are authored event auditions through
the actual Tone synth/mix graph, not a recording of a human match. MP3s are review
exports only; the game synthesises all sound in real time.

Validation: Vite+ check, 307 unit tests, root-path production build, three native
Chromium audio lifecycle checks and the audition level/clipping assertions pass.
The pre-existing bundle warning remains. Speaker/phone audibility and subjective
mix balance require owner review. Reproduce WAVs with the local Vite server:
`node tooling/review-impact-audio.mjs /tmp/citadel-impacts http://127.0.0.1:5176`.
