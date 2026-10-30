import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '../i18n/LanguageContext';
import { LANGUAGE_NAMES, LanguageCode } from '../i18n/translations';
import { RootStackParamList } from '../types';
import { C, G, SH, RADIUS } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Language'>;

const OPTIONS: { code: LanguageCode; hint: string }[] = [
  { code: 'fr', hint: 'Continuer en français' },
  { code: 'ar', hint: 'المتابعة باللغة العربية' },
];

// Premier lancement : choix de la langue avant tout autre écran (modifiable ensuite dans Paramètres).
// Les textes sont affichés dans les deux langues, aucune n'étant encore choisie.
export default function LanguageScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const { setLanguage } = useLanguage();

  const choose = (code: LanguageCode) => {
    setLanguage(code);
    navigation.replace(route.params?.next ?? 'Welcome');
  };

  return (
    <LinearGradient colors={G.hero} start={{ x: 0.1, y: 0 }} end={{ x: 0.9, y: 1 }} style={[styles.root, { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 32 }]}>
      <StatusBar style="light" />

      <View style={styles.logoBlock}>
        <View style={styles.logoRing}>
          <Ionicons name="globe-outline" size={38} color={C.white} />
        </View>
        <Text style={styles.title}>Choisissez votre langue</Text>
        <Text style={styles.title}>اختر لغتك</Text>
      </View>

      <View style={styles.options}>
        {OPTIONS.map((o) => (
          <TouchableOpacity key={o.code} style={styles.option} onPress={() => choose(o.code)} activeOpacity={0.85}>
            <View style={{ flex: 1 }}>
              <Text style={styles.optionName}>{LANGUAGE_NAMES[o.code]}</Text>
              <Text style={styles.optionHint}>{o.hint}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={C.primary} />
          </TouchableOpacity>
        ))}
        <Text style={styles.footnote}>Modifiable dans Paramètres · يمكن تغييرها من الإعدادات</Text>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, paddingHorizontal: 24, justifyContent: 'space-between' },

  logoBlock: { alignItems: 'center', gap: 10 },
  logoRing: {
    width: 84, height: 84, borderRadius: 42, marginBottom: 14,
    backgroundColor: 'rgba(255,255,255,0.13)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },
  title: { fontSize: 24, fontWeight: '800', color: C.white, textAlign: 'center' },

  options: { gap: 14 },
  option: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: C.surface, borderRadius: RADIUS.xl,
    paddingHorizontal: 22, paddingVertical: 20,
    ...SH.md,
  },
  optionName: { fontSize: 20, fontWeight: '800', color: C.text },
  optionHint: { fontSize: 13, color: C.sub, marginTop: 2 },
  footnote:   { fontSize: 12, color: 'rgba(255,255,255,0.6)', textAlign: 'center', marginTop: 6 },
});
