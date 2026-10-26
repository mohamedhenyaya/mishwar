/**
 * Palette unique de l'app — toute couleur codée en dur dans un écran doit
 * migrer ici. Le vert WhatsApp est volontairement isolé : il ne doit
 * apparaître qu'à proximité directe de la mention "WhatsApp" (badge OTP),
 * jamais comme couleur d'action générique.
 */
export const colors = {
  // Marque
  primary: '#14142B',
  primaryPressed: '#0A0A18',
  primaryMuted: '#E9E9F1',

  accent: '#3652E0',
  accentPressed: '#2A40B8',
  accentMuted: '#EBEEFE',

  whatsapp: '#25D366',
  whatsappDark: '#0C6B3D',
  whatsappMuted: '#E3F9EC',

  success: '#1FAA59',
  successMuted: '#E4F7EC',
  danger: '#E5484D',
  dangerMuted: '#FDECEC',
  warning: '#F5A524',
  warningMuted: '#FDF3E0',
  star: '#F5B400',

  // Itinéraire (départ / arrivée)
  routeOrigin: '#1FAA59',
  routeOriginMuted: '#E4F7EC',
  routeDestination: '#123C7A',
  routeDestinationMuted: '#E7ECFA',

  // Neutres
  bg: '#F7F7FA',
  surface: '#FFFFFF',
  surfaceAlt: '#F1F1F6',
  border: '#E7E7EF',
  borderStrong: '#D6D6E3',

  text: '#15151F',
  textSecondary: '#6C6C79',
  textTertiary: '#A0A0AC',
  textInverse: '#FFFFFF',
  textInverseMuted: 'rgba(255,255,255,0.66)',

  placeholder: '#AEAEB8',
  overlay: 'rgba(10,10,20,0.55)',
  skeleton: '#ECECF2',
} as const;

export type Colors = typeof colors;
