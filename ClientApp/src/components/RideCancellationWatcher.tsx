import { useEffect } from 'react';
import { Alert, AppState } from 'react-native';
import { CommonActions } from '@react-navigation/native';
import { socketService } from '../services/socket';
import { apiGet } from '../services/api';
import { notify } from '../services/notifications';
import { playAlert } from '../services/alerts';
import { navigationRef } from '../navigation/navigationRef';
import { RideDetails } from '../types';

// Courses dont l'annulation a déjà été affichée (socket + vérification au retour au premier plan)
const announced = new Set<string>();
// Dernière course suivie par le client, vérifiée quand l'app revient au premier plan
let watchedRideId: string | null = null;

export function watchRide(rideId: string | null): void {
  watchedRideId = rideId;
}

function backToHome(ride: RideDetails | null, newRequest: boolean): void {
  const routes: { name: string; params?: object }[] = [{ name: 'Home' }];
  if (newRequest && ride) {
    routes.push({
      name: 'Booking',
      params: { startLatitude: Number(ride.startLatitude), startLongitude: Number(ride.startLongitude) },
    });
  }
  navigationRef.current?.dispatch(CommonActions.reset({ index: routes.length - 1, routes }));
}

// Popup affiché au client quand le chauffeur annule, quel que soit l'écran ouvert
export async function announceDriverCancellation(rideId: string): Promise<void> {
  if (announced.has(rideId)) return;
  announced.add(rideId);
  if (watchedRideId === rideId) watchedRideId = null;

  const ride = await apiGet<RideDetails>(`/rides/${rideId}`).catch(() => null);
  const name = ride?.driver?.name ?? 'Le chauffeur';

  playAlert('cancel');
  notify('Course annulée par le chauffeur', `${name} a annulé la course.`);
  Alert.alert(
    'Course annulée',
    `${name} a annulé votre course. Voulez-vous rechercher un autre chauffeur ?`,
    [
      { text: 'Accueil', style: 'cancel', onPress: () => backToHome(ride, false) },
      { text: 'Nouvelle demande', onPress: () => backToHome(ride, true) },
    ],
    { cancelable: false },
  );
}

// Monté une seule fois dans le NavigationContainer
export default function RideCancellationWatcher() {
  useEffect(() => {
    const unsubscribe = socketService.subscribe('ride:cancelled', (p) => {
      if (p.reason === 'driver_cancelled') announceDriverCancellation(p.rideId);
    });

    // Événement manqué pendant que l'app était en arrière-plan
    const appState = AppState.addEventListener('change', (state) => {
      if (state !== 'active' || !watchedRideId) return;
      const rideId = watchedRideId;
      apiGet<RideDetails>(`/rides/${rideId}`)
        .then((ride) => {
          if (ride.status === 'CANCELLED' && ride.cancelledBy === 'driver') announceDriverCancellation(rideId);
        })
        .catch(() => {});
    });

    return () => {
      unsubscribe();
      appState.remove();
    };
  }, []);

  return null;
}
