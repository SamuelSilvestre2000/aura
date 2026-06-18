import React from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING } from '../constants/colors';

type Props = {
  onPress: () => void;
};

export function HeaderBackButton({ onPress }: Props) {
  return (
    <TouchableOpacity
      style={styles.btn}
      onPress={onPress}
      hitSlop={8}
      activeOpacity={0.7}
    >
      <Ionicons name="chevron-back" size={22} color={COLORS.textPrimary} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    paddingVertical: 6,
    paddingHorizontal: SPACING.xs,
    backgroundColor: 'transparent',
    minWidth: 44,
    alignItems: 'flex-start',
  },
});
