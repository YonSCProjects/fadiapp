import { useState } from 'react';
import { I18nManager, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Stack } from 'expo-router';
import { he } from '@/i18n/he';

const GRADES = ['ז', 'ח', 'ט', 'י', 'יא', 'יב'];
const DURATIONS = [30, 45, 60, 90];

export default function RtlSpike() {
  const [grade, setGrade] = useState<string>('ט');
  const [duration, setDuration] = useState<number>(45);
  const [students, setStudents] = useState<string>('28');
  const [goal, setGoal] = useState<string>('');

  return (
    <>
      <Stack.Screen options={{ title: he.rtlSpike.title }} />
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.directionBadge}>
          <Text style={styles.directionLabel}>{he.rtlSpike.direction}: </Text>
          <Text style={styles.directionValue}>
            {I18nManager.isRTL ? he.rtlSpike.rtl : he.rtlSpike.ltr}
          </Text>
        </View>

        <Field label={he.rtlSpike.grade}>
          <Chips
            options={GRADES}
            value={grade}
            onChange={setGrade}
            renderLabel={(g) => `כיתה ${g}`}
          />
        </Field>

        <Field label={he.rtlSpike.duration}>
          <Chips
            options={DURATIONS}
            value={duration}
            onChange={setDuration}
            renderLabel={(d) => `${d}`}
          />
        </Field>

        <Field label={he.rtlSpike.students}>
          <TextInput
            value={students}
            onChangeText={setStudents}
            keyboardType="number-pad"
            style={styles.input}
            placeholderTextColor="#6a6a72"
          />
        </Field>

        <Field label={he.rtlSpike.goal}>
          <TextInput
            value={goal}
            onChangeText={setGoal}
            placeholder={he.rtlSpike.goalPlaceholder}
            placeholderTextColor="#6a6a72"
            style={[styles.input, styles.textarea]}
            multiline
            textAlign="right"
          />
        </Field>

        <View style={styles.summary}>
          <Text style={styles.summaryHeader}>{he.rtlSpike.summary}</Text>
          <Text style={styles.summaryLine}>
            כיתה {grade} · {duration} דקות · {students} תלמידים
          </Text>
          {goal ? <Text style={styles.summaryLine}>{goal}</Text> : null}
        </View>
      </ScrollView>
    </>
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

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20, gap: 16 },
  directionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#23232a',
    padding: 12,
    borderRadius: 8,
  },
  directionLabel: { color: '#a0a0a8' },
  directionValue: { color: '#f5f5f5', fontWeight: '700' },
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
  summary: {
    marginTop: 8,
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#1a1a20',
    borderWidth: 1,
    borderColor: '#2a2a32',
  },
  summaryHeader: { color: '#a0a0a8', fontSize: 12, marginBottom: 8 },
  summaryLine: { color: '#f5f5f5', fontSize: 16 },
});
