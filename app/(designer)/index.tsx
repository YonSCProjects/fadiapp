import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { he } from '@/i18n/he';
import { designLesson, resolveActivityRefs, type GeneratedLesson } from '@/llm/designer';
import type { DesignerConstraints } from '@/llm/prompts/he/lessonDesigner';
import { createLesson } from '@/db/repos/lessons';
import type { Activity, PedagogicalModel } from '@/db/schema';
import { and, inArray, isNull } from 'drizzle-orm';
import { activities } from '@/db/schema';
import { db } from '@/db/client';
import { useBottomInset } from '@/ui/useBottomInset';
import { LessonBlocksView } from '@/ui/LessonBlocksView';

const GRADES = [7, 8, 9, 10, 11, 12] as const;
const DURATIONS = [30, 45, 60, 90] as const;
const ENVIRONMENTS: Array<{ key: 'gym' | 'outdoor' | 'studio'; label: string }> = [
  { key: 'gym', label: he.designer.envGym },
  { key: 'outdoor', label: he.designer.envOutdoor },
  { key: 'studio', label: he.designer.envStudio },
];

const EQUIPMENT_OPTIONS = [
  'כדורסל',
  'כדורגל',
  'כדורעף',
  'כדוריד',
  'חבלי קפיצה',
  'קונוסים',
  'מחצלות',
  'שער',
  'פריסבי',
  'כדורי קצף',
];

const MODEL_OPTIONS: Array<{ key: PedagogicalModel | 'auto'; label: string }> = [
  { key: 'auto', label: he.designer.modelAuto },
  { key: 'tgfu', label: 'TGfU — למידה מבוססת משחק' },
  { key: 'sport-education', label: 'חינוך ספורטיבי' },
  { key: 'tpsr', label: 'אחריות (TPSR)' },
  { key: 'skill-themes', label: 'נושאי מיומנויות' },
  { key: 'cooperative', label: 'למידה שיתופית' },
];

type Phase = 'gather' | 'generating' | 'preview' | 'saved' | 'error';

export default function DesignerHome() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>('gather');
  const [error, setError] = useState<string | null>(null);
  const [lesson, setLesson] = useState<GeneratedLesson | null>(null);
  const [whitelist, setWhitelist] = useState<Activity[]>([]);
  const [streamedText, setStreamedText] = useState<string>('');
  const [streamedChars, setStreamedChars] = useState<number>(0);
  const centerPad = useBottomInset();

  // Form state
  const [grade, setGrade] = useState<number>(9);
  const [durationMin, setDurationMin] = useState<30 | 45 | 60 | 90>(45);
  const [environment, setEnvironment] = useState<'gym' | 'outdoor' | 'studio'>('gym');
  const [classSize, setClassSize] = useState<string>('28');
  const [goalHe, setGoalHe] = useState<string>('');
  const [equipment, setEquipment] = useState<Set<string>>(new Set());
  const [preferredModel, setPreferredModel] = useState<PedagogicalModel | 'auto'>('auto');
  const [specialHe, setSpecialHe] = useState<string>('');

  const canGenerate = useMemo(
    () => goalHe.trim().length >= 5 && Number(classSize) > 0,
    [goalHe, classSize],
  );

  async function onGenerate() {
    setError(null);
    setStreamedText('');
    setStreamedChars(0);
    setPhase('generating');
    let buffered = '';
    try {
      const constraints: DesignerConstraints = {
        grade,
        durationMin,
        environment,
        classSize: Number(classSize),
        goalHe: goalHe.trim(),
        equipmentAvailableHe: Array.from(equipment),
        preferredModel,
        specialConsiderationsHe: specialHe.trim() || undefined,
      };
      const result = await designLesson(constraints, {
        onTextDelta: (delta) => {
          buffered += delta;
          // Keep only the last 600 chars in state — enough for a feel-alive
          // preview without forcing a big re-render on every delta.
          setStreamedText(buffered.length > 600 ? buffered.slice(-600) : buffered);
          setStreamedChars(buffered.length);
        },
      });
      setLesson(result.lesson);
      setWhitelist(
        await db
          .select()
          .from(activities)
          .where(
            and(
              isNull(activities.deleted_at),
              inArray(activities.environment, [environment, 'any']),
            ),
          ),
      );
      setPhase('preview');
    } catch (e) {
      setError(String(e));
      setPhase('error');
    }
  }

  async function onSave() {
    if (!lesson) return;
    const resolved = resolveActivityRefs(lesson, whitelist);
    const saved = await createLesson({
      title_he: resolved.title_he,
      grade_band: resolved.grade_band,
      duration_min: resolved.duration_min,
      goal_he: resolved.goal_he,
      equipment_json: resolved.equipment_json,
      environment: resolved.environment,
      pedagogical_model: resolved.pedagogical_model,
      blocks_json: resolved.blocks_json,
      safety_notes_he: resolved.safety_notes_he,
      pedagogical_rationale_he: resolved.pedagogical_rationale_he,
      source: 'llm',
      llm_model_used: 'claude-sonnet-4-6',
    });
    router.replace(`/lessons/${saved.id}` as never);
  }

  function reset() {
    setPhase('gather');
    setLesson(null);
    setError(null);
  }

  return (
    <>
      <Stack.Screen options={{ title: he.designer.title }} />
      {phase === 'gather' && (
        <GatherForm
          grade={grade}
          setGrade={setGrade}
          durationMin={durationMin}
          setDurationMin={setDurationMin}
          environment={environment}
          setEnvironment={setEnvironment}
          classSize={classSize}
          setClassSize={setClassSize}
          goalHe={goalHe}
          setGoalHe={setGoalHe}
          equipment={equipment}
          setEquipment={setEquipment}
          preferredModel={preferredModel}
          setPreferredModel={setPreferredModel}
          specialHe={specialHe}
          setSpecialHe={setSpecialHe}
          canGenerate={canGenerate}
          onGenerate={onGenerate}
        />
      )}

      {phase === 'generating' && (
        <View style={[styles.generatingContainer, centerPad]}>
          <View style={styles.generatingHeader}>
            <ActivityIndicator color="#3b82f6" />
            <Text style={styles.genTitle}>{he.designer.generating}</Text>
            <Text style={styles.genSub}>
              {streamedChars > 0 ? `${streamedChars} תווים` : he.designer.generatingSub}
            </Text>
          </View>
          {streamedText.length > 0 && (
            <ScrollView style={styles.streamView} contentContainerStyle={styles.streamContent}>
              <Text style={styles.streamText} selectable>
                {streamedText}
              </Text>
            </ScrollView>
          )}
        </View>
      )}

      {phase === 'error' && (
        <View style={[styles.center, centerPad]}>
          <Text style={styles.errorText}>
            {he.designer.errorPrefix}
            {error}
          </Text>
          <View style={styles.row}>
            <Btn label={he.designer.regenerate} onPress={reset} primary />
          </View>
        </View>
      )}

      {phase === 'preview' && lesson && (
        <LessonPreview
          lesson={lesson}
          whitelist={whitelist}
          onSave={onSave}
          onRegen={reset}
        />
      )}

      {phase === 'saved' && (
        <View style={[styles.center, centerPad]}>
          <Text style={styles.savedTitle}>{he.designer.saved}</Text>
          <View style={styles.row}>
            <Btn label={he.designer.saveAndNew} onPress={reset} primary />
            <Btn label="חזרה לבית" onPress={() => router.replace('/')} />
          </View>
        </View>
      )}
    </>
  );
}

function GatherForm(props: {
  grade: number;
  setGrade: (n: number) => void;
  durationMin: 30 | 45 | 60 | 90;
  setDurationMin: (n: 30 | 45 | 60 | 90) => void;
  environment: 'gym' | 'outdoor' | 'studio';
  setEnvironment: (e: 'gym' | 'outdoor' | 'studio') => void;
  classSize: string;
  setClassSize: (s: string) => void;
  goalHe: string;
  setGoalHe: (s: string) => void;
  equipment: Set<string>;
  setEquipment: (s: Set<string>) => void;
  preferredModel: PedagogicalModel | 'auto';
  setPreferredModel: (m: PedagogicalModel | 'auto') => void;
  specialHe: string;
  setSpecialHe: (s: string) => void;
  canGenerate: boolean;
  onGenerate: () => void;
}) {
  const toggleEq = (item: string) => {
    const next = new Set(props.equipment);
    if (next.has(item)) next.delete(item);
    else next.add(item);
    props.setEquipment(next);
  };
  const bottomPad = useBottomInset();

  return (
    <ScrollView style={styles.container} contentContainerStyle={[styles.content, bottomPad]}>
      <Field label={he.designer.grade}>
        <Chips
          options={GRADES as unknown as number[]}
          value={props.grade}
          onChange={props.setGrade}
          renderLabel={(g) => `כיתה ${g}`}
        />
      </Field>

      <Field label={he.designer.duration}>
        <Chips
          options={DURATIONS as unknown as number[]}
          value={props.durationMin}
          onChange={(v) => props.setDurationMin(v as 30 | 45 | 60 | 90)}
          renderLabel={(d) => `${d}`}
        />
      </Field>

      <Field label={he.designer.environment}>
        <Chips
          options={ENVIRONMENTS.map((e) => e.key)}
          value={props.environment}
          onChange={props.setEnvironment}
          renderLabel={(k) => ENVIRONMENTS.find((e) => e.key === k)?.label ?? k}
        />
      </Field>

      <Field label={he.designer.classSize}>
        <TextInput
          value={props.classSize}
          onChangeText={props.setClassSize}
          keyboardType="number-pad"
          style={styles.input}
        />
      </Field>

      <Field label={he.designer.goal}>
        <TextInput
          value={props.goalHe}
          onChangeText={props.setGoalHe}
          placeholder={he.designer.goalPlaceholder}
          placeholderTextColor="#6a6a72"
          style={[styles.input, styles.textarea]}
          multiline
          textAlign="right"
        />
      </Field>

      <Field label={he.designer.equipment}>
        <View style={styles.chipsRow}>
          {EQUIPMENT_OPTIONS.map((item) => {
            const selected = props.equipment.has(item);
            return (
              <Text
                key={item}
                onPress={() => toggleEq(item)}
                style={[styles.chip, selected && styles.chipSelected]}
              >
                {item}
              </Text>
            );
          })}
        </View>
      </Field>

      <Field label={he.designer.preferredModel}>
        <View style={styles.chipsRow}>
          {MODEL_OPTIONS.map((m) => {
            const selected = props.preferredModel === m.key;
            return (
              <Text
                key={m.key}
                onPress={() => props.setPreferredModel(m.key)}
                style={[styles.chip, selected && styles.chipSelected]}
              >
                {m.label}
              </Text>
            );
          })}
        </View>
      </Field>

      <Field label={he.designer.specialConsiderations}>
        <TextInput
          value={props.specialHe}
          onChangeText={props.setSpecialHe}
          placeholder={he.designer.specialPlaceholder}
          placeholderTextColor="#6a6a72"
          style={[styles.input, styles.textarea]}
          multiline
          textAlign="right"
        />
      </Field>

      <Btn
        label={he.designer.generate}
        onPress={props.onGenerate}
        primary
        disabled={!props.canGenerate}
      />
    </ScrollView>
  );
}

function LessonPreview({
  lesson,
  whitelist,
  onSave,
  onRegen,
}: {
  lesson: GeneratedLesson;
  whitelist: Activity[];
  onSave: () => void;
  onRegen: () => void;
}) {
  // Preview uses source_refs (what the LLM returned); detail screen later
  // resolves them to real activity IDs before persisting.
  const refToName = new Map(whitelist.map((a) => [a.source_ref ?? a.id, a.name_he]));
  const bottomPad = useBottomInset();

  return (
    <ScrollView style={styles.container} contentContainerStyle={[styles.content, bottomPad]}>
      <Text style={styles.lessonTitle}>{lesson.title_he}</Text>
      <Text style={styles.lessonMeta}>
        כיתה {lesson.grade_band} · {lesson.duration_min} דק׳ · {lesson.pedagogical_model}
      </Text>
      <Text style={styles.lessonGoal}>{lesson.goal_he}</Text>

      <LessonBlocksView
        blocks={lesson.blocks_json}
        activityIdToName={refToName}
        safetyNotes={lesson.safety_notes_he}
        rationale={lesson.pedagogical_rationale_he}
      />

      <View style={styles.row}>
        <Btn label={he.designer.save} onPress={onSave} primary />
        <Btn label={he.designer.regenerate} onPress={onRegen} />
      </View>
    </ScrollView>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {children}
    </View>
  );
}

function Chips<T extends string | number>({
  options,
  value,
  onChange,
  renderLabel,
}: {
  options: readonly T[];
  value: T;
  onChange: (v: T) => void;
  renderLabel: (v: T) => string;
}) {
  return (
    <View style={styles.chipsRow}>
      {options.map((opt) => {
        const selected = opt === value;
        return (
          <Text
            key={String(opt)}
            onPress={() => onChange(opt)}
            style={[styles.chip, selected && styles.chipSelected]}
          >
            {renderLabel(opt)}
          </Text>
        );
      })}
    </View>
  );
}

function Btn({
  label,
  onPress,
  primary,
  disabled,
}: {
  label: string;
  onPress: () => void;
  primary?: boolean;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={[styles.btn, primary && styles.btnPrimary, disabled && styles.btnDisabled]}
    >
      <Text style={[styles.btnLabel, primary && styles.btnLabelPrimary]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20, gap: 14 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 },
  generatingContainer: { flex: 1, padding: 20, gap: 16 },
  generatingHeader: { alignItems: 'center', gap: 8, paddingVertical: 16 },
  genTitle: { color: '#f5f5f5', fontSize: 18, marginTop: 12 },
  genSub: { color: '#a0a0a8', fontSize: 12, fontVariant: ['tabular-nums'] },
  streamView: {
    flex: 1,
    backgroundColor: '#0a0a10',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#1a1a20',
  },
  streamContent: { padding: 12 },
  streamText: {
    color: '#86efac',
    fontFamily: 'Courier',
    fontSize: 12,
    lineHeight: 18,
  },
  errorText: { color: '#ff8a8a', lineHeight: 22, textAlign: 'center' },
  savedTitle: { color: '#86efac', fontSize: 22, fontWeight: '700' },
  field: { gap: 8 },
  fieldLabel: { color: '#a0a0a8', fontSize: 14 },
  input: {
    backgroundColor: '#23232a',
    color: '#f5f5f5',
    padding: 12,
    borderRadius: 8,
    fontSize: 16,
  },
  textarea: { minHeight: 80, textAlignVertical: 'top' },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    backgroundColor: '#23232a',
    color: '#f5f5f5',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    overflow: 'hidden',
  },
  chipSelected: { backgroundColor: '#3b82f6', color: '#ffffff' },
  row: { flexDirection: 'row', gap: 8, marginTop: 12 },
  btn: {
    flex: 1,
    backgroundColor: '#23232a',
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  btnPrimary: { backgroundColor: '#3b82f6' },
  btnDisabled: { opacity: 0.4 },
  btnLabel: { color: '#f5f5f5', fontSize: 16, fontWeight: '600' },
  btnLabelPrimary: { color: '#fff' },
  lessonTitle: { color: '#f5f5f5', fontSize: 24, fontWeight: '700' },
  lessonMeta: { color: '#a0a0a8', fontSize: 12 },
  lessonGoal: { color: '#e0e0e8', fontSize: 16, lineHeight: 22 },
  section: { gap: 8, marginTop: 12 },
  sectionLabel: { color: '#a0a0a8', fontSize: 12, textTransform: 'uppercase', letterSpacing: 1 },
  block: {
    backgroundColor: '#1a1a20',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#2a2a32',
    gap: 6,
  },
  blockHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  blockName: { color: '#f5f5f5', fontSize: 16, fontWeight: '600' },
  blockDuration: { color: '#a0a0a8', fontSize: 14 },
  blockActivities: { color: '#c0c0c8', fontSize: 14 },
  blockCues: { color: '#86efac', fontSize: 13, fontStyle: 'italic' },
  blockNotes: { color: '#a0a0a8', fontSize: 13 },
  safetyNote: { color: '#fbbf24', fontSize: 14, lineHeight: 20 },
  bodyText: { color: '#e0e0e8', fontSize: 14, lineHeight: 20 },
});
