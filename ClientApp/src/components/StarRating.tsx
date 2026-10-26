import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface Props {
  value: number;
  onChange?: (value: number) => void; // absent → affichage seul
  size?: number;
}

export default function StarRating({ value, onChange, size = 36 }: Props) {
  return (
    <View style={styles.row}>
      {[1, 2, 3, 4, 5].map((i) => {
        const star = (
          <Text style={{ fontSize: size, color: i <= Math.round(value) ? '#FFC107' : '#E5E5EA' }}>★</Text>
        );
        return onChange ? (
          <TouchableOpacity key={i} onPress={() => onChange(i)} hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}>
            {star}
          </TouchableOpacity>
        ) : (
          <View key={i}>{star}</View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 6, justifyContent: 'center' },
});
