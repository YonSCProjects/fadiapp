// Runner audio cues. Two sounds, generated at build time (see
// scripts/generate-sounds.ts) and bundled with the app:
//   pip  — short 880Hz tone, played at each second of the 3-2-1 countdown
//   ding — two-tone chime, played at block transitions (end of block)
//
// expo-audio's createAudioPlayer lets us preload once and replay fast.
// We seek back to 0 before each replay because playing a completed clip
// no-ops otherwise.

import { createAudioPlayer, type AudioPlayer, setAudioModeAsync } from 'expo-audio';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const pipSource = require('../../assets/sounds/pip.wav');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const dingSource = require('../../assets/sounds/ding.wav');

let pipPlayer: AudioPlayer | null = null;
let dingPlayer: AudioPlayer | null = null;
let modeConfigured = false;

async function ensureMode(): Promise<void> {
  if (modeConfigured) return;
  modeConfigured = true;
  // Play through the device speaker even in silent mode — this is a coaching
  // tool, silent mode isn't what the teacher meant for gym-floor cues. Also
  // disable "interrupt music" in case a teacher has music playing in the
  // background: we want to blend, not stop their warmup playlist.
  try {
    await setAudioModeAsync({
      playsInSilentMode: true,
      interruptionMode: 'mixWithOthers',
      shouldPlayInBackground: false,
    });
  } catch {
    // Non-fatal — the sounds just won't respect silent mode.
  }
}

function ensurePlayers(): void {
  if (!pipPlayer) pipPlayer = createAudioPlayer(pipSource);
  if (!dingPlayer) dingPlayer = createAudioPlayer(dingSource);
}

async function replay(player: AudioPlayer): Promise<void> {
  try {
    // Seek to start before play so repeat taps within ~1s re-trigger.
    await player.seekTo(0);
    player.play();
  } catch {
    // Haptic is the baseline channel — swallow audio errors, they'd just
    // be a second-class cue failure and shouldn't break the runner.
  }
}

export async function playPip(): Promise<void> {
  await ensureMode();
  ensurePlayers();
  if (pipPlayer) await replay(pipPlayer);
}

export async function playDing(): Promise<void> {
  await ensureMode();
  ensurePlayers();
  if (dingPlayer) await replay(dingPlayer);
}

// Call on runner unmount if you want to free the underlying native resources
// early. Not strictly required — they'll be GC'd when the app unloads.
export function unloadRunnerAudio(): void {
  pipPlayer?.remove();
  dingPlayer?.remove();
  pipPlayer = null;
  dingPlayer = null;
  modeConfigured = false;
}
