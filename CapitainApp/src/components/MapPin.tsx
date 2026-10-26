import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Marker, LatLng } from 'react-native-maps';

interface Props {
  coordinate: LatLng;
  color: string;
  square?: boolean; // carré = destination, rond = départ
}

// Marqueur dessiné en vue React (comme sur l'accueil) plutôt que l'épingle native `pinColor`,
// soupçonnée de faire planter l'app sur iOS (nouvelle architecture).
export default function MapPin({ coordinate, color, square = false }: Props) {
  return (
    <Marker coordinate={coordinate} anchor={{ x: 0.5, y: 0.5 }} tracksViewChanges={false}>
      <View style={[styles.outer, { borderColor: color }, square && styles.square]}>
        <View style={[styles.inner, { backgroundColor: color }, square && styles.squareInner]} />
      </View>
    </Marker>
  );
}

const styles = StyleSheet.create({
  outer: {
    width: 24, height: 24, borderRadius: 12, borderWidth: 3,
    backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4, elevation: 4,
  },
  inner:       { width: 10, height: 10, borderRadius: 5 },
  square:      { borderRadius: 6 },
  squareInner: { borderRadius: 2 },
});
