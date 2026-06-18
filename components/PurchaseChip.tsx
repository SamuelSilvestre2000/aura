import React from 'react';
import { StyleSheet, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, RADIUS, SPACING, STATUS_COLORS } from '../constants/colors';

type Props = {
  purchased: boolean;
  onPress?: () => void;
  disabled?: boolean;
};

/** Chip pastel estilo tag Notion para status de compra. */
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
      hitSlop={8}
    >
      <Ionicons
        name={purchased ? 'checkmark' : 'time-outline'}
        size={12}
        color={purchased ? STATUS_COLORS.all : COLORS.textMuted}
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
    borderRadius: RADIUS.sm,
  },
  chipPurchased: {
    backgroundColor: COLORS.successBg,
  },
  chipPending: {
    backgroundColor: '#F1F1EF',
  },
  chipDisabled: {
    opacity: 0.7,
  },
  text: {
    fontSize: FONTS.sizes.xs,
    fontWeight: '600',
  },
  textPurchased: {
    color: STATUS_COLORS.all,
  },
  textPending: {
    color: COLORS.textSecondary,
  },
});
