import { checkAnthropicMessages } from './sanitizer';

export interface Env {
  ANTHROPIC_API_KEY: string;
  WORKER_SHARED_SECRET: string;
  ANTHROPIC_DESIGN_MODEL: string;
  ANTHROPIC_CHAT_MODEL: string;
}

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_VERSION = '2023-06-01';
const ALLOWED_MODELS = new Set(['claude-opus-4-7', 'claude-sonnet-4-6']);

// Constant-time string comparison to avoid timing attacks on the bearer.
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

export default {
  async fetch(request: Request, env: Env, _ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const reqId = crypto.randomUUID();

    if (url.pathname === '/health') {
      return json({ ok: true, reqId });
    }

    if (url.pathname !== '/v1/messages' || request.method !== 'POST') {
      return json({ error: 'not_found', reqId }, 404);
    }

    const auth = request.headers.get('authorization') ?? '';
    const m = auth.match(/^Bearer\s+(.+)$/i);
    if (!m || !safeEqual(m[1]!, env.WORKER_SHARED_SECRET)) {
      return json({ error: 'unauthorized', reqId }, 401);
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return json({ error: 'invalid_json', reqId }, 400);
    }

    const model = (body as { model?: unknown }).model;
    if (typeof model !== 'string' || !ALLOWED_MODELS.has(model)) {
      return json({ error: 'model_not_allowed', allowed: [...ALLOWED_MODELS], reqId }, 400);
    }

    const verdict = checkAnthropicMessages(body);
    if (!verdict.ok) {
      console.log(JSON.stringify({ reqId, blocked: verdict.reason }));
      return json({ error: 'pii_blocked', reason: verdict.reason, reqId }, 400);
    }

    const upstream = await fetch(ANTHROPIC_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': env.ANTHROPIC_API_KEY,
        'anthropic-version': ANTHROPIC_VERSION,
      },
      body: JSON.stringify(body),
    });

    console.log(
      JSON.stringify({ reqId, model, upstream_status: upstream.status }),
    );

    return new Response(upstream.body, {
      status: upstream.status,
      headers: {
        'content-type': upstream.headers.get('content-type') ?? 'application/json',
        'x-fadiapp-req-id': reqId,
      },
    });
  },
} satisfies ExportedHandler<Env>;

function json(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}
