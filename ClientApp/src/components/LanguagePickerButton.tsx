import React, { useState } from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '../i18n/LanguageContext';
import { LanguageCode } from '../i18n/translations';
import { colors, radius, shadows, spacing, typography } from '../theme';

const LANGUAGES: { code: LanguageCode; label: string; short: string }[] = [
  { code: 'fr', label: 'Français', short: 'FR' },
  { code: 'en', label: 'English',  short: 'EN' },
  { code: 'ar', label: 'العربية',  short: 'AR' },
];

export default function LanguagePickerButton() {
  const { language, setLanguage } = useLanguage();
  const [open, setOpen] = useState(false);

  const select = (code: LanguageCode) => {
    setLanguage(code);
    setOpen(false);
  };

  const current = LANGUAGES.find((l) => l.code === language) ?? LANGUAGES[0];

  return (
    <>
      <TouchableOpacity style={styles.button} onPress={() => setOpen(true)} activeOpacity={0.8}>
        <Ionicons name="globe-outline" size={16} color={colors.primary} />
        <Text style={styles.buttonText}>{current.short}</Text>
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setOpen(false)}>
          <View style={styles.dropdown}>
            {LANGUAGES.map((l) => (
              <TouchableOpacity
                key={l.code}
                style={styles.row}
                onPress={() => select(l.code)}
                activeOpacity={0.7}
              >
                <Text style={[styles.rowLabel, l.code === language && styles.rowLabelActive]}>
                  {l.label}
                </Text>
                {l.code === language && <Ionicons name="checkmark" size={16} color={colors.accent} />}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: colors.surface, borderRadius: radius.full,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    ...shadows.sm,
  },
  buttonText: { ...typography.caption, fontWeight: '800', color: colors.primary },

  overlay: { flex: 1, backgroundColor: 'rgba(10,10,20,0.25)', alignItems: 'flex-end' },
  dropdown: {
    marginTop: 60, marginRight: spacing.lg,
    backgroundColor: colors.surface, borderRadius: radius.lg,
    paddingVertical: spacing.xs, minWidth: 170,
    ...shadows.lg,
  },
  row: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
  },
  rowLabel: { ...typography.bodySm, fontWeight: '600', color: colors.text },
  rowLabelActive: { color: colors.accent, fontWeight: '700' },
});
