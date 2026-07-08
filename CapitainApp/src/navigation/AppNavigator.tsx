import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import * as SecureStore from 'expo-secure-store';

import { RootStackParamList } from '../types';
import { SECURE_STORE_KEY } from '../config/constants';
import { navigationRef } from './navigationRef';
import MainDrawer          from './MainDrawer';
import WelcomeScreen       from '../screens/WelcomeScreen';
import LoginScreen         from '../screens/LoginScreen';
import AuthScreen          from '../screens/AuthScreen';
import HistoriqueScreen    from '../screens/HistoriqueScreen';
import ParametresScreen    from '../screens/ParametresScreen';
import MonCompteScreen     from '../screens/MonCompteScreen';
import PerformanceScreen   from '../screens/PerformanceScreen';
import RechargeScreen      from '../screens/RechargeScreen';
import ActiveTripScreen    from '../screens/ActiveTripScreen';
import { C } from '../theme';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function AppNavigator() {
  const [isLoading,       setIsLoading]       = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    SecureStore.getItemAsync(SECURE_STORE_KEY)
      .then((token) => setIsAuthenticated(!!token))
      .finally(() => setIsLoading(false));
  }, []);

  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: C.dark }}>
        <ActivityIndicator size="large" color={C.white} />
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
          contentStyle: { backgroundColor: C.bg },
        }}
      >
        <Stack.Screen name="Welcome"     component={WelcomeScreen} options={{ animation: 'fade' }} />
        <Stack.Screen name="Login"       component={LoginScreen} />
        <Stack.Screen name="Auth"        component={AuthScreen} />
        <Stack.Screen name="Main"        component={MainDrawer} options={{ animation: 'fade' }} />
        <Stack.Screen name="Historique"  component={HistoriqueScreen} options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="Parametres"  component={ParametresScreen} options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="MonCompte"   component={MonCompteScreen}  options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="Performance" component={PerformanceScreen} options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="Recharge"    component={RechargeScreen}   options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="ActiveTrip"  component={ActiveTripScreen} options={{ animation: 'slide_from_bottom' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
