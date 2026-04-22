// Integration bot: exercises the real code paths end-to-end without needing
// a device. Calls the deployed Worker with real prompts, parses the LLM
// output through our actual parser, feeds the plan into the pure wall-clock
// state machine, simulates time, asserts invariants, logs PASS/FAIL.
//
// Usage:
//   npm run qa-bot                        # one iteration
//   npm run qa-bot -- --loop=50           # fifty iterations
//   npm run qa-bot -- --loop=50 --quiet   # only log failures + final summary
//   npm run qa-bot -- --fixture-only      # skip Worker; re-use a stashed lesson
//
// Output:
//   scripts/qa-bot.log                    # one line per iteration
//   scripts/qa-bot-failures/<ts>.json     # dump of the failing state

import { config as dotenvConfig } from 'dotenv';
import { appendFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { resolve } from 'node:path';

// Load .env.local first (if present), fall back to .env. Matches Expo's order.
dotenvConfig({ path: resolve(__dirname, '..', '.env.local') });
dotenvConfig({ path: resolve(__dirname, '..', '.env') });

import {
  buildSystemPrompt,
  buildUserMessage,
  parseLessonJson,
  type DesignerConstraints,
  type GeneratedLesson,
} from '../src/llm/prompts/he/lessonDesigner';
import {
  advanceIfComplete,
  createBlock,
  createRunner,
  elapsedMs,
  extendCurrent,
  isRunning,
  pauseRunner,
  remainingMs,
  skipToNext,
  startRunner,
  type BlockState,
  type RunnerState,
} from '../src/runner/wallClock';
import type { Activity, ActivityCategory, ActivityEnvironment } from '../src/db/schema';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const activitiesSeed = require('../assets/kb/activities_seed.json') as {
  activities: Array<{
    source_ref: string;
    name_he: string;
    name_en?: string;
    category: ActivityCategory;
    environment: ActivityEnvironment;
    equipment_json: string[];
    min_space_m2: number;
    tags_json: string[];
    difficulty: number;
    cues_he?: string;
    safety_he?: string;
  }>;
};

// ---------------------------------------------------------------------------
// Config & CLI
// ---------------------------------------------------------------------------

const WORKER_URL = process.env.WORKER_BASE_URL;
const WORKER_SECRET = process.env.WORKER_SHARED_SECRET;
if (!WORKER_URL || !WORKER_SECRET) {
  console.error('[qa-bot] WORKER_BASE_URL and WORKER_SHARED_SECRET must be set in .env.local');
  process.exit(2);
}

const args = process.argv.slice(2);
function argValue(name: string): string | undefined {
  const hit = args.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.split('=')[1] : undefined;
}
const loopCount = Number(argValue('loop') ?? '1');
const quiet = args.includes('--quiet');
const fixtureOnly = args.includes('--fixture-only');

const LOG_PATH = resolve(__dirname, 'qa-bot.log');
const FAIL_DIR = resolve(__dirname, 'qa-bot-failures');
mkdirSync(FAIL_DIR, { recursive: true });

// ---------------------------------------------------------------------------
// Scenario generator
// ---------------------------------------------------------------------------

const GRADES = [7, 8, 9, 10, 11, 12] as const;
const DURATIONS = [30, 45, 60, 90] as const;
const ENVS: Array<'gym' | 'outdoor' | 'studio'> = ['gym', 'outdoor', 'studio'];
const GOALS_HE = [
  'שיפור מסירות בכדורסל',
  'פיתוח סיבולת לב-ריאה',
  'עבודה על שיווי משקל דינמי',
  'הקנית יסודות של כדוריד',
  'חיזוק שרירי ליבה וגב',
  'פיתוח גמישות ותחום תנועה',
  'עבודה קבוצתית במשחק ספורט',
];
const EQUIPMENT_POOLS_HE = [
  ['כדורסל', 'קונוסים'],
  ['כדורגל', 'קונוסים'],
  ['כדורעף'],
  ['חבלי קפיצה', 'מחצלות'],
  ['מחצלות'],
  [],
];

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!;
}

function randomConstraints(): DesignerConstraints {
  const env = pick(ENVS);
  return {
    grade: pick(GRADES),
    durationMin: pick(DURATIONS),
    environment: env,
    classSize: 20 + Math.floor(Math.random() * 16),
    goalHe: pick(GOALS_HE),
    equipmentAvailableHe: pick(EQUIPMENT_POOLS_HE),
    preferredModel: 'auto',
  };
}

// ---------------------------------------------------------------------------
// Worker call (non-streaming for the bot; simpler, same code on server side)
// ---------------------------------------------------------------------------

type WorkerMessageResponse = {
  content: Array<{ type: string; text?: string }>;
  stop_reason: string | null;
  usage?: { input_tokens: number; output_tokens: number };
};

// Mirrors the app-side normalization in src/llm/designer.ts.
function normalizeDurations(lesson: GeneratedLesson): GeneratedLesson {
  const target = lesson.duration_min * 60;
  const total = lesson.blocks_json.reduce((acc, b) => acc + b.duration_s, 0);
  if (total <= 0) return lesson;
  if (Math.abs(total - target) / target < 0.02) return lesson;
  const scale = target / total;
  const scaled = lesson.blocks_json.map((b) => ({
    ...b,
    duration_s: Math.max(30, Math.round((b.duration_s * scale) / 30) * 30),
  }));
  const scaledTotal = scaled.reduce((acc, b) => acc + b.duration_s, 0);
  const residual = target - scaledTotal;
  if (residual !== 0 && scaled.length > 0) {
    let maxIdx = 0;
    for (let i = 1; i < scaled.length; i++) {
      if (scaled[i]!.duration_s > scaled[maxIdx]!.duration_s) maxIdx = i;
    }
    scaled[maxIdx] = {
      ...scaled[maxIdx]!,
      duration_s: Math.max(30, scaled[maxIdx]!.duration_s + residual),
    };
  }
  return { ...lesson, blocks_json: scaled };
}

async function callWorker(constraints: DesignerConstraints): Promise<{
  lesson: GeneratedLesson;
  rawDriftPct: number;
}> {
  const whitelist: Activity[] = activityWhitelistFor(constraints.environment);
  const body = {
    model: 'claude-sonnet-4-6',
    system: [
      { type: 'text', text: buildSystemPrompt(), cache_control: { type: 'ephemeral' } },
    ],
    messages: [{ role: 'user', content: buildUserMessage(constraints, whitelist) }],
    max_tokens: 8192,
  };
  const res = await fetch(`${WORKER_URL}/v1/messages`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${WORKER_SECRET}`,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(`worker ${res.status}: ${await res.text()}`);
  }
  const json = (await res.json()) as WorkerMessageResponse;
  if (json.stop_reason === 'max_tokens') {
    throw new Error('LLM truncated at max_tokens');
  }
  const raw = json.content.find((b) => b.type === 'text')?.text ?? '';
  const rawLesson = parseLessonJson(raw);
  const rawTotal = rawLesson.blocks_json.reduce((acc, b) => acc + b.duration_s, 0);
  const rawDriftPct = Math.abs(rawTotal - rawLesson.duration_min * 60) / (rawLesson.duration_min * 60);
  return { lesson: normalizeDurations(rawLesson), rawDriftPct };
}

function activityWhitelistFor(env: ActivityEnvironment): Activity[] {
  // Convert the bundled seed JSON into minimal Activity-shaped objects.
  // The prompt builder only reads name_he, category, equipment_json,
  // tags_json, source_ref/id — everything else can be a placeholder.
  return activitiesSeed.activities
    .filter((a) => a.environment === env || a.environment === 'any')
    .map(
      (a) =>
        ({
          id: a.source_ref,
          name_he: a.name_he,
          name_en: a.name_en ?? null,
          category: a.category,
          environment: a.environment,
          equipment_json: a.equipment_json,
          min_space_m2: a.min_space_m2,
          tags_json: a.tags_json,
          source_ref: a.source_ref,
          video_url_local: null,
          difficulty: a.difficulty,
          cues_he: a.cues_he ?? null,
          safety_he: a.safety_he ?? null,
          created_at: new Date(0),
          updated_at: new Date(0),
          deleted_at: null,
          sync_rev: 0,
          drive_etag: null,
        }) as unknown as Activity,
    );
}

// ---------------------------------------------------------------------------
// Assertions
// ---------------------------------------------------------------------------

type Assertion = { ok: true } | { ok: false; reason: string };

const ALLOWED_PEDAGOGICAL_MODELS = new Set([
  'tgfu',
  'sport-education',
  'tpsr',
  'skill-themes',
  'cooperative',
  'mosston-spectrum',
  'mosston-command',
  'mosston-practice',
  'mosston-reciprocal',
  'mosston-self-check',
  'mosston-inclusion',
  'mosston-guided-discovery',
  'mosston-convergent',
  'mosston-divergent',
  'mosston-individual',
  'mosston-learner-initiated',
  'mosston-self-teaching',
]);
const ALLOWED_SUB_PHASES = new Set(['raise', 'activate', 'mobilize', 'potentiate']);

function assertSchema(lesson: GeneratedLesson, constraints: DesignerConstraints): Assertion {
  if (!lesson.title_he || typeof lesson.title_he !== 'string') {
    return { ok: false, reason: 'missing title_he' };
  }
  if (!Array.isArray(lesson.blocks_json) || lesson.blocks_json.length === 0) {
    return { ok: false, reason: 'blocks_json empty or missing' };
  }
  if (!['gym', 'outdoor', 'studio'].includes(lesson.environment)) {
    return { ok: false, reason: `bad environment: ${lesson.environment}` };
  }
  if (!ALLOWED_PEDAGOGICAL_MODELS.has(lesson.pedagogical_model)) {
    return {
      ok: false,
      reason: `pedagogical_model "${lesson.pedagogical_model}" not in allowed enum`,
    };
  }
  const phases = new Set(['warmup', 'main', 'cooldown']);
  const ids = new Set<string>();
  for (const b of lesson.blocks_json) {
    if (!phases.has(b.phase)) return { ok: false, reason: `bad phase: ${b.phase}` };
    if (typeof b.duration_s !== 'number' || b.duration_s <= 0) {
      return { ok: false, reason: `bad duration_s: ${b.duration_s}` };
    }
    if (!Array.isArray(b.activity_ids)) {
      return { ok: false, reason: `bad activity_ids for block ${b.id}` };
    }
    if (ids.has(b.id)) {
      return { ok: false, reason: `duplicate block id: ${b.id}` };
    }
    ids.add(b.id);
    // sub_phase must be omitted on non-warmup blocks, and must be one of the
    // RAMP values on warmup blocks. The string literal "undefined" (a known
    // LLM failure mode) is never valid.
    if (b.sub_phase !== undefined) {
      if (b.phase !== 'warmup') {
        return { ok: false, reason: `sub_phase set on ${b.phase} block ${b.id}` };
      }
      if (!ALLOWED_SUB_PHASES.has(b.sub_phase as string)) {
        return {
          ok: false,
          reason: `invalid sub_phase "${b.sub_phase}" on block ${b.id}`,
        };
      }
    }
  }
  const totalS = lesson.blocks_json.reduce((acc, b) => acc + b.duration_s, 0);
  const expectedS = constraints.durationMin * 60;
  const drift = Math.abs(totalS - expectedS);
  // Tolerance: 10% of requested duration OR 90s, whichever is larger.
  const tolerance = Math.max(90, expectedS * 0.1);
  if (drift > tolerance) {
    return {
      ok: false,
      reason: `duration drift: planned=${expectedS}s, actual=${totalS}s, Δ=${drift}s (tol=${tolerance}s)`,
    };
  }
  return { ok: true };
}

function assertWhitelist(lesson: GeneratedLesson, whitelist: Activity[]): Assertion {
  const refs = new Set(whitelist.map((a) => a.source_ref ?? a.id));
  for (const b of lesson.blocks_json) {
    for (const aid of b.activity_ids) {
      if (!refs.has(aid)) return { ok: false, reason: `unknown activity id: ${aid}` };
    }
  }
  return { ok: true };
}

function assertRunnerRoundTrip(lesson: GeneratedLesson): Assertion {
  const runnerBlocks: BlockState[] = lesson.blocks_json.map((b) =>
    createBlock(b.id, b.name_he, b.duration_s),
  );
  let state = createRunner(randomUUID(), runnerBlocks);
  let simNow = 1_700_000_000_000; // arbitrary epoch
  state = startRunner(state, simNow);

  // Simulate time passing, with random pauses and skips sprinkled in.
  while (state.finishedAt === null) {
    const jump = 15_000 + Math.floor(Math.random() * 60_000);
    simNow += jump;

    if (Math.random() < 0.15) {
      state = pauseRunner(state, simNow);
      simNow += 30_000 + Math.floor(Math.random() * 120_000);
      state = startRunner(state, simNow);
    }
    if (Math.random() < 0.1) {
      state = extendCurrent(state, 30);
    }
    if (Math.random() < 0.05) {
      state = skipToNext(state, simNow);
      continue;
    }
    state = advanceIfComplete(state, simNow);
    if (simNow > 1_700_000_000_000 + 48 * 60 * 60_000) {
      return { ok: false, reason: 'runner did not finish within simulated 48h' };
    }
  }

  // Serialize + reparse should be a no-op.
  const serialized = JSON.stringify(state);
  const parsed = JSON.parse(serialized) as RunnerState;
  if (parsed.currentIdx !== state.currentIdx) {
    return { ok: false, reason: 'currentIdx drift on round-trip' };
  }
  if (parsed.finishedAt !== state.finishedAt) {
    return { ok: false, reason: 'finishedAt drift on round-trip' };
  }
  if (parsed.blocks.length !== state.blocks.length) {
    return { ok: false, reason: 'block count drift on round-trip' };
  }
  for (let i = 0; i < state.blocks.length; i++) {
    const a = state.blocks[i]!;
    const b = parsed.blocks[i]!;
    const ea = elapsedMs(a, simNow);
    const eb = elapsedMs(b, simNow);
    if (ea !== eb) return { ok: false, reason: `block[${i}] elapsedMs drift after parse` };
    if (isRunning(a) !== isRunning(b)) {
      return { ok: false, reason: `block[${i}] isRunning drift after parse` };
    }
  }
  // All blocks should be paused in a finished runner (no dangling running segments).
  for (let i = 0; i < state.blocks.length; i++) {
    if (isRunning(state.blocks[i]!)) {
      return { ok: false, reason: `block[${i}] still running in finished state` };
    }
  }
  // Elapsed can legitimately be less than planned when blocks were skipped;
  // that's not a bug. The meaningful invariant is: elapsed on each
  // non-skipped block is exactly plannedDurationS.
  // (We don't track which were skipped here, so this is the tightest we can say.)
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Main loop
// ---------------------------------------------------------------------------

type IterationResult = {
  ok: boolean;
  ms: number;
  reason?: string;
  constraints: DesignerConstraints;
  lesson?: GeneratedLesson;
  phase?: 'schema' | 'whitelist' | 'runner' | 'worker';
  rawDriftPct?: number;
};

async function runOnce(): Promise<IterationResult> {
  const constraints = randomConstraints();
  const started = Date.now();
  let lesson: GeneratedLesson;
  let rawDriftPct = 0;
  try {
    if (fixtureOnly) {
      throw new Error('--fixture-only not implemented yet');
    }
    const out = await callWorker(constraints);
    lesson = out.lesson;
    rawDriftPct = out.rawDriftPct;
  } catch (e) {
    return {
      ok: false,
      ms: Date.now() - started,
      reason: `worker: ${(e as Error).message}`,
      constraints,
      phase: 'worker',
    };
  }

  const schema = assertSchema(lesson, constraints);
  if (!schema.ok) {
    return { ok: false, ms: Date.now() - started, reason: schema.reason, constraints, lesson, phase: 'schema', rawDriftPct };
  }
  const whitelist = activityWhitelistFor(constraints.environment);
  const wl = assertWhitelist(lesson, whitelist);
  if (!wl.ok) {
    return { ok: false, ms: Date.now() - started, reason: wl.reason, constraints, lesson, phase: 'whitelist', rawDriftPct };
  }
  const runner = assertRunnerRoundTrip(lesson);
  if (!runner.ok) {
    return { ok: false, ms: Date.now() - started, reason: runner.reason, constraints, lesson, phase: 'runner', rawDriftPct };
  }
  return { ok: true, ms: Date.now() - started, constraints, lesson, rawDriftPct };
}

function logIteration(i: number, result: IterationResult): void {
  const ts = new Date().toISOString();
  const { ok, ms, reason, constraints, phase, rawDriftPct } = result;
  const c = `g${constraints.grade}/${constraints.durationMin}m/${constraints.environment}`;
  const drift = rawDriftPct !== undefined ? `  rawDrift=${(rawDriftPct * 100).toFixed(1)}%` : '';
  const line = ok
    ? `${ts}  PASS  #${i}  ${ms}ms  ${c}${drift}`
    : `${ts}  FAIL  #${i}  ${ms}ms  ${c}${drift}  [${phase}] ${reason}`;
  appendFileSync(LOG_PATH, line + '\n');
  if (!quiet || !ok) console.log(line);

  if (!ok && result.lesson) {
    const dumpPath = resolve(FAIL_DIR, `${ts.replace(/[:.]/g, '-')}-${i}.json`);
    writeFileSync(
      dumpPath,
      JSON.stringify({ result, lesson: result.lesson }, null, 2),
    );
  }
}

async function main(): Promise<void> {
  console.log(`[qa-bot] starting ${loopCount} iteration(s) against ${WORKER_URL}`);
  const startedAll = Date.now();
  let passed = 0;
  let failed = 0;
  const failureReasons = new Map<string, number>();

  for (let i = 1; i <= loopCount; i++) {
    const result = await runOnce();
    logIteration(i, result);
    if (result.ok) passed++;
    else {
      failed++;
      const key = `${result.phase}: ${result.reason?.split(':')[0] ?? 'unknown'}`;
      failureReasons.set(key, (failureReasons.get(key) ?? 0) + 1);
    }
  }

  const totalMs = Date.now() - startedAll;
  const summary = [
    '',
    `[qa-bot] done: ${passed}/${loopCount} passed, ${failed} failed, ${(totalMs / 1000).toFixed(1)}s total`,
  ];
  if (failureReasons.size > 0) {
    summary.push('[qa-bot] failure modes:');
    for (const [reason, count] of [...failureReasons.entries()].sort((a, b) => b[1] - a[1])) {
      summary.push(`  ${count}× ${reason}`);
    }
  }
  console.log(summary.join('\n'));
  appendFileSync(LOG_PATH, summary.join('\n') + '\n');

  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error('[qa-bot] crashed:', e);
  process.exit(2);
});
