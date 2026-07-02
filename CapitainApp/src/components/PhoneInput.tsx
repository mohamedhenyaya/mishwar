import React, { forwardRef, useState, useMemo } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  Modal, FlatList, StyleSheet, TextStyle,
  ViewStyle, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COUNTRIES, Country, DEFAULT_COUNTRY } from '../data/countries';
import { C, RADIUS, SH } from '../theme';

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
            <Ionicons name="chevron-down" size={12} color={C.sub} />
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
            placeholderTextColor={C.muted}
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
                <Ionicons name="close" size={22} color={C.sub} />
              </TouchableOpacity>
            </View>

            {/* Barre de recherche */}
            <View style={styles.searchWrap}>
              <Ionicons name="search" size={16} color={C.muted} />
              <TextInput
                style={styles.searchInput}
                value={search}
                onChangeText={setSearch}
                placeholder="Rechercher un pays ou un indicatif…"
                placeholderTextColor={C.muted}
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
                    {active && <Ionicons name="checkmark" size={16} color={C.primary} style={{ marginLeft: 4 }} />}
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
    backgroundColor: C.white, borderRadius: RADIUS.md + 2,
    borderWidth: 1.5, borderColor: C.border,
    overflow: 'hidden',
    ...SH.sm,
  },

  // Sélecteur pays
  countryBtn: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 12, paddingVertical: 14, gap: 6,
  },
  flag:     { fontSize: 22 },
  dialCode: { fontSize: 15, fontWeight: '700', color: C.text },

  separator: {
    width: 1, height: 28, backgroundColor: C.border, marginHorizontal: 2,
  },

  input: {
    flex: 1,
    fontSize: 16, color: C.text,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 14 : 11,
  },

  // Modal
  modal: {
    flex: 1, backgroundColor: C.white,
  },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingBottom: 16,
    borderBottomWidth: 1, borderBottomColor: C.border,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: C.text },

  // Recherche
  searchWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    margin: 16, paddingHorizontal: 14,
    backgroundColor: C.bg, borderRadius: RADIUS.md,
    borderWidth: 1, borderColor: C.border,
  },
  searchInput: {
    flex: 1, fontSize: 15, color: C.text,
    paddingVertical: Platform.OS === 'ios' ? 12 : 9,
  },

  // Liste
  listSeparator: { height: 1, backgroundColor: C.border, marginLeft: 64 },
  countryItem: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 13, gap: 14,
  },
  countryItemActive: { backgroundColor: C.surfaceAlt },
  itemFlag: { fontSize: 24, width: 32 },
  itemName: {
    flex: 1, fontSize: 15, color: C.text, fontWeight: '500',
  },
  itemNameActive: { color: C.primary, fontWeight: '700' },
  itemDial:       { fontSize: 14, color: C.sub, fontWeight: '600' },
  itemDialActive: { color: C.primary },

  emptyWrap: { padding: 40, alignItems: 'center' },
  emptyText: { fontSize: 15, color: C.sub },
});