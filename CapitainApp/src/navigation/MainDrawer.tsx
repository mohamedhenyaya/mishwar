import React from 'react';
import { Dimensions } from 'react-native';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { DrawerParamList } from '../types';
import DrawerContent from './DrawerContent';
import HomeScreen from '../screens/HomeScreen';

const Drawer = createDrawerNavigator<DrawerParamList>();
const { width: SW } = Dimensions.get('window');

export default function MainDrawer() {
  return (
    <Drawer.Navigator
      drawerContent={(props) => <DrawerContent {...props} />}
      screenOptions={{
        headerShown: false,
        drawerType: 'front',
        drawerStyle: { width: SW * 0.8 },
        overlayColor: 'rgba(10, 6, 27, 0.55)',
        swipeEdgeWidth: 40,
      }}
    >
      <Drawer.Screen name="Home" component={HomeScreen} />
    </Drawer.Navigator>
  );
}
