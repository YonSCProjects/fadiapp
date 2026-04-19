export type TeacherClaims = {
  sub: string;
  iat: number;
  exp: number;
};

function b64urlDecode(s: string): Uint8Array {
  const pad = '='.repeat((4 - (s.length % 4)) % 4);
  const b64 = (s + pad).replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function b64urlDecodeString(s: string): string {
  return new TextDecoder().decode(b64urlDecode(s));
}

async function importHs256Key(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['verify'],
  );
}

export async function verifyTeacherJwt(token: string, secret: string): Promise<TeacherClaims> {
  const parts = token.split('.');
  if (parts.length !== 3) throw new Error('jwt: malformed');

  const [headerB64, payloadB64, sigB64] = parts as [string, string, string];

  const header = JSON.parse(b64urlDecodeString(headerB64));
  if (header.alg !== 'HS256') throw new Error('jwt: alg not HS256');

  const key = await importHs256Key(secret);
  const data = new TextEncoder().encode(`${headerB64}.${payloadB64}`);
  const sig = b64urlDecode(sigB64);
  const ok = await crypto.subtle.verify('HMAC', key, sig, data);
  if (!ok) throw new Error('jwt: bad signature');

  const claims = JSON.parse(b64urlDecodeString(payloadB64)) as TeacherClaims;
  const now = Math.floor(Date.now() / 1000);
  if (typeof claims.exp !== 'number' || claims.exp < now) throw new Error('jwt: expired');
  if (typeof claims.sub !== 'string' || claims.sub.length === 0) throw new Error('jwt: no sub');

  return claims;
}
