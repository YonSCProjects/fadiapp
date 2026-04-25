// OAuth 2.0 refresh-token flow for Google. Exchanges a long-lived refresh
// token for a fresh access token without user interaction. Wrapped in
// getValidToken() which auto-refreshes on demand and caches the in-flight
// promise so concurrent callers share a single network round-trip.

import Constants from 'expo-constants';
import { clearTokenSet, loadTokenSet, saveTokenSet, type TokenSet } from './tokenStore';

const TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token';

const extra = (Constants.expoConfig?.extra ?? {}) as {
  googleClientIdAndroid?: string;
  googleClientIdIos?: string;
  googleClientIdWeb?: string;
};

// On Android, expo-auth-session's Google provider uses the Web client ID
// internally (via the Auth proxy / ID token flow), so the refresh token must
// be redeemed against that same Web client ID. iOS uses the iOS client.
function clientIdForRefresh(): string {
  return (
    extra.googleClientIdWeb ?? extra.googleClientIdAndroid ?? extra.googleClientIdIos ?? ''
  );
}

let inflight: Promise<TokenSet | null> | null = null;

async function performRefresh(refreshToken: string): Promise<TokenSet | null> {
  const clientId = clientIdForRefresh();
  if (!clientId) {
    throw new Error('tokenRefresh: no Google client ID configured');
  }

  const body = new URLSearchParams({
    client_id: clientId,
    refresh_token: refreshToken,
    grant_type: 'refresh_token',
  });

  const res = await fetch(TOKEN_ENDPOINT, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  if (!res.ok) {
    // 400 invalid_grant means the refresh token itself is dead — user
    // revoked access, password reset, 6-month inactivity, etc. Wipe the
    // TokenSet so the next call cleanly returns null.
    await clearTokenSet();
    const text = await res.text();
    throw new Error(`tokenRefresh ${res.status}: ${text}`);
  }

  const data = (await res.json()) as {
    access_token: string;
    expires_in: number;
    refresh_token?: string;
    scope?: string;
    token_type?: string;
  };

  const next: TokenSet = {
    accessToken: data.access_token,
    // Google usually does NOT rotate refresh tokens, so we keep the existing
    // one when none is returned. If a new one is returned, prefer it.
    refreshToken: data.refresh_token ?? refreshToken,
    expiresAt: Date.now() + data.expires_in * 1000,
  };
  await saveTokenSet(next);
  return next;
}

// Returns a valid access token, refreshing if needed. Returns null when no
// token is available and no refresh is possible — callers should treat that
// as "user must re-sign-in" and surface the Drive spike screen.
export async function getValidToken(): Promise<string | null> {
  const set = await loadTokenSet();
  if (!set) return null;

  // Still good for at least 60 seconds — use as-is.
  if (set.accessToken && set.expiresAt > Date.now() + 60_000) {
    return set.accessToken;
  }

  if (!set.refreshToken) {
    // Legacy single-token state (or refresh token never issued). The access
    // token is treated as expired; without a refresh token we can't recover.
    await clearTokenSet();
    return null;
  }

  if (!inflight) {
    inflight = performRefresh(set.refreshToken).finally(() => {
      inflight = null;
    });
  }

  try {
    const refreshed = await inflight;
    return refreshed?.accessToken ?? null;
  } catch {
    // performRefresh already cleared the TokenSet on hard failures.
    return null;
  }
}
