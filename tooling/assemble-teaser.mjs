import { readFile, writeFile, mkdir, copyFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import assert from "node:assert/strict";
import { join } from "node:path";
import { introBalance, rmsBetween } from "./teaser-levels.ts";

const source = process.argv[2] ?? "/private/tmp/citadel-teaser-v4-work";
const output = process.argv[3] ?? "artifacts/citadel-teaser";
await mkdir(output, { recursive: true });
const capture = JSON.parse(await readFile(join(source, "capture.json"), "utf8"));
const frames = capture.shots.at(-1).end;
const duration = frames / 60;
const scoreHeader = await readFile(join(source, "score.wav"));
const effectsHeader = await readFile(join(source, "effects.wav"));
assert.equal(scoreHeader.readUInt32LE(24), 48000, "Teaser music must be rendered at 48 kHz");
assert.equal(effectsHeader.readUInt32LE(24), 48000, "Teaser effects must be rendered at 48 kHz");
assert.equal(capture.errors.length, 0);
for (const summary of capture.summaries) {
  assert.equal(summary.phase, "playing");
  assert.equal(summary.stats.collisionCaps, 0);
  if (summary.id.startsWith("curve")) {
    assert.ok(summary.selectedSpin > 1.3);
    assert.equal(summary.curveHit, true);
  }
  if (summary.id === "crowd") assert.equal(summary.survivors, 16);
  if (summary.id === "chaos") {
    assert.equal(summary.level, 100);
    assert.equal(summary.peakBalls, 16);
  }
  if (summary.id === "level100-intro") {
    assert.equal(summary.initialPieces, 1);
    assert.ok(summary.eliminationsShown >= 2);
    assert.ok(summary.morphFrames > 60);
  }
  if (!["title", "end"].includes(summary.id))
    assert.ok(summary.maxPulse > 0, "Capture must retain music-driven lighting");
  assert.equal(summary.environment.effects.pixelRatio, 2);
}
const raw = join(source, "sequence.h264");
await writeFile(
  raw,
  Buffer.concat(
    await Promise.all(capture.shots.map((shot) => readFile(join(source, `${shot.id}.h264`)))),
  ),
);
function run(command, args) {
  const result = spawnSync(command, args, {
    stdio: ["ignore", "pipe", "pipe"],
    encoding: "utf8",
    maxBuffer: 10 * 1024 * 1024,
  });
  if (result.status !== 0) throw Error(`${command} failed: ${result.stderr}`);
  return result.stdout;
}
const movie = join(output, process.argv[4] ?? "citadel-teaser-v4-1080p60.mp4");
console.log("Encoding the final teaser and continuous soundtrack mix");
run("ffmpeg", [
  "-y",
  "-v",
  "error",
  "-fflags",
  "+genpts",
  "-framerate",
  "60",
  "-i",
  raw,
  "-i",
  join(source, "score.wav"),
  "-i",
  join(source, "effects.wav"),
  "-filter_complex",
  `[0:v]fade=t=in:st=0:d=0.25,fade=t=out:st=${duration - 0.65}:d=0.65[v];` +
    `[1:a]volume=1.45,afade=t=in:st=0:d=0.25,afade=t=out:st=${duration - 2}:d=2[score];` +
    "[2:a]volume=1.0,afade=t=out:st=35.3:d=0.7[effects];" +
    // Fixed gain preserves the intro. Only reduce peaks; never auto-amplify quiet hats.
    "[score][effects]amix=inputs=2:duration=longest:normalize=0,volume=3.5,alimiter=limit=0.8:level=false:attack=5:release=80:latency=true,aresample=48000[a]",
  "-map",
  "[v]",
  "-map",
  "[a]",
  "-frames:v",
  String(frames),
  "-t",
  String(duration),
  "-c:v",
  "libx264",
  "-preset",
  "medium",
  "-crf",
  "18",
  "-pix_fmt",
  "yuv420p",
  "-r",
  "60",
  "-color_primaries",
  "bt709",
  "-color_trc",
  "iec61966-2-1",
  "-colorspace",
  "bt709",
  "-c:a",
  "aac",
  "-b:a",
  "256k",
  "-ar",
  "48000",
  "-movflags",
  "+faststart",
  "-metadata",
  "title=CITADEL — Gameplay Teaser",
  "-metadata",
  "comment=Original continuous score and synchronized game sound effects. Captured with the real procedural renderer and game physics.",
  movie,
]);
const stills = [
  ["duel.png", "citadel-01-two-player.png"],
  ["curve-left-still.png", "citadel-02-curve-shot.png"],
  ["crowd.png", "citadel-03-sixteen-players.png"],
];
for (const [input, filename] of stills) {
  run("ffmpeg", [
    "-y",
    "-v",
    "error",
    "-i",
    join(source, input),
    "-vf",
    "crop=2400:1350:80:0,scale=2560:1440:flags=lanczos",
    "-frames:v",
    "1",
    join(output, filename),
  ]);
}
const probe = JSON.parse(
  run("ffprobe", [
    "-v",
    "error",
    "-count_frames",
    "-show_entries",
    "stream=index,codec_name,codec_type,width,height,avg_frame_rate,nb_read_frames,sample_rate,channels,duration:format=duration,size",
    "-of",
    "json",
    movie,
  ]),
);
const video = probe.streams.find((stream) => stream.codec_type === "video");
const audio = probe.streams.find((stream) => stream.codec_type === "audio");
function decodeStereo(file) {
  const result = spawnSync(
    "ffmpeg",
    [
      "-v",
      "error",
      "-i",
      file,
      "-map",
      "0:a:0",
      "-f",
      "f32le",
      "-ac",
      "2",
      "-ar",
      "48000",
      "pipe:1",
    ],
    { maxBuffer: 32 * 1024 * 1024 },
  );
  if (result.status !== 0) throw new Error(String(result.stderr));
  return Float32Array.from({ length: result.stdout.length / 4 }, (_, index) =>
    result.stdout.readFloatLE(index * 4),
  );
}
const originalScore = decodeStereo(join(source, "score.wav"));
const mixedAudio = decodeStereo(movie);
// Stereo samples are interleaved, so a second contains 96,000 float values.
const balance = introBalance(
  rmsBetween(originalScore, 96000, 0.5, 2.5),
  rmsBetween(originalScore, 96000, 7.5, 10),
  rmsBetween(mixedAudio, 96000, 0.5, 2.5),
  rmsBetween(mixedAudio, 96000, 7.5, 10),
);
assert.ok(
  balance.introLiftDb < 6,
  `Mastering amplified the intro by ${balance.introLiftDb.toFixed(1)} dB`,
);
await writeFile(join(output, "levels-check.json"), JSON.stringify(balance, null, 2) + "\n");
assert.equal(video.width, 1920);
assert.equal(video.height, 1080);
assert.equal(video.avg_frame_rate, "60/1");
assert.equal(Number(video.nb_read_frames), frames);
assert.equal(audio.codec_name, "aac");
assert.equal(audio.channels, 2);
assert.ok(Math.abs(Number(probe.format.duration) - duration) < 0.1);
await copyFile(join(source, "capture.json"), join(output, "capture-report.json"));
await copyFile(join(source, "audio.json"), join(output, "audio-stems-report.json"));
await writeFile(
  join(output, "media-report.json"),
  JSON.stringify(
    {
      ...probe,
      expectedFrames: frames,
      expectedDuration: duration,
      screenshots: stills.map(([, name]) => ({ name, width: 2560, height: 1440 })),
    },
    null,
    2,
  ) + "\n",
);
console.log(
  JSON.stringify({ movie, seconds: duration, frames, screenshots: stills.map(([, name]) => name) }),
);
