import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import {
  getClass,
  setDesignProfile,
  softDeleteClass,
  updateClass,
} from '@/db/repos/classes';
import {
  createStudent,
  listStudentsInClass,
  softDeleteStudent,
  updateStudent,
} from '@/db/repos/students';
import {
  addFeedback,
  listFeedbackForClass,
  softDeleteFeedback,
} from '@/db/repos/designFeedback';
import { consolidateProfile } from '@/llm/profileConsolidator';
import type { Class, DesignFeedback, Student } from '@/db/schema';
import { he } from '@/i18n/he';
import { useBottomInset } from '@/ui/useBottomInset';
import { useTheme } from '@/theme/ThemeProvider';
import type { ThemeTokens } from '@/theme/tokens';

export default function ClassDetail() {
  const router = useRouter();
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { id } = useLocalSearchParams<{ id: string }>();
  const [cls, setCls] = useState<Class | null | 'missing'>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [students, setStudents] = useState<Student[]>([]);
  const [newStudentName, setNewStudentName] = useState('');
  // Learning loop state.
  const [feedback, setFeedback] = useState<DesignFeedback[]>([]);
  const [newFeedback, setNewFeedback] = useState('');
  const [profileDraft, setProfileDraft] = useState('');
  const [consolidating, setConsolidating] = useState(false);
  const bottomPad = useBottomInset();

  const load = useCallback(
    async (active: () => boolean) => {
      const row = await getClass(id);
      if (!active()) return;
      if (!row) {
        setCls('missing');
        return;
      }
      const roster = await listStudentsInClass(id);
      const fb = await listFeedbackForClass(id);
      if (!active()) return;
      setCls(row);
      setName(row.name);
      setEmail(row.educator_email ?? '');
      setStudents(roster);
      setFeedback(fb);
      setProfileDraft(row.design_profile_he ?? '');
    },
    [id],
  );

  useFocusEffect(
    useCallback(() => {
      let live = true;
      load(() => live);
      return () => {
        live = false;
      };
    }, [load]),
  );

  async function reloadStudents() {
    const roster = await listStudentsInClass(id);
    setStudents(roster);
  }

  async function onSave() {
    const trimmedName = name.trim();
    const trimmedEmail = email.trim();
    if (trimmedName.length === 0) return;
    await updateClass(id, {
      name: trimmedName,
      educator_email: trimmedEmail.length > 0 ? trimmedEmail : null,
    });
    router.back();
  }

  function onDelete() {
    Alert.alert(he.classes.deleteConfirm, '', [
      { text: he.classes.cancel, style: 'cancel' },
      {
        text: he.classes.delete,
        style: 'destructive',
        onPress: async () => {
          await softDeleteClass(id);
          router.back();
        },
      },
    ]);
  }

  async function onAddStudent() {
    const label = newStudentName.trim();
    if (label.length === 0) return;
    await createStudent({ class_id: id, display_label: label });
    setNewStudentName('');
    await reloadStudents();
  }

  async function onRenameStudent(studentId: string, nextLabel: string) {
    const label = nextLabel.trim();
    if (label.length === 0) return;
    await updateStudent(studentId, { display_label: label });
    await reloadStudents();
  }

  async function onRemoveStudent(studentId: string) {
    await softDeleteStudent(studentId);
    await reloadStudents();
  }

  // Re-runs the LLM consolidation over the current feedback set and reflects
  // the new profile in the editor. Feedback is already persisted by the time
  // this runs, so a failure here only means "profile not updated yet".
  async function reconsolidate() {
    setConsolidating(true);
    try {
      const profile = await consolidateProfile(id);
      setProfileDraft(profile);
    } catch {
      Alert.alert(he.classes.learningLabel, he.classes.consolidateFailed);
    } finally {
      setConsolidating(false);
    }
  }

  async function onAddFeedback() {
    const text = newFeedback.trim();
    if (text.length === 0) return;
    await addFeedback(id, text);
    setNewFeedback('');
    setFeedback(await listFeedbackForClass(id));
    await reconsolidate();
  }

  async function onRemoveFeedback(feedbackId: string) {
    await softDeleteFeedback(feedbackId);
    setFeedback(await listFeedbackForClass(id));
    await reconsolidate();
  }

  async function onSaveProfile() {
    const trimmed = profileDraft.trim();
    await setDesignProfile(id, trimmed.length > 0 ? trimmed : null);
    Alert.alert(he.classes.learningLabel, he.classes.saveChanges);
  }

  if (cls === null) {
    return (
      <>
        <Stack.Screen options={{ title: he.classes.detailTitle }} />
        <View style={styles.container} />
      </>
    );
  }

  if (cls === 'missing') {
    return (
      <>
        <Stack.Screen options={{ title: he.classes.detailTitle }} />
        <View style={styles.missing}>
          <Text style={styles.missingText}>הכיתה לא נמצאה.</Text>
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: he.classes.detailTitle }} />
      <ScrollView
        style={styles.container}
        contentContainerStyle={[styles.content, bottomPad]}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.fieldLabel}>{he.classes.nameLabel}</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          style={styles.input}
          textAlign="right"
          placeholder={he.classes.namePlaceholder}
          placeholderTextColor={theme.text.faint}
        />

        <Text style={styles.fieldLabel}>{he.classes.emailLabel}</Text>
        <TextInput
          value={email}
          onChangeText={setEmail}
          style={styles.input}
          textAlign="right"
          placeholder={he.classes.emailPlaceholder}
          placeholderTextColor={theme.text.faint}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
        />

        <Text style={[styles.fieldLabel, styles.sectionSpacer]}>
          {he.classes.studentsLabel}
        </Text>
        {students.length === 0 ? (
          <Text style={styles.empty}>{he.classes.studentsEmpty}</Text>
        ) : (
          <View style={styles.studentList}>
            {students.map((s) => (
              <StudentRow
                key={s.id}
                student={s}
                onRename={(label) => onRenameStudent(s.id, label)}
                onRemove={() => onRemoveStudent(s.id)}
                styles={styles}
                placeholderColor={theme.text.faint}
              />
            ))}
          </View>
        )}

        <View style={styles.addStudentRow}>
          <TextInput
            value={newStudentName}
            onChangeText={setNewStudentName}
            style={[styles.input, styles.flex1]}
            textAlign="right"
            placeholder={he.classes.studentNamePlaceholder}
            placeholderTextColor={theme.text.faint}
            onSubmitEditing={onAddStudent}
          />
          <Pressable style={styles.addStudentBtn} onPress={onAddStudent}>
            <Text style={styles.addStudentLabel}>+</Text>
          </Pressable>
        </View>

        {/* ---- Learning loop ---- */}
        <Text style={[styles.fieldLabel, styles.sectionSpacer]}>
          {he.classes.learningLabel}
        </Text>
        <Text style={styles.learningSubtitle}>{he.classes.learningSubtitle}</Text>

        <View style={styles.profileHeader}>
          <Text style={styles.profileLabelText}>{he.classes.profileLabel}</Text>
          {consolidating && (
            <View style={styles.consolidatingRow}>
              <ActivityIndicator size="small" color={theme.accent.link} />
              <Text style={styles.consolidatingText}>{he.classes.consolidating}</Text>
            </View>
          )}
        </View>
        <TextInput
          value={profileDraft}
          onChangeText={setProfileDraft}
          style={[styles.input, styles.profileBox]}
          textAlign="right"
          textAlignVertical="top"
          multiline
          editable={!consolidating}
          placeholder={
            feedback.length === 0
              ? he.classes.profileEmpty
              : he.classes.profilePlaceholder
          }
          placeholderTextColor={theme.text.faint}
        />
        <Pressable style={styles.secondaryBtn} onPress={onSaveProfile}>
          <Text style={styles.secondaryBtnLabel}>{he.classes.saveProfile}</Text>
        </Pressable>

        <View style={styles.addStudentRow}>
          <TextInput
            value={newFeedback}
            onChangeText={setNewFeedback}
            style={[styles.input, styles.flex1]}
            textAlign="right"
            placeholder={he.classes.feedbackPlaceholder}
            placeholderTextColor={theme.text.faint}
            onSubmitEditing={onAddFeedback}
          />
          <Pressable style={styles.addStudentBtn} onPress={onAddFeedback}>
            <Text style={styles.addStudentLabel}>+</Text>
          </Pressable>
        </View>
        <Text style={styles.piiHint}>{he.classes.feedbackPiiHint}</Text>

        {feedback.length > 0 && (
          <>
            <Text style={[styles.fieldLabel, styles.feedbackHistoryLabel]}>
              {he.classes.feedbackHistory}
            </Text>
            <View style={styles.studentList}>
              {feedback.map((f) => (
                <View key={f.id} style={styles.feedbackRow}>
                  <Text style={styles.feedbackText}>{f.text_he}</Text>
                  <Pressable
                    onPress={() => onRemoveFeedback(f.id)}
                    hitSlop={12}
                    style={styles.removeBtn}
                  >
                    <Text style={styles.removeLabel}>×</Text>
                  </Pressable>
                </View>
              ))}
            </View>
          </>
        )}

        <Pressable style={styles.primaryBtn} onPress={onSave}>
          <Text style={styles.primaryBtnLabel}>{he.classes.saveChanges}</Text>
        </Pressable>

        <Pressable style={styles.dangerBtn} onPress={onDelete}>
          <Text style={styles.dangerBtnLabel}>{he.classes.delete}</Text>
        </Pressable>
      </ScrollView>
    </>
  );
}

type S = ReturnType<typeof createStyles>;

function StudentRow({
  student,
  onRename,
  onRemove,
  styles,
  placeholderColor,
}: {
  student: Student;
  onRename: (next: string) => void;
  onRemove: () => void;
  styles: S;
  placeholderColor: string;
}) {
  const [value, setValue] = useState(student.display_label);
  return (
    <View style={styles.studentRow}>
      <TextInput
        value={value}
        onChangeText={setValue}
        onEndEditing={() => {
          if (value.trim() !== student.display_label) onRename(value);
        }}
        style={[styles.input, styles.flex1]}
        textAlign="right"
        placeholderTextColor={placeholderColor}
      />
      <Pressable onPress={onRemove} hitSlop={12} style={styles.removeBtn}>
        <Text style={styles.removeLabel}>×</Text>
      </Pressable>
    </View>
  );
}

const createStyles = (theme: ThemeTokens) =>
  StyleSheet.create({
    container: { flex: 1 },
    content: { padding: 20, gap: 10 },
    missing: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.bg.app,
    },
    missingText: { color: theme.text.muted, fontSize: 16 },
    fieldLabel: { color: theme.text.muted, fontSize: 14, marginTop: 6 },
    sectionSpacer: { marginTop: 20 },
    input: {
      backgroundColor: theme.bg.input,
      color: theme.text.primary,
      padding: 12,
      borderRadius: 8,
      fontSize: 16,
    },
    flex1: { flex: 1 },
    empty: {
      color: theme.text.muted,
      fontSize: 14,
      textAlign: 'center',
      paddingVertical: 12,
    },
    studentList: { gap: 8 },
    studentRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
    removeBtn: {
      width: 44,
      height: 44,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: theme.status.dangerBorder,
      alignItems: 'center',
      justifyContent: 'center',
    },
    removeLabel: { color: theme.status.danger, fontSize: 22, lineHeight: 24 },
    addStudentRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
    addStudentBtn: {
      width: 44,
      height: 44,
      borderRadius: 8,
      backgroundColor: theme.accent.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    addStudentLabel: { color: theme.accent.primaryText, fontSize: 22, lineHeight: 24 },
    learningSubtitle: {
      color: theme.text.muted,
      fontSize: 13,
      lineHeight: 19,
      marginTop: 2,
      marginBottom: 6,
    },
    profileHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: 4,
    },
    profileLabelText: { color: theme.text.secondary, fontSize: 14, fontWeight: '600' },
    consolidatingRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    consolidatingText: { color: theme.accent.link, fontSize: 12 },
    profileBox: { minHeight: 96, lineHeight: 22 },
    secondaryBtn: {
      padding: 12,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: theme.border.default,
      alignItems: 'center',
      marginTop: 4,
    },
    secondaryBtnLabel: { color: theme.text.secondary, fontSize: 14, fontWeight: '600' },
    piiHint: { color: theme.text.faint, fontSize: 12, marginTop: 4 },
    feedbackHistoryLabel: { marginTop: 14 },
    feedbackRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: theme.bg.card,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: theme.border.subtle,
      paddingHorizontal: 12,
      paddingVertical: 4,
    },
    feedbackText: {
      flex: 1,
      color: theme.text.secondary,
      fontSize: 14,
      lineHeight: 20,
      paddingVertical: 6,
    },
    primaryBtn: {
      backgroundColor: theme.accent.primary,
      padding: 14,
      borderRadius: 10,
      alignItems: 'center',
      marginTop: 20,
    },
    primaryBtnLabel: { color: theme.accent.primaryText, fontSize: 16, fontWeight: '600' },
    dangerBtn: {
      padding: 14,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: theme.status.dangerBorder,
      alignItems: 'center',
      marginTop: 8,
    },
    dangerBtnLabel: { color: theme.status.danger, fontSize: 16, fontWeight: '600' },
  });
