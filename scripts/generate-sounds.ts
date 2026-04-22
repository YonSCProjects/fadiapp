// Generates the runner's audio cues as small mono 16-bit WAV files.
// Run once (and whenever you want to tweak the tones):
//   npx tsx scripts/generate-sounds.ts
//
// Output:
//   assets/sounds/pip.wav   — short high beep for 3-2-1 countdown
//   assets/sounds/ding.wav  — longer two-tone chime for block transition
//
// Keeping the sounds generated-in-repo (as opposed to downloaded from an
// audio CDN) means they're reproducible, free of license question, and
// tiny (< 25 KB each).

import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const SAMPLE_RATE = 22050;
const OUT_DIR = resolve(__dirname, '..', 'assets', 'sounds');

type Segment = {
  freqHz: number;
  durationS: number;
  gain?: number; // 0..1 peak amplitude
  fadeInS?: number;
  fadeOutS?: number;
};

function synthesize(segments: Segment[]): Int16Array {
  const sampleCount = segments.reduce(
    (acc, s) => acc + Math.round(s.durationS * SAMPLE_RATE),
    0,
  );
  const samples = new Int16Array(sampleCount);
  let idx = 0;
  let phase = 0;
  for (const seg of segments) {
    const segSamples = Math.round(seg.durationS * SAMPLE_RATE);
    const fadeIn = Math.round((seg.fadeInS ?? 0.005) * SAMPLE_RATE);
    const fadeOut = Math.round((seg.fadeOutS ?? 0.02) * SAMPLE_RATE);
    const peak = (seg.gain ?? 0.6) * 0x7fff;
    const omega = (2 * Math.PI * seg.freqHz) / SAMPLE_RATE;
    for (let i = 0; i < segSamples; i++) {
      let envelope = 1;
      if (i < fadeIn) envelope = i / fadeIn;
      const tailStart = segSamples - fadeOut;
      if (i > tailStart) envelope = Math.max(0, 1 - (i - tailStart) / fadeOut);
      samples[idx++] = Math.round(Math.sin(phase) * peak * envelope);
      phase += omega;
      if (phase > 2 * Math.PI) phase -= 2 * Math.PI;
    }
  }
  return samples;
}

function toWav(samples: Int16Array): Buffer {
  const dataSize = samples.length * 2;
  const buf = Buffer.alloc(44 + dataSize);
  let p = 0;
  buf.write('RIFF', p); p += 4;
  buf.writeUInt32LE(36 + dataSize, p); p += 4;
  buf.write('WAVE', p); p += 4;
  buf.write('fmt ', p); p += 4;
  buf.writeUInt32LE(16, p); p += 4; // PCM subchunk size
  buf.writeUInt16LE(1, p); p += 2;  // format = PCM
  buf.writeUInt16LE(1, p); p += 2;  // channels = 1
  buf.writeUInt32LE(SAMPLE_RATE, p); p += 4;
  buf.writeUInt32LE(SAMPLE_RATE * 2, p); p += 4; // byte rate
  buf.writeUInt16LE(2, p); p += 2;  // block align
  buf.writeUInt16LE(16, p); p += 2; // bits per sample
  buf.write('data', p); p += 4;
  buf.writeUInt32LE(dataSize, p); p += 4;
  for (let i = 0; i < samples.length; i++) {
    buf.writeInt16LE(samples[i]!, p);
    p += 2;
  }
  return buf;
}

mkdirSync(OUT_DIR, { recursive: true });

// Pip: one short 880 Hz tone (high A). Meant to be distinctly audible but not
// startling — teachers will hear it three times in a row at the end of a block.
const pip = synthesize([{ freqHz: 880, durationS: 0.14, gain: 0.55 }]);
writeFileSync(resolve(OUT_DIR, 'pip.wav'), toWav(pip));

// Ding: two tones, octave apart, descending — signals "block is over, move on".
// Noticeably different from the pip so a teacher can hear the transition even
// mid-conversation on the floor.
const ding = synthesize([
  { freqHz: 1320, durationS: 0.08, gain: 0.6, fadeOutS: 0.01 },
  { freqHz: 880, durationS: 0.42, gain: 0.55, fadeInS: 0.005, fadeOutS: 0.12 },
]);
writeFileSync(resolve(OUT_DIR, 'ding.wav'), toWav(ding));

console.log('[generate-sounds] wrote pip.wav and ding.wav to', OUT_DIR);
