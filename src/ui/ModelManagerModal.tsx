import { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { he } from '@/i18n/he';
import type { PedagogicalModel } from '@/db/schema';

// All pedagogy-card keys from assets/kb/pedagogy_cards.json. The 5 non-Mosston
// plus the meta "mosston-spectrum". Kept here rather than derived to avoid
// accidentally exposing every individual Mosston sub-style in the UI — the
// spectrum card represents them all as a single "available" toggle.
const MODELS: Array<{ key: PedagogicalModel; label: string }> = [
  { key: 'tgfu', label: 'TGfU — למידה מבוססת משחק' },
  { key: 'sport-education', label: 'חינוך ספורטיבי' },
  { key: 'tpsr', label: 'אחריות (TPSR)' },
  { key: 'skill-themes', label: 'נושאי מיומנויות' },
  { key: 'cooperative', label: 'למידה שיתופית' },
  { key: 'mosston-spectrum', label: 'ספקטרום מוסטון' },
];

type Props = {
  visible: boolean;
  disabled: string[];
  onClose: () => void;
  onSave: (next: string[]) => void;
};

export function ModelManagerModal({ visible, disabled, onClose, onSave }: Props) {
  const [disabledSet, setDisabledSet] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (visible) setDisabledSet(new Set(disabled));
  }, [visible, disabled]);

  function toggle(key: string) {
    const next = new Set(disabledSet);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    setDisabledSet(next);
  }

  function handleSave() {
    onSave(Array.from(disabledSet));
    onClose();
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} transparent={false}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>{he.designer.modelManagerTitle}</Text>
          <Pressable onPress={onClose} hitSlop={12}>
            <Text style={styles.close}>×</Text>
          </Pressable>
        </View>

        <Text style={styles.subtitle}>{he.designer.modelManagerSubtitle}</Text>

        <ScrollView style={styles.listScroll} contentContainerStyle={styles.list}>
          {MODELS.map((m) => {
            const on = !disabledSet.has(m.key);
            return (
              <Pressable key={m.key} style={styles.row} onPress={() => toggle(m.key)}>
                <Text style={styles.rowName}>{m.label}</Text>
                <View style={[styles.toggle, on && styles.toggleOn]}>
                  <View style={[styles.toggleKnob, on && styles.toggleKnobOn]} />
                </View>
              </Pressable>
            );
          })}
        </ScrollView>

        <Pressable style={styles.primaryBtn} onPress={handleSave}>
          <Text style={styles.primaryBtnLabel}>{he.lessons.saveBlock}</Text>
        </Pressable>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f10', paddingTop: 24 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a20',
  },
  title: { color: '#f5f5f5', fontSize: 20, fontWeight: '700' },
  close: { color: '#a0a0a8', fontSize: 32, lineHeight: 32 },
  subtitle: { color: '#a0a0a8', fontSize: 14, paddingHorizontal: 20, paddingTop: 12, lineHeight: 20 },
  listScroll: { flex: 1 },
  list: { padding: 20, gap: 8 },
  row: {
    backgroundColor: '#1a1a20',
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  rowName: { color: '#f5f5f5', fontSize: 16, flex: 1 },
  toggle: {
    width: 46,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#2a2a32',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  toggleOn: { backgroundColor: '#3b82f6' },
  toggleKnob: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#6a6a72',
  },
  toggleKnobOn: { backgroundColor: '#ffffff', alignSelf: 'flex-end' },
  primaryBtn: {
    backgroundColor: '#3b82f6',
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
    margin: 20,
  },
  primaryBtnLabel: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
