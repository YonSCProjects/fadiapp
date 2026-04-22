import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { LessonBlock } from '@/db/schema';
import { he } from '@/i18n/he';
import { useTheme } from '@/theme/ThemeProvider';
import type { ThemeTokens } from '@/theme/tokens';

type Props = {
  blocks: LessonBlock[];
  activityIdToName: Map<string, string>;
  safetyNotes?: string[];
  rationale?: string;
};

type S = ReturnType<typeof createStyles>;

export function LessonBlocksView({
  blocks,
  activityIdToName,
  safetyNotes,
  rationale,
}: Props) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const warmup = blocks.filter((b) => b.phase === 'warmup');
  const main = blocks.filter((b) => b.phase === 'main');
  const cooldown = blocks.filter((b) => b.phase === 'cooldown');

  return (
    <>
      {rationale && rationale.length > 0 && (
        <Section label={he.designer.rationale} styles={styles}>
          <Text style={styles.bodyText}>{rationale}</Text>
        </Section>
      )}
      {warmup.length > 0 && (
        <Section label={he.designer.warmup} styles={styles}>
          {warmup.map((b) => (
            <BlockView key={b.id} block={b} idToName={activityIdToName} styles={styles} />
          ))}
        </Section>
      )}
      {main.length > 0 && (
        <Section label={he.designer.main} styles={styles}>
          {main.map((b) => (
            <BlockView key={b.id} block={b} idToName={activityIdToName} styles={styles} />
          ))}
        </Section>
      )}
      {cooldown.length > 0 && (
        <Section label={he.designer.cooldown} styles={styles}>
          {cooldown.map((b) => (
            <BlockView key={b.id} block={b} idToName={activityIdToName} styles={styles} />
          ))}
        </Section>
      )}
      {safetyNotes && safetyNotes.length > 0 && (
        <Section label={he.designer.safetyNotes} styles={styles}>
          {safetyNotes.map((note, i) => (
            <Text key={i} style={styles.safetyNote}>
              • {note}
            </Text>
          ))}
        </Section>
      )}
    </>
  );
}

function BlockView({
  block,
  idToName,
  styles,
}: {
  block: LessonBlock;
  idToName: Map<string, string>;
  styles: S;
}) {
  const minutes = Math.round(block.duration_s / 60);
  return (
    <View style={styles.block}>
      <View style={styles.blockHeader}>
        <Text style={styles.blockName}>{block.name_he}</Text>
        <Text style={styles.blockDuration}>{minutes} דק׳</Text>
      </View>
      {block.activity_ids.length > 0 && (
        <Text style={styles.blockActivities}>
          {he.designer.activities}:{' '}
          {block.activity_ids.map((id) => idToName.get(id) ?? id).join(', ')}
        </Text>
      )}
      {block.teacher_cues_he && <Text style={styles.blockCues}>💡 {block.teacher_cues_he}</Text>}
      {block.notes_he && <Text style={styles.blockNotes}>{block.notes_he}</Text>}
    </View>
  );
}

function Section({
  label,
  children,
  styles,
}: {
  label: string;
  children: React.ReactNode;
  styles: S;
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionLabel}>{label}</Text>
      {children}
    </View>
  );
}

const createStyles = (theme: ThemeTokens) =>
  StyleSheet.create({
    section: { gap: 8, marginTop: 12 },
    sectionLabel: {
      color: theme.text.muted,
      fontSize: 12,
      textTransform: 'uppercase',
      letterSpacing: 1,
    },
    block: {
      backgroundColor: theme.bg.card,
      padding: 12,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: theme.border.default,
      gap: 6,
    },
    blockHeader: { flexDirection: 'row', justifyContent: 'space-between' },
    blockName: { color: theme.text.primary, fontSize: 16, fontWeight: '600' },
    blockDuration: { color: theme.text.muted, fontSize: 14 },
    blockActivities: { color: theme.text.secondary, fontSize: 14 },
    blockCues: { color: theme.status.success, fontSize: 13, fontStyle: 'italic' },
    blockNotes: { color: theme.text.muted, fontSize: 13 },
    safetyNote: { color: theme.status.warning, fontSize: 14, lineHeight: 20 },
    bodyText: { color: theme.text.secondary, fontSize: 14, lineHeight: 20 },
  });
