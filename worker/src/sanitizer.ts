// Defense-in-depth: the mobile app's outbound sanitizer is authoritative,
// but we also reject obvious PII leaks at the proxy boundary.
//
// Heuristics:
//   - Hebrew given-name + family-name pair (two Hebrew tokens in a row).
//   - Israeli ID number (9 digits).
//   - Common Hebrew "student" + name pattern.
//
// We deliberately allow single Hebrew tokens (curriculum/exercise names contain Hebrew),
// and we do NOT scan for English names (too noisy).

const HEBREW_NAME_PAIR = /[\u05D0-\u05EA]{2,}\s+[\u05D0-\u05EA]{2,}/;
const ISRAELI_ID = /\b\d{9}\b/;
const STUDENT_PREFIX = /(?:תלמיד|תלמידה|התלמיד|התלמידה)\s+[\u05D0-\u05EA]{2,}/;

export type SanitizerVerdict =
  | { ok: true }
  | { ok: false; reason: 'hebrew_name_pair' | 'israeli_id' | 'student_named' };

export function checkForPii(text: string): SanitizerVerdict {
  if (STUDENT_PREFIX.test(text)) return { ok: false, reason: 'student_named' };
  if (ISRAELI_ID.test(text)) return { ok: false, reason: 'israeli_id' };
  if (HEBREW_NAME_PAIR.test(text)) return { ok: false, reason: 'hebrew_name_pair' };
  return { ok: true };
}

export function checkAnthropicMessages(body: unknown): SanitizerVerdict {
  if (!body || typeof body !== 'object') return { ok: true };
  const msgs = (body as { messages?: unknown }).messages;
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
