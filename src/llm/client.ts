import Constants from 'expo-constants';

const extra = (Constants.expoConfig?.extra ?? {}) as {
  workerBaseUrl?: string;
  workerSharedSecret?: string;
};

export type LlmModel = 'claude-opus-4-7' | 'claude-sonnet-4-6';

export type LlmTextBlock = { type: 'text'; text: string };
export type LlmContent = string | LlmTextBlock[];

export type LlmMessage = { role: 'user' | 'assistant'; content: LlmContent };

export type LlmRequest = {
  model: LlmModel;
  system?: string;
  messages: LlmMessage[];
  max_tokens?: number;
  temperature?: number;
};

export type LlmResponse = {
  id: string;
  model: string;
  content: LlmTextBlock[];
  stop_reason: string | null;
  usage?: { input_tokens: number; output_tokens: number };
};

function workerConfig(): { base: string; secret: string } {
  const base = extra.workerBaseUrl;
  const secret = extra.workerSharedSecret;
  if (!base || base.includes('example.workers.dev')) {
    throw new Error('workerBaseUrl not set in app.json extra');
  }
  if (!secret || secret.startsWith('REPLACE_')) {
    throw new Error('workerSharedSecret not set in app.json extra');
  }
  return { base, secret };
}

export async function callLlm(req: LlmRequest): Promise<LlmResponse> {
  const { base, secret } = workerConfig();
  const url = `${base.replace(/\/$/, '')}/v1/messages`;
  const body = {
    model: req.model,
    system: req.system,
    messages: req.messages,
    max_tokens: req.max_tokens ?? 4096,
    temperature: req.temperature ?? 0.4,
  };
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${secret}`,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`worker ${res.status}: ${text}`);
  }
  return (await res.json()) as LlmResponse;
}

// Convenience for the lesson designer: extract the first text block.
export function firstText(resp: LlmResponse): string {
  return resp.content.find((b) => b.type === 'text')?.text ?? '';
}
