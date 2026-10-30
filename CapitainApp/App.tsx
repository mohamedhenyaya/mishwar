import 'react-native-gesture-handler';
import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import AppNavigator from './src/navigation/AppNavigator';
import { DriverStatusProvider } from './src/context/DriverStatusContext';
import IncomingRideModal from './src/components/IncomingRideModal';
import { LanguageProvider } from './src/i18n/LanguageContext';

export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <LanguageProvider>
        <DriverStatusProvider>
          <AppNavigator />
          <IncomingRideModal />
        </DriverStatusProvider>
      </LanguageProvider>
    </SafeAreaProvider>
  );
}
