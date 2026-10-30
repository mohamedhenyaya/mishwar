import React, { useMemo, useState } from 'react';
import { FlatList, Modal, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '../i18n/LanguageContext';
import { C, RADIUS } from '../theme';

interface OptionPickerProps {
  title:       string;
  value:       string;
  options:     string[];
  placeholder: string;
  onChange:    (value: string) => void;
  disabled?:   boolean;
  labelOf?:    (value: string) => string; // libellé affiché (ex. « Autre » traduit)
}

// Champ qui ouvre une liste avec recherche (même présentation que le choix du pays)
export default function OptionPicker({ title, value, options, placeholder, onChange, disabled, labelOf = (v) => v }: OptionPickerProps) {
  const insets = useSafeAreaInsets();
  const { t } = useLanguage();
  const [open,   setOpen]   = useState(false);
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return q ? options.filter((o) => labelOf(o).toLowerCase().includes(q)) : options;
  }, [options, search, labelOf]);

  const close = () => { setOpen(false); setSearch(''); };

  return (
    <>
      <TouchableOpacity
        style={[styles.field, disabled && styles.fieldDisabled]}
        onPress={() => setOpen(true)}
        disabled={disabled}
        activeOpacity={0.7}
      >
        <Text style={[styles.value, !value && styles.placeholder]} numberOfLines={1}>{value ? labelOf(value) : placeholder}</Text>
        <Ionicons name="chevron-down" size={16} color={C.sub} />
      </TouchableOpacity>

      <Modal visible={open} animationType="slide" presentationStyle="pageSheet" onRequestClose={close}>
        <View style={[styles.modal, { paddingTop: insets.top + 16, paddingBottom: insets.bottom }]}>
          <View style={styles.header}>
            <Text style={styles.title}>{title}</Text>
            <TouchableOpacity onPress={close} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close" size={22} color={C.sub} />
            </TouchableOpacity>
          </View>

          <View style={styles.searchWrap}>
            <Ionicons name="search" size={16} color={C.muted} />
            <TextInput
              style={styles.searchInput}
              value={search}
              onChangeText={setSearch}
              placeholder={t('commonSearch')}
              placeholderTextColor={C.muted}
              returnKeyType="search"
            />
          </View>

          <FlatList
            data={filtered}
            keyExtractor={(item) => item}
            keyboardShouldPersistTaps="handled"
            ItemSeparatorComponent={() => <View style={styles.separator} />}
            renderItem={({ item }) => {
              const active = item === value;
              return (
                <TouchableOpacity
                  style={[styles.item, active && styles.itemActive]}
                  onPress={() => { onChange(item); close(); }}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.itemLabel, active && styles.itemLabelActive]}>{labelOf(item)}</Text>
                  {active && <Ionicons name="checkmark" size={16} color={C.primary} />}
                </TouchableOpacity>
              );
            }}
          />
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  field: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    height: 54, paddingHorizontal: 18,
    backgroundColor: C.bg, borderRadius: RADIUS.lg,
    borderWidth: 2, borderColor: C.border,
  },
  fieldDisabled: { opacity: 0.5 },
  value:       { flex: 1, fontSize: 16, color: C.text },
  placeholder: { color: C.muted },

  modal:  { flex: 1, backgroundColor: C.surface, paddingHorizontal: 20 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  title:  { fontSize: 18, fontWeight: '800', color: C.text },
  searchWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: C.bg, borderRadius: RADIUS.md,
    paddingHorizontal: 12, marginBottom: 12,
  },
  searchInput: { flex: 1, height: 44, fontSize: 15, color: C.text },
  separator:   { height: 1, backgroundColor: C.border },
  item:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, paddingHorizontal: 4 },
  itemActive:  { backgroundColor: '#FAF8FF' },
  itemLabel:   { fontSize: 15, color: C.text },
  itemLabelActive: { color: C.primary, fontWeight: '700' },
});
