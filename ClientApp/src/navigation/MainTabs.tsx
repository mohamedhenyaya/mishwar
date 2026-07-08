import React from 'react';
import { Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { TabParamList } from '../types';
import ItineraryScreen from '../screens/ItineraryScreen';
import TripsScreen from '../screens/TripsScreen';
import RankingScreen from '../screens/RankingScreen';
import ProfileScreen from '../screens/ProfileScreen';
import { useLanguage } from '../i18n/LanguageContext';
import { colors, typography } from '../theme';

const Tab = createBottomTabNavigator<TabParamList>();

const ICONS: Record<keyof TabParamList, { active: keyof typeof Ionicons.glyphMap; inactive: keyof typeof Ionicons.glyphMap }> = {
  Home:    { active: 'home',          inactive: 'home-outline' },
  Trips:   { active: 'reader',        inactive: 'reader-outline' },
  Ranking: { active: 'trophy',        inactive: 'trophy-outline' },
  Profile: { active: 'person',        inactive: 'person-outline' },
};

export default function MainTabs() {
  const { t } = useLanguage();
  const LABELS: Record<keyof TabParamList, string> = {
    Home: t('tabHome'),
    Trips: t('tabTrips'),
    Ranking: t('tabRanking'),
    Profile: t('tabProfile'),
  };

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
      <Tab.Screen name="Home" component={ItineraryScreen} options={{ tabBarLabel: LABELS.Home }} />
      <Tab.Screen name="Trips" component={TripsScreen} options={{ tabBarLabel: LABELS.Trips }} />
      <Tab.Screen name="Ranking" component={RankingScreen} options={{ tabBarLabel: LABELS.Ranking }} />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ tabBarLabel: LABELS.Profile }} />
    </Tab.Navigator>
  );
}
