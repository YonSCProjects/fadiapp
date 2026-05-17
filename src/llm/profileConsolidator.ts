// Orchestrates the "app learns" loop: reads every per-lesson improvement-
// feedback row, asks the LLM to distill them into one concise global design
// profile, and persists it on teachers.design_profile_he.
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
import { getCurrentTeacher, setDesignProfile } from '@/db/repos/teachers';
import { listAllFeedback } from '@/db/repos/designFeedback';

// Re-consolidates the teacher's global design profile from all feedback.
// Returns the new profile text. Throws on LLM/network failure — callers
// should treat that as "feedback saved, profile not yet updated".
export async function consolidateProfile(): Promise<string> {
  const teacher = await getCurrentTeacher();
  if (!teacher) throw new Error('consolidateProfile: no teacher row');

  const feedback = await listAllFeedback();
  if (feedback.length === 0) {
    await setDesignProfile(teacher.id, null);
    return '';
  }

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
          teacher.design_profile_he ?? null,
          feedback.map((f) => f.text_he),
        ),
      },
    ],
    max_tokens: 600,
  });

  const profile = firstText(resp).trim();
  await setDesignProfile(teacher.id, profile.length > 0 ? profile : null);
  return profile;
}
