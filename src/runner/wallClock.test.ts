import {
  advanceIfComplete,
  createBlock,
  createRunner,
  elapsedMs,
  extendCurrent,
  isComplete,
  isRunning,
  pauseRunner,
  remainingMs,
  skipToNext,
  startRunner,
  totalElapsedMs,
} from './wallClock';

const RAISE = createBlock('r', 'Raise', 60);
const ACTIVATE = createBlock('a', 'Activate', 90);
const MAIN = createBlock('m', 'Main', 1200);

const T0 = 1_700_000_000_000;

describe('wallClock — pure block math', () => {
  test('a fresh block is not running and has zero elapsed', () => {
    const b = createBlock('x', 'X', 60);
    expect(isRunning(b)).toBe(false);
    expect(elapsedMs(b, T0)).toBe(0);
    expect(remainingMs(b, T0)).toBe(60_000);
    expect(isComplete(b, T0)).toBe(false);
  });

  test('elapsed accrues only against real wall-clock between segment start and now', () => {
    let b = createBlock('x', 'X', 60);
    b = { ...b, segments: [{ startedAt: T0, endedAt: null }] };
    expect(elapsedMs(b, T0 + 5_000)).toBe(5_000);
    expect(remainingMs(b, T0 + 5_000)).toBe(55_000);
  });

  test('paused segments stop accruing; resuming adds a new segment', () => {
    let b = createBlock('x', 'X', 60);
    b = {
      ...b,
      segments: [
        { startedAt: T0, endedAt: T0 + 10_000 },
        { startedAt: T0 + 30_000, endedAt: null },
      ],
    };
    expect(elapsedMs(b, T0 + 35_000)).toBe(15_000);
  });

  test('block completes the moment elapsed crosses planned duration', () => {
    let b = createBlock('x', 'X', 60);
    b = { ...b, segments: [{ startedAt: T0, endedAt: null }] };
    expect(isComplete(b, T0 + 59_999)).toBe(false);
    expect(isComplete(b, T0 + 60_000)).toBe(true);
    expect(isComplete(b, T0 + 1_000_000)).toBe(true);
  });
});

describe('wallClock — runner survives wall-clock jumps (background simulation)', () => {
  test('huge time jump while running advances through completed blocks correctly', () => {
    let r = createRunner('lesson-1', [RAISE, ACTIVATE, MAIN]);
    r = startRunner(r, T0);

    const fiveMinutesLater = T0 + 5 * 60_000;
    r = advanceIfComplete(r, fiveMinutesLater);

    expect(r.currentIdx).toBe(2);
    expect(r.finishedAt).toBeNull();
    expect(isRunning(r.blocks[2]!)).toBe(true);

    expect(elapsedMs(r.blocks[0]!, fiveMinutesLater)).toBe(60_000);
    expect(elapsedMs(r.blocks[1]!, fiveMinutesLater)).toBe(90_000);
  });

  test('jumping past the end of all blocks marks runner finished', () => {
    let r = createRunner('lesson-1', [RAISE, ACTIVATE]);
    r = startRunner(r, T0);
    r = advanceIfComplete(r, T0 + 24 * 60 * 60_000);
    expect(r.finishedAt).toBe(T0 + 24 * 60 * 60_000);
  });

  test('pause then long absence then advance does not advance past pause boundary', () => {
    let r = createRunner('lesson-1', [RAISE, ACTIVATE, MAIN]);
    r = startRunner(r, T0);
    r = pauseRunner(r, T0 + 30_000);

    const muchLater = T0 + 60 * 60_000;
    r = advanceIfComplete(r, muchLater);

    expect(r.currentIdx).toBe(0);
    expect(elapsedMs(r.blocks[0]!, muchLater)).toBe(30_000);
    expect(remainingMs(r.blocks[0]!, muchLater)).toBe(30_000);
  });
});

describe('wallClock — runner controls', () => {
  test('skipToNext pauses current and starts next at the same instant', () => {
    let r = createRunner('lesson-1', [RAISE, ACTIVATE]);
    r = startRunner(r, T0);
    r = skipToNext(r, T0 + 10_000);

    expect(r.currentIdx).toBe(1);
    expect(elapsedMs(r.blocks[0]!, T0 + 20_000)).toBe(10_000);
    expect(elapsedMs(r.blocks[1]!, T0 + 20_000)).toBe(10_000);
  });

  test('skipToNext on the last block finishes the runner', () => {
    let r = createRunner('lesson-1', [RAISE]);
    r = startRunner(r, T0);
    r = skipToNext(r, T0 + 5_000);
    expect(r.finishedAt).toBe(T0 + 5_000);
  });

  test('extendCurrent adds time to the current block without losing elapsed', () => {
    let r = createRunner('lesson-1', [RAISE]);
    r = startRunner(r, T0);
    r = extendCurrent(r, 30);
    expect(remainingMs(r.blocks[0]!, T0 + 10_000)).toBe(80_000);
  });

  test('totalElapsedMs sums across all blocks regardless of pauses', () => {
    let r = createRunner('lesson-1', [RAISE, ACTIVATE]);
    r = startRunner(r, T0);
    r = skipToNext(r, T0 + 30_000);
    expect(totalElapsedMs(r, T0 + 60_000)).toBe(60_000);
  });
});

describe('wallClock — round-trip serialization (proves state is JSON-safe)', () => {
  test('JSON.stringify/parse reproduces identical behavior', () => {
    let r = createRunner('lesson-1', [RAISE, ACTIVATE]);
    r = startRunner(r, T0);
    r = pauseRunner(r, T0 + 15_000);

    const restored = JSON.parse(JSON.stringify(r));
    expect(elapsedMs(restored.blocks[0], T0 + 1_000_000)).toBe(15_000);
    expect(isRunning(restored.blocks[0])).toBe(false);
  });
});
