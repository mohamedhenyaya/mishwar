import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import * as SecureStore from 'expo-secure-store';

import { RootStackParamList } from '../types';
import { SECURE_STORE_KEY } from '../config/constants';
import { navigationRef } from './navigationRef';
import RideCancellationWatcher from '../components/RideCancellationWatcher';
import WelcomeScreen from '../screens/WelcomeScreen';
import LoginScreen   from '../screens/LoginScreen';
import AuthScreen    from '../screens/AuthScreen';
import HomeScreen    from '../screens/HomeScreen';
import BookingScreen from '../screens/BookingScreen';
import MatchScreen   from '../screens/MatchScreen';
import TripScreen    from '../screens/TripScreen';
import RatingScreen  from '../screens/RatingScreen';
import ProfileScreen from '../screens/ProfileScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function AppNavigator() {
  const [isLoading,        setIsLoading]        = useState(true);
  const [isAuthenticated,  setIsAuthenticated]  = useState(false);

  useEffect(() => {
    SecureStore.getItemAsync(SECURE_STORE_KEY)
      .then((token) => setIsAuthenticated(!!token))
      .finally(() => setIsLoading(false));
  }, []);

  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#1A1A2E' }}>
        <ActivityIndicator size="large" color="#FFFFFF" />
      </View>
    );
  }

  return (
    <NavigationContainer ref={navigationRef}>
      <RideCancellationWatcher />
      <Stack.Navigator
        initialRouteName={isAuthenticated ? 'Home' : 'Welcome'}
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
          contentStyle: { backgroundColor: '#F5F5F7' },
        }}
      >
        {/* ── Écrans publics ──────────────────────────────────────────────── */}
        <Stack.Screen
          name="Welcome"
          component={WelcomeScreen}
          options={{ animation: 'fade' }}
        />
        <Stack.Screen
          name="Login"
          component={LoginScreen}
        />
        <Stack.Screen
          name="Auth"
          component={AuthScreen}
        />

        {/* ── Écrans authentifiés ─────────────────────────────────────────── */}
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen
          name="Booking"
          component={BookingScreen}
          options={{ animation: 'slide_from_bottom' }}
        />
        <Stack.Screen
          name="Match"
          component={MatchScreen}
          options={{ animation: 'fade' }}
        />
        <Stack.Screen
          name="Trip"
          component={TripScreen}
          options={{ animation: 'fade', gestureEnabled: false }}
        />
        <Stack.Screen
          name="Rating"
          component={RatingScreen}
          options={{ animation: 'fade', gestureEnabled: false }}
        />
        <Stack.Screen
          name="Profile"
          component={ProfileScreen}
          options={{ animation: 'slide_from_right' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}