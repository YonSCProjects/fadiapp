// Runner audio cues. Two sounds, generated at build time (see
// scripts/generate-sounds.ts) and bundled with the app:
//   pip  — short 880Hz tone, played at each second of the 3-2-1 countdown
//   ding — two-tone chime, played at block transitions (end of block)
//
// expo-audio is a native module. On a dev client built before the plugin
// was added, the native side isn't linked and createAudioPlayer throws.
// We tolerate that silently — haptic stays as the baseline cue, audio is
// the additive nice-to-have.

import { createAudioPlayer, type AudioPlayer, setAudioModeAsync } from 'expo-audio';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const pipSource = require('../../assets/sounds/pip.wav');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const dingSource = require('../../assets/sounds/ding.wav');

let pipPlayer: AudioPlayer | null = null;
let dingPlayer: AudioPlayer | null = null;
let modeConfigured = false;
// Flips to true the first time any native call fails — disables all further
// audio work for this session without flooding the console.
let audioUnavailable = false;

async function ensureMode(): Promise<void> {
  if (modeConfigured || audioUnavailable) return;
  modeConfigured = true;
  try {
    await setAudioModeAsync({
      playsInSilentMode: true,
      interruptionMode: 'mixWithOthers',
      shouldPlayInBackground: false,
    });
  } catch (e) {
    audioUnavailable = true;
    if (__DEV__) {
      console.warn(
        '[audio] expo-audio not available — rebuild dev client to enable runner sounds. Continuing silently.',
        e,
      );
    }
  }
}

function ensurePlayers(): void {
  if (audioUnavailable) return;
  try {
    if (!pipPlayer) pipPlayer = createAudioPlayer(pipSource);
    if (!dingPlayer) dingPlayer = createAudioPlayer(dingSource);
  } catch (e) {
    audioUnavailable = true;
    if (__DEV__) {
      console.warn(
        '[audio] expo-audio not available — rebuild dev client to enable runner sounds. Continuing silently.',
        e,
      );
    }
  }
}

async function replay(player: AudioPlayer): Promise<void> {
  try {
    await player.seekTo(0);
    player.play();
  } catch {
    // Don't flip audioUnavailable here — transient replay failures (seek mid-
    // ready, OS interruption) shouldn't kill audio for the whole session.
  }
}

export async function playPip(): Promise<void> {
  await ensureMode();
  if (audioUnavailable) return;
  ensurePlayers();
  if (pipPlayer) await replay(pipPlayer);
}

export async function playDing(): Promise<void> {
  await ensureMode();
  if (audioUnavailable) return;
  ensurePlayers();
  if (dingPlayer) await replay(dingPlayer);
}

export function unloadRunnerAudio(): void {
  try {
    pipPlayer?.remove();
    dingPlayer?.remove();
  } catch {
    // Teardown errors are never worth surfacing.
  }
  pipPlayer = null;
  dingPlayer = null;
  modeConfigured = false;
  audioUnavailable = false; // let the next mount re-probe
}
