import React from 'react';
import { Platform } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';

interface Props {
  value: Date;
  minimumDate?: Date;
  onChange: (date: Date) => void;
  onRequestClose?: () => void;
}

export default function DateTimePickerField({ value, minimumDate, onChange, onRequestClose }: Props) {
  const handleChange = (_event: unknown, selected?: Date) => {
    // Android's picker is a self-dismissing dialog; iOS's is inline and
    // stays open until the caller decides to hide it.
    if (Platform.OS === 'android') onRequestClose?.();
    if (selected) onChange(selected);
  };

  return (
    <DateTimePicker
      value={value}
      mode="datetime"
      minimumDate={minimumDate}
      onChange={handleChange}
    />
  );
}
