import 'react-native-gesture-handler';
import { registerRootComponent } from 'expo';
import App from './App';
// Tâches d'arrière-plan (écran « Nouvelle course », position en ligne) : déclarées avant le
// démarrage pour s'exécuter aussi quand Android réveille l'app fermée
import './src/services/rideOffers';

registerRootComponent(App);
