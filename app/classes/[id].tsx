import { useCallback, useMemo, useState } from 'react';
import {
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
  softDeleteClass,
  updateClass,
} from '@/db/repos/classes';
import {
  createStudent,
  listStudentsInClass,
  softDeleteStudent,
  updateStudent,
} from '@/db/repos/students';
import type { Class, Student } from '@/db/schema';
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
      if (!active()) return;
      setCls(row);
      setName(row.name);
      setEmail(row.educator_email ?? '');
      setStudents(roster);
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
