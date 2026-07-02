import { createRef } from 'react';
import { NavigationContainerRef, CommonActions } from '@react-navigation/native';
import { RootStackParamList } from '../types';

export const navigationRef = createRef<NavigationContainerRef<RootStackParamList>>();

export function resetToWelcome(): void {
  navigationRef.current?.dispatch(
    CommonActions.reset({ index: 0, routes: [{ name: 'Welcome' }] }),
  );
}
