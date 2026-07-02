import { Platform, ViewStyle } from 'react-native';

function shadow(elevation: number, opacity: number, blurRadius: number, offsetY: number): ViewStyle {
  return Platform.select<ViewStyle>({
    ios: {
      shadowColor: '#0B0B18',
      shadowOffset: { width: 0, height: offsetY },
      shadowOpacity: opacity,
      shadowRadius: blurRadius,
    },
    android: { elevation },
    default: {},
  }) as ViewStyle;
}

export const shadows = {
  none: {} as ViewStyle,
  xs: shadow(2, 0.05, 4, 1),
  sm: shadow(3, 0.06, 8, 2),
  md: shadow(6, 0.08, 16, 4),
  lg: shadow(10, 0.12, 24, 8),
  xl: shadow(16, 0.16, 32, 14),
};
