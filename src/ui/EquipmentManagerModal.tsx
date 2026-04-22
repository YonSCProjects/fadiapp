import { useEffect, useMemo, useState } from 'react';
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
import { useTheme } from '@/theme/ThemeProvider';
import type { ThemeTokens } from '@/theme/tokens';

type Props = {
  visible: boolean;
  catalog: string[];
  onClose: () => void;
  onSave: (next: string[]) => void;
};

export function EquipmentManagerModal({ visible, catalog, onClose, onSave }: Props) {
  const [items, setItems] = useState<string[]>([]);
  const [draft, setDraft] = useState('');
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

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

const createStyles = (theme: ThemeTokens) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.bg.modal, paddingTop: 24 },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingVertical: 14,
      borderBottomWidth: 1,
      borderBottomColor: theme.border.subtle,
    },
    title: { color: theme.text.primary, fontSize: 20, fontWeight: '700' },
    close: { color: theme.text.muted, fontSize: 32, lineHeight: 32 },
    addRow: { flexDirection: 'row', gap: 8, padding: 20, paddingBottom: 8 },
    input: {
      flex: 1,
      backgroundColor: theme.bg.input,
      color: theme.text.primary,
      padding: 12,
      borderRadius: 8,
      fontSize: 16,
    },
    addBtn: {
      backgroundColor: theme.accent.primary,
      paddingHorizontal: 18,
      borderRadius: 8,
      justifyContent: 'center',
    },
    addBtnLabel: { color: theme.accent.primaryText, fontSize: 16, fontWeight: '600' },
    listScroll: { flex: 1 },
    list: { padding: 20, gap: 8, paddingTop: 8 },
    emptyText: { color: theme.text.muted, fontSize: 14, textAlign: 'center', paddingVertical: 40 },
    row: {
      backgroundColor: theme.bg.card,
      padding: 12,
      borderRadius: 8,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    rowName: { color: theme.text.primary, fontSize: 16 },
    rowRemove: { color: theme.status.danger, fontSize: 14 },
    primaryBtn: {
      backgroundColor: theme.accent.primary,
      padding: 14,
      borderRadius: 10,
      alignItems: 'center',
      margin: 20,
    },
    primaryBtnLabel: { color: theme.accent.primaryText, fontSize: 16, fontWeight: '600' },
  });
