import React from 'react';
import { StyleSheet, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, HIT_TARGET, RADIUS, SPACING } from '../constants/colors';

type Props = {
  purchased: boolean;
  onPress?: () => void;
  disabled?: boolean;
};

/**
 * Status de compra: sempre símbolo + palavra, nunca cor sozinha. A cor do texto
 * é o verde escuro de COLORS.success, não o verde puro do mapa — este último não
 * tem contraste suficiente sobre fundo claro.
 */
export function PurchaseChip({ purchased, onPress, disabled }: Props) {
  return (
    <TouchableOpacity
      style={[
        styles.chip,
        purchased ? styles.chipPurchased : styles.chipPending,
        disabled && styles.chipDisabled,
      ]}
      onPress={(e) => {
        e?.stopPropagation?.();
        onPress?.();
      }}
      disabled={disabled || !onPress}
      activeOpacity={onPress ? 0.7 : 1}
      hitSlop={(HIT_TARGET - 26) / 2}
    >
      <Ionicons
        name={purchased ? 'checkmark' : 'time-outline'}
        size={12}
        color={purchased ? COLORS.success : COLORS.textSecondary}
      />
      <Text style={[styles.text, purchased ? styles.textPurchased : styles.textPending]}>
        {purchased ? 'Comprou' : 'Pendente'}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 5,
    borderRadius: RADIUS.full,
  },
  chipPurchased: {
    backgroundColor: COLORS.successBg,
  },
  chipPending: {
    backgroundColor: COLORS.fill,
  },
  chipDisabled: {
    opacity: 0.7,
  },
  text: {
    fontSize: FONTS.sizes.xs,
    fontWeight: '600',
  },
  textPurchased: {
    color: COLORS.success,
  },
  textPending: {
    color: COLORS.textSecondary,
  },
});
