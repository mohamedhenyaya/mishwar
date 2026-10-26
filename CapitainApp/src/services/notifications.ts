import Constants, { ExecutionEnvironment } from 'expo-constants';

// Notifications locales déclenchées à la réception d'un événement socket.
//
// Désactivées dans Expo Go : l'app s'y ferme à l'ouverture de l'écran de recherche,
// au moment exact du premier appel à l'API de notifications (module « pas entièrement
// supporté dans Expo Go » d'après Expo). Les écrans se mettent quand même à jour en
// temps réel ; les notifications fonctionnent dans un build de développement / production.
const IS_EXPO_GO = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

type NotificationsModule = typeof import('expo-notifications');

let notificationsModule: NotificationsModule | null = null;
let permissionAsked: Promise<boolean> | null = null;

// Chargement paresseux : le module natif n'est jamais touché dans Expo Go
function getNotifications(): NotificationsModule | null {
  if (IS_EXPO_GO) return null;
  if (!notificationsModule) {
    notificationsModule = require('expo-notifications') as NotificationsModule;
    // Affichées aussi quand l'app est au premier plan
    notificationsModule.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList:   true,
        shouldPlaySound:  true,
        shouldSetBadge:   false,
      }),
    });
  }
  return notificationsModule;
}

export function ensureNotificationPermission(): Promise<boolean> {
  const Notifications = getNotifications();
  if (!Notifications) return Promise.resolve(false);
  permissionAsked ??= Notifications.requestPermissionsAsync()
    .then(({ granted }) => granted)
    .catch(() => false);
  return permissionAsked;
}

export async function notify(title: string, body: string): Promise<void> {
  const Notifications = getNotifications();
  if (!Notifications || !(await ensureNotificationPermission())) return;
  await Notifications.scheduleNotificationAsync({
    content: { title, body, sound: true },
    trigger: null, // immédiat
  }).catch(() => { /* notification non critique */ });
}
