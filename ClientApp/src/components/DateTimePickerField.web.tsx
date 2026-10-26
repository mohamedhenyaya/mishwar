import React from 'react';
import { colors, radius, spacing, typography } from '../theme';

interface Props {
  value: Date;
  minimumDate?: Date;
  onChange: (date: Date) => void;
  onRequestClose?: () => void;
}

// <input type="datetime-local"> expects/returns local time as
// YYYY-MM-DDTHH:mm — building it from the local getters (not
// toISOString, which is UTC) keeps the displayed time correct.
function toLocalInputValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export default function DateTimePickerField({ value, minimumDate, onChange }: Props) {
  return (
    <input
      type="datetime-local"
      value={toLocalInputValue(value)}
      min={minimumDate ? toLocalInputValue(minimumDate) : undefined}
      onChange={(e) => {
        const parsed = new Date(e.target.value);
        if (!Number.isNaN(parsed.getTime())) onChange(parsed);
      }}
      style={{
        width: '100%',
        fontSize: typography.bodySm.fontSize,
        color: colors.text,
        backgroundColor: colors.surface,
        border: `1px solid ${colors.border}`,
        borderRadius: radius.md,
        padding: spacing.sm,
        marginBottom: spacing.xxl,
        boxSizing: 'border-box',
      }}
    />
  );
}
