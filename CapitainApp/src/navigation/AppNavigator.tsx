import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import * as SecureStore from 'expo-secure-store';

import { RootStackParamList } from '../types';
import { SECURE_STORE_KEY } from '../config/constants';
import { navigationRef } from './navigationRef';
import WelcomeScreen    from '../screens/WelcomeScreen';
import LoginScreen      from '../screens/LoginScreen';
import AuthScreen       from '../screens/AuthScreen';
import HomeScreen       from '../screens/HomeScreen';
import HistoriqueScreen from '../screens/HistoriqueScreen';
import ParametresScreen from '../screens/ParametresScreen';
import MonCompteScreen  from '../screens/MonCompteScreen';

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
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F5F6FA' }}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <NavigationContainer ref={navigationRef}>
      <Stack.Navigator
        initialRouteName={isAuthenticated ? 'Home' : 'Welcome'}
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
          contentStyle: { backgroundColor: '#F5F6FA' },
        }}
      >
        <Stack.Screen name="Welcome"    component={WelcomeScreen} options={{ animation: 'fade' }} />
        <Stack.Screen name="Login"      component={LoginScreen} />
        <Stack.Screen name="Auth"       component={AuthScreen} />
        <Stack.Screen name="Home"       component={HomeScreen} options={{ animation: 'fade' }} />
        <Stack.Screen name="Historique" component={HistoriqueScreen} options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="Parametres" component={ParametresScreen} options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="MonCompte"  component={MonCompteScreen}  options={{ animation: 'slide_from_right' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
