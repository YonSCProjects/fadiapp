import { useEffect, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { he } from '@/i18n/he';

type Props = {
  visible: boolean;
  catalog: string[];
  onClose: () => void;
  onSave: (next: string[]) => void;
};

export function EquipmentManagerModal({ visible, catalog, onClose, onSave }: Props) {
  const [items, setItems] = useState<string[]>([]);
  const [draft, setDraft] = useState('');

  useEffect(() => {
    if (visible) {
      setItems([...catalog]);
      setDraft('');
    }
  }, [visible, catalog]);

  function addDraft() {
    const clean = draft.trim();
    if (!clean) return;
    if (items.includes(clean)) {
      setDraft('');
      return;
    }
    setItems([...items, clean]);
    setDraft('');
  }

  function removeAt(idx: number) {
    setItems(items.filter((_, i) => i !== idx));
  }

  function handleSave() {
    onSave(items);
    onClose();
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} transparent={false}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>{he.designer.equipmentEditorTitle}</Text>
          <Pressable onPress={onClose} hitSlop={12}>
            <Text style={styles.close}>×</Text>
          </Pressable>
        </View>

        <View style={styles.addRow}>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder={he.designer.equipmentAddPlaceholder}
            placeholderTextColor="#6a6a72"
            style={styles.input}
            textAlign="right"
            onSubmitEditing={addDraft}
            returnKeyType="done"
          />
          <Pressable style={styles.addBtn} onPress={addDraft}>
            <Text style={styles.addBtnLabel}>{he.designer.equipmentAdd}</Text>
          </Pressable>
        </View>

        <ScrollView style={styles.listScroll} contentContainerStyle={styles.list}>
          {items.length === 0 ? (
            <Text style={styles.emptyText}>{he.designer.equipmentEmpty}</Text>
          ) : (
            items.map((item, idx) => (
              <View key={`${item}-${idx}`} style={styles.row}>
                <Text style={styles.rowName}>{item}</Text>
                <Pressable onPress={() => removeAt(idx)} hitSlop={8}>
                  <Text style={styles.rowRemove}>{he.lessons.removeActivity}</Text>
                </Pressable>
              </View>
            ))
          )}
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
  addRow: { flexDirection: 'row', gap: 8, padding: 20, paddingBottom: 8 },
  input: {
    flex: 1,
    backgroundColor: '#23232a',
    color: '#f5f5f5',
    padding: 12,
    borderRadius: 8,
    fontSize: 16,
  },
  addBtn: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 18,
    borderRadius: 8,
    justifyContent: 'center',
  },
  addBtnLabel: { color: '#fff', fontSize: 16, fontWeight: '600' },
  listScroll: { flex: 1 },
  list: { padding: 20, gap: 8, paddingTop: 8 },
  emptyText: { color: '#a0a0a8', fontSize: 14, textAlign: 'center', paddingVertical: 40 },
  row: {
    backgroundColor: '#1a1a20',
    padding: 12,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowName: { color: '#f5f5f5', fontSize: 16 },
  rowRemove: { color: '#ff8a8a', fontSize: 14 },
  primaryBtn: {
    backgroundColor: '#3b82f6',
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
    margin: 20,
  },
  primaryBtnLabel: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
