import * as SecureStore from 'expo-secure-store';

const KEY = 'google_token_set_v1';
const LEGACY_KEY = 'google_access_token_v1';

export type TokenSet = {
  accessToken: string;
  // Long-lived refresh token. Null when the original sign-in didn't include
  // offline access (e.g. the legacy single-token migration path).
  refreshToken: string | null;
  // Unix-ms epoch when the access token expires. 0 when unknown — caller
  // should treat as expired and refresh if possible.
  expiresAt: number;
};

export async function saveTokenSet(set: TokenSet): Promise<void> {
  await SecureStore.setItemAsync(KEY, JSON.stringify(set));
}

export async function loadTokenSet(): Promise<TokenSet | null> {
  const raw = await SecureStore.getItemAsync(KEY);
  if (raw) {
    try {
      return JSON.parse(raw) as TokenSet;
    } catch {
      return null;
    }
  }
  // Legacy migration: a previous build stored a bare access token under a
  // different key, with no refresh token and no expiry. Treat it as expired
  // so the next auth-aware call forces a fresh sign-in.
  const legacy = await SecureStore.getItemAsync(LEGACY_KEY);
  if (legacy) {
    return { accessToken: legacy, refreshToken: null, expiresAt: 0 };
  }
  return null;
}

export async function clearTokenSet(): Promise<void> {
  await SecureStore.deleteItemAsync(KEY);
  await SecureStore.deleteItemAsync(LEGACY_KEY);
}
