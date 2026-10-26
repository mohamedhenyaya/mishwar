import React, { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { DrawerContentComponentProps, useDrawerStatus } from '@react-navigation/drawer';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import { SECURE_STORE_KEY, APP_VERSION } from '../config/constants';
import { resetToWelcome } from './navigationRef';
import { apiGet } from '../services/api';
import Avatar from '../components/Avatar';
import { DriverProfile } from '../types';
import { C, G, RADIUS } from '../theme';

const MENU_ITEMS = [
  { key: 'Chauffeur',              icon: 'car-sport'      as const, color: '#EDE9FF', route: 'Home'        as const },
  { key: 'Mon profil',             icon: 'person-circle-outline' as const, color: '#EDE9FF', route: 'Profil' as const },
  { key: 'Mes trajets',            icon: 'reader-outline' as const, color: '#E8F5E9', route: 'Historique'  as const },
  { key: 'Mon compte',             icon: 'wallet-outline' as const, color: '#E3F2FD', route: 'MonCompte'   as const },
  { key: 'Performance et classement', icon: 'trophy-outline' as const, color: '#FFF3E0', route: 'Performance' as const },
  { key: 'Paramètres',             icon: 'settings-outline' as const, color: '#F3E5F5', route: 'Parametres' as const },
];

export default function DrawerContent({ navigation }: DrawerContentComponentProps) {
  // Profil réel (nom, photo, note, statut) rechargé à chaque ouverture du menu
  const [profile, setProfile] = useState<DriverProfile | null>(null);
  const drawerStatus = useDrawerStatus();
  const loadProfile = useCallback(() => {
    apiGet<DriverProfile>('/drivers/me').then(setProfile).catch(() => {});
  }, []);
  React.useEffect(() => { if (drawerStatus === 'open') loadProfile(); }, [drawerStatus, loadProfile]);
  const isOnline = !!profile && profile.status !== 'OFFLINE';

  const handleMenu = (route: (typeof MENU_ITEMS)[number]['route']) => {
    navigation.closeDrawer();
    if (route !== 'Home') navigation.navigate(route as never);
  };

  const handleLogout = async () => {
    navigation.closeDrawer();
    await SecureStore.deleteItemAsync(SECURE_STORE_KEY);
    resetToWelcome();
  };

  return (
    <View style={styles.root}>
      {/* Header sombre */}
      <LinearGradient colors={G.dark} style={styles.header}>
        <View style={styles.blob} />

        <View style={styles.avatarWrap}>
          <LinearGradient colors={G.primary} style={styles.avatarRing}>
            <Avatar photoUrl={profile?.photoUrl} name={profile?.name ?? 'C'} size={65} color={C.darkMid} />
          </LinearGradient>
          <View style={[styles.avatarBadge, { backgroundColor: isOnline ? C.accent : C.danger }]} />
        </View>
        <Text style={styles.name}>{profile?.name || 'Complétez votre profil'}</Text>
        <Text style={styles.phone}>{profile?.phone ?? ''}</Text>

        <View style={styles.ratingChip}>
          <Ionicons name="star" size={12} color="#FFD60A" />
          <Text style={styles.ratingText}>{Number(profile?.rating ?? 5).toFixed(1)}</Text>
          <Text style={styles.ratingDot}>·</Text>
          <Text style={styles.ratingText}>{profile?.totalRides ?? 0} courses</Text>
        </View>
      </LinearGradient>

      {/* Menu */}
      <ScrollView style={styles.menu} showsVerticalScrollIndicator={false}>
        {MENU_ITEMS.map((item) => (
          <TouchableOpacity
            key={item.key}
            style={styles.menuItem}
            onPress={() => handleMenu(item.route)}
            activeOpacity={0.65}
          >
            <View style={[styles.menuIconBadge, { backgroundColor: item.color }]}>
              <Ionicons name={item.icon} size={19} color={C.primary} />
            </View>
            <Text style={styles.menuLabel}>{item.key}</Text>
            <Ionicons name="chevron-forward" size={19} color={C.muted} />
          </TouchableOpacity>
        ))}

        <View style={styles.divider} />

        <TouchableOpacity style={styles.passengerRow} activeOpacity={0.8}>
          <View style={styles.passengerContent}>
            <Ionicons name="person-outline" size={20} color={C.text} style={{ width: 40, textAlign: 'center' }} />
            <View>
              <Text style={styles.passengerTitle}>Mode Passager</Text>
              <Text style={styles.passengerSub}>Passer en mode client</Text>
            </View>
          </View>
          <View style={styles.passengerBadge}>
            <Text style={styles.passengerBadgeText}>Bêta</Text>
          </View>
        </TouchableOpacity>

        <View style={styles.divider} />

        <TouchableOpacity style={styles.logoutRow} onPress={handleLogout} activeOpacity={0.7}>
          <View style={[styles.menuIconBadge, { backgroundColor: '#FEE2E2' }]}>
            <Ionicons name="log-out-outline" size={19} color={C.danger} />
          </View>
          <Text style={[styles.menuLabel, { color: C.danger }]}>Se déconnecter</Text>
        </TouchableOpacity>

        <View style={styles.footer}>
          <View style={styles.footerLangRow}>
            <Ionicons name="globe-outline" size={13} color={C.sub} />
            <Text style={styles.footerLang}>Français</Text>
          </View>
          <Text style={styles.footerVersion}>Volta Capitaine v{APP_VERSION}</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.surface },

  header: { paddingHorizontal: 24, paddingTop: 56, paddingBottom: 24, overflow: 'hidden' },
  blob: {
    position: 'absolute', top: -60, right: -80,
    width: 220, height: 220, borderRadius: 110,
    backgroundColor: C.primaryLt, opacity: 0.1,
  },

  avatarWrap: { position: 'relative', alignSelf: 'flex-start', marginBottom: 14 },
  avatarRing: {
    width: 70, height: 70, borderRadius: 35,
    padding: 2.5, alignItems: 'center', justifyContent: 'center',
  },
  avatarBadge: {
    position: 'absolute', bottom: 2, right: 2,
    width: 16, height: 16, borderRadius: 8,
    borderWidth: 2.5, borderColor: C.white,
  },

  name:  { fontSize: 20, fontWeight: '800', color: C.white, marginBottom: 4 },
  phone: { fontSize: 13, color: 'rgba(255,255,255,0.55)', marginBottom: 12 },

  ratingChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: RADIUS.pill, paddingHorizontal: 12, paddingVertical: 6,
    alignSelf: 'flex-start',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
  },
  ratingText: { fontSize: 13, color: C.white, fontWeight: '700' },
  ratingDot:  { fontSize: 13, color: 'rgba(255,255,255,0.4)' },

  menu: { flex: 1 },
  menuItem: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 13, gap: 14,
  },
  menuIconBadge: {
    width: 40, height: 40, borderRadius: RADIUS.md,
    alignItems: 'center', justifyContent: 'center',
  },
  menuLabel: { flex: 1, fontSize: 15, color: C.text, fontWeight: '600' },
  divider: { height: 1, backgroundColor: C.border, marginHorizontal: 20, marginVertical: 4 },

  passengerRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 14,
  },
  passengerContent: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  passengerTitle:   { fontSize: 15, fontWeight: '600', color: C.text },
  passengerSub:     { fontSize: 12, color: C.sub, marginTop: 2 },
  passengerBadge:   { backgroundColor: C.surfaceAlt, borderRadius: RADIUS.pill, paddingHorizontal: 8, paddingVertical: 3 },
  passengerBadgeText: { fontSize: 11, color: C.primary, fontWeight: '700' },

  logoutRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 13, gap: 14,
  },

  footer: { padding: 20, gap: 6 },
  footerLangRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  footerLang:    { fontSize: 13, color: C.sub },
  footerVersion: { fontSize: 11, color: C.muted },
});
