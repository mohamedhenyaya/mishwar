import React, { forwardRef, useState, useMemo } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  Modal, FlatList, StyleSheet, TextStyle,
  ViewStyle, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COUNTRIES, Country, DEFAULT_COUNTRY } from '../data/countries';
import { colors, radius, shadows, spacing, typography } from '../theme';

// ── Props ─────────────────────────────────────────────────────────────────────
interface PhoneInputProps {
  value: string;
  onChange: (fullNumber: string) => void;
  placeholder?: string;
  inputStyle?: TextStyle;
  containerStyle?: ViewStyle;
  onSubmitEditing?: () => void;
  returnKeyType?: 'done' | 'next' | 'go' | 'search';
}

// ─────────────────────────────────────────────────────────────────────────────

const PhoneInput = forwardRef<TextInput, PhoneInputProps>(
  ({ value, onChange, placeholder = 'XX XX XX XX', inputStyle, containerStyle, onSubmitEditing, returnKeyType = 'done' }, ref) => {
    const insets = useSafeAreaInsets();

    const [country,      setCountry]      = useState<Country>(DEFAULT_COUNTRY);
    const [localNumber,  setLocalNumber]  = useState('');
    const [modalVisible, setModalVisible] = useState(false);
    const [search,       setSearch]       = useState('');

    // Filtre la liste selon la recherche
    const filtered = useMemo(() => {
      const q = search.toLowerCase().trim();
      if (!q) return COUNTRIES;
      return COUNTRIES.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.dialCode.includes(q) ||
          c.code.toLowerCase().includes(q)
      );
    }, [search]);

    const handleChangeLocal = (text: string) => {
      // N'accepte que les chiffres
      const digits = text.replace(/\D/g, '');
      setLocalNumber(digits);
      onChange(`+${country.dialCode}${digits}`);
    };

    const handleSelectCountry = (c: Country) => {
      setCountry(c);
      setModalVisible(false);
      setSearch('');
      onChange(`+${c.dialCode}${localNumber}`);
    };

    // ── Render ──────────────────────────────────────────────────────────────

    return (
      <>
        {/* Champ de saisie */}
        <View style={[styles.container, containerStyle]}>
          {/* Sélecteur pays */}
          <TouchableOpacity
            style={styles.countryBtn}
            onPress={() => setModalVisible(true)}
            activeOpacity={0.7}
          >
            <Text style={styles.flag}>{country.flag}</Text>
            <Text style={styles.dialCode}>+{country.dialCode}</Text>
            <Ionicons name="chevron-down" size={12} color={colors.textSecondary} />
          </TouchableOpacity>

          {/* Séparateur */}
          <View style={styles.separator} />

          {/* Input numéro local */}
          <TextInput
            ref={ref}
            style={[styles.input, inputStyle]}
            value={localNumber}
            onChangeText={handleChangeLocal}
            placeholder={placeholder}
            placeholderTextColor={colors.placeholder}
            keyboardType="phone-pad"
            returnKeyType={returnKeyType}
            onSubmitEditing={onSubmitEditing}
            maxLength={15}
          />
        </View>

        {/* Modal sélecteur de pays */}
        <Modal
          visible={modalVisible}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => { setModalVisible(false); setSearch(''); }}
        >
          <View style={[styles.modal, { paddingTop: insets.top + 16, paddingBottom: insets.bottom }]}>

            {/* Header modal */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Sélectionner un pays</Text>
              <TouchableOpacity
                onPress={() => { setModalVisible(false); setSearch(''); }}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="close" size={22} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Barre de recherche */}
            <View style={styles.searchWrap}>
              <Ionicons name="search" size={17} color={colors.textTertiary} />
              <TextInput
                style={styles.searchInput}
                value={search}
                onChangeText={setSearch}
                placeholder="Rechercher un pays ou un indicatif…"
                placeholderTextColor={colors.placeholder}
                autoFocus
                returnKeyType="search"
                clearButtonMode="while-editing"
              />
            </View>

            {/* Liste des pays */}
            <FlatList
              data={filtered}
              keyExtractor={(item) => item.code}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              ItemSeparatorComponent={() => <View style={styles.listSeparator} />}
              renderItem={({ item }) => {
                const active = item.code === country.code && item.dialCode === country.dialCode;
                return (
                  <TouchableOpacity
                    style={[styles.countryItem, active && styles.countryItemActive]}
                    onPress={() => handleSelectCountry(item)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.itemFlag}>{item.flag}</Text>
                    <Text style={[styles.itemName, active && styles.itemNameActive]} numberOfLines={1}>
                      {item.name}
                    </Text>
                    <Text style={[styles.itemDial, active && styles.itemDialActive]}>
                      +{item.dialCode}
                    </Text>
                    {active && <Ionicons name="checkmark" size={16} color={colors.accent} style={{ marginLeft: 4 }} />}
                  </TouchableOpacity>
                );
              }}
              ListEmptyComponent={
                <View style={styles.emptyWrap}>
                  <Text style={styles.emptyText}>Aucun pays trouvé</Text>
                </View>
              }
            />
          </View>
        </Modal>
      </>
    );
  }
);

PhoneInput.displayName = 'PhoneInput';
export default PhoneInput;

// ─────────────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.surface, borderRadius: radius.md,
    borderWidth: 1.5, borderColor: colors.border,
    overflow: 'hidden',
    ...shadows.sm,
  },

  // Sélecteur pays
  countryBtn: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: spacing.md, paddingVertical: 14, gap: 6,
  },
  flag:     { fontSize: 22 },
  dialCode: { ...typography.bodyLg, fontWeight: '700', color: colors.text },

  separator: {
    width: 1, height: 28, backgroundColor: colors.border, marginHorizontal: 2,
  },

  input: {
    flex: 1,
    fontSize: 16, color: colors.text,
    paddingHorizontal: spacing.md,
    paddingVertical: Platform.OS === 'ios' ? 14 : 11,
  },

  // Modal
  modal: {
    flex: 1, backgroundColor: colors.surface,
  },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.xl, paddingBottom: spacing.lg,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  modalTitle: { ...typography.h3, color: colors.text },

  // Recherche
  searchWrap: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    margin: spacing.lg, paddingHorizontal: spacing.md,
    backgroundColor: colors.bg, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border,
  },
  searchInput: {
    flex: 1, fontSize: 15, color: colors.text,
    paddingVertical: Platform.OS === 'ios' ? 12 : 9,
  },

  // Liste
  listSeparator: { height: 1, backgroundColor: colors.border, marginLeft: 64 },
  countryItem: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: spacing.xl, paddingVertical: 13, gap: spacing.lg,
  },
  countryItemActive: { backgroundColor: colors.accentMuted },
  itemFlag: { fontSize: 24, width: 32 },
  itemName: {
    flex: 1, ...typography.bodyLg, fontWeight: '500', color: colors.text,
  },
  itemNameActive: { color: colors.accent, fontWeight: '700' },
  itemDial:       { ...typography.bodySm, color: colors.textSecondary, fontWeight: '600' },
  itemDialActive: { color: colors.accent },

  emptyWrap: { padding: 40, alignItems: 'center' },
  emptyText: { ...typography.bodyLg, color: colors.textSecondary },
});
