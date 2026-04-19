export type Segment = { startedAt: number; endedAt: number | null };

export type BlockState = {
  id: string;
  name: string;
  plannedDurationS: number;
  segments: Segment[];
};

export type RunnerState = {
  lessonInstanceId: string;
  blocks: BlockState[];
  currentIdx: number;
  finishedAt: number | null;
};

export function createBlock(id: string, name: string, plannedDurationS: number): BlockState {
  return { id, name, plannedDurationS, segments: [] };
}

export function createRunner(lessonInstanceId: string, blocks: BlockState[]): RunnerState {
  if (blocks.length === 0) throw new Error('runner needs at least one block');
  return { lessonInstanceId, blocks, currentIdx: 0, finishedAt: null };
}

export function isRunning(block: BlockState): boolean {
  const last = block.segments[block.segments.length - 1];
  return !!last && last.endedAt === null;
}

export function start(block: BlockState, now: number): BlockState {
  if (isRunning(block)) return block;
  return { ...block, segments: [...block.segments, { startedAt: now, endedAt: null }] };
}

export function pause(block: BlockState, now: number): BlockState {
  if (!isRunning(block)) return block;
  const segments = block.segments.slice();
  const last = segments[segments.length - 1]!;
  segments[segments.length - 1] = { ...last, endedAt: now };
  return { ...block, segments };
}

export function elapsedMs(block: BlockState, now: number): number {
  let total = 0;
  for (const seg of block.segments) {
    const end = seg.endedAt ?? now;
    total += Math.max(0, end - seg.startedAt);
  }
  return total;
}

export function remainingMs(block: BlockState, now: number): number {
  return block.plannedDurationS * 1000 - elapsedMs(block, now);
}

export function isComplete(block: BlockState, now: number): boolean {
  return remainingMs(block, now) <= 0;
}

export function completionTime(block: BlockState, now: number): number | null {
  const planned = block.plannedDurationS * 1000;
  let cumulative = 0;
  for (const seg of block.segments) {
    const end = seg.endedAt ?? now;
    const segElapsed = Math.max(0, end - seg.startedAt);
    if (cumulative + segElapsed >= planned) {
      return seg.startedAt + (planned - cumulative);
    }
    cumulative += segElapsed;
  }
  return null;
}

export function startRunner(state: RunnerState, now: number): RunnerState {
  const blocks = state.blocks.slice();
  const idx = state.currentIdx;
  blocks[idx] = start(blocks[idx]!, now);
  return { ...state, blocks };
}

export function pauseRunner(state: RunnerState, now: number): RunnerState {
  const blocks = state.blocks.slice();
  const idx = state.currentIdx;
  blocks[idx] = pause(blocks[idx]!, now);
  return { ...state, blocks };
}

export function advanceIfComplete(state: RunnerState, now: number): RunnerState {
  if (state.finishedAt !== null) return state;
  let idx = state.currentIdx;
  const blocks = state.blocks.slice();

  while (idx < blocks.length && isComplete(blocks[idx]!, now)) {
    const t = completionTime(blocks[idx]!, now) ?? now;
    blocks[idx] = pause(blocks[idx]!, t);
    idx += 1;
    if (idx < blocks.length) {
      blocks[idx] = start(blocks[idx]!, t);
    }
  }

  if (idx >= blocks.length) {
    return { ...state, blocks, currentIdx: blocks.length - 1, finishedAt: now };
  }
  return { ...state, blocks, currentIdx: idx };
}

export function skipToNext(state: RunnerState, now: number): RunnerState {
  if (state.finishedAt !== null) return state;
  const blocks = state.blocks.slice();
  blocks[state.currentIdx] = pause(blocks[state.currentIdx]!, now);
  const nextIdx = state.currentIdx + 1;
  if (nextIdx >= blocks.length) {
    return { ...state, blocks, finishedAt: now };
  }
  blocks[nextIdx] = start(blocks[nextIdx]!, now);
  return { ...state, blocks, currentIdx: nextIdx };
}

export function extendCurrent(state: RunnerState, addSeconds: number): RunnerState {
  const blocks = state.blocks.slice();
  const idx = state.currentIdx;
  const cur = blocks[idx]!;
  blocks[idx] = { ...cur, plannedDurationS: cur.plannedDurationS + addSeconds };
  return { ...state, blocks };
}

export function totalElapsedMs(state: RunnerState, now: number): number {
  return state.blocks.reduce((acc, b) => acc + elapsedMs(b, now), 0);
}
