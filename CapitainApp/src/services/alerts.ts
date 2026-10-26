import { Vibration } from 'react-native';
import { AudioPlayer, createAudioPlayer, setAudioModeAsync } from 'expo-audio';

// Son + vibration joués par l'app elle-même à chaque événement de course.
// Indépendant des notifications système (désactivées dans Expo Go) : fonctionne partout.

const SOURCES = {
  newRide: require('../../assets/sounds/new_ride.wav'), // sonnerie (jouée en boucle)
  event:   require('../../assets/sounds/event.wav'),    // étape : chauffeur trouvé, arrivé, démarrée
  cancel:  require('../../assets/sounds/cancel.wav'),   // annulation
  success: require('../../assets/sounds/success.wav'),  // course terminée
};

export type AlertSound = keyof typeof SOURCES;

// Motifs [pause, vibration, pause, vibration…] en ms (iOS : durée de vibration fixe, pauses respectées)
const VIBRATIONS: Record<AlertSound, number[]> = {
  newRide: [0, 500, 300, 500],
  event:   [0, 400],
  cancel:  [0, 500, 200, 500],
  success: [0, 300, 150, 300],
};

const players = new Map<AlertSound, AudioPlayer>();
let audioModeReady: Promise<void> | null = null;

function getPlayer(kind: AlertSound): AudioPlayer {
  // Son audible même avec le bouton silencieux de l'iPhone, en baissant la musique en cours
  audioModeReady ??= setAudioModeAsync({ playsInSilentMode: true, interruptionMode: 'duckOthers' }).catch(() => {});
  let player = players.get(kind);
  if (!player) {
    player = createAudioPlayer(SOURCES[kind]);
    players.set(kind, player);
  }
  return player;
}

function play(kind: AlertSound, loop: boolean): void {
  try {
    const player = getPlayer(kind);
    player.loop = loop;
    player.seekTo(0).catch(() => {}).finally(() => player.play());
  } catch {
    // son non critique
  }
}

// Son court + vibration pour un événement ponctuel
export function playAlert(kind: AlertSound): void {
  play(kind, false);
  Vibration.vibrate(VIBRATIONS[kind]);
}

// Sonnerie répétée (nouvelle demande de course) jusqu'à stopRinging()
export function startRinging(): void {
  play('newRide', true);
  Vibration.vibrate([0, 600, 1200], true);
}

export function stopRinging(): void {
  try {
    players.get('newRide')?.pause();
  } catch {
    // déjà arrêté
  }
  Vibration.cancel();
}
