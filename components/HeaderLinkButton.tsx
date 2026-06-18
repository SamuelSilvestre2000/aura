import React from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { COLORS, FONTS, SPACING } from '../constants/colors';

type Props = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
};

export function HeaderLinkButton({ label, onPress, disabled, loading }: Props) {
  return (
    <TouchableOpacity
      style={styles.btn}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.7}
      hitSlop={8}
    >
      {loading ? (
        <ActivityIndicator size="small" color={COLORS.primary} />
      ) : (
        <Text style={[styles.text, disabled && styles.textDisabled]}>{label}</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    paddingVertical: 6,
    paddingHorizontal: SPACING.xs,
    backgroundColor: 'transparent',
    minWidth: 44,
    alignItems: 'flex-end',
  },
  text: {
    color: COLORS.primary,
    fontWeight: '600',
    fontSize: FONTS.sizes.sm,
  },
  textDisabled: {
    opacity: 0.4,
  },
});
