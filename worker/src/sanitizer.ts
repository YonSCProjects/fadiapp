// Defense-in-depth PII tripwire. The device-side sanitizer (future
// src/llm/sanitizer.ts) is the authoritative PII guard; this Worker guard
// only catches leaks so specific that they could not appear in our own
// prompt templates.
//
// Why this is narrow on purpose:
//   - Hebrew-name-pair detection catches every normal Hebrew sentence
//     (activity names, lesson goals, prose in pedagogy cards).
//   - Detecting "תלמיד/ה <hebrew word>" catches abstract student prose in
//     our own pedagogy cards ("התלמיד לומד טקטיקה", "כל תלמיד רץ").
//   - So we can't reliably flag names without the actual student roster,
//     which only the device has.
//
// What we DO match: Israeli ID numbers (9 consecutive digits). Highly
// specific — virtually impossible to appear in clean lesson-design
// content by accident. This will catch the obvious device-side leak.
//
// TODO: once src/llm/sanitizer.ts exists and substitutes student names
// with placeholder tokens (תלמיד/ה א/ב/ג), add a server check that
// rejects prompts containing any Hebrew-name-shaped token *that is not*
// one of the allowed placeholders.

const ISRAELI_ID = /\b\d{9}\b/;

export type SanitizerVerdict = { ok: true } | { ok: false; reason: 'israeli_id' };

export function checkForPii(text: string): SanitizerVerdict {
  if (ISRAELI_ID.test(text)) return { ok: false, reason: 'israeli_id' };
  return { ok: true };
}

export function checkAnthropicMessages(body: unknown): SanitizerVerdict {
  if (!body || typeof body !== 'object') return { ok: true };
  const obj = body as { messages?: unknown; system?: unknown };

  if (typeof obj.system === 'string') {
    const v = checkForPii(obj.system);
    if (!v.ok) return v;
  }

  const msgs = obj.messages;
  if (!Array.isArray(msgs)) return { ok: true };
  for (const m of msgs) {
    const content = (m as { content?: unknown }).content;
    if (typeof content === 'string') {
      const v = checkForPii(content);
      if (!v.ok) return v;
    } else if (Array.isArray(content)) {
      for (const part of content) {
        const text = (part as { text?: unknown }).text;
        if (typeof text === 'string') {
          const v = checkForPii(text);
          if (!v.ok) return v;
        }
      }
    }
  }
  return { ok: true };
}
