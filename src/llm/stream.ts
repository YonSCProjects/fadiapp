// Streaming wrapper around the Worker's /v1/messages. Parses Anthropic's
// Server-Sent Events and calls back as text deltas arrive. Returns the fully
// assembled response at the end.
//
// Anthropic SSE events relevant for text streaming:
//   content_block_delta — { delta: { type: 'text_delta', text: '...' } }
//   message_delta       — { delta: { stop_reason, stop_sequence }, usage }
//   message_stop        — terminal
// Other events (message_start, content_block_start/stop, ping) we ignore.

import Constants from 'expo-constants';
import { fetch as expoFetch } from 'expo/fetch';
import type { LlmRequest, LlmResponse } from './client';

const extra = (Constants.expoConfig?.extra ?? {}) as {
  workerBaseUrl?: string;
  workerSharedSecret?: string;
};

export type StreamHandlers = {
  onTextDelta?: (delta: string) => void;
  onUsage?: (usage: { input_tokens: number; output_tokens: number }) => void;
  onStop?: (stopReason: string | null) => void;
};

function workerConfig(): { base: string; secret: string } {
  const base = extra.workerBaseUrl;
  const secret = extra.workerSharedSecret;
  if (!base || base.includes('example.workers.dev')) {
    throw new Error('workerBaseUrl not set');
  }
  if (!secret || secret.startsWith('REPLACE_')) {
    throw new Error('workerSharedSecret not set');
  }
  return { base, secret };
}

type AnthropicEvent = {
  type: string;
  delta?: { type?: string; text?: string; stop_reason?: string };
  usage?: { input_tokens?: number; output_tokens?: number };
};

function parseSseBlock(block: string): AnthropicEvent | null {
  const lines = block.split('\n');
  let dataLine: string | undefined;
  for (const line of lines) {
    if (line.startsWith('data:')) dataLine = line.slice(5).trim();
  }
  if (!dataLine || dataLine === '[DONE]') return null;
  try {
    return JSON.parse(dataLine) as AnthropicEvent;
  } catch {
    return null;
  }
}

export async function callLlmStream(
  req: LlmRequest,
  handlers: StreamHandlers = {},
): Promise<LlmResponse> {
  const { base, secret } = workerConfig();
  const url = `${base.replace(/\/$/, '')}/v1/messages`;

  const body: Record<string, unknown> = {
    model: req.model,
    system: req.system,
    messages: req.messages,
    max_tokens: req.max_tokens ?? 4096,
    stream: true,
  };
  if (typeof req.temperature === 'number') body.temperature = req.temperature;

  // expo/fetch — RN's built-in fetch buffers response bodies, so res.body is
  // null and streaming silently fails. This variant exposes ReadableStream.
  const res = await expoFetch(url, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${secret}`,
      accept: 'text/event-stream',
    },
    body: JSON.stringify(body),
  });
  if (!res.ok || !res.body) {
    const text = await res.text().catch(() => '');
    throw new Error(`worker ${res.status}: ${text}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let buffer = '';
  let accumulated = '';
  let stopReason: string | null = null;
  let usage: { input_tokens: number; output_tokens: number } | undefined;

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    // SSE blocks are separated by a blank line. Process complete ones; keep
    // the final partial block in the buffer for the next iteration.
    let boundary = buffer.indexOf('\n\n');
    while (boundary >= 0) {
      const rawBlock = buffer.slice(0, boundary);
      buffer = buffer.slice(boundary + 2);
      const event = parseSseBlock(rawBlock);
      if (event) {
        if (
          event.type === 'content_block_delta' &&
          event.delta?.type === 'text_delta' &&
          typeof event.delta.text === 'string'
        ) {
          accumulated += event.delta.text;
          handlers.onTextDelta?.(event.delta.text);
        } else if (event.type === 'message_delta') {
          if (event.delta?.stop_reason) {
            stopReason = event.delta.stop_reason;
            handlers.onStop?.(stopReason);
          }
          if (event.usage) {
            usage = {
              input_tokens: event.usage.input_tokens ?? 0,
              output_tokens: event.usage.output_tokens ?? 0,
            };
            handlers.onUsage?.(usage);
          }
        }
      }
      boundary = buffer.indexOf('\n\n');
    }
  }

  return {
    id: '',
    model: typeof req.model === 'string' ? req.model : 'unknown',
    content: [{ type: 'text', text: accumulated }],
    stop_reason: stopReason,
    usage,
  };
}
