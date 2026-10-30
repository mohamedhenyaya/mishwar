import { Alert, AppState, Platform } from 'react-native';
import * as Location from 'expo-location';
import * as SecureStore from 'expo-secure-store';
import * as TaskManager from 'expo-task-manager';
import IncomingRide from '../../modules/incoming-ride';
import { apiPatch, apiPost, onSignedOut } from './api';
import { RideRequestPayload } from './socket';
import { API_BASE_URL, SECURE_STORE_KEY } from '../config/constants';
import { restoreLanguage, tr } from '../i18n/LanguageContext';

// Demandes de course quand l'app est fermée ou en arrière-plan (build Android uniquement) :
//  1. le serveur envoie un message Firebase « ride:new » en plus du socket ;
//  2. expo-notifications réveille l'app et exécute RIDE_PUSH_TASK, même app fermée ;
//  3. le module natif IncomingRide affiche l'écran d'appel (plein écran, sonnerie, Accepter / Refuser) ;
//  4. Accepter ou toucher l'écran ouvre l'app via mishwarcapitaine://ride/<id> (voir parseRideUrl).
// Dans Expo Go, IncomingRide vaut null : tout ce fichier devient inactif.

const RIDE_PUSH_TASK = 'ride-offer-push';
const LOCATION_TASK = 'driver-online-location';
const SCHEME = 'mishwarcapitaine';
const OFFER_TIMEOUT_MS = 60_000; // = délai d'acceptation du serveur
const BATTERY_ASKED_KEY = 'mishwar_captain_battery_asked';
// Explication « Toujours autoriser » montrée une fois par lancement de l'app, pas à chaque écran
let backgroundLocationAsked = false;

export const rideOffersAvailable = !!IncomingRide && Platform.OS === 'android';

type PushData = Record<string, string>;

// ── Lien de l'écran d'appel ───────────────────────────────────────────────────
// La demande voyage dans le lien : le capitaine n'a pas encore le droit de lire la course (GET /rides/:id)

export type RideLinkAction = 'open' | 'accept';

function rideUrl(offer: RideRequestPayload, action: RideLinkAction): string {
  const params: Record<string, string> = {
    action,
    dest:      offer.destinationName ?? '',
    price:     offer.price != null ? String(offer.price) : '',
    open:      String(offer.isOpenTrip),
    lat:       String(offer.startLatitude),
    lng:       String(offer.startLongitude),
    createdAt: offer.createdAt,
  };
  const query = Object.entries(params).map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&');
  return `${SCHEME}://ride/${offer.rideId}?${query}`;
}

export function parseRideUrl(url: string): { action: RideLinkAction; offer: RideRequestPayload } | null {
  const match = new RegExp(`^${SCHEME}://ride/([^?]+)\\?(.*)$`).exec(url);
  if (!match) return null;
  const params: Record<string, string> = {};
  for (const pair of match[2].split('&')) {
    const [key, value = ''] = pair.split('=');
    params[key] = decodeURIComponent(value);
  }
  return {
    action: params.action === 'accept' ? 'accept' : 'open',
    offer:  offerFromData({ rideId: match[1], ...params, destinationName: params.dest, isOpenTrip: params.open, startLatitude: params.lat, startLongitude: params.lng }),
  };
}

function offerFromData(d: PushData): RideRequestPayload {
  return {
    rideId:          d.rideId,
    startLatitude:   Number(d.startLatitude),
    startLongitude:  Number(d.startLongitude),
    destinationName: d.destinationName ?? '',
    endLatitude:     null,
    endLongitude:    null,
    price:           d.price ? Number(d.price) : null,
    isOpenTrip:      d.isOpenTrip === 'true',
    vehicleType:     'sedan',
    createdAt:       d.createdAt ?? new Date().toISOString(),
  };
}

// ── Message Firebase reçu (app fermée, en arrière-plan ou à l'écran) ──────────

// Forme du contenu selon la version d'expo-notifications : on cherche l'objet portant « type »
function pushData(body: unknown): PushData | null {
  const b = body as any;
  for (const candidate of [b, b?.data, b?.data?.data, b?.notification?.request?.content?.data]) {
    if (!candidate || typeof candidate !== 'object') continue;
    if (typeof candidate.type === 'string') return candidate as PushData;
    if (typeof candidate.dataString === 'string') {
      try {
        const parsed = JSON.parse(candidate.dataString);
        if (typeof parsed?.type === 'string') return parsed;
      } catch { /* contenu illisible */ }
    }
  }
  return null;
}

async function handlePush(data: PushData): Promise<void> {
  if (!IncomingRide || !data.rideId) return;
  if (data.type === 'ride:unavailable') {
    IncomingRide.cancel(data.rideId);
    return;
  }
  // App à l'écran : la carte de course arrive déjà par le socket, avec sa sonnerie
  if (data.type !== 'ride:new' || AppState.currentState === 'active') return;

  await restoreLanguage();
  const offer = offerFromData(data);
  const price = offer.price != null ? `${Math.round(Number(offer.price))} MRU` : tr('homeMeterPrice');
  IncomingRide.show({
    rideId:      offer.rideId,
    title:       tr('homeNewRideNotif'),
    body:        offer.isOpenTrip ? tr('homeNewRideOpenTripBody') : tr('homeNewRideBody')(offer.destinationName, price),
    openUrl:     rideUrl(offer, 'open'),
    acceptUrl:   rideUrl(offer, 'accept'),
    acceptLabel: tr('commonAccept'),
    rejectLabel: tr('commonReject'),
    timeoutMs:   OFFER_TIMEOUT_MS,
  });
}

if (rideOffersAvailable) {
  TaskManager.defineTask(RIDE_PUSH_TASK, async ({ data, error }) => {
    if (error) return;
    const message = pushData(data);
    if (message) await handlePush(message).catch(() => {});
  });

  // Position envoyée par le service « Vous êtes en ligne », même app fermée :
  // le serveur continue de proposer des courses à proximité
  TaskManager.defineTask(LOCATION_TASK, async ({ data, error }) => {
    if (error) return;
    const locations = (data as { locations?: Location.LocationObject[] })?.locations;
    const last = locations?.[locations.length - 1];
    if (!last) return;
    await apiPatch('/drivers/location', {
      latitude:  last.coords.latitude,
      longitude: last.coords.longitude,
    }).catch(() => {});
  });

  // Déconnexion : plus d'écran de course ni de suivi sur ce téléphone
  onSignedOut(() => {
    void stopOnlineTracking();
    IncomingRide?.configure(API_BASE_URL, null);
  });
}

// ── Enregistrement du téléphone auprès du serveur ─────────────────────────────

// À chaque ouverture de l'accueil : le jeton Firebase peut changer, le jeton de session aussi
export async function registerRideOffers(): Promise<void> {
  if (!rideOffersAvailable || !IncomingRide) return;
  const Notifications = require('expo-notifications') as typeof import('expo-notifications');
  try {
    await Notifications.requestPermissionsAsync();
    await Notifications.registerTaskAsync(RIDE_PUSH_TASK).catch(() => {});
    const { data: token } = await Notifications.getDevicePushTokenAsync();
    await apiPost('/notifications/devices', { token, platform: 'android' });
    IncomingRide.configure(API_BASE_URL, await SecureStore.getItemAsync(SECURE_STORE_KEY));
  } catch (e) {
    console.warn('[RideOffers] Enregistrement impossible :', e);
  }
}

// ── Autorisations nécessaires app fermée (demandées au passage en ligne) ──────

function ask(title: string, message: string): Promise<boolean> {
  return new Promise((resolve) => {
    Alert.alert(title, message, [
      { text: tr('commonLater'), style: 'cancel', onPress: () => resolve(false) },
      { text: tr('commonAllow'), onPress: () => resolve(true) },
    ], { cancelable: true, onDismiss: () => resolve(false) });
  });
}

export async function ensureRideOfferPermissions(): Promise<void> {
  if (!rideOffersAvailable || !IncomingRide) return;
  // Android 14+ : sans cette autorisation, seul un bandeau s'affiche (pas d'écran plein téléphone verrouillé)
  if (!IncomingRide.canUseFullScreenIntent()) {
    if (await ask(tr('offerPermTitle'), tr('offerFullScreenMessage'))) IncomingRide.openFullScreenIntentSettings();
    return;
  }
  // Demandé une seule fois : certains téléphones tuent l'app sinon
  if (!IncomingRide.isIgnoringBatteryOptimizations() && !(await SecureStore.getItemAsync(BATTERY_ASKED_KEY))) {
    await SecureStore.setItemAsync(BATTERY_ASKED_KEY, '1');
    if (await ask(tr('offerPermTitle'), tr('offerBatteryMessage'))) IncomingRide.requestIgnoreBatteryOptimizations();
  }
}

// ── Suivi de position « en ligne » en arrière-plan ────────────────────────────

export async function startOnlineTracking(): Promise<void> {
  if (!rideOffersAvailable) return;
  try {
    if (!(await Location.getForegroundPermissionsAsync()).granted) return;
    let background = await Location.getBackgroundPermissionsAsync();
    if (!background.granted && background.canAskAgain && !backgroundLocationAsked) {
      backgroundLocationAsked = true;
      if (await ask(tr('offerBgLocationTitle'), tr('offerBgLocationMessage'))) {
        background = await Location.requestBackgroundPermissionsAsync();
      }
    }
    if (!background.granted || await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK)) return;
    await Location.startLocationUpdatesAsync(LOCATION_TASK, {
      accuracy:                  Location.Accuracy.Balanced,
      timeInterval:              60_000, // même immobile : le serveur sait que le capitaine est toujours là
      distanceInterval:          0,
      pausesUpdatesAutomatically: false,
      foregroundService: {
        notificationTitle: tr('onlineServiceTitle'),
        notificationBody:  tr('onlineServiceBody'),
        notificationColor: '#6D28D9',
      },
    });
  } catch (e) {
    console.warn('[RideOffers] Suivi en arrière-plan impossible :', e);
  }
}

export async function stopOnlineTracking(): Promise<void> {
  if (!rideOffersAvailable) return;
  try {
    if (await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK)) {
      await Location.stopLocationUpdatesAsync(LOCATION_TASK);
    }
  } catch { /* déjà arrêté */ }
}

// ── Écran d'appel ─────────────────────────────────────────────────────────────

// Demande affichée dans l'app (ou traitée) : l'écran d'appel et sa sonnerie disparaissent
export function dismissRideOffer(rideId: string): void {
  IncomingRide?.cancel(rideId);
}

// Plus de demande en cours : l'app ne passe plus par-dessus l'écran verrouillé
export function releaseLockScreen(): void {
  IncomingRide?.releaseLockScreen();
}
