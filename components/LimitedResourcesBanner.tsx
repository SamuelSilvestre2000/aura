import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { COLORS, FONTS, RADIUS, SPACING } from '../constants/colors';
import { GEOCODING_LIMITED_MESSAGE } from '../services/geocoding';

type Props = {
  visible: boolean;
  style?: object;
};

export function LimitedResourcesBanner({ visible, style }: Props) {
  if (!visible) return null;

  return (
    <View style={[styles.banner, style]}>
      <Text style={styles.icon}>⚠️</Text>
      <Text style={styles.text}>{GEOCODING_LIMITED_MESSAGE}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm,
    backgroundColor: 'rgba(251, 191, 36, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.4)',
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  icon: {
    fontSize: 14,
    marginTop: 1,
  },
  text: {
    flex: 1,
    color: COLORS.warning,
    fontSize: FONTS.sizes.xs,
    lineHeight: 18,
  },
});
