import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  AppState,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import {
  advanceIfComplete,
  createRunner,
  elapsedMs,
  extendCurrent,
  isRunning,
  pauseRunner,
  remainingMs,
  skipToNext,
  startRunner,
  type RunnerState,
} from '@/runner/wallClock';
import { blocksFromLesson } from '@/runner/fromLesson';
import { playDing, playPip, unloadRunnerAudio } from '@/runner/audio';
import {
  getInstance,
  isActualBlocksRecord,
  markCompleted,
  markStarted,
  saveRunnerState,
  type ActualBlocksRecord,
  type RunnerDeviation,
  type RunnerDeviationKind,
} from '@/db/repos/lessonInstances';
import type { LessonBlock } from '@/db/schema';
import { he } from '@/i18n/he';
import { useTheme } from '@/theme/ThemeProvider';
import type { ThemeTokens } from '@/theme/tokens';

const TICK_MS = 250;

export default function RunnerScreen() {
  const router = useRouter();
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { instanceId } = useLocalSearchParams<{ instanceId: string }>();
  const [state, setState] = useState<RunnerState | null>(null);
  const [deviations, setDeviations] = useState<RunnerDeviation[]>([]);
  const [plannedBlocks, setPlannedBlocks] = useState<LessonBlock[]>([]);
  const [deviationSheet, setDeviationSheet] = useState(false);
  const [, forceRender] = useState(0);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastBlockIdRef = useRef<string | null>(null);
  // Tracks the last remaining-whole-seconds value we emitted a pip for, so a
  // 250ms tick doesn't double-play the 3-second beep within the same second.
  const lastPipSecRef = useRef<number>(-1);

  // Load / hydrate -----------------------------------------------------------
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const instance = await getInstance(instanceId);
      if (!instance || cancelled) return;
      setPlannedBlocks(instance.planned_blocks_json);

      if (isActualBlocksRecord(instance.actual_blocks_json)) {
        const rec = instance.actual_blocks_json;
        setState(advanceIfComplete(rec.state, Date.now()));
        setDeviations(rec.deviations);
        lastBlockIdRef.current =
          rec.state.blocks[rec.state.currentIdx]?.id ?? null;
      } else {
        // Fresh instance — build state from the plan.
        const blocks = blocksFromLesson(instance.planned_blocks_json);
        setState(createRunner(instance.id, blocks));
        setDeviations([]);
        lastBlockIdRef.current = blocks[0]?.id ?? null;
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [instanceId]);

  // Persist every state change back to SQLite (small, cheap JSON writes).
  const persist = useCallback(
    (nextState: RunnerState, nextDeviations: RunnerDeviation[]) => {
      const record: ActualBlocksRecord = {
        version: 1,
        state: nextState,
        deviations: nextDeviations,
      };
      const patch =
        nextState.finishedAt !== null
          ? { status: 'completed' as const, ended_at: new Date(nextState.finishedAt) }
          : undefined;
      saveRunnerState(instanceId, record, patch).catch((err) => {
        console.warn('[runner] persist failed:', err);
      });
    },
    [instanceId],
  );

  // Reconcile on foreground (closes the "phone was locked for 20 min" gap).
  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => {
      if (next !== 'active') return;
      setState((s) => {
        if (s === null) return s;
        const advanced = advanceIfComplete(s, Date.now());
        if (advanced !== s) {
          persist(advanced, deviations);
        }
        return advanced;
      });
    });
    return () => sub.remove();
  }, [deviations, persist]);

  // UI tick — purely cosmetic. The wall-clock model is the source of truth.
  useEffect(() => {
    if (!state) return;
    const current = state.blocks[state.currentIdx];
    if (!current || state.finishedAt !== null || !isRunning(current)) {
      if (tickRef.current) clearInterval(tickRef.current);
      tickRef.current = null;
      return;
    }
    tickRef.current = setInterval(() => {
      const nowMs = Date.now();
      setState((s) => {
        if (!s) return s;
        const advanced = advanceIfComplete(s, nowMs);
        if (advanced !== s) {
          // Block transition — persist only; haptic + ding fire from the
          // block-change effect below (which also catches user-initiated
          // skips). Keeping them in one place prevents double-triggers.
          persist(advanced, deviations);
          return advanced;
        }
        return s;
      });

      // 3-2-1 countdown pips. Check against current state without forcing a
      // state read; we look at the last-known state ref via closure.
      const cur = state?.blocks[state.currentIdx];
      if (cur && isRunning(cur) && state?.finishedAt === null) {
        const remSec = Math.ceil(remainingMs(cur, nowMs) / 1000);
        if (remSec >= 1 && remSec <= 3 && remSec !== lastPipSecRef.current) {
          lastPipSecRef.current = remSec;
          playPip().catch(() => {});
        }
        // Reset the pip memory once we're past the 3s window.
        if (remSec > 3) lastPipSecRef.current = -1;
      }

      forceRender((n) => n + 1);
    }, TICK_MS);
    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
      tickRef.current = null;
    };
  }, [state, deviations, persist]);

  // Track block changes for haptics + audio ding (fires for natural
  // completion AND user skips — one place, one trigger per transition).
  useEffect(() => {
    if (!state) return;
    const current = state.blocks[state.currentIdx];
    const id = current?.id ?? null;
    if (id !== lastBlockIdRef.current) {
      const isFirstMount = lastBlockIdRef.current === null;
      lastBlockIdRef.current = id;
      // Reset pip memory so the new block's countdown fires fresh.
      lastPipSecRef.current = -1;
      // Skip the cue on first mount (loading the screen for the first
      // time shouldn't ding just because we just learned which block
      // is current).
      if (!isFirstMount) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
        playDing().catch(() => {});
      }
    }
  }, [state]);

  // Release audio resources on unmount.
  useEffect(() => {
    return () => {
      unloadRunnerAudio();
    };
  }, []);

  const now = Date.now();
  const currentBlock = useMemo(
    () => (state ? state.blocks[state.currentIdx] : null),
    [state],
  );
  const nextBlock = useMemo(
    () => (state ? state.blocks[state.currentIdx + 1] ?? null : null),
    [state],
  );

  if (!state || !currentBlock) {
    return (
      <>
        <Stack.Screen options={{ title: he.runner.title }} />
        <View style={styles.loading} />
      </>
    );
  }

  const running = isRunning(currentBlock);
  const finished = state.finishedAt !== null;
  const remainingS = Math.max(0, Math.ceil(remainingMs(currentBlock, now) / 1000));
  const elapsedS = Math.floor(elapsedMs(currentBlock, now) / 1000);

  // -- User actions ---------------------------------------------------------
  function onStartOrResume() {
    if (!state) return;
    const next = startRunner(state, Date.now());
    if (!state.blocks[0] || state.blocks[0].segments.length === 0) {
      markStarted(instanceId, new Date()).catch(() => {});
    }
    setState(next);
    persist(next, deviations);
  }

  function onPause() {
    if (!state) return;
    const next = pauseRunner(state, Date.now());
    setState(next);
    persist(next, deviations);
  }

  function onSkip() {
    if (!state || !currentBlock) return;
    const now2 = Date.now();
    const nextState = skipToNext(state, now2);
    const dev: RunnerDeviation = {
      at_ms: now2,
      block_id: currentBlock.id,
      kind: 'skipped',
    };
    const nextDevs = [...deviations, dev];
    setState(nextState);
    setDeviations(nextDevs);
    persist(nextState, nextDevs);
  }

  function onExtend() {
    if (!state || !currentBlock) return;
    const nextState = extendCurrent(state, 120);
    const dev: RunnerDeviation = {
      at_ms: Date.now(),
      block_id: currentBlock.id,
      kind: 'extended',
    };
    const nextDevs = [...deviations, dev];
    setState(nextState);
    setDeviations(nextDevs);
    persist(nextState, nextDevs);
  }

  function logDeviation(kind: RunnerDeviationKind) {
    if (!currentBlock) return;
    const dev: RunnerDeviation = {
      at_ms: Date.now(),
      block_id: currentBlock.id,
      kind,
    };
    const nextDevs = [...deviations, dev];
    setDeviations(nextDevs);
    if (state) persist(state, nextDevs);
    setDeviationSheet(false);
  }

  function onEnd() {
    Alert.alert(he.runner.endConfirm, '', [
      { text: he.lessons.cancel, style: 'cancel' },
      {
        text: he.runner.end,
        style: 'destructive',
        onPress: async () => {
          const now2 = Date.now();
          const paused = state ? pauseRunner(state, now2) : state;
          if (paused) {
            const finishedState: RunnerState = { ...paused, finishedAt: now2 };
            setState(finishedState);
            persist(finishedState, deviations);
          }
          await markCompleted(instanceId, new Date(now2));
        },
      },
    ]);
  }

  return (
    <>
      <Stack.Screen options={{ title: he.runner.title }} />
      <View style={styles.screen}>
        <View style={styles.topMeta}>
          <Text style={styles.stepLabel}>
            {he.runner.step} {state.currentIdx + 1} {he.runner.of} {state.blocks.length}
          </Text>
          {finished && <Text style={styles.finishedLabel}>{he.runner.finished}</Text>}
        </View>

        <View style={styles.center}>
          <Text style={styles.blockNameLabel}>{he.runner.current}</Text>
          <Text style={styles.blockName} numberOfLines={2} adjustsFontSizeToFit>
            {currentBlock.name}
          </Text>

          <Text style={styles.timer} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.4}>
            {formatMMSS(remainingS)}
          </Text>
          <Text style={styles.elapsedLabel}>
            {he.runner.elapsed} {formatMMSS(elapsedS)}
          </Text>

          {nextBlock && !finished && (
            <View style={styles.nextBox}>
              <Text style={styles.nextLabel}>{he.runner.next}</Text>
              <Text style={styles.nextName} numberOfLines={1}>
                {nextBlock.name}
              </Text>
            </View>
          )}
        </View>

        {!finished && (
          <View style={styles.controls}>
            <View style={styles.mainRow}>
              {running ? (
                <Btn label={he.runner.pause} onPress={onPause} primary styles={styles} />
              ) : (
                <Btn
                  label={elapsedS > 0 ? he.runner.resume : he.runner.start}
                  onPress={onStartOrResume}
                  primary
                  styles={styles}
                />
              )}
            </View>
            <View style={styles.secondaryRow}>
              <Btn label={he.runner.extend} onPress={onExtend} styles={styles} />
              <Btn label={he.runner.skip} onPress={onSkip} styles={styles} />
              <Btn
                label={he.runner.deviate}
                onPress={() => setDeviationSheet(true)}
                styles={styles}
              />
            </View>
            <Btn label={he.runner.end} onPress={onEnd} danger styles={styles} />
          </View>
        )}

        {finished && (
          <View style={styles.controls}>
            <Btn
              label={he.runner.backToLessons}
              onPress={() => router.replace('/lessons' as never)}
              primary
              styles={styles}
            />
          </View>
        )}
      </View>

      <Modal
        visible={deviationSheet}
        transparent
        animationType="fade"
        onRequestClose={() => setDeviationSheet(false)}
      >
        <Pressable style={styles.backdrop} onPress={() => setDeviationSheet(false)}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.sheetTitle}>{he.runner.deviate}</Text>
            <Btn
              label={he.runner.waterBreak}
              onPress={() => logDeviation('water_break')}
              styles={styles}
            />
            <Btn
              label={he.runner.injuryPause}
              onPress={() => logDeviation('injury_pause')}
              styles={styles}
            />
            <Btn
              label={he.runner.substituted}
              onPress={() => logDeviation('substituted')}
              styles={styles}
            />
            <Btn
              label={he.lessons.cancel}
              onPress={() => setDeviationSheet(false)}
              styles={styles}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

type S = ReturnType<typeof createStyles>;

function Btn({
  label,
  onPress,
  primary,
  danger,
  styles,
}: {
  label: string;
  onPress: () => void;
  primary?: boolean;
  danger?: boolean;
  styles: S;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.btn, primary && styles.btnPrimary, danger && styles.btnDanger]}
    >
      <Text
        style={[
          styles.btnLabel,
          primary && styles.btnLabelPrimary,
          danger && styles.btnLabelDanger,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function formatMMSS(s: number): string {
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${pad(m)}:${pad(r)}`;
}
function pad(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

const createStyles = (theme: ThemeTokens) =>
  StyleSheet.create({
    loading: { flex: 1, backgroundColor: theme.bg.runner },
    screen: { flex: 1, backgroundColor: theme.bg.runner, padding: 20, gap: 16 },
    topMeta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    stepLabel: { color: theme.text.muted, fontSize: 14 },
    finishedLabel: { color: theme.status.success, fontSize: 14, fontWeight: '700' },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
    blockNameLabel: {
      color: theme.text.faint,
      fontSize: 12,
      textTransform: 'uppercase',
      letterSpacing: 1,
    },
    blockName: {
      color: theme.text.primary,
      fontSize: 32,
      fontWeight: '700',
      textAlign: 'center',
    },
    timer: {
      color: theme.text.primary,
      fontSize: 128,
      fontVariant: ['tabular-nums'],
      fontWeight: '200',
      textAlign: 'center',
      marginVertical: 8,
    },
    elapsedLabel: { color: theme.text.faint, fontSize: 14, fontVariant: ['tabular-nums'] },
    nextBox: {
      marginTop: 24,
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 10,
      backgroundColor: theme.bg.subtle,
      borderWidth: 1,
      borderColor: theme.border.subtle,
      alignItems: 'center',
      gap: 4,
    },
    nextLabel: {
      color: theme.text.faint,
      fontSize: 11,
      textTransform: 'uppercase',
      letterSpacing: 1,
    },
    nextName: { color: theme.text.secondary, fontSize: 16, fontWeight: '500' },
    controls: { gap: 10 },
    mainRow: { flexDirection: 'row', gap: 8 },
    secondaryRow: { flexDirection: 'row', gap: 8 },
    btn: {
      flex: 1,
      backgroundColor: theme.bg.card,
      paddingVertical: 14,
      borderRadius: 10,
      alignItems: 'center',
    },
    btnPrimary: { backgroundColor: theme.accent.primary },
    btnDanger: {
      borderWidth: 1,
      borderColor: theme.status.dangerBorder,
      backgroundColor: 'transparent',
    },
    btnLabel: { color: theme.text.primary, fontSize: 16, fontWeight: '600' },
    btnLabelPrimary: { color: theme.accent.primaryText },
    btnLabelDanger: { color: theme.status.danger },
    backdrop: { flex: 1, backgroundColor: theme.bg.overlay, justifyContent: 'flex-end' },
    sheet: {
      backgroundColor: theme.bg.subtle,
      padding: 20,
      gap: 10,
      borderTopLeftRadius: 16,
      borderTopRightRadius: 16,
    },
    sheetTitle: {
      color: theme.text.primary,
      fontSize: 16,
      fontWeight: '700',
      marginBottom: 4,
      textAlign: 'center',
    },
  });
