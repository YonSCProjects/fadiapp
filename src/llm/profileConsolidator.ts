// Orchestrates the "app learns" loop: reads a class's raw design feedback,
// asks the LLM to distill it into a concise profile, and persists the result
// on classes.design_profile_he.
//
// PII NOTE: feedback `text_he` is teacher-authored free text sent to the LLM
// verbatim — same outbound free-text path as the designer's
// `specialConsiderationsHe`/`goalHe`. When the device-side sanitizer
// (src/llm/sanitizer.ts, not yet built) lands, it MUST be run over each
// feedback string before the callLlm below. Today the Worker-side guard is
// the only boundary.

import { callLlm, firstText } from './client';
import {
  CONSOLIDATOR_SYSTEM,
  buildConsolidatorUserMessage,
} from './prompts/he/profileConsolidator';
import { getClass, setDesignProfile } from '@/db/repos/classes';
import { listFeedbackForClass } from '@/db/repos/designFeedback';

// Re-consolidates the design profile for a class from all of its feedback.
// Returns the new profile text. Throws on LLM/network failure — callers
// should treat that as "feedback saved, profile not yet updated".
export async function consolidateProfile(classId: string): Promise<string> {
  const feedback = await listFeedbackForClass(classId);
  if (feedback.length === 0) {
    await setDesignProfile(classId, null);
    return '';
  }

  const cls = await getClass(classId);
  const resp = await callLlm({
    model: 'claude-sonnet-4-6',
    system: [
      {
        type: 'text',
        text: CONSOLIDATOR_SYSTEM,
        cache_control: { type: 'ephemeral' },
      },
    ],
    messages: [
      {
        role: 'user',
        content: buildConsolidatorUserMessage(
          cls?.design_profile_he ?? null,
          feedback.map((f) => f.text_he),
        ),
      },
    ],
    max_tokens: 600,
  });

  const profile = firstText(resp).trim();
  await setDesignProfile(classId, profile.length > 0 ? profile : null);
  return profile;
}
