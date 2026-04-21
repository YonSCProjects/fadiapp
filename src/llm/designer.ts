import { and, inArray, isNull } from 'drizzle-orm';
import { db } from '@/db/client';
import { activities, type Activity } from '@/db/schema';
import { firstText } from './client';
import { callLlmStream, type StreamHandlers } from './stream';
import {
  buildSystemPrompt,
  buildUserMessage,
  parseLessonJson,
  type DesignerConstraints,
  type GeneratedLesson,
} from './prompts/he/lessonDesigner';

// Filter the activity whitelist to what's reachable for this class. Keep it
// permissive — the LLM will further narrow by goal. Include everything in the
// 'any' environment plus the requested one.
async function loadActivityWhitelist(constraints: DesignerConstraints): Promise<Activity[]> {
  return db
    .select()
    .from(activities)
    .where(
      and(
        isNull(activities.deleted_at),
        inArray(activities.environment, [constraints.environment, 'any']),
      ),
    );
}

export type DesignerResult = {
  lesson: GeneratedLesson;
  usedActivities: Activity[];
  usage?: { input_tokens: number; output_tokens: number };
  rawResponseText: string;
};

export async function designLesson(
  constraints: DesignerConstraints,
  handlers: StreamHandlers = {},
): Promise<DesignerResult> {
  const whitelist = await loadActivityWhitelist(constraints);
  if (whitelist.length === 0) {
    throw new Error('no activities available for this environment — KB importer may not have run');
  }

  // Split the system prompt so the static-per-session chunk (pedagogy cards,
  // RAMP, safety, JSON schema) gets cached by Anthropic. Subsequent lesson
  // generations in the same session skip re-billing + re-processing it.
  const system = buildSystemPrompt();
  const userMessage = buildUserMessage(constraints, whitelist);

  const response = await callLlmStream(
    {
      model: 'claude-sonnet-4-6',
      system: [
        {
          type: 'text',
          text: system,
          cache_control: { type: 'ephemeral' },
        },
      ],
      messages: [{ role: 'user', content: userMessage }],
      max_tokens: 4096,
    },
    handlers,
  );

  if (response.stop_reason === 'max_tokens') {
    throw new Error(
      'LLM hit max_tokens before finishing the lesson JSON — response was truncated. ' +
        'Try again, or ask the designer to be more concise.',
    );
  }

  const rawText = firstText(response);
  const lesson = parseLessonJson(rawText);

  const refToId = new Map(whitelist.map((a) => [a.source_ref ?? a.id, a]));
  const used: Activity[] = [];
  const unknownIds: string[] = [];
  for (const block of lesson.blocks_json) {
    for (const activityRef of block.activity_ids) {
      const hit = refToId.get(activityRef);
      if (hit) used.push(hit);
      else unknownIds.push(activityRef);
    }
  }
  if (unknownIds.length > 0) {
    throw new Error(
      `LLM referenced unknown activity ids: ${unknownIds.join(', ')}. Prompt whitelist may need tightening.`,
    );
  }

  return {
    lesson,
    usedActivities: Array.from(new Set(used)),
    usage: response.usage,
    rawResponseText: rawText,
  };
}

// Rewrites the block IDs from source_refs (what the LLM returned) to the actual
// DB row IDs. Called before persisting so lesson_instances can later reference
// the real activity rows via activity_ids.
export function resolveActivityRefs(
  lesson: GeneratedLesson,
  whitelist: Activity[],
): GeneratedLesson {
  const refToId = new Map(whitelist.map((a) => [a.source_ref ?? a.id, a.id]));
  return {
    ...lesson,
    blocks_json: lesson.blocks_json.map((b) => ({
      ...b,
      activity_ids: b.activity_ids.map((ref) => refToId.get(ref) ?? ref),
    })),
  };
}

// Re-export so UI code can import constraint/lesson types from a single place.
export type { DesignerConstraints, GeneratedLesson } from './prompts/he/lessonDesigner';
