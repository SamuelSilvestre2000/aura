import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { COLORS, FONTS, RADIUS, SPACING } from '../constants/colors';
import { formatMoneyInput, parseMoneyInput } from '../utils/money';

type Props = {
  label: string;
  value: number;
  onChange: (amount: number) => void;
  placeholder?: string;
};

export function MoneyInput({ label, value, onChange, placeholder = '0,00' }: Props) {
  const [text, setText] = useState(value > 0 ? formatMoneyInput(value) : '');

  useEffect(() => {
    setText(value > 0 ? formatMoneyInput(value) : '');
  }, [value]);

  const handleChange = (raw: string) => {
    const amount = parseMoneyInput(raw);
    setText(raw.replace(/\D/g, '') ? formatMoneyInput(amount) : '');
    onChange(amount);
  };

  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.inputRow}>
        <Text style={styles.prefix}>R$</Text>
        <TextInput
          style={styles.input}
          value={text}
          onChangeText={handleChange}
          placeholder={placeholder}
          placeholderTextColor={COLORS.textPlaceholder}
          keyboardType="numeric"
          returnKeyType="done"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  field: { gap: SPACING.sm },
  label: {
    color: COLORS.textMuted,
    fontSize: FONTS.sizes.xs,
    fontWeight: '600',
    letterSpacing: 0.4,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    paddingHorizontal: SPACING.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.surfaceBorder,
  },
  prefix: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.md,
    fontWeight: '500',
    marginRight: SPACING.sm,
  },
  input: {
    flex: 1,
    paddingVertical: SPACING.md,
    color: COLORS.textPrimary,
    fontSize: FONTS.sizes.md,
  },
});
