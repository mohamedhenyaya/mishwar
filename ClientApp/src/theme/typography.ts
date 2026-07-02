import { TextStyle } from 'react-native';

type Preset = TextStyle;

export const typography: Record<string, Preset> = {
  display: { fontSize: 32, fontWeight: '800', lineHeight: 38, letterSpacing: -0.6 },
  h1: { fontSize: 26, fontWeight: '700', lineHeight: 32, letterSpacing: -0.4 },
  h2: { fontSize: 22, fontWeight: '700', lineHeight: 28, letterSpacing: -0.3 },
  h3: { fontSize: 18, fontWeight: '700', lineHeight: 24, letterSpacing: -0.2 },
  bodyLg: { fontSize: 16, fontWeight: '500', lineHeight: 24 },
  body: { fontSize: 15, fontWeight: '400', lineHeight: 22 },
  bodySm: { fontSize: 13, fontWeight: '400', lineHeight: 19 },
  caption: { fontSize: 12, fontWeight: '500', lineHeight: 16 },
  label: { fontSize: 13, fontWeight: '600', lineHeight: 17, letterSpacing: 0.1 },
  overline: {
    fontSize: 11,
    fontWeight: '700',
    lineHeight: 14,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  button: { fontSize: 16, fontWeight: '700', lineHeight: 20 },
  buttonSm: { fontSize: 14, fontWeight: '700', lineHeight: 18 },
};
