import { useEffect, useRef, useState } from 'react';
import { AppState, Pressable, StyleSheet, Text, View } from 'react-native';
import { Stack } from 'expo-router';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { he } from '@/i18n/he';
import {
  advanceIfComplete,
  createBlock,
  createRunner,
  elapsedMs,
  isRunning,
  pauseRunner,
  remainingMs,
  skipToNext,
  startRunner,
  type RunnerState,
} from '@/runner/wallClock';
import { clearRunner, loadRunner, saveRunner } from '@/runner/persistence';

const SEED_BLOCKS = () => [
  createBlock('raise', he.timerSpike.raise, 30),
  createBlock('activate', he.timerSpike.activate, 30),
  createBlock('mobilize', he.timerSpike.mobilize, 30),
  createBlock('potentiate', he.timerSpike.potentiate, 30),
];

export default function TimerSpike() {
  const [runner, setRunner] = useState<RunnerState>(() =>
    createRunner('spike-' + Date.now(), SEED_BLOCKS()),
  );
  const [, force] = useState(0);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    loadRunner().then((saved) => {
      if (saved) setRunner(advanceIfComplete(saved, Date.now()));
    });
    activateKeepAwakeAsync('timer-spike').catch(() => {});
    return () => {
      deactivateKeepAwake('timer-spike');
    };
  }, []);

  useEffect(() => {
    saveRunner(runner).catch(() => {});
  }, [runner]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => {
      if (next === 'active') {
        setRunner((r) => advanceIfComplete(r, Date.now()));
      }
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    const current = runner.blocks[runner.currentIdx]!;
    if (isRunning(current) && runner.finishedAt === null) {
      tickRef.current = setInterval(() => {
        setRunner((r) => advanceIfComplete(r, Date.now()));
        force((n) => n + 1);
      }, 250);
    }
    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
      tickRef.current = null;
    };
  }, [runner.currentIdx, runner.finishedAt, isRunning(runner.blocks[runner.currentIdx]!)]);

  const now = Date.now();
  const current = runner.blocks[runner.currentIdx]!;
  const remainingS = Math.max(0, Math.ceil(remainingMs(current, now) / 1000));
  const elapsedS = Math.floor(elapsedMs(current, now) / 1000);
  const running = isRunning(current);
  const finished = runner.finishedAt !== null;

  return (
    <>
      <Stack.Screen options={{ title: he.timerSpike.title }} />
      <View style={styles.container}>
        <Text style={styles.blockLabel}>{he.timerSpike.block}</Text>
        <Text style={styles.blockName}>{current.name}</Text>

        <View style={styles.timerRow}>
          <View style={styles.timerCol}>
            <Text style={styles.timerLabel}>{he.timerSpike.remaining}</Text>
            <Text style={styles.timerValue}>{formatMMSS(remainingS)}</Text>
          </View>
          <View style={styles.timerCol}>
            <Text style={styles.timerLabel}>{he.timerSpike.elapsed}</Text>
            <Text style={styles.timerValueSmall}>{formatMMSS(elapsedS)}</Text>
          </View>
        </View>

        <Text style={styles.steps}>
          שלב {runner.currentIdx + 1} מתוך {runner.blocks.length}
        </Text>

        <View style={styles.controls}>
          {finished ? (
            <Btn
              label={he.timerSpike.reset}
              onPress={async () => {
                await clearRunner();
                setRunner(createRunner('spike-' + Date.now(), SEED_BLOCKS()));
              }}
            />
          ) : !running ? (
            <Btn
              label={elapsedS > 0 ? he.timerSpike.resume : he.timerSpike.start}
              onPress={() => setRunner(startRunner(runner, Date.now()))}
              primary
            />
          ) : (
            <Btn
              label={he.timerSpike.pause}
              onPress={() => setRunner(pauseRunner(runner, Date.now()))}
            />
          )}
          {!finished && (
            <Btn label="דלג" onPress={() => setRunner(skipToNext(runner, Date.now()))} />
          )}
          <Btn
            label={he.timerSpike.reset}
            onPress={async () => {
              await clearRunner();
              setRunner(createRunner('spike-' + Date.now(), SEED_BLOCKS()));
            }}
          />
        </View>

        <Text style={styles.explainer}>{he.timerSpike.explainer}</Text>
      </View>
    </>
  );
}

function formatMMSS(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${pad(m)}:${pad(s)}`;
}

function pad(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

function Btn({
  label,
  onPress,
  primary,
}: {
  label: string;
  onPress: () => void;
  primary?: boolean;
}) {
  return (
    <Pressable onPress={onPress} style={[styles.btn, primary && styles.btnPrimary]}>
      <Text style={[styles.btnLabel, primary && styles.btnLabelPrimary]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, justifyContent: 'center', gap: 16 },
  blockLabel: { color: '#a0a0a8', fontSize: 14, textAlign: 'center' },
  blockName: { color: '#f5f5f5', fontSize: 32, fontWeight: '700', textAlign: 'center' },
  timerRow: { flexDirection: 'row', gap: 16, justifyContent: 'center', marginTop: 12 },
  timerCol: { flex: 1, alignItems: 'center', gap: 4 },
  timerLabel: { color: '#a0a0a8', fontSize: 12 },
  timerValue: { color: '#f5f5f5', fontSize: 80, fontVariant: ['tabular-nums'], fontWeight: '300' },
  timerValueSmall: {
    color: '#a0a0a8',
    fontSize: 36,
    fontVariant: ['tabular-nums'],
    fontWeight: '300',
  },
  steps: { color: '#a0a0a8', textAlign: 'center' },
  controls: { flexDirection: 'row', gap: 8, justifyContent: 'center', marginTop: 12 },
  btn: { backgroundColor: '#23232a', paddingHorizontal: 18, paddingVertical: 12, borderRadius: 10 },
  btnPrimary: { backgroundColor: '#3b82f6' },
  btnLabel: { color: '#f5f5f5', fontSize: 16, fontWeight: '600' },
  btnLabelPrimary: { color: '#fff' },
  explainer: { color: '#6a6a72', fontSize: 12, textAlign: 'center', marginTop: 24, lineHeight: 18 },
});
