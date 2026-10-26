import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { PaymentMethodId } from '../config/payments';
import { C } from '../theme';

interface Props {
  method: PaymentMethodId;
  size?: number;
}

// Pastilles rondes dessinées en vues (nettes à toute taille, sans fichier image)
export default function PaymentLogo({ method, size = 52 }: Props) {
  const circle = { width: size, height: size, borderRadius: size / 2 };
  const k = size / 52; // facteur d'échelle des éléments internes

  switch (method) {
    case 'bankily':
      return (
        <View style={[styles.base, circle, styles.bankily]}>
          <Text style={[styles.bankilyLetter, { fontSize: 26 * k, lineHeight: 30 * k }]}>B</Text>
          <View style={[styles.bankilyBar, { width: 20 * k, height: 3 * k, marginTop: 1 * k }]} />
        </View>
      );

    case 'sedad':
      return (
        <View style={[styles.base, circle, styles.sedad]}>
          {[
            { rotate: '-28deg', left: 12, color: '#B8862A' },
            { rotate: '-12deg', left: 16, color: '#CC9C35' },
            { rotate: '4deg',   left: 20, color: '#E0B548' },
          ].map((card, i) => (
            <View
              key={i}
              style={[styles.sedadCard, {
                left: card.left * k, top: 13 * k, width: 17 * k, height: 24 * k,
                borderRadius: 3 * k, backgroundColor: card.color,
                transform: [{ rotate: card.rotate }],
              }]}
            />
          ))}
          <Text style={[styles.sedadCheck, { fontSize: 15 * k, left: 22 * k, top: 15 * k }]}>✓</Text>
        </View>
      );

    case 'masrvi':
      return (
        <View style={[styles.base, circle, styles.masrvi]}>
          <Text style={[styles.masrviGlyph, { fontSize: 26 * k, lineHeight: 34 * k }]}>ك</Text>
        </View>
      );

    default:
      return (
        <View style={[styles.base, circle, styles.autres]}>
          <View style={styles.dots}>
            {[0, 1, 2].map((i) => (
              <View key={i} style={[styles.dot, { width: 6 * k, height: 6 * k, borderRadius: 3 * k }]} />
            ))}
          </View>
        </View>
      );
  }
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.12, shadowRadius: 6, elevation: 4,
  },

  bankily:       { backgroundColor: '#FFFFFF', borderWidth: 1.5, borderColor: '#DCEBF5' },
  bankilyLetter: { fontWeight: '900', color: '#1D8CC4', fontStyle: 'italic' },
  bankilyBar:    { backgroundColor: '#E9B949', borderRadius: 2 },

  sedad:      { backgroundColor: '#FFFFFF', borderWidth: 1.5, borderColor: '#F1E4C3' },
  sedadCard:  { position: 'absolute' },
  sedadCheck: { position: 'absolute', fontWeight: '900', color: '#FFFFFF' },

  masrvi:      { backgroundColor: '#2FD3A6' },
  masrviGlyph: { fontWeight: '900', color: '#1B1F5E' },

  autres: { backgroundColor: C.surfaceAlt, borderWidth: 1.5, borderColor: C.border },
  dots:   { flexDirection: 'row', gap: 4 },
  dot:    { backgroundColor: C.primary },
});
