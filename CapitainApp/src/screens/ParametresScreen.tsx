import React, { useState } from 'react';
import {
  StyleSheet, View, Text, TouchableOpacity,
  ScrollView, TextInput, Alert, Switch, Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList } from '../types';
import { SUPPORT_PHONE, SUPPORT_WHATSAPP } from '../config/constants';
import { logout } from '../services/api';
import { useLanguage } from '../i18n/LanguageContext';
import { LANGUAGE_NAMES, LanguageCode } from '../i18n/translations';
import { C, G, SH, RADIUS } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Parametres'>;
type IoniconName = keyof typeof Ionicons.glyphMap;

// ─── Section header ───────────────────────────────────────────────────────────
function Section({ label, icon }: { label: string; icon: IoniconName }) {
  return (
    <View style={sec.row}>
      <Ionicons name={icon} size={15} color={C.primary} />
      <Text style={sec.label}>{label}</Text>
    </View>
  );
}
const sec = StyleSheet.create({
  row:   { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 4, marginBottom: 8, marginTop: 20 },
  label: { fontSize: 13, fontWeight: '800', color: C.primary, textTransform: 'uppercase', letterSpacing: 0.8 },
});

// ─── Settings row ─────────────────────────────────────────────────────────────
function SettingRow({
  badgeIcon, badgeBg, badgeColor = C.primary, label, sub, value, onPress, last = false, external = false,
}: {
  badgeIcon: IoniconName; badgeBg: string; badgeColor?: string; label: string; sub?: string;
  value?: string; onPress?: () => void; last?: boolean; external?: boolean;
}) {
  return (
    <TouchableOpacity
      style={[row.wrap, last && row.last]}
      onPress={onPress}
      activeOpacity={onPress ? 0.65 : 1}
      disabled={!onPress}
    >
      <View style={[row.badge, { backgroundColor: badgeBg }]}>
        <Ionicons name={badgeIcon} size={18} color={badgeColor} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={row.label}>{label}</Text>
        {sub && <Text style={row.sub}>{sub}</Text>}
      </View>
      {value !== undefined && (
        <View style={row.right}>
          <Text style={row.value}>{value}</Text>
          {onPress && <Ionicons name="chevron-forward" size={19} color={C.muted} />}
        </View>
      )}
      {external && <Ionicons name="open-outline" size={18} color={C.sub} />}
    </TouchableOpacity>
  );
}

function DropdownRow({ badgeIcon, badgeBg, label, value, last = false }: {
  badgeIcon: IoniconName; badgeBg: string; label: string; value: string; last?: boolean;
}) {
  return (
    <View style={[row.wrap, last && row.last]}>
      <View style={[row.badge, { backgroundColor: badgeBg }]}>
        <Ionicons name={badgeIcon} size={18} color={C.primary} />
      </View>
      <Text style={row.label}>{label}</Text>
      <View style={row.dropdownRight}>
        <Text style={row.dropValue}>{value}</Text>
        <View style={row.dropArrow}><Ionicons name="chevron-down" size={10} color={C.primary} /></View>
      </View>
    </View>
  );
}

// Langue de l'application : choix immédiat, enregistré sur le téléphone
function LanguageRow({ badgeIcon, badgeBg, label }: { badgeIcon: IoniconName; badgeBg: string; label: string }) {
  const { language, setLanguage } = useLanguage();
  return (
    <View style={row.wrap}>
      <View style={[row.badge, { backgroundColor: badgeBg }]}>
        <Ionicons name={badgeIcon} size={18} color={C.primary} />
      </View>
      <Text style={[row.label, { flex: 1 }]}>{label}</Text>
      <View style={row.segment}>
        {(Object.keys(LANGUAGE_NAMES) as LanguageCode[]).map((code) => (
          <TouchableOpacity
            key={code}
            style={[row.segmentItem, language === code && row.segmentItemActive]}
            onPress={() => setLanguage(code)}
            activeOpacity={0.8}
          >
            <Text style={[row.segmentText, language === code && row.segmentTextActive]}>{LANGUAGE_NAMES[code]}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

function SwitchRow({ badgeIcon, badgeBg, label, value, onChange, last = false }: {
  badgeIcon: IoniconName; badgeBg: string; label: string; value: boolean; onChange: (v: boolean) => void; last?: boolean;
}) {
  return (
    <View style={[row.wrap, last && row.last]}>
      <View style={[row.badge, { backgroundColor: badgeBg }]}>
        <Ionicons name={badgeIcon} size={18} color={C.primary} />
      </View>
      <Text style={row.label}>{label}</Text>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ true: C.primary, false: C.border }}
        thumbColor={C.white}
      />
    </View>
  );
}

const row = StyleSheet.create({
  wrap: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12, gap: 14,
    borderBottomWidth: 1, borderBottomColor: C.borderLt,
  },
  last:      { borderBottomWidth: 0 },
  badge:     { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  label:     { fontSize: 15, color: C.text, fontWeight: '500' },
  sub:       { fontSize: 12, color: C.sub, marginTop: 1 },
  right:     { flexDirection: 'row', alignItems: 'center', gap: 4 },
  value:     { fontSize: 14, color: C.sub },
  dropdownRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dropValue:     { fontSize: 14, color: C.primary, fontWeight: '600' },
  dropArrow:     { width: 22, height: 22, borderRadius: 6, backgroundColor: C.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
  segment:           { flexDirection: 'row', backgroundColor: C.surfaceAlt, borderRadius: RADIUS.md, padding: 3 },
  segmentItem:       { paddingHorizontal: 10, paddingVertical: 6, borderRadius: RADIUS.md - 2 },
  segmentItemActive: { backgroundColor: C.primary },
  segmentText:       { fontSize: 13, fontWeight: '600', color: C.primary },
  segmentTextActive: { color: C.white, fontWeight: '700' },
});

// ─── Volume slider ────────────────────────────────────────────────────────────
function VolumeRow({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const { t } = useLanguage();
  const STEPS = [0, 0.25, 0.5, 0.75, 1];
  return (
    <View style={vol.wrap}>
      <View style={vol.header}>
        <View style={[row.badge, { backgroundColor: '#FFF3E0' }]}>
          <Ionicons name="notifications" size={17} color={C.primary} />
        </View>
        <Text style={vol.label}>{t('settingsRingVolume')}</Text>
        <View style={vol.valuePill}>
          <Text style={vol.valueText}>{Math.round(value * 100)}%</Text>
        </View>
      </View>
      <View style={vol.trackWrap}>
        <View style={vol.track}>
          <View style={[vol.fill, { width: `${value * 100}%` }]} />
        </View>
        <View style={[vol.thumb, { left: `${value * 100}%` as any }]} />
      </View>
      <View style={vol.stepRow}>
        {STEPS.map((s) => (
          <TouchableOpacity key={s} onPress={() => onChange(s)} style={vol.stepBtn} activeOpacity={0.7}>
            <View style={[vol.stepDot, value >= s && vol.stepDotActive]} />
            <Text style={[vol.stepLbl, value === s && vol.stepLblActive]}>{Math.round(s * 100)}%</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}
const vol = StyleSheet.create({
  wrap:        { padding: 16, gap: 14 },
  header:      { flexDirection: 'row', alignItems: 'center', gap: 14 },
  label:       { flex: 1, fontSize: 15, color: C.text, fontWeight: '500' },
  valuePill:   { backgroundColor: C.primary, borderRadius: RADIUS.pill, paddingHorizontal: 10, paddingVertical: 3 },
  valueText:   { fontSize: 13, fontWeight: '800', color: C.white },
  trackWrap:   { position: 'relative', height: 6, marginHorizontal: 4 },
  track:       { height: 6, backgroundColor: C.border, borderRadius: 3, overflow: 'hidden' },
  fill:        { height: 6, backgroundColor: C.primary, borderRadius: 3 },
  thumb: {
    position: 'absolute', top: -7, marginLeft: -10,
    width: 20, height: 20, borderRadius: 10,
    backgroundColor: C.white, borderWidth: 3, borderColor: C.primary,
    ...SH.md,
  },
  stepRow:     { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 0 },
  stepBtn:     { alignItems: 'center', gap: 4 },
  stepDot:     { width: 6, height: 6, borderRadius: 3, backgroundColor: C.border },
  stepDotActive:{ backgroundColor: C.primary },
  stepLbl:     { fontSize: 10, color: C.muted, fontWeight: '600' },
  stepLblActive:{ color: C.primary, fontWeight: '800' },
});

// ─── Card wrapper ─────────────────────────────────────────────────────────────
function Card({ children }: { children: React.ReactNode }) {
  return <View style={styles.card}>{children}</View>;
}

// ─────────────────────────────────────────────────────────────────────────────

export default function ParametresScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { t } = useLanguage();
  const [volume,        setVolume]        = useState(1.0);
  const [emailVerified, setEmailVerified] = useState(false);
  const [editEmail,     setEditEmail]     = useState(false);
  const [email,         setEmail]         = useState('');
  const [editPwd,       setEditPwd]       = useState(false);
  const [newPwd,        setNewPwd]        = useState('');
  const [notifSound,    setNotifSound]    = useState(true);
  const [notifVibrate,  setNotifVibrate]  = useState(true);

  const handleLogout = () => {
    Alert.alert(t('settingsLogoutTitle'), t('settingsLogoutConfirm'), [
      { text: t('commonCancel'), style: 'cancel' },
      {
        text: t('settingsLogoutBtn'), style: 'destructive',
        onPress: logout,
      },
    ]);
  };

  const handleDelete = () => {
    Alert.alert(
      t('settingsDeleteAccount'),
      t('settingsDeleteMessage'),
      [
        { text: t('commonCancel'), style: 'cancel' },
        { text: t('settingsDeleteForever'), style: 'destructive', onPress: () => {} },
      ],
    );
  };

  const callSupport = () => Linking.openURL(`tel:${SUPPORT_PHONE}`);
  const chatWhatsapp = () => Linking.openURL(`https://wa.me/${SUPPORT_WHATSAPP.replace(/[^0-9]/g, '')}`);

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* ── Header ── */}
      <LinearGradient colors={G.dark} style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={22} color={C.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('settingsTitle')}</Text>
        <Text style={styles.headerSub}>{t('settingsSub')}</Text>
      </LinearGradient>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 40 }]}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
      >
        {/* ── Langue ── */}
        <Section icon="globe-outline" label={t('settingsLangRegion')} />
        <Card>
          <LanguageRow badgeIcon="earth" badgeBg="#E8F5E9" label={t('languageSettingLabel')} />
          <DropdownRow badgeIcon="location-outline" badgeBg="#FFF3E0" label={t('settingsPlaceNames')} value="العربية" last />
        </Card>

        {/* ── Navigation ── */}
        <Section icon="map-outline" label={t('settingsNavigation')} />
        <Card>
          <DropdownRow badgeIcon="navigate-outline" badgeBg="#E3F2FD" label={t('settingsDefaultGps')} value="Google Maps" last />
        </Card>

        {/* ── Notifications ── */}
        <Section icon="notifications-outline" label={t('settingsNotifications')} />
        <Card>
          <SwitchRow badgeIcon="volume-high-outline" badgeBg="#FFF3E0" label={t('settingsNotifSound')} value={notifSound}   onChange={setNotifSound}   />
          <SwitchRow badgeIcon="phone-portrait-outline" badgeBg="#F3E5F5" label={t('settingsVibration')}           value={notifVibrate} onChange={setNotifVibrate} last />
        </Card>

        {/* ── Sonnerie ── */}
        <Section icon="musical-notes-outline" label={t('settingsRingtone')} />
        <Card>
          <VolumeRow value={volume} onChange={setVolume} />
        </Card>

        {/* ── Informations ── */}
        <Section icon="person-outline" label={t('settingsPersonalInfo')} />
        <Card>
          <SettingRow badgeIcon="call-outline" badgeBg="#E8F5E9" label={t('settingsPhone')} value="20122724"       />
          <SettingRow badgeIcon="person" badgeBg="#EDE9FF" label={t('settingsName')} value="MohamedhenYaya" />

          {/* Email */}
          {editEmail ? (
            <View style={[styles.editRow]}>
              <View style={[row.badge, { backgroundColor: '#E3F2FD' }]}>
                <Ionicons name="mail-outline" size={17} color={C.primary} />
              </View>
              <TextInput
                style={styles.editInput}
                value={email}
                onChangeText={setEmail}
                placeholder={t('settingsEmailPlaceholder')}
                placeholderTextColor={C.muted}
                keyboardType="email-address"
                autoCapitalize="none"
                autoFocus
              />
              <TouchableOpacity onPress={() => setEditEmail(false)} style={styles.confirmBtn}>
                <Ionicons name="checkmark" size={16} color={C.white} />
              </TouchableOpacity>
            </View>
          ) : (
            <SettingRow badgeIcon="mail-outline" badgeBg="#E3F2FD" label={t('settingsEmail')} value={email || t('settingsNotSet')} onPress={() => setEditEmail(true)} />
          )}

          {/* Password */}
          {editPwd ? (
            <View style={[styles.editRow, styles.editRowLast]}>
              <View style={[row.badge, { backgroundColor: '#F3E5F5' }]}>
                <Ionicons name="lock-closed-outline" size={17} color={C.primary} />
              </View>
              <TextInput
                style={styles.editInput}
                value={newPwd}
                onChangeText={setNewPwd}
                placeholder={t('settingsNewPassword')}
                placeholderTextColor={C.muted}
                secureTextEntry
                autoFocus
              />
              <TouchableOpacity onPress={() => setEditPwd(false)} style={styles.confirmBtn}>
                <Ionicons name="checkmark" size={16} color={C.white} />
              </TouchableOpacity>
            </View>
          ) : (
            <SettingRow badgeIcon="lock-closed-outline" badgeBg="#F3E5F5" label={t('settingsPassword')} value={t('settingsModify')} onPress={() => setEditPwd(true)} last />
          )}
        </Card>

        {/* ── Vérification email ── */}
        <View style={styles.emailVerifCard}>
          <View style={styles.emailVerifTop}>
            <Text style={styles.emailVerifLabel}>{t('settingsEmailVerified')}</Text>
            <View style={[styles.emailVerifBadge, { backgroundColor: emailVerified ? '#ECFDF5' : '#FFF1F5', borderColor: emailVerified ? C.accentDk : C.dangerDk }]}>
              <Ionicons name={emailVerified ? 'checkmark-circle' : 'close-circle'} size={13} color={emailVerified ? C.accentDk : C.danger} />
              <Text style={[styles.emailVerifStatus, { color: emailVerified ? C.accentDk : C.danger }]}>
                {emailVerified ? t('settingsVerified') : t('settingsNotVerified')}
              </Text>
            </View>
          </View>
          {!emailVerified && (
            <TouchableOpacity
              style={styles.verifyBtn}
              onPress={() => Alert.alert(t('settingsEmail'), t('settingsVerificationSent'))}
              activeOpacity={0.85}
            >
              <LinearGradient colors={G.primary} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.verifyBtnGrad}>
                <Text style={styles.verifyBtnText}>{t('settingsVerifyEmail')}</Text>
              </LinearGradient>
            </TouchableOpacity>
          )}
        </View>

        {/* ── Soutien ── */}
        <Section icon="headset-outline" label={t('settingsSupport')} />
        <Card>
          <SettingRow
            badgeIcon="call" badgeBg="#E3F2FD"
            label={t('settingsHelpCenter')} sub={SUPPORT_PHONE}
            onPress={callSupport}
          />
          <SettingRow
            badgeIcon="logo-whatsapp" badgeBg={C.accentDk + '22'} badgeColor={C.accentDk}
            label={t('commonWhatsapp')} sub={SUPPORT_WHATSAPP}
            onPress={chatWhatsapp}
          />
          <SettingRow
            badgeIcon="wallet-outline" badgeBg="#FFF3E0"
            label={t('settingsRechargeWallet')}
            onPress={() => navigation.navigate('Recharge')}
            last
          />
        </Card>

        {/* ── Actions compte ── */}
        <Section icon="settings-outline" label={t('settingsAccount')} />
        <Card>
          <SettingRow badgeIcon="document-text-outline" badgeBg="#E3F2FD" label={t('settingsPrivacy')} onPress={() => {}} />
          <SettingRow badgeIcon="log-out-outline" badgeBg="#FEE2E2" badgeColor={C.danger} label={t('menuLogout')} onPress={handleLogout} last />
        </Card>

        {/* ── Danger zone ── */}
        <TouchableOpacity style={styles.deleteZone} onPress={handleDelete} activeOpacity={0.7}>
          <Ionicons name="trash-outline" size={22} color={C.danger} />
          <View>
            <Text style={styles.deleteTitle}>{t('settingsDeleteAccount')}</Text>
            <Text style={styles.deleteSub}>{t('settingsDeleteSub')}</Text>
          </View>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },

  header: {
    paddingHorizontal: 20, paddingBottom: 28,
    borderBottomLeftRadius: RADIUS.xxl, borderBottomRightRadius: RADIUS.xxl,
  },
  backBtn: {
    width: 38, height: 38, borderRadius: RADIUS.md,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center', justifyContent: 'center', marginBottom: 14,
  },
  headerTitle: { fontSize: 26, fontWeight: '900', color: C.white },
  headerSub:   { fontSize: 13, color: 'rgba(255,255,255,0.5)', marginTop: 4 },

  scroll: { paddingHorizontal: 16, paddingTop: 8 },

  card: {
    backgroundColor: C.surface, borderRadius: RADIUS.xl,
    overflow: 'hidden', ...SH.sm,
  },

  editRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 10, gap: 14,
    borderBottomWidth: 1, borderBottomColor: C.borderLt,
  },
  editRowLast: { borderBottomWidth: 0 },
  editInput: {
    flex: 1, fontSize: 15, color: C.text,
    borderBottomWidth: 1.5, borderBottomColor: C.primary, paddingBottom: 4,
  },
  confirmBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center',
  },

  // Email verif card
  emailVerifCard: {
    backgroundColor: C.surface, borderRadius: RADIUS.xl,
    padding: 16, gap: 14, marginTop: 16, ...SH.sm,
  },
  emailVerifTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  emailVerifLabel: { fontSize: 15, fontWeight: '600', color: C.text },
  emailVerifBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: RADIUS.pill, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1 },
  emailVerifStatus: { fontSize: 13, fontWeight: '700' },
  verifyBtn:      { borderRadius: RADIUS.lg, overflow: 'hidden', ...SH.md },
  verifyBtnGrad:  { paddingVertical: 14, alignItems: 'center' },
  verifyBtnText:  { color: C.white, fontSize: 15, fontWeight: '700' },

  // Delete zone
  deleteZone: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: '#FFF1F5', borderRadius: RADIUS.xl,
    padding: 16, marginTop: 24, marginBottom: 8,
    borderWidth: 1, borderColor: '#FFD6E4',
  },
  deleteTitle: { fontSize: 14, fontWeight: '700', color: C.danger },
  deleteSub:   { fontSize: 11, color: C.danger, opacity: 0.7, marginTop: 2 },
});
