import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { COLORS, FONTS, RADIUS, SPACING } from '../constants/colors';
import { parseISODate, toISODate } from '../utils/dates';

type Props = {
  label: string;
  value: Date;
  onChange: (date: Date) => void;
  minimumDate?: Date;
  maximumDate?: Date;
  required?: boolean;
};

/**
 * @react-native-community/datetimepicker não tem implementação web (renderiza
 * null e só loga um warning) — por isso os campos de data ficavam "mortos" no
 * app web. Aqui usamos o <input type="date"> nativo do navegador, que já tem
 * seu próprio seletor de calendário.
 */
export function DateField({ label, value, onChange, minimumDate, maximumDate, required = false }: Props) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>
        {label}
        {required && <Text style={styles.required}> *</Text>}
      </Text>
      {React.createElement('input', {
        type: 'date',
        value: toISODate(value),
        min: minimumDate ? toISODate(minimumDate) : undefined,
        max: maximumDate ? toISODate(maximumDate) : undefined,
        onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
          if (e.target.value) onChange(parseISODate(e.target.value));
        },
        style: inputStyle,
      })}
    </View>
  );
}

const inputStyle: React.CSSProperties = {
  backgroundColor: COLORS.backgroundSubtle,
  borderRadius: RADIUS.lg,
  paddingLeft: SPACING.lg,
  paddingRight: SPACING.lg,
  paddingTop: SPACING.md,
  paddingBottom: SPACING.md,
  color: COLORS.textPrimary,
  fontSize: FONTS.sizes.md,
  fontFamily: 'inherit',
  border: `${StyleSheet.hairlineWidth}px solid ${COLORS.surfaceBorder}`,
  outline: 'none',
  width: '100%',
  boxSizing: 'border-box',
};

const styles = StyleSheet.create({
  field: { gap: SPACING.sm },
  label: {
    color: COLORS.textPrimary,
    fontSize: FONTS.sizes.xs,
    fontWeight: '600',
    letterSpacing: 0.4,
  },
  required: {
    color: COLORS.error,
  },
});
