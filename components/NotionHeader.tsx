import React, { type ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { COLORS, FONTS, SPACING } from '../constants/colors';

const SIDE_SLOT_WIDTH = 80;

type Props = {
  title: string;
  /** `sheet` = handle + título centralizado (modais). `screen` = barra de tela com título centralizado. */
  variant?: 'screen' | 'sheet';
  leftAction?: ReactNode;
  rightAction?: ReactNode;
  showBorder?: boolean;
};

export function NotionHeader({
  title,
  variant = 'screen',
  leftAction,
  rightAction,
  showBorder = false,
}: Props) {
  if (variant === 'sheet') {
    return (
      <View style={styles.sheetHeader}>
        <View style={[styles.sideSlot, styles.sideLeft]}>{leftAction}</View>
        <Text style={styles.sheetTitle} numberOfLines={1}>
          {title}
        </Text>
        <View style={[styles.sideSlot, styles.sideRight]}>{rightAction}</View>
      </View>
    );
  }

  return (
    <View style={[styles.screenHeader, showBorder && styles.screenHeaderBorder]}>
      <View style={[styles.sideSlot, styles.sideLeft]}>{leftAction}</View>
      <Text style={styles.screenTitle} numberOfLines={1}>
        {title}
      </Text>
      <View style={[styles.sideSlot, styles.sideRight]}>{rightAction}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 36,
    paddingBottom: SPACING.lg,
    marginHorizontal: -SPACING.lg,
    paddingHorizontal: SPACING.lg,
  },
  sheetTitle: {
    flex: 1,
    color: COLORS.textPrimary,
    fontSize: FONTS.sizes.lg,
    fontWeight: '600',
    letterSpacing: -0.2,
    textAlign: 'center',
  },
  screenHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 36,
    paddingTop: 2,
    paddingBottom: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    backgroundColor: 'transparent',
  },
  screenHeaderBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.surfaceBorder,
    paddingBottom: SPACING.sm,
    marginBottom: SPACING.xs,
  },
  screenTitle: {
    flex: 1,
    color: COLORS.textPrimary,
    fontSize: FONTS.sizes.lg,
    fontWeight: '600',
    letterSpacing: -0.3,
    textAlign: 'center',
  },
  sideSlot: {
    width: SIDE_SLOT_WIDTH,
    justifyContent: 'center',
  },
  sideLeft: {
    alignItems: 'flex-start',
  },
  sideRight: {
    alignItems: 'flex-end',
  },
});
