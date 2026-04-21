import { StyleSheet, Text, View } from 'react-native';
import type { LessonBlock } from '@/db/schema';
import { he } from '@/i18n/he';

type Props = {
  blocks: LessonBlock[];
  activityIdToName: Map<string, string>;
  safetyNotes?: string[];
  rationale?: string;
};

export function LessonBlocksView({
  blocks,
  activityIdToName,
  safetyNotes,
  rationale,
}: Props) {
  const warmup = blocks.filter((b) => b.phase === 'warmup');
  const main = blocks.filter((b) => b.phase === 'main');
  const cooldown = blocks.filter((b) => b.phase === 'cooldown');

  return (
    <>
      {rationale && rationale.length > 0 && (
        <Section label={he.designer.rationale}>
          <Text style={styles.bodyText}>{rationale}</Text>
        </Section>
      )}
      {warmup.length > 0 && (
        <Section label={he.designer.warmup}>
          {warmup.map((b) => (
            <BlockView key={b.id} block={b} idToName={activityIdToName} />
          ))}
        </Section>
      )}
      {main.length > 0 && (
        <Section label={he.designer.main}>
          {main.map((b) => (
            <BlockView key={b.id} block={b} idToName={activityIdToName} />
          ))}
        </Section>
      )}
      {cooldown.length > 0 && (
        <Section label={he.designer.cooldown}>
          {cooldown.map((b) => (
            <BlockView key={b.id} block={b} idToName={activityIdToName} />
          ))}
        </Section>
      )}
      {safetyNotes && safetyNotes.length > 0 && (
        <Section label={he.designer.safetyNotes}>
          {safetyNotes.map((note, i) => (
            <Text key={i} style={styles.safetyNote}>• {note}</Text>
          ))}
        </Section>
      )}
    </>
  );
}

function BlockView({
  block,
  idToName,
}: {
  block: LessonBlock;
  idToName: Map<string, string>;
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

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionLabel}>{label}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
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
