// Import once, as early as possible in the app entry, to satisfy any library
// (ulidx, uuid, etc.) that reaches for `crypto.getRandomValues` globally.
// We use expo-crypto so no native module / rebuild is required.

import * as ExpoCrypto from 'expo-crypto';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const g = globalThis as any;
if (!g.crypto) {
  g.crypto = {};
}
if (!g.crypto.getRandomValues) {
  g.crypto.getRandomValues = ExpoCrypto.getRandomValues;
}
if (!g.crypto.randomUUID) {
  g.crypto.randomUUID = ExpoCrypto.randomUUID;
}
