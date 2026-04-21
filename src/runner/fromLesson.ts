import { createBlock, type BlockState } from './wallClock';
import type { LessonBlock } from '@/db/schema';

// Bridge: convert a plan's LessonBlock[] to the runner's BlockState[].
// The runner works in its own (pure, JSON-serializable) universe; the lesson
// plan is the input shape. We keep the runner's id stable across a run by
// reusing the lesson block's id.
export function blocksFromLesson(lessonBlocks: LessonBlock[]): BlockState[] {
  return lessonBlocks.map((b) => createBlock(b.id, b.name_he, b.duration_s));
}
