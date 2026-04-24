import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import type { Class } from '@/db/schema';
import { he } from '@/i18n/he';
import { useTheme } from '@/theme/ThemeProvider';
import type { ThemeTokens } from '@/theme/tokens';

type Props = {
  visible: boolean;
  /** null = add mode; a Class = edit mode */
  cls: Class | null;
  onClose: () => void;
  onSave: (name: string) => void;
  onDelete?: () => void;
};

export function ClassEditModal({ visible, cls, onClose, onSave, onDelete }: Props) {
  const [name, setName] = useState('');
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  useEffect(() => {
    if (visible) setName(cls?.name ?? '');
  }, [visible, cls]);

  const isEdit = cls !== null;
  const canSave = name.trim().length > 0;

  function handleSave() {
    if (!canSave) return;
    onSave(name.trim());
    onClose();
  }

  function handleDelete() {
    if (!onDelete) return;
    Alert.alert(he.classes.deleteConfirm, '', [
      { text: he.classes.cancel, style: 'cancel' },
      {
        text: he.classes.delete,
        style: 'destructive',
        onPress: () => {
          onDelete();
          onClose();
        },
      },
    ]);
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <Text style={styles.title}>
            {isEdit ? he.classes.editTitle : he.classes.addTitle}
          </Text>
          <Text style={styles.label}>{he.classes.nameLabel}</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder={he.classes.namePlaceholder}
            placeholderTextColor={theme.text.faint}
            style={styles.input}
            textAlign="right"
            autoFocus
          />
          <Pressable
            onPress={handleSave}
            disabled={!canSave}
            style={[styles.primaryBtn, !canSave && styles.primaryBtnDisabled]}
          >
            <Text style={styles.primaryBtnLabel}>{he.classes.save}</Text>
          </Pressable>
          {isEdit && onDelete && (
            <Pressable onPress={handleDelete} style={styles.dangerBtn}>
              <Text style={styles.dangerBtnLabel}>{he.classes.delete}</Text>
            </Pressable>
          )}
          <Pressable onPress={onClose} style={styles.cancelBtn}>
            <Text style={styles.cancelBtnLabel}>{he.classes.cancel}</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const createStyles = (theme: ThemeTokens) =>
  StyleSheet.create({
    backdrop: { flex: 1, backgroundColor: theme.bg.overlay, justifyContent: 'flex-end' },
    sheet: {
      backgroundColor: theme.bg.subtle,
      padding: 20,
      gap: 12,
      borderTopLeftRadius: 16,
      borderTopRightRadius: 16,
    },
    title: {
      color: theme.text.primary,
      fontSize: 18,
      fontWeight: '700',
      textAlign: 'center',
      marginBottom: 4,
    },
    label: { color: theme.text.muted, fontSize: 14 },
    input: {
      backgroundColor: theme.bg.input,
      color: theme.text.primary,
      padding: 12,
      borderRadius: 8,
      fontSize: 16,
    },
    primaryBtn: {
      backgroundColor: theme.accent.primary,
      padding: 14,
      borderRadius: 10,
      alignItems: 'center',
      marginTop: 8,
    },
    primaryBtnDisabled: { opacity: 0.4 },
    primaryBtnLabel: { color: theme.accent.primaryText, fontSize: 16, fontWeight: '600' },
    dangerBtn: {
      padding: 14,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: theme.status.dangerBorder,
      alignItems: 'center',
    },
    dangerBtnLabel: { color: theme.status.danger, fontSize: 16, fontWeight: '600' },
    cancelBtn: { padding: 12, alignItems: 'center' },
    cancelBtnLabel: { color: theme.text.muted, fontSize: 14 },
  });
