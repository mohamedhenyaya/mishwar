import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator, Alert, Image, ImageURISource, KeyboardAvoidingView, Modal, Platform, Pressable, RefreshControl,
  ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as SecureStore from 'expo-secure-store';
import { Ionicons } from '@expo/vector-icons';

import Avatar from '../components/Avatar';
import DocumentSlot, { SlotStatus } from '../components/DocumentSlot';
import PlateInput from '../components/PlateInput';
import { captainSocketService } from '../services/socket';
import { apiErrorMessage, apiGet, apiPatch } from '../services/api';
import { chooseImage, photoUri, pickAndUploadPhoto, PickedImage, uploadImage } from '../services/photo';
import { API_BASE_URL, SECURE_STORE_KEY } from '../config/constants';
import {
  DOSSIER_ITEMS, DocumentType, formatDate, formatDateInput, futureDateToIso, isValidNni,
} from '../data/documents';
import { FUEL_TYPES, FuelType, MIN_VEHICLE_YEAR, formatPlate, isValidPlate } from '../data/vehicles';
import { useLanguage } from '../i18n/LanguageContext';
import { TranslationKey } from '../i18n/translations';
import { DriverProfile, RootStackParamList } from '../types';
import { C, RADIUS } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Profil'>;

interface DossierDocument {
  id:         string;
  type:       DocumentType;
  status:     SlotStatus;
  reviewNote: string | null;
  expiresAt:  string | null;
}
interface Dossier {
  status:              SlotStatus;
  rejectedReason:      string | null;
  make:                string | null;
  model:               string;
  year:                number | null;
  fuelType:            FuelType | null;
  plateNumber:         string;
  documents:           DossierDocument[];   // du plus récent au plus ancien
  missing:             string[];
  insuranceValidUntil: string | null;
  identity:            { firstName: string | null; lastName: string | null; nni: string | null };
}

// Une information modifiable à la fois, dans une petite fenêtre (crayon sur chaque ligne)
type EditKey = 'firstName' | 'lastName' | 'nni' | 'make' | 'model' | 'year' | 'fuelType' | 'plate' | 'insurance';
const EDIT_TITLES: Record<EditKey, TranslationKey> = {
  firstName: 'fieldFirstName', lastName: 'fieldLastName', nni: 'fieldNni', make: 'fieldMake', model: 'fieldModel',
  year: 'fieldYear', fuelType: 'fieldFuel', plate: 'fieldPlate', insurance: 'profileNewInsurance',
};

// Profil = dossier du capitaine, affiché en lecture. Avant l'approbation, chaque information se
// modifie via son crayon ; une fois le compte approuvé, tout est figé sauf l'assurance.
export default function ProfilScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { t } = useLanguage();
  const [profile,    setProfile]    = useState<DriverProfile | null>(null);
  const [dossier,    setDossier]    = useState<Dossier | null>(null);
  const [token,      setToken]      = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [busy,       setBusy]       = useState<string | null>(null);
  const [viewing,    setViewing]    = useState<ImageURISource | null>(null);

  const [editing,      setEditing]      = useState<EditKey | null>(null);
  const [draft,        setDraft]        = useState('');
  const [draftFuel,    setDraftFuel]    = useState<FuelType | null>(null);
  const [insurance,    setInsurance]    = useState<PickedImage | null>(null);
  const [insuranceEnd, setInsuranceEnd] = useState('');

  const load = useCallback(async () => {
    try {
      const [me, d, t] = await Promise.all([
        apiGet<DriverProfile>('/drivers/me'),
        apiGet<Dossier>('/drivers/vehicle'),
        SecureStore.getItemAsync(SECURE_STORE_KEY),
      ]);
      setProfile(me);
      setDossier(d);
      setToken(t);
    } catch (e) {
      Alert.alert(t('commonError'), apiErrorMessage(e, t('profileLoadError')));
    } finally {
      setRefreshing(false);
    }
  }, [t]);
  useEffect(() => { load(); }, [load]);
  // Pièce validée/refusée, compte approuvé… par un admin : statuts à jour sans recharger à la main
  useEffect(() => captainSocketService.onDossierUpdated(() => { load(); }), [load]);

  if (!profile || !dossier) {
    return <View style={styles.centered}><ActivityIndicator size="large" color={C.primary} /></View>;
  }

  const locked = dossier.status === 'APPROVED';
  const identity = dossier.identity;
  const latest = (type: DocumentType) => dossier.documents.find((d) => d.type === type);
  const documentImage = (doc: DossierDocument): ImageURISource => ({
    uri: `${API_BASE_URL}/drivers/vehicle/documents/${doc.id}/file`,
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
  const insuranceExpired = !dossier.insuranceValidUntil || new Date(dossier.insuranceValidUntil) < new Date();
  const pendingInsurance = latest('INSURANCE')?.status === 'PENDING' ? latest('INSURANCE') : undefined;

  // Envoi : recharge le dossier, affiche l'erreur du serveur
  const run = async (key: string, action: () => Promise<unknown>, success?: [string, string]) => {
    setBusy(key);
    try {
      await action();
      await load();
      setEditing(null);
      if (success) Alert.alert(...success);
    } catch (e) {
      Alert.alert(t('commonError'), apiErrorMessage(e, t('profileSaveError')));
    } finally {
      setBusy(null);
    }
  };

  const openEdit = (key: EditKey) => {
    const current: Partial<Record<EditKey, string>> = {
      firstName: identity.firstName ?? '', lastName: identity.lastName ?? '', nni: identity.nni ?? '',
      make: dossier.make ?? '', model: dossier.model, year: dossier.year ? String(dossier.year) : '',
      plate: formatPlate(dossier.plateNumber),
    };
    setDraft(current[key] ?? '');
    setDraftFuel(dossier.fuelType);
    setInsurance(null);
    setInsuranceEnd('');
    setEditing(key);
  };

  const yearNumber = Number(draft);
  const draftValid = editing === 'nni' ? isValidNni(draft)
    : editing === 'year' ? draft.length === 4 && yearNumber >= MIN_VEHICLE_YEAR && yearNumber <= new Date().getFullYear() + 1
    : editing === 'plate' ? isValidPlate(draft)
    : editing === 'fuelType' ? !!draftFuel
    : editing === 'insurance' ? !!insurance && !!futureDateToIso(insuranceEnd)
    : !!draft.trim();

  const save = () => {
    if (!editing || !draftValid) return;
    if (editing === 'firstName' || editing === 'lastName' || editing === 'nni') {
      return run(editing, () => apiPatch('/drivers/me/identity', {
        firstName: identity.firstName ?? '', lastName: identity.lastName ?? '', nni: identity.nni ?? '',
        [editing]: draft.trim(),
      }));
    }
    if (editing === 'insurance') {
      return run('insurance', () => uploadImage('/drivers/vehicle/documents', insurance!, { type: 'INSURANCE', expiresAt: futureDateToIso(insuranceEnd)! }),
        [t('profileInsuranceSentTitle'), t('profileInsuranceSentMessage')]);
    }
    const body = editing === 'year' ? { year: yearNumber }
      : editing === 'fuelType' ? { fuelType: draftFuel }
      : editing === 'plate' ? { plateNumber: draft }
      : { [editing]: draft.trim() };
    return run(editing, () => apiPatch('/drivers/vehicle', body));
  };

  const sendDocument = async (type: DocumentType) => {
    try {
      const image = await chooseImage();
      if (image) await run(type, () => uploadImage('/drivers/vehicle/documents', image, { type }));
    } catch (e: any) {
      Alert.alert(t('commonPhoto'), e?.message ?? t('commonPhotoOpenError'));
    }
  };

  const banner = dossier.status === 'REJECTED'
    ? { tone: styles.bannerDanger, title: t('profileRejectedTitle'), text: t('profileRejectedText')(dossier.rejectedReason) }
    : dossier.status === 'PENDING'
      ? { tone: styles.bannerWarning, title: t('profilePendingTitle'), text: dossier.missing.length ? t('profilePendingMissing') : t('profilePendingText') }
      : insuranceExpired
        ? { tone: styles.bannerDanger, title: t('profileExpiredTitle'), text: t('profileExpiredText') }
        : { tone: styles.bannerSuccess, title: t('profileApprovedTitle'), text: t('profileApprovedText') };

  // Ligne d'information : valeur + crayon (modifiable) ou cadenas (validé)
  const row = (label: string, value: string | null | undefined, key: EditKey, editable = !locked) => (
    <View style={styles.row} key={key}>
      <View style={{ flex: 1 }}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={[styles.rowValue, !value && styles.rowEmpty]}>{value || t('profileToFill')}</Text>
      </View>
      {editable
        ? (
          <TouchableOpacity style={styles.editBtn} onPress={() => openEdit(key)} hitSlop={8} accessibilityLabel={t('editLabel')(label)}>
            <Ionicons name="pencil" size={14} color={C.primary} />
          </TouchableOpacity>
        )
        : <Ionicons name="lock-closed-outline" size={16} color={C.muted} />}
    </View>
  );

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingTop: insets.top + 12, paddingBottom: insets.bottom + 32, paddingHorizontal: 20 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={C.primary} />}
    >
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.topTitle}>{t('commonMyProfile')}</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* ── Photo : agrandie au toucher, crayon pour la changer (avant approbation) ── */}
      <View style={styles.avatarWrap}>
        <TouchableOpacity onPress={() => profile.photoUrl && setViewing({ uri: photoUri(profile.photoUrl)! })} activeOpacity={0.85}>
          <Avatar photoUrl={profile.photoUrl} name={profile.name} size={110} color={C.primary} />
        </TouchableOpacity>
        {!locked && (
          <TouchableOpacity style={styles.avatarBadge} onPress={() => run('photo', () => pickAndUploadPhoto('/drivers/me/photo'))} disabled={busy === 'photo'}>
            {busy === 'photo' ? <ActivityIndicator size="small" color={C.white} /> : <Ionicons name="pencil" size={14} color={C.white} />}
          </TouchableOpacity>
        )}
      </View>
      <Text style={styles.name}>{profile.name || t('profileNoName')}</Text>
      <Text style={styles.phone}>{profile.phone}</Text>

      <View style={styles.stats}>
        <View style={styles.stat}>
          <Text style={styles.statValue}>⭐ {Number(profile.rating).toFixed(1)}</Text>
          <Text style={styles.statLabel}>{t('commonRating')}</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.stat}>
          <Text style={styles.statValue}>{profile.totalRides}</Text>
          <Text style={styles.statLabel}>{t('profileRidesDone')}</Text>
        </View>
      </View>

      <View style={[styles.banner, banner.tone]}>
        <Text style={styles.bannerTitle}>{banner.title}</Text>
        <Text style={styles.bannerText}>{banner.text}</Text>
      </View>

      <Text style={styles.section}>{t('profileIdentity')}</Text>
      <View style={styles.card}>
        {row(t('fieldFirstName'), identity.firstName, 'firstName')}
        {row(t('fieldLastName'), identity.lastName, 'lastName')}
        {row(t('fieldNni'), identity.nni, 'nni')}
      </View>

      <Text style={styles.section}>{t('profileVehicle')}</Text>
      <View style={styles.card}>
        {row(t('fieldMake'), dossier.make, 'make')}
        {row(t('fieldModel'), dossier.model, 'model')}
        {row(t('fieldYear'), dossier.year ? String(dossier.year) : null, 'year')}
        {row(t('fieldFuel'), dossier.fuelType ? t('fuelTypes')[dossier.fuelType] : null, 'fuelType')}
        {row(t('fieldPlate'), dossier.plateNumber, 'plate')}
      </View>

      {/* ── Assurance : toujours renouvelable ── */}
      <Text style={styles.section}>{t('profileInsurance')}</Text>
      <View style={styles.card}>
        {row(
          dossier.insuranceValidUntil && !insuranceExpired ? t('profileValidUntil') : t('profileInsurance'),
          dossier.insuranceValidUntil
            ? insuranceExpired ? t('profileExpiredOn')(formatDate(dossier.insuranceValidUntil)) : formatDate(dossier.insuranceValidUntil)
            : t('profileNoValidInsurance'),
          'insurance', true,
        )}
      </View>
      {pendingInsurance?.expiresAt && (
        <Text style={styles.sectionHint}>{t('profilePendingInsurance')(formatDate(pendingInsurance.expiresAt))}</Text>
      )}

      {/* ── Pièces : toujours consultables ; crayon pour remplacer une pièce non validée ── */}
      <Text style={styles.section}>{t('profileMyDocuments')}</Text>
      <View style={styles.block}>
        {DOSSIER_ITEMS.filter((key) => key !== 'PROFILE_PHOTO').map((key) => {
          const type = key as DocumentType;
          const doc = latest(type);
          const editable = type !== 'INSURANCE' && doc?.status !== 'APPROVED';
          return (
            <DocumentSlot
              key={type}
              label={t('dossierLabels')[type]}
              hint={doc ? t('dossierHints')[type] : t('profileNotProvided')}
              image={doc ? documentImage(doc) : null}
              status={doc?.status}
              note={doc?.reviewNote}
              loading={busy === type}
              editIcon
              onView={doc ? () => setViewing(documentImage(doc)) : undefined}
              onPress={editable ? () => sendDocument(type) : undefined}
            />
          );
        })}
      </View>

      {/* ── Modification d'une information ── */}
      <Modal visible={!!editing} transparent animationType="slide" onRequestClose={() => setEditing(null)}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <Pressable style={styles.backdrop} onPress={() => setEditing(null)} />
          <View style={[styles.sheet, { paddingBottom: insets.bottom + 20 }]}>
            <Text style={styles.sheetTitle}>{editing ? (t(EDIT_TITLES[editing]) as string) : ''}</Text>

            {editing === 'fuelType' ? (
              <View style={styles.chips}>
                {FUEL_TYPES.map((f) => (
                  <TouchableOpacity key={f} onPress={() => setDraftFuel(f)} activeOpacity={0.8} style={[styles.chip, draftFuel === f && styles.chipActive]}>
                    <Text style={[styles.chipLabel, draftFuel === f && styles.chipLabelActive]}>{t('fuelTypes')[f]}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            ) : editing === 'plate' ? (
              <PlateInput style={[styles.input, styles.plate]} value={draft} onChange={setDraft} onSubmitEditing={save} autoFocus />
            ) : editing === 'insurance' ? (
              <>
                <DocumentSlot
                  label={t('profileInsuranceCertificate')}
                  hint={t('profileEndDateVisible')}
                  image={insurance ? { uri: insurance.uri } : null}
                  onPress={async () => {
                    try { const image = await chooseImage(); if (image) setInsurance(image); }
                    catch (e: any) { Alert.alert(t('commonPhoto'), e?.message ?? t('commonPhotoOpenError')); }
                  }}
                />
                <Text style={styles.label}>{t('profileValidityEnd')}</Text>
                <TextInput style={styles.input} value={insuranceEnd} onChangeText={(v) => setInsuranceEnd(formatDateInput(v))}
                  placeholder={t('commonDatePlaceholder')} placeholderTextColor={C.muted} keyboardType="number-pad" maxLength={10} />
                {insuranceEnd.length === 10 && !futureDateToIso(insuranceEnd) && <Text style={styles.error}>{t('commonInvalidDate')}</Text>}
              </>
            ) : (
              <TextInput
                style={styles.input}
                value={draft}
                onChangeText={(v) => setDraft(editing === 'nni' ? v.replace(/\D/g, '').slice(0, 10) : editing === 'year' ? v.replace(/\D/g, '').slice(0, 4) : v)}
                keyboardType={editing === 'nni' || editing === 'year' ? 'number-pad' : 'default'}
                autoCapitalize={editing === 'model' ? 'sentences' : 'words'}
                placeholder={editing === 'nni' ? t('authNniPlaceholder') : editing === 'year' ? t('authYearPlaceholder') : undefined}
                placeholderTextColor={C.muted}
                maxLength={editing === 'nni' ? 10 : editing === 'year' ? 4 : 60}
                returnKeyType="done"
                onSubmitEditing={save}
                autoFocus
              />
            )}

            <View style={styles.sheetActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setEditing(null)} activeOpacity={0.8}>
                <Text style={styles.cancelText}>{t('commonCancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.saveBtn, (!draftValid || !!busy) && styles.disabled]} onPress={save} disabled={!draftValid || !!busy} activeOpacity={0.85}>
                {busy ? <ActivityIndicator color={C.white} /> : <Text style={styles.saveText}>{t('commonValidate')}</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── Photo agrandie ── */}
      <Modal visible={!!viewing} transparent animationType="fade" onRequestClose={() => setViewing(null)}>
        <View style={styles.viewer}>
          {viewing && <Image source={viewing} style={styles.viewerImage} resizeMode="contain" />}
          <TouchableOpacity style={[styles.viewerClose, { top: insets.top + 12 }]} onPress={() => setViewing(null)}>
            <Ionicons name="close" size={26} color={C.white} />
          </TouchableOpacity>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  centered:  { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: C.bg },

  topBar:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 },
  backBtn:  { width: 40, height: 40, borderRadius: RADIUS.md, backgroundColor: C.surface, alignItems: 'center', justifyContent: 'center' },
  backText: { fontSize: 26, color: C.text, marginTop: -3 },
  topTitle: { fontSize: 17, fontWeight: '700', color: C.text },

  avatarWrap:  { alignSelf: 'center' },
  avatarBadge: {
    position: 'absolute', right: 0, bottom: 0, width: 34, height: 34, borderRadius: 17,
    backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: C.bg,
  },
  name:  { alignSelf: 'center', marginTop: 12, fontSize: 18, fontWeight: '800', color: C.text },
  phone: { alignSelf: 'center', marginTop: 2, fontSize: 14, color: C.sub },

  stats: {
    flexDirection: 'row', backgroundColor: C.surface, borderRadius: RADIUS.lg,
    paddingVertical: 14, marginTop: 18, marginBottom: 18,
  },
  stat:        { flex: 1, alignItems: 'center' },
  statValue:   { fontSize: 18, fontWeight: '800', color: C.text },
  statLabel:   { fontSize: 12, color: C.sub, marginTop: 2 },
  statDivider: { width: 1, backgroundColor: C.border },

  banner:        { padding: 14, borderRadius: RADIUS.lg, borderWidth: 1 },
  bannerSuccess: { backgroundColor: '#E8F8F0', borderColor: '#BDEBD3' },
  bannerWarning: { backgroundColor: '#FFF8E6', borderColor: '#FFE2A8' },
  bannerDanger:  { backgroundColor: '#FFF1F1', borderColor: '#FFD0D0' },
  bannerTitle:   { fontSize: 15, fontWeight: '800', color: C.text, marginBottom: 2 },
  bannerText:    { fontSize: 13, color: C.text, lineHeight: 19 },

  section:     { fontSize: 15, fontWeight: '800', color: C.text, marginTop: 26, marginBottom: 8 },
  sectionHint: { fontSize: 13, color: C.sub, marginTop: 8, lineHeight: 19 },
  block:       { gap: 10 },
  card:        { backgroundColor: C.surface, borderRadius: RADIUS.lg, paddingHorizontal: 16, borderWidth: 1.5, borderColor: C.border },
  row:         { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.border },
  rowLabel:    { fontSize: 12, color: C.sub },
  rowValue:    { fontSize: 15, fontWeight: '700', color: C.text, marginTop: 2 },
  rowEmpty:    { color: C.danger, fontWeight: '600' },
  editBtn:     { width: 30, height: 30, borderRadius: 15, backgroundColor: '#F1EDFF', alignItems: 'center', justifyContent: 'center' },

  backdrop:     { flex: 1, backgroundColor: 'rgba(26, 11, 59, 0.5)' },
  sheet:        { backgroundColor: C.surface, borderTopLeftRadius: RADIUS.xl, borderTopRightRadius: RADIUS.xl, padding: 20, gap: 12 },
  sheetTitle:   { fontSize: 17, fontWeight: '800', color: C.text },
  sheetActions: { flexDirection: 'row', gap: 10, marginTop: 6 },
  cancelBtn:    { flex: 1, height: 52, borderRadius: RADIUS.lg, borderWidth: 1.5, borderColor: C.border, alignItems: 'center', justifyContent: 'center' },
  cancelText:   { fontSize: 15, fontWeight: '700', color: C.sub },

  label: { fontSize: 13, fontWeight: '600', color: C.sub, marginTop: 4 },
  input: {
    height: 52, borderRadius: RADIUS.lg, backgroundColor: C.bg, paddingHorizontal: 16,
    fontSize: 15, color: C.text, borderWidth: 1.5, borderColor: C.border,
  },
  plate: { fontWeight: '700', letterSpacing: 1.5 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip:  { paddingHorizontal: 16, paddingVertical: 10, borderRadius: RADIUS.lg, backgroundColor: C.bg, borderWidth: 2, borderColor: C.border },
  chipActive:      { borderColor: C.primary, backgroundColor: '#FAF8FF' },
  chipLabel:       { fontSize: 14, fontWeight: '700', color: C.sub },
  chipLabelActive: { color: C.primary },
  error:    { fontSize: 12, color: C.danger, fontWeight: '600' },
  saveBtn:  { flex: 1, height: 52, borderRadius: RADIUS.lg, backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center' },
  saveText: { color: C.white, fontSize: 15, fontWeight: '700' },
  disabled: { opacity: 0.5 },

  viewer:      { flex: 1, backgroundColor: 'rgba(0,0,0,0.92)', alignItems: 'center', justifyContent: 'center' },
  viewerImage: { width: '100%', height: '80%' },
  viewerClose: { position: 'absolute', right: 20, padding: 6 },
});
