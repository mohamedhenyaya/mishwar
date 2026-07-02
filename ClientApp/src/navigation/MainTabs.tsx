import React from 'react';
import { Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { TabParamList } from '../types';
import HomeScreen from '../screens/HomeScreen';
import TripsScreen from '../screens/TripsScreen';
import WalletScreen from '../screens/WalletScreen';
import ProfileScreen from '../screens/ProfileScreen';
import { colors, typography } from '../theme';

const Tab = createBottomTabNavigator<TabParamList>();

const ICONS: Record<keyof TabParamList, { active: keyof typeof Ionicons.glyphMap; inactive: keyof typeof Ionicons.glyphMap }> = {
  Home:    { active: 'home',          inactive: 'home-outline' },
  Trips:   { active: 'reader',        inactive: 'reader-outline' },
  Wallet:  { active: 'wallet',        inactive: 'wallet-outline' },
  Profile: { active: 'person',        inactive: 'person-outline' },
};

const LABELS: Record<keyof TabParamList, string> = {
  Home: 'Accueil',
  Trips: 'Trajets',
  Wallet: 'Portefeuille',
  Profile: 'Profil',
};

export default function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textTertiary,
        tabBarLabelStyle: { ...typography.caption, fontWeight: '700' },
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          height: Platform.OS === 'ios' ? 84 : 64,
          paddingTop: 8,
          paddingBottom: Platform.OS === 'ios' ? 28 : 10,
        },
        tabBarIcon: ({ focused, color, size }) => (
          <Ionicons
            name={focused ? ICONS[route.name as keyof TabParamList].active : ICONS[route.name as keyof TabParamList].inactive}
            size={size}
            color={color}
          />
        ),
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} options={{ tabBarLabel: LABELS.Home }} />
      <Tab.Screen name="Trips" component={TripsScreen} options={{ tabBarLabel: LABELS.Trips }} />
      <Tab.Screen name="Wallet" component={WalletScreen} options={{ tabBarLabel: LABELS.Wallet }} />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ tabBarLabel: LABELS.Profile }} />
    </Tab.Navigator>
  );
}
