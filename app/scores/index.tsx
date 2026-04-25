import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Stack } from 'expo-router';
import { and, eq, isNull } from 'drizzle-orm';
import * as MailComposer from 'expo-mail-composer';
import { db } from '@/db/client';
import { listClasses } from '@/db/repos/classes';
import { listStudentsInClass } from '@/db/repos/students';
import {
  saveSessionScores,
  totalForRow,
  type ScoreInput,
} from '@/db/repos/classScores';
import { class_scores, type Class, type Student } from '@/db/schema';
import { clearTokenSet } from '@/sync/tokenStore';
import { getValidToken } from '@/sync/tokenRefresh';
import {
  ensureScoresSheet,
  getShareUrl,
  pushSessionRows,
  type ScoreSheetRow,
} from '@/sync/scoresSheet';
import { he } from '@/i18n/he';
import { useBottomInset } from '@/ui/useBottomInset';
import { useTheme } from '@/theme/ThemeProvider';
import type { ThemeTokens } from '@/theme/tokens';

type Row = {
  studentId: string;
  label: string;
  present: boolean;
  entry: number;
  attendance: number;
  execution: number;
  atmosphere: number;
  personal_goal: number;
  bonus: number;
};

const PERIODS = [1, 2, 3, 4, 5] as const;

function todayIso(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function addDays(iso: string, delta: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(y!, m! - 1, d!);
  dt.setDate(dt.getDate() + delta);
  const yyyy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, '0');
  const dd = String(dt.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function prettyDate(iso: string): string {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

export default function ScoresScreen() {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const bottomPad = useBottomInset();

  const [classes, setClasses] = useState<Class[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [period, setPeriod] = useState<number>(1);
  const [date, setDate] = useState<string>(todayIso());
  const [students, setStudents] = useState<Student[]>([]);
  const [rows, setRows] = useState<Row[]>([]);
  const [classPickerOpen, setClassPickerOpen] = useState(false);
  const [periodPickerOpen, setPeriodPickerOpen] = useState(false);
  const [sending, setSending] = useState(false);
  // True if scores already exist locally for the current (class, date, period)
  // — used to mark the email as an update rather than a fresh report.
  const [isUpdate, setIsUpdate] = useState(false);

  useEffect(() => {
    (async () => {
      const cs = await listClasses();
      setClasses(cs);
      if (cs.length > 0 && selectedClassId === null) {
        setSelectedClassId(cs[0]!.id);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reload roster + existing scores whenever session key changes.
  const loadSession = useCallback(async () => {
    if (!selectedClassId) {
      setStudents([]);
      setRows([]);
      return;
    }
    const roster = await listStudentsInClass(selectedClassId);
    setStudents(roster);

    const existing = await db
      .select()
      .from(class_scores)
      .where(
        and(
          eq(class_scores.class_id, selectedClassId),
          eq(class_scores.date, date),
          eq(class_scores.period, period),
          isNull(class_scores.deleted_at),
        ),
      );
    setIsUpdate(existing.length > 0);
    const byStudent = new Map(existing.map((e) => [e.student_id, e]));
    setRows(
      roster.map((s) => {
        const e = byStudent.get(s.id);
        return {
          studentId: s.id,
          label: s.display_label,
          present: true,
          entry: e?.entry ?? 0,
          attendance: e?.attendance ?? 0,
          execution: e?.execution ?? 0,
          atmosphere: e?.atmosphere ?? 0,
          personal_goal: e?.personal_goal ?? 0,
          bonus: e?.bonus ?? 0,
        };
      }),
    );
  }, [selectedClassId, date, period]);

  useEffect(() => {
    loadSession();
  }, [loadSession]);

  const selectedClass = useMemo(
    () => classes.find((c) => c.id === selectedClassId) ?? null,
    [classes, selectedClassId],
  );

  function setRowField(studentId: string, field: keyof Row, value: Row[keyof Row]) {
    setRows((prev) =>
      prev.map((r) => (r.studentId === studentId ? { ...r, [field]: value } : r)),
    );
  }

  async function onSend() {
    if (!selectedClass) return;
    if (rows.length === 0) {
      Alert.alert(he.scores.title, he.scores.noStudentsForClass);
      return;
    }
    if (!selectedClass.educator_email) {
      Alert.alert(he.scores.title, he.scores.noEmailForClass);
      return;
    }

    setSending(true);
    try {
      // Save all attending students' scores locally (upsert by session).
      const attendingRows: ScoreInput[] = rows
        .filter((r) => r.present)
        .map((r) => ({
          class_id: selectedClass.id,
          student_id: r.studentId,
          date,
          period,
          entry: r.entry,
          attendance: r.attendance,
          execution: r.execution,
          atmosphere: r.atmosphere,
          personal_goal: r.personal_goal,
          bonus: r.bonus,
        }));
      await saveSessionScores(attendingRows);

      // Best-effort sync to Google Sheets. If the teacher hasn't connected
      // Drive (or the sync errors out), fall back to email-only.
      let shareUrl: string | null = null;
      let sheetWarning: string | null = null;
      const token = await getValidToken();
      if (token) {
        try {
          const spreadsheetId = await ensureScoresSheet(token);
          const sheetRows: ScoreSheetRow[] = rows
            .filter((r) => r.present)
            .map((r) => ({
              date,
              studentLabel: r.label,
              period,
              entry: r.entry,
              attendance: r.attendance,
              execution: r.execution,
              atmosphere: r.atmosphere,
              personal_goal: r.personal_goal,
              bonus: r.bonus,
            }));
          await pushSessionRows(token, spreadsheetId, selectedClass.name, sheetRows);
          shareUrl = getShareUrl(spreadsheetId);
        } catch (err) {
          const errStr = String(err);
          // Token expired (very common — Google access tokens last ~1 hour).
          // Clear the stale token so the next attempt starts from a clean
          // state, and surface a Hebrew message instead of the raw JSON.
          if (errStr.includes('401')) {
            await clearTokenSet();
            sheetWarning = he.scores.sheetTokenExpired;
          } else {
            sheetWarning = `${he.scores.sheetSyncFailed}\n${errStr}`;
          }
        }
      } else {
        sheetWarning = he.scores.sheetNoDriveToken;
      }

      const available = await MailComposer.isAvailableAsync();
      if (!available) {
        Alert.alert(he.scores.title, he.scores.noMailApp);
        setSending(false);
        return;
      }

      const subject =
        (isUpdate ? he.scores.mailSubjectUpdatePrefix : '') +
        he.scores.mailSubject(selectedClass.name, prettyDate(date), period);
      const result = await MailComposer.composeAsync({
        recipients: [selectedClass.educator_email],
        subject,
        body: buildMailBody(
          selectedClass.name,
          date,
          period,
          rows,
          shareUrl,
          isUpdate,
        ),
        isHtml: false,
      });

      if (result.status === 'sent') {
        Alert.alert(he.scores.title, he.scores.sentOk);
        // Subsequent sends for this same session are now updates.
        setIsUpdate(true);
      } else if (result.status === 'cancelled') {
        Alert.alert(he.scores.title, he.scores.sendCancelled);
      }
      if (sheetWarning) Alert.alert(he.scores.title, sheetWarning);
    } catch (err) {
      Alert.alert(he.scores.title, String(err));
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      <Stack.Screen options={{ title: he.scores.title }} />
      {classes.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>{he.scores.noClasses}</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.container}
          contentContainerStyle={[styles.content, bottomPad]}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.subtitle}>{he.scores.subtitle}</Text>

          <View style={styles.topRow}>
            <Field label={he.scores.dateLabel} styles={styles}>
              <View style={styles.dateRow}>
                <Pressable
                  style={styles.chevronBtn}
                  onPress={() => setDate((d) => addDays(d, -1))}
                >
                  <Text style={styles.chevronLabel}>‹</Text>
                </Pressable>
                <Pressable
                  style={styles.dateChip}
                  onPress={() => setDate(todayIso())}
                >
                  <Text style={styles.dateChipLabel}>{prettyDate(date)}</Text>
                </Pressable>
                <Pressable
                  style={styles.chevronBtn}
                  onPress={() => setDate((d) => addDays(d, 1))}
                >
                  <Text style={styles.chevronLabel}>›</Text>
                </Pressable>
              </View>
            </Field>
          </View>

          <View style={styles.twoColRow}>
            <Field label={he.scores.classLabel} styles={styles}>
              <Pressable
                style={styles.selector}
                onPress={() => setClassPickerOpen(true)}
              >
                <Text style={styles.selectorLabel}>
                  {selectedClass?.name ?? he.scores.pickClass}
                </Text>
              </Pressable>
            </Field>
            <Field label={he.scores.periodLabel} styles={styles}>
              <Pressable
                style={styles.selector}
                onPress={() => setPeriodPickerOpen(true)}
              >
                <Text style={styles.selectorLabel}>{period}</Text>
              </Pressable>
            </Field>
          </View>

          <View style={styles.students}>
            {students.length === 0 ? (
              <Text style={styles.empty}>{he.scores.noStudentsForClass}</Text>
            ) : (
              rows.map((r) => (
                <StudentScoreCard
                  key={r.studentId}
                  row={r}
                  styles={styles}
                  onTogglePresent={() =>
                    setRowField(r.studentId, 'present', !r.present)
                  }
                  onSet={(field, value) => setRowField(r.studentId, field, value)}
                />
              ))
            )}
          </View>

          <Pressable
            style={[styles.sendBtn, sending && styles.sendBtnDisabled]}
            onPress={onSend}
            disabled={sending || rows.length === 0}
          >
            <Text style={styles.sendBtnLabel}>{he.scores.send}</Text>
          </Pressable>
        </ScrollView>
      )}

      <PickerSheet
        visible={classPickerOpen}
        title={he.scores.pickClass}
        items={classes.map((c) => ({ key: c.id, label: c.name }))}
        onPick={(key) => {
          setSelectedClassId(key);
          setClassPickerOpen(false);
        }}
        onClose={() => setClassPickerOpen(false)}
        styles={styles}
      />

      <PickerSheet
        visible={periodPickerOpen}
        title={he.scores.periodLabel}
        items={PERIODS.map((p) => ({ key: String(p), label: String(p) }))}
        onPick={(key) => {
          setPeriod(Number(key));
          setPeriodPickerOpen(false);
        }}
        onClose={() => setPeriodPickerOpen(false)}
        styles={styles}
      />
    </>
  );
}

type S = ReturnType<typeof createStyles>;

function Field({
  label,
  children,
  styles,
}: {
  label: string;
  children: React.ReactNode;
  styles: S;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {children}
    </View>
  );
}

function StudentScoreCard({
  row,
  styles,
  onTogglePresent,
  onSet,
}: {
  row: Row;
  styles: S;
  onTogglePresent: () => void;
  onSet: (field: keyof Row, value: number) => void;
}) {
  const total = row.present
    ? row.entry +
      row.attendance +
      row.execution +
      row.atmosphere +
      row.personal_goal +
      row.bonus
    : 0;

  return (
    <View style={styles.studentCard}>
      <View style={styles.studentHeader}>
        <Text style={styles.studentName}>{row.label}</Text>
        <View style={styles.headerRight}>
          {row.present && (
            <Text style={styles.totalBadge}>
              {he.scores.total}: {total}
            </Text>
          )}
          <Pressable
            style={[styles.presentToggle, !row.present && styles.presentToggleOff]}
            onPress={onTogglePresent}
          >
            <Text
              style={[
                styles.presentToggleLabel,
                !row.present && styles.presentToggleLabelOff,
              ]}
            >
              {row.present ? he.scores.present : he.scores.absent}
            </Text>
          </Pressable>
        </View>
      </View>

      {row.present && (
        <View style={styles.scoreGrid}>
          <ScoreRow
            label={he.scores.fieldEntry}
            options={[0, 1]}
            value={row.entry}
            onChange={(v) => onSet('entry', v)}
            styles={styles}
          />
          <ScoreRow
            label={he.scores.fieldAttendance}
            options={[0, 1, 2]}
            value={row.attendance}
            onChange={(v) => onSet('attendance', v)}
            styles={styles}
          />
          <ScoreRow
            label={he.scores.fieldExecution}
            options={[0, 1]}
            value={row.execution}
            onChange={(v) => onSet('execution', v)}
            styles={styles}
          />
          <ScoreRow
            label={he.scores.fieldAtmosphere}
            options={[0, 1]}
            value={row.atmosphere}
            onChange={(v) => onSet('atmosphere', v)}
            styles={styles}
          />
          <ScoreRow
            label={he.scores.fieldPersonalGoal}
            options={[0, 1]}
            value={row.personal_goal}
            onChange={(v) => onSet('personal_goal', v)}
            styles={styles}
          />
          <ScoreRow
            label={he.scores.fieldBonus}
            options={[0, 1]}
            value={row.bonus}
            onChange={(v) => onSet('bonus', v)}
            styles={styles}
          />
        </View>
      )}
    </View>
  );
}

function ScoreRow({
  label,
  options,
  value,
  onChange,
  styles,
}: {
  label: string;
  options: number[];
  value: number;
  onChange: (v: number) => void;
  styles: S;
}) {
  return (
    <View style={styles.scoreRow}>
      <Text style={styles.scoreLabel}>{label}</Text>
      <View style={styles.segment}>
        {options.map((o) => (
          <Pressable
            key={o}
            style={[styles.segmentBtn, value === o && styles.segmentBtnActive]}
            onPress={() => onChange(o)}
          >
            <Text
              style={[
                styles.segmentBtnLabel,
                value === o && styles.segmentBtnLabelActive,
              ]}
            >
              {o}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

function PickerSheet({
  visible,
  title,
  items,
  onPick,
  onClose,
  styles,
}: {
  visible: boolean;
  title: string;
  items: Array<{ key: string; label: string }>;
  onPick: (key: string) => void;
  onClose: () => void;
  styles: S;
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.sheetBackdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <Text style={styles.sheetTitle}>{title}</Text>
          {items.map((it) => (
            <Pressable
              key={it.key}
              style={styles.sheetRow}
              onPress={() => onPick(it.key)}
            >
              <Text style={styles.sheetRowLabel}>{it.label}</Text>
            </Pressable>
          ))}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function buildMailBody(
  className: string,
  date: string,
  period: number,
  rows: Row[],
  shareUrl: string | null,
  isUpdate: boolean,
): string {
  const header = he.scores.bodyHeader(className, prettyDate(date), period);
  const lines: string[] = [];
  if (isUpdate) {
    lines.push(`** ${he.scores.bodyUpdateNote} **`);
    lines.push('');
  }
  lines.push(header, '');

  for (const r of rows) {
    if (!r.present) {
      lines.push(`${r.label} — ${he.scores.bodyAbsent}`);
      continue;
    }
    const t = totalForRow({
      class_id: '',
      student_id: '',
      date,
      period,
      entry: r.entry,
      attendance: r.attendance,
      execution: r.execution,
      atmosphere: r.atmosphere,
      personal_goal: r.personal_goal,
      bonus: r.bonus,
    });
    lines.push(`${r.label}`);
    lines.push(`  ${he.scores.fieldEntry}: ${r.entry}`);
    lines.push(`  ${he.scores.fieldAttendance}: ${r.attendance}`);
    lines.push(`  ${he.scores.fieldExecution}: ${r.execution}`);
    lines.push(`  ${he.scores.fieldAtmosphere}: ${r.atmosphere}`);
    lines.push(`  ${he.scores.fieldPersonalGoal}: ${r.personal_goal}`);
    lines.push(`  ${he.scores.fieldBonus}: ${r.bonus}`);
    lines.push(`  ${he.scores.total}: ${t}`);
    lines.push('');
  }

  if (shareUrl) {
    lines.push(`${he.scores.shareLinkLabel}:`);
    lines.push(shareUrl);
    lines.push('');
  }

  lines.push('--');
  lines.push(he.scores.bodyFooter);
  return lines.join('\n');
}

const createStyles = (theme: ThemeTokens) =>
  StyleSheet.create({
    container: { flex: 1 },
    content: { padding: 16, gap: 12 },
    subtitle: { color: theme.text.muted, fontSize: 13, lineHeight: 18, marginBottom: 4 },
    empty: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
      color: theme.text.muted,
      fontSize: 14,
      textAlign: 'center',
    },
    emptyText: { color: theme.text.muted, fontSize: 14, textAlign: 'center' },
    topRow: { flexDirection: 'row' },
    twoColRow: { flexDirection: 'row', gap: 10 },
    field: { flex: 1, gap: 6 },
    fieldLabel: { color: theme.text.muted, fontSize: 13 },
    dateRow: { flexDirection: 'row', gap: 6, alignItems: 'center' },
    chevronBtn: {
      width: 40,
      height: 44,
      borderRadius: 8,
      backgroundColor: theme.bg.input,
      alignItems: 'center',
      justifyContent: 'center',
    },
    chevronLabel: { color: theme.text.primary, fontSize: 22, lineHeight: 24 },
    dateChip: {
      flex: 1,
      height: 44,
      borderRadius: 8,
      backgroundColor: theme.bg.input,
      alignItems: 'center',
      justifyContent: 'center',
    },
    dateChipLabel: {
      color: theme.text.primary,
      fontSize: 15,
      fontWeight: '600',
      fontVariant: ['tabular-nums'],
    },
    selector: {
      height: 44,
      borderRadius: 8,
      backgroundColor: theme.bg.input,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 12,
    },
    selectorLabel: { color: theme.text.primary, fontSize: 15, fontWeight: '600' },
    students: { gap: 10, marginTop: 6 },
    studentCard: {
      backgroundColor: theme.bg.card,
      padding: 12,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.border.subtle,
      gap: 10,
    },
    studentHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 8,
    },
    studentName: { color: theme.text.primary, fontSize: 16, fontWeight: '700', flex: 1 },
    headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    totalBadge: {
      color: theme.text.secondary,
      fontSize: 13,
      fontWeight: '600',
      fontVariant: ['tabular-nums'],
    },
    presentToggle: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 16,
      backgroundColor: theme.accent.primary,
    },
    presentToggleOff: {
      backgroundColor: 'transparent',
      borderWidth: 1,
      borderColor: theme.status.dangerBorder,
    },
    presentToggleLabel: {
      color: theme.accent.primaryText,
      fontSize: 12,
      fontWeight: '700',
    },
    presentToggleLabelOff: { color: theme.status.danger },
    scoreGrid: { gap: 6 },
    scoreRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 8,
    },
    scoreLabel: { color: theme.text.primary, fontSize: 14, flex: 1 },
    segment: {
      // Numbers should read left-to-right (0, 1, 2) regardless of the
      // surrounding RTL flow. row-reverse inverts the axis under forceRTL.
      flexDirection: 'row-reverse',
      borderRadius: 8,
      overflow: 'hidden',
      backgroundColor: theme.bg.input,
    },
    segmentBtn: {
      minWidth: 44,
      height: 36,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 10,
    },
    segmentBtnActive: { backgroundColor: theme.accent.primary },
    segmentBtnLabel: {
      color: theme.text.primary,
      fontSize: 15,
      fontWeight: '600',
      fontVariant: ['tabular-nums'],
    },
    segmentBtnLabelActive: { color: theme.accent.primaryText },
    sendBtn: {
      backgroundColor: theme.accent.primary,
      padding: 16,
      borderRadius: 12,
      alignItems: 'center',
      marginTop: 12,
    },
    sendBtnDisabled: { opacity: 0.5 },
    sendBtnLabel: { color: theme.accent.primaryText, fontSize: 17, fontWeight: '700' },
    sheetBackdrop: {
      flex: 1,
      backgroundColor: theme.bg.overlay,
      justifyContent: 'flex-end',
    },
    sheet: {
      backgroundColor: theme.bg.subtle,
      padding: 20,
      gap: 8,
      borderTopLeftRadius: 16,
      borderTopRightRadius: 16,
    },
    sheetTitle: {
      color: theme.text.primary,
      fontSize: 16,
      fontWeight: '700',
      textAlign: 'center',
      marginBottom: 6,
    },
    sheetRow: {
      backgroundColor: theme.bg.card,
      padding: 14,
      borderRadius: 10,
      alignItems: 'center',
    },
    sheetRowLabel: { color: theme.text.primary, fontSize: 16, fontWeight: '600' },
  });
