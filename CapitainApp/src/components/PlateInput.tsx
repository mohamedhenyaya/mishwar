import React from 'react';
import { StyleProp, TextInput, TextStyle } from 'react-native';
import { PLATE_PLACEHOLDER, formatPlate } from '../data/vehicles';
import { C } from '../theme';

interface PlateInputProps {
  value:            string;
  onChange:         (plate: string) => void;
  style?:           StyleProp<TextStyle>;
  onSubmitEditing?: () => void;
  autoFocus?:       boolean;
}

// Immatriculation « 1234 AB 12 » : le clavier suit la partie en cours de saisie —
// chiffres (4), puis lettres (2), puis chiffres (2) — et les espaces se placent seuls
export default function PlateInput({ value, onChange, style, onSubmitEditing, autoFocus }: PlateInputProps) {
  const typed = value.replace(/\s/g, '').length;
  const expectsLetters = typed >= 4 && typed < 6;

  return (
    <TextInput
      style={style}
      value={value}
      onChangeText={(v) => onChange(formatPlate(v))}
      placeholder={PLATE_PLACEHOLDER}
      placeholderTextColor={C.muted}
      keyboardType={expectsLetters ? 'default' : 'number-pad'}
      autoCapitalize="characters"
      autoCorrect={false}
      spellCheck={false}
      autoComplete="off"
      maxLength={10}
      returnKeyType="done"
      onSubmitEditing={onSubmitEditing}
      autoFocus={autoFocus}
    />
  );
}
