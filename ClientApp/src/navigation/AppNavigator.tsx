import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import * as SecureStore from 'expo-secure-store';

import { RootStackParamList } from '../types';
import { SECURE_STORE_KEY } from '../config/constants';
import { navigationRef } from './navigationRef';
import { colors } from '../theme';
import MainTabs        from './MainTabs';
import WelcomeScreen    from '../screens/WelcomeScreen';
import LoginScreen      from '../screens/LoginScreen';
import AuthScreen       from '../screens/AuthScreen';
import BookingScreen    from '../screens/BookingScreen';
import MatchScreen      from '../screens/MatchScreen';
import FavoritesScreen  from '../screens/FavoritesScreen';
import SupportScreen    from '../screens/SupportScreen';
import RechargeScreen   from '../screens/RechargeScreen';

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
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary }}>
        <ActivityIndicator size="large" color={colors.textInverse} />
      </View>
    );
  }

  return (
    <NavigationContainer ref={navigationRef}>
      <Stack.Navigator
        initialRouteName={isAuthenticated ? 'Main' : 'Welcome'}
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
          contentStyle: { backgroundColor: colors.bg },
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
        <Stack.Screen name="Main" component={MainTabs} options={{ animation: 'fade' }} />
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
        <Stack.Screen name="Favorites" component={FavoritesScreen} />
        <Stack.Screen name="Support" component={SupportScreen} />
        <Stack.Screen name="Recharge" component={RechargeScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}