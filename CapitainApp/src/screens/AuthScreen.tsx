import React, { useRef, useState, useEffect } from 'react';
import {
  ActivityIndicator, Alert, Animated, KeyboardAvoidingView,
  Platform, ScrollView, StyleSheet, Text, TextInput,
  TouchableOpacity, View,
} from 'react-native';
import type { TextInputInstance } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import { apiPost, apiErrorMessage } from '../services/api';
import { SECURE_STORE_KEY } from '../config/constants';
import { RootStackParamList } from '../types';
import PhoneInput from '../components/PhoneInput';
import OptionPicker from '../components/OptionPicker';
import PlateInput from '../components/PlateInput';
import DocumentSlot from '../components/DocumentSlot';
import { chooseImage, PickedImage, uploadImage } from '../services/photo';
import {
  DOSSIER_ITEMS, DossierItem, formatDateInput, futureDateToIso, isValidNni,
} from '../data/documents';
import {
  FUEL_TYPES, FuelType, MIN_VEHICLE_YEAR, OTHER, PLATE_PLACEHOLDER, VEHICLE_MAKES, isValidPlate,
} from '../data/vehicles';
import { useLanguage } from '../i18n/LanguageContext';
import { C, G, SH, RADIUS } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Auth'>;
type Step  = 'phone' | 'otp' | 'vehicle' | 'documents' | 'password';

interface SendOtpResponse  { message: string; otp?: string }
interface RegisterResponse { accessToken: string }

// ─── Step Indicator ───────────────────────────────────────────────────────────

const STEPS = [
  { key: 'phone',     label: 'authStepPhone',     icon: 'call-outline'         as const },
  { key: 'otp',       label: 'authStepOtp',       icon: 'chatbubble-outline'   as const },
  { key: 'vehicle',   label: 'authStepVehicle',   icon: 'car-outline'          as const },
  { key: 'documents', label: 'authStepDocuments', icon: 'documents-outline'    as const },
  { key: 'password',  label: 'authStepPassword',  icon: 'lock-closed-outline'  as const },
] as const;

function StepBar({ current }: { current: Step }) {
  const { t } = useLanguage();
  const idx = STEPS.findIndex((s) => s.key === current);
  return (
    <View style={sb.row}>
      {STEPS.map((s, i) => {
        const done   = i < idx;
        const active = i === idx;
        return (
          <React.Fragment key={s.key}>
            <View style={sb.item}>
              <View style={[sb.dot, done && sb.dotDone, active && sb.dotActive]}>
                {done
                  ? <Ionicons name="checkmark" size={14} color={C.white} />
                  : <Text style={[sb.dotLabel, active && sb.dotLabelActive]}>{i + 1}</Text>}
              </View>
              <Text style={[sb.stepLabel, active && sb.stepLabelActive]}>{t(s.label)}</Text>
            </View>
            {i < STEPS.length - 1 && (
              <View style={[sb.line, done && sb.lineDone]} />
            )}
          </React.Fragment>
        );
      })}
    </View>
  );
}

const sb = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: 8, marginBottom: 4 },
  item: { alignItems: 'center', gap: 4, width: 52 },
  dot: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: C.border, alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: C.border,
  },
  dotActive: { backgroundColor: C.primary, borderColor: C.primary },
  dotDone:   { backgroundColor: C.accent,  borderColor: C.accent  },
  dotLabel:  { fontSize: 13, fontWeight: '700', color: C.muted },
  dotLabelActive: { color: C.white },
  stepLabel: { fontSize: 10, fontWeight: '600', color: C.muted, textAlign: 'center' },
  stepLabelActive: { color: C.primary },
  line: { flex: 1, height: 2, backgroundColor: C.border, marginTop: 15, marginHorizontal: 4 },
  lineDone: { backgroundColor: C.accent },
});

// ─── OTP Boxes ────────────────────────────────────────────────────────────────

function OtpInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const inputRef = useRef<TextInputInstance>(null);
  const boxes = 6;

  return (
    <TouchableOpacity activeOpacity={1} onPress={() => inputRef.current?.focus()}>
      <View style={otp.row}>
        {Array.from({ length: boxes }).map((_, i) => {
          const ch     = value[i] ?? '';
          const active = value.length === i && value.length < boxes;
          return (
            <View key={i} style={[otp.box, ch && otp.boxFilled, active && otp.boxActive]}>
              <Text style={otp.char}>{ch || (active ? '|' : '')}</Text>
            </View>
          );
        })}
      </View>
      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={(v) => onChange(v.replace(/\D/g, '').slice(0, 6))}
        keyboardType="number-pad"
        maxLength={6}
        style={otp.hidden}
        autoFocus
      />
    </TouchableOpacity>
  );
}

const otp = StyleSheet.create({
  row:    { flexDirection: 'row', gap: 10, justifyContent: 'center' },
  box: {
    width: 48, height: 58, borderRadius: RADIUS.md,
    backgroundColor: C.bg, borderWidth: 2, borderColor: C.border,
    alignItems: 'center', justifyContent: 'center',
  },
  boxFilled: { backgroundColor: '#FAF8FF', borderColor: C.primaryLt },
  boxActive: { borderColor: C.primary, backgroundColor: '#FAF8FF' },
  char:      { fontSize: 22, fontWeight: '800', color: C.text },
  hidden:    { position: 'absolute', opacity: 0, height: 0 },
});

// ─── Password Strength ────────────────────────────────────────────────────────

function StrengthBar({ pwd }: { pwd: string }) {
  const { t } = useLanguage();
  const score = pwd.length === 0 ? 0
    : pwd.length < 6  ? 1
    : pwd.length < 10 ? 2
    : /[A-Z]/.test(pwd) && /[0-9]/.test(pwd) ? 4 : 3;

  const labels = t('authPwdStrength');
  const colors = ['', C.danger, C.warning, C.accent, C.accentDk];

  if (pwd.length === 0) return null;

  return (
    <View style={str.wrap}>
      <View style={str.bars}>
        {[1, 2, 3, 4].map((i) => (
          <View
            key={i}
            style={[str.bar, { backgroundColor: i <= score ? colors[score] : C.border }]}
          />
        ))}
      </View>
      <Text style={[str.label, { color: colors[score] }]}>{labels[score]}</Text>
    </View>
  );
}

const str = StyleSheet.create({
  wrap:  { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 8 },
  bars:  { flex: 1, flexDirection: 'row', gap: 4 },
  bar:   { flex: 1, height: 4, borderRadius: 2 },
  label: { fontSize: 12, fontWeight: '700', width: 60, textAlign: 'right' },
});

// ─────────────────────────────────────────────────────────────────────────────

export default function AuthScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { t } = useLanguage();

  const [step,     setStep]     = useState<Step>('phone');
  const [phone,    setPhone]    = useState('');
  const [otp,      setOtp]      = useState('');
  const [password, setPassword] = useState('');
  const [confirm,  setConfirm]  = useState('');
  const [vehicleYear,  setVehicleYear]  = useState('');
  const [make,         setMake]         = useState('');
  const [customMake,   setCustomMake]   = useState('');
  const [model,        setModel]        = useState('');
  const [customModel,  setCustomModel]  = useState('');
  const [fuel,         setFuel]         = useState<FuelType | null>(null);
  const [vehiclePlate, setVehiclePlate] = useState('');
  const [images,       setImages]       = useState<Partial<Record<DossierItem, PickedImage>>>({});
  const [insuranceEnd, setInsuranceEnd] = useState('');
  const [firstName,    setFirstName]    = useState('');
  const [lastName,     setLastName]     = useState('');
  const [nni,          setNni]          = useState('');
  const [uploadStep,   setUploadStep]   = useState<string | null>(null);
  const [showPwd,  setShowPwd]  = useState(false);
  const [loading,  setLoading]  = useState(false);

  const confirmRef = useRef<TextInputInstance>(null);
  const slideAnim  = useRef(new Animated.Value(0)).current;
  const mountAnim  = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(mountAnim, { toValue: 1, tension: 60, friction: 10, useNativeDriver: true }).start();
  }, []);

  const animateStep = (fn: () => void) => {
    Animated.sequence([
      Animated.timing(slideAnim, { toValue: -20, duration: 100, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 0, useNativeDriver: false }),
    ]).start();
    fn();
    Animated.spring(slideAnim, { toValue: 0, tension: 60, friction: 10, useNativeDriver: true }).start();
  };

  const handleBack = () => {
    if (step === 'otp')      { animateStep(() => { setStep('phone'); setOtp(''); }); return; }
    if (step === 'vehicle')  { animateStep(() => setStep('otp')); return; }
    if (step === 'documents') { animateStep(() => setStep('vehicle')); return; }
    if (step === 'password') { animateStep(() => { setStep('documents'); setPassword(''); setConfirm(''); }); return; }
    navigation.goBack();
  };

  const handleSendOtp = async () => {
    if (phone.trim().length < 9) return;
    setLoading(true);
    try {
      const res = await apiPost<SendOtpResponse, { phone: string; role: string }>(
        '/auth/send-otp', { phone: phone.trim(), role: 'driver' },
      );
      if (res.otp) Alert.alert('DEV', `OTP: ${res.otp}`);
      animateStep(() => setStep('otp'));
    } catch (e: any) {
      Alert.alert(t('commonError'), apiErrorMessage(e, t('authSendOtpError')));
    } finally {
      setLoading(false);
    }
  };

  // Le code est vérifié par le serveur avant de continuer (il reste valable pour la création du compte)
  const handleOtpNext = async () => {
    if (otp.length !== 6 || loading) return;
    setLoading(true);
    try {
      await apiPost('/auth/register/check-otp', { phone: phone.trim(), code: otp });
      animateStep(() => setStep('vehicle'));
    } catch (e) {
      Alert.alert(t('authWrongCodeTitle'), apiErrorMessage(e, t('authWrongCodeMessage')));
      setOtp('');
    } finally {
      setLoading(false);
    }
  };

  // Un capitaine = un véhicule : le compte et le véhicule sont créés ensemble.
  // « Autre » : marque et/ou modèle saisis à la main.
  const makeIsOther  = make === OTHER;
  const modelIsOther = makeIsOther || model === OTHER;
  const makeValue    = makeIsOther ? customMake.trim() : make;
  const modelValue   = modelIsOther ? customModel.trim() : model;
  const modelOptions = make && !makeIsOther ? [...VEHICLE_MAKES[make], OTHER] : [];
  const plateValid   = isValidPlate(vehiclePlate);
  const yearNumber   = Number(vehicleYear);
  const yearValid    = vehicleYear.length === 4 && yearNumber >= MIN_VEHICLE_YEAR && yearNumber <= new Date().getFullYear() + 1;
  const vehicleReady = !!makeValue && !!modelValue && yearValid && !!fuel && plateValid;

  const otherLabel = (value: string) => (value === OTHER ? t('commonOther') : value);
  const chooseMake = (value: string) => {
    setMake(value);
    setModel('');
    setCustomModel('');
  };
  const handleVehicleNext = () => {
    if (!vehicleReady) return;
    animateStep(() => setStep('documents'));
  };

  // Toutes les pièces du dossier, vérifiées par un admin avant le premier passage en ligne
  const insuranceEndIso = futureDateToIso(insuranceEnd);
  const identityReady   = !!firstName.trim() && !!lastName.trim() && isValidNni(nni);
  const documentsReady  = identityReady && DOSSIER_ITEMS.every((key) => !!images[key]) && !!insuranceEndIso;
  const pickDocument = async (key: DossierItem) => {
    try {
      const image = await chooseImage({ square: key === 'PROFILE_PHOTO' });
      if (image) setImages((current) => ({ ...current, [key]: image }));
    } catch (e: any) {
      Alert.alert(t('commonPhoto'), e?.message ?? t('commonPhotoOpenError'));
    }
  };
  const handleDocumentsNext = () => {
    if (!documentsReady) return;
    animateStep(() => setStep('password'));
  };

  // Compte créé : envoi des pièces une à une. Un échec n'annule pas le compte,
  // la pièce se renvoie depuis « Mon profil ».
  const uploadDossier = async (): Promise<number> => {
    let failed = 0;
    for (const [index, key] of DOSSIER_ITEMS.entries()) {
      setUploadStep(t('authUploadProgress')(index + 1, DOSSIER_ITEMS.length));
      try {
        if (key === 'PROFILE_PHOTO') await uploadImage('/drivers/me/photo', images[key]!);
        else await uploadImage('/drivers/vehicle/documents', images[key]!, {
          type: key,
          ...(key === 'INSURANCE' && { expiresAt: insuranceEndIso! }),
        });
      } catch {
        failed += 1;
      }
    }
    setUploadStep(null);
    return failed;
  };

  const handleRegister = async () => {
    if (password.length < 6 || password !== confirm) return;
    setLoading(true);
    try {
      const res = await apiPost<RegisterResponse, Record<string, string>>('/auth/register/verify', {
        phone: phone.trim(), code: otp, password,
        firstName: firstName.trim(), lastName: lastName.trim(), nni,
        vehicleMake: makeValue, vehicleModel: modelValue, vehicleYear,
        vehicleFuel: fuel!, vehiclePlate,
      });
      await SecureStore.setItemAsync(SECURE_STORE_KEY, res.accessToken);
      const failed = await uploadDossier();
      Alert.alert(
        t('authAccountCreatedTitle'),
        failed ? t('authAccountCreatedFailed')(failed) : t('authAccountCreatedOk'),
        [{ text: t('commonUnderstood'), onPress: () => navigation.replace('Main') }],
        { cancelable: false },
      );
    } catch (e: any) {
      const msg = apiErrorMessage(e, t('authRegisterError'));
      Alert.alert(t('commonError'), msg);
      if (e?.response?.status === 401) { setStep('otp'); setOtp(''); }
      // Plaque déjà prise ou véhicule incomplet : retour à l'étape véhicule
      if (/NNI|prénom|nom/.test(msg)) setStep('documents');
      else if (e?.response?.status === 409 || /immatriculation|véhicule/i.test(msg)) setStep('vehicle');
    } finally {
      setLoading(false);
    }
  };

  const pwdMatch = confirm.length > 0 && password !== confirm;

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
    {/* Tout l'écran défile : avec le clavier ouvert, les champs et le bouton restent atteignables,
        et « handled » laisse le premier appui sur un bouton agir au lieu de seulement fermer le clavier */}
    <ScrollView
      contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 20 }]}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <LinearGradient colors={G.dark} style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity style={styles.backBtn} onPress={handleBack} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={22} color={C.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('authHeaderTitle')}</Text>
        <Text style={styles.headerSub}>{t('authHeaderSub')}</Text>
        <View style={styles.stepBarWrap}>
          <StepBar current={step} />
        </View>
      </LinearGradient>

      {/* Content card */}
      <Animated.View
        style={[styles.card, {
          opacity: mountAnim,
          transform: [{ translateY: mountAnim.interpolate({ inputRange: [0, 1], outputRange: [30, 0] }) }],
        }]}
      >
        <Animated.View style={{ transform: [{ translateX: slideAnim }] }}>

          {/* ── Step 1: Phone ── */}
          {step === 'phone' && (
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>{t('authPhoneTitle')}</Text>
              <Text style={styles.stepSub}>
                {t('authPhoneSubPrefix')}
                <Text style={styles.waHighlight}>{t('commonWhatsapp')}</Text>
              </Text>
              <PhoneInput
                value={phone}
                onChange={setPhone}
                returnKeyType="done"
                onSubmitEditing={handleSendOtp}
              />
              <TouchableOpacity
                onPress={handleSendOtp}
                disabled={loading || phone.length < 9}
                activeOpacity={0.88}
                style={[styles.btnWrap, phone.length < 9 && styles.btnDisabled]}
              >
                <LinearGradient
                  colors={['#25D366', '#1DA851']}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                  style={styles.btn}
                >
                  {loading
                    ? <ActivityIndicator color={C.white} />
                    : <>
                        <Ionicons name="logo-whatsapp" size={18} color={C.white} />
                        <Text style={styles.btnLabel}>{t('authReceiveWaCode')}</Text>
                      </>}
                </LinearGradient>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => navigation.replace('Login')} style={styles.switchLink}>
                <Text style={styles.switchText}>
                  {t('authAlreadyAccount')}{'  '}<Text style={styles.switchCta}>{t('authLoginCta')}</Text>
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* ── Step 2: OTP ── */}
          {step === 'otp' && (
            <View style={styles.stepContent}>
              <View style={styles.waBanner}>
                <Ionicons name="checkmark-circle" size={16} color="#1A6B45" />
                <Text style={styles.waBannerText}>{t('authCodeSentTo')(phone)}</Text>
              </View>
              <Text style={styles.stepTitle}>{t('authOtpTitle')}</Text>
              <Text style={styles.stepSub}>{t('authOtpSub')}</Text>
              <OtpInput value={otp} onChange={setOtp} />
              <TouchableOpacity
                onPress={handleOtpNext}
                disabled={otp.length < 6 || loading}
                activeOpacity={0.88}
                style={[styles.btnWrap, otp.length < 6 && styles.btnDisabled]}
              >
                <LinearGradient
                  colors={otp.length === 6 ? G.primary : [C.muted, C.muted]}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                  style={styles.btn}
                >
                  {loading ? <ActivityIndicator color={C.white} /> : <Text style={styles.btnLabel}>{t('commonContinue')}</Text>}
                </LinearGradient>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleSendOtp} disabled={loading} style={styles.switchLink}>
                <Text style={styles.switchText}>
                  {t('authCodeNotReceived')}{'  '}<Text style={styles.switchCta}>{t('authResendCta')}</Text>
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* ── Step 3: Vehicle ── */}
          {step === 'vehicle' && (
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>{t('authVehicleTitle')}</Text>
              <Text style={styles.stepSub}>{t('authVehicleSub')}</Text>

              <View style={styles.pwdField}>
                <Text style={styles.fieldLabel}>{t('fieldMake')}</Text>
                <OptionPicker
                  title={t('authMakePickerTitle')}
                  value={make}
                  options={[...Object.keys(VEHICLE_MAKES), OTHER]}
                  labelOf={otherLabel}
                  placeholder={t('authMakePlaceholder')}
                  onChange={chooseMake}
                />
                {makeIsOther && (
                  <View style={styles.pwdRow}>
                    <TextInput
                      style={styles.pwdInput}
                      value={customMake}
                      onChangeText={setCustomMake}
                      placeholder={t('authCustomMakePlaceholder')}
                      placeholderTextColor={C.muted}
                      autoCapitalize="words"
                      maxLength={40}
                    />
                  </View>
                )}
              </View>

              <View style={styles.pwdField}>
                <Text style={styles.fieldLabel}>{t('fieldModel')}</Text>
                {!makeIsOther && (
                  <OptionPicker
                    title={make ? t('authModelPickerTitle')(make) : t('fieldModel')}
                    value={model}
                    options={modelOptions}
                    labelOf={otherLabel}
                    placeholder={make ? t('authModelPlaceholder') : t('authChooseMakeFirst')}
                    onChange={setModel}
                    disabled={!make}
                  />
                )}
                {modelIsOther && (
                  <View style={styles.pwdRow}>
                    <TextInput
                      style={styles.pwdInput}
                      value={customModel}
                      onChangeText={setCustomModel}
                      placeholder={t('authCustomModelPlaceholder')}
                      placeholderTextColor={C.muted}
                      maxLength={60}
                    />
                  </View>
                )}
              </View>

              <View style={styles.pwdField}>
                <Text style={styles.fieldLabel}>{t('fieldYear')}</Text>
                <View style={[styles.pwdRow, vehicleYear.length === 4 && !yearValid && styles.pwdRowError]}>
                  <TextInput
                    style={styles.pwdInput}
                    value={vehicleYear}
                    onChangeText={(v) => setVehicleYear(v.replace(/\D/g, '').slice(0, 4))}
                    placeholder={t('authYearPlaceholder')}
                    placeholderTextColor={C.muted}
                    keyboardType="number-pad"
                    maxLength={4}
                  />
                </View>
                {vehicleYear.length === 4 && !yearValid && (
                  <Text style={styles.pwdError}>{t('authYearRange')(MIN_VEHICLE_YEAR, new Date().getFullYear() + 1)}</Text>
                )}
              </View>

              <View style={styles.pwdField}>
                <Text style={styles.fieldLabel}>{t('fieldFuel')}</Text>
                <View style={styles.typeRow}>
                  {FUEL_TYPES.map((f) => (
                    <TouchableOpacity
                      key={f}
                      onPress={() => setFuel(f)}
                      activeOpacity={0.8}
                      style={[styles.typeChip, fuel === f && styles.typeChipActive]}
                    >
                      <Text style={[styles.typeChipLabel, fuel === f && styles.typeChipLabelActive]}>
                        {t('fuelTypes')[f]}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.pwdField}>
                <Text style={styles.fieldLabel}>{t('fieldPlate')}</Text>
                <View style={styles.pwdRow}>
                  <PlateInput
                    style={[styles.pwdInput, styles.plateInput]}
                    value={vehiclePlate}
                    onChange={setVehiclePlate}
                    onSubmitEditing={handleVehicleNext}
                  />
                </View>
                <Text style={styles.fieldHint}>{t('authPlateHint')(PLATE_PLACEHOLDER)}</Text>
              </View>

              <TouchableOpacity
                onPress={handleVehicleNext}
                disabled={!vehicleReady}
                activeOpacity={0.88}
                style={[styles.btnWrap, !vehicleReady && styles.btnDisabled]}
              >
                <LinearGradient colors={G.primary} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.btn}>
                  <Text style={styles.btnLabel}>{t('commonContinue')}</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          )}

          {/* ── Step 4: Documents ── */}
          {step === 'documents' && (
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>{t('authDocumentsTitle')}</Text>
              <Text style={styles.stepSub}>{t('authDocumentsSub')}</Text>

              <View style={styles.pwdField}>
                <Text style={styles.fieldLabel}>{t('fieldFirstName')}</Text>
                <View style={styles.pwdRow}>
                  <TextInput style={styles.pwdInput} value={firstName} onChangeText={setFirstName}
                    placeholder={t('authAsOnIdCard')} placeholderTextColor={C.muted} autoCapitalize="words" maxLength={40} />
                </View>
              </View>
              <View style={styles.pwdField}>
                <Text style={styles.fieldLabel}>{t('fieldLastName')}</Text>
                <View style={styles.pwdRow}>
                  <TextInput style={styles.pwdInput} value={lastName} onChangeText={setLastName}
                    placeholder={t('authAsOnIdCard')} placeholderTextColor={C.muted} autoCapitalize="words" maxLength={40} />
                </View>
              </View>
              <View style={styles.pwdField}>
                <Text style={styles.fieldLabel}>{t('fieldNni')}</Text>
                <View style={[styles.pwdRow, nni.length > 0 && nni.length < 10 && styles.pwdRowError]}>
                  <TextInput style={[styles.pwdInput, styles.plateInput]} value={nni}
                    onChangeText={(v) => setNni(v.replace(/\D/g, '').slice(0, 10))}
                    placeholder={t('authNniPlaceholder')} placeholderTextColor={C.muted} keyboardType="number-pad" maxLength={10} />
                </View>
                <Text style={styles.fieldHint}>{t('authNniHint')}</Text>
              </View>

              {DOSSIER_ITEMS.map((key) => (
                <DocumentSlot
                  key={key}
                  label={t('dossierLabels')[key]}
                  hint={t('dossierHints')[key]}
                  image={images[key] ? { uri: images[key]!.uri } : null}
                  onPress={() => pickDocument(key)}
                />
              ))}

              <View style={styles.pwdField}>
                <Text style={styles.fieldLabel}>{t('authInsuranceEndLabel')}</Text>
                <View style={[styles.pwdRow, insuranceEnd.length === 10 && !insuranceEndIso && styles.pwdRowError]}>
                  <TextInput
                    style={styles.pwdInput}
                    value={insuranceEnd}
                    onChangeText={(v) => setInsuranceEnd(formatDateInput(v))}
                    placeholder={t('commonDatePlaceholder')}
                    placeholderTextColor={C.muted}
                    keyboardType="number-pad"
                    maxLength={10}
                  />
                </View>
                {insuranceEnd.length === 10 && !insuranceEndIso
                  ? <Text style={styles.pwdError}>{t('commonInvalidDate')}</Text>
                  : <Text style={styles.fieldHint}>{t('authInsuranceEndHint')}</Text>}
              </View>

              <TouchableOpacity
                onPress={handleDocumentsNext}
                disabled={!documentsReady}
                activeOpacity={0.88}
                style={[styles.btnWrap, !documentsReady && styles.btnDisabled]}
              >
                <LinearGradient colors={G.primary} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.btn}>
                  <Text style={styles.btnLabel}>{t('commonContinue')}</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          )}

          {/* ── Step 5: Password ── */}
          {step === 'password' && (
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>{t('authPasswordTitle')}</Text>
              <Text style={styles.stepSub}>{t('authPasswordSub')}</Text>

              <View style={styles.pwdField}>
                <Text style={styles.fieldLabel}>{t('loginPasswordLabel')}</Text>
                <View style={styles.pwdRow}>
                  <TextInput
                    style={styles.pwdInput}
                    value={password}
                    onChangeText={setPassword}
                    placeholder={t('authPasswordPlaceholder')}
                    placeholderTextColor={C.muted}
                    secureTextEntry={!showPwd}
                    returnKeyType="next"
                    onSubmitEditing={() => confirmRef.current?.focus()}
                  />
                  <TouchableOpacity onPress={() => setShowPwd((v) => !v)} style={styles.eyeBtn}>
                    <Ionicons name={showPwd ? 'eye-off-outline' : 'eye-outline'} size={18} color={C.sub} />
                  </TouchableOpacity>
                </View>
                <StrengthBar pwd={password} />
              </View>

              <View style={styles.pwdField}>
                <Text style={styles.fieldLabel}>{t('authConfirmLabel')}</Text>
                <View style={[styles.pwdRow, pwdMatch && styles.pwdRowError]}>
                  <TextInput
                    ref={confirmRef}
                    style={styles.pwdInput}
                    value={confirm}
                    onChangeText={setConfirm}
                    placeholder={t('authConfirmPlaceholder')}
                    placeholderTextColor={C.muted}
                    secureTextEntry={!showPwd}
                    returnKeyType="done"
                    onSubmitEditing={handleRegister}
                  />
                </View>
                {pwdMatch && <Text style={styles.pwdError}>{t('authPasswordMismatch')}</Text>}
              </View>

              <TouchableOpacity
                onPress={handleRegister}
                disabled={loading || password.length < 6 || password !== confirm}
                activeOpacity={0.88}
                style={[styles.btnWrap, (password.length < 6 || password !== confirm) && styles.btnDisabled]}
              >
                <LinearGradient
                  colors={G.primary}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                  style={styles.btn}
                >
                  {loading
                    ? <><ActivityIndicator color={C.white} />{uploadStep && <Text style={styles.btnLabel}>{uploadStep}</Text>}</>
                    : <>
                        <Text style={styles.btnLabel}>{t('authCreateMyAccount')}</Text>
                        <Ionicons name="checkmark-circle" size={18} color={C.white} />
                      </>}
                </LinearGradient>
              </TouchableOpacity>
            </View>
          )}
        </Animated.View>
      </Animated.View>
    </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root:   { flex: 1, backgroundColor: C.bg },
  scroll: { flexGrow: 1 },

  header: {
    paddingHorizontal: 24, paddingBottom: 32,
    borderBottomLeftRadius: RADIUS.xxl, borderBottomRightRadius: RADIUS.xxl,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: RADIUS.md,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center', justifyContent: 'center', marginBottom: 14,
  },
  headerTitle: { fontSize: 22, fontWeight: '800', color: C.white, marginBottom: 4 },
  headerSub:   { fontSize: 13, color: 'rgba(255,255,255,0.55)', marginBottom: 20 },
  stepBarWrap: { backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: RADIUS.lg, padding: 12 },

  card: {
    flexGrow: 1, backgroundColor: C.surface,
    marginHorizontal: 16, marginTop: -20,
    borderRadius: RADIUS.xxl, padding: 28,
    ...SH.md,
  },
  stepContent: { gap: 18 },

  stepTitle: { fontSize: 24, fontWeight: '800', color: C.text },
  stepSub:   { fontSize: 14, color: C.sub, lineHeight: 21, marginBottom: 4 },

  waHighlight: { color: '#25D366', fontWeight: '700' },
  waBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#F0FFF9', borderRadius: RADIUS.lg,
    padding: 14, borderWidth: 1, borderColor: '#C6F6E5',
  },
  waBannerText: { flex: 1, fontSize: 13, color: '#1A6B45', fontWeight: '600' },

  btnWrap:    { borderRadius: RADIUS.xl, overflow: 'hidden', ...SH.md },
  btnDisabled:{ opacity: 0.45 },
  btn:        { height: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  btnLabel:   { color: C.white, fontSize: 16, fontWeight: '800' },

  switchLink: { alignItems: 'center' },
  switchText: { fontSize: 14, color: C.sub },
  switchCta:  { color: C.primary, fontWeight: '800' },

  // Vehicle step
  typeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  typeChip: {
    paddingHorizontal: 16, paddingVertical: 10, borderRadius: RADIUS.lg,
    backgroundColor: C.bg, borderWidth: 2, borderColor: C.border,
  },
  typeChipActive:      { borderColor: C.primary, backgroundColor: '#FAF8FF' },
  typeChipLabel:       { fontSize: 14, fontWeight: '700', color: C.sub },
  typeChipLabelActive: { color: C.primary },
  plateInput:          { fontWeight: '700', letterSpacing: 1.5 },
  fieldHint:           { fontSize: 12, color: C.muted, marginLeft: 4 },

  // Password step
  pwdField:   { gap: 8 },
  fieldLabel: { fontSize: 13, fontWeight: '700', color: C.sub },
  pwdRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: C.bg, borderRadius: RADIUS.lg,
    borderWidth: 2, borderColor: C.border,
  },
  pwdRowError: { borderColor: C.danger },
  pwdInput: {
    flex: 1, height: 54, paddingHorizontal: 18,
    fontSize: 16, color: C.text,
  },
  eyeBtn:    { padding: 14 },
  pwdError:  { fontSize: 12, color: C.danger, fontWeight: '600', marginLeft: 4 },
});
