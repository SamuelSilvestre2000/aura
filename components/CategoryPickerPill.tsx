import React, { useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Category } from '../types';
import { COLORS, FONTS, RADIUS, SPACING } from '../constants/colors';
import {
  ALL_CATEGORIES_FILTER,
  CategoryFilterValue,
} from '../utils/categoryFilter';

type Props = {
  categories: Category[];
  value: CategoryFilterValue;
  onChange: (value: CategoryFilterValue) => void;
  allLabel?: string;
  style?: ViewStyle;
};

export function CategoryPickerPill({
  categories,
  value,
  onChange,
  allLabel = 'Todas',
  style,
}: Props) {
  const [visible, setVisible] = useState(false);

  const activeLabel = useMemo(() => {
    if (value === ALL_CATEGORIES_FILTER) return allLabel;
    return categories.find((c) => c.id === value)?.name ?? allLabel;
  }, [value, categories, allLabel]);

  const options = useMemo(
    () => [
      { id: ALL_CATEGORIES_FILTER, label: allLabel },
      ...categories.map((c) => ({ id: c.id, label: c.name })),
    ],
    [categories, allLabel]
  );

  if (categories.length <= 1) return null;

  return (
    <>
      <TouchableOpacity
        style={[styles.pill, style]}
        onPress={() => setVisible(true)}
        activeOpacity={0.75}
      >
        <Ionicons name="pricetag-outline" size={14} color={COLORS.primary} />
        <Text style={styles.pillText} numberOfLines={1}>
          {activeLabel}
        </Text>
        <Ionicons name="chevron-down" size={13} color={COLORS.textMuted} />
      </TouchableOpacity>

      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={() => setVisible(false)}
      >
        <Pressable style={styles.overlay} onPress={() => setVisible(false)}>
          <View style={styles.sheet}>
            <View style={styles.handle} />
            <Text style={styles.title}>Categoria ativa</Text>
            {options.map((opt, i) => {
              const active = value === opt.id;
              return (
                <TouchableOpacity
                  key={opt.id}
                  style={[styles.row, i > 0 && styles.rowBorder]}
                  onPress={() => {
                    onChange(opt.id);
                    setVisible(false);
                  }}
                  activeOpacity={0.7}
                >
                  <View style={styles.rowLeft}>
                    <Ionicons
                      name={active ? 'pricetag' : 'pricetag-outline'}
                      size={18}
                      color={active ? COLORS.primary : COLORS.textMuted}
                    />
                    <Text style={[styles.rowText, active && styles.rowTextActive]}>
                      {opt.label}
                    </Text>
                  </View>
                  {active && <Ionicons name="checkmark" size={18} color={COLORS.primary} />}
                </TouchableOpacity>
              );
            })}
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.md,
    paddingVertical: 6,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.surfaceBorder,
  },
  pillText: {
    color: COLORS.textPrimary,
    fontSize: FONTS.sizes.sm,
    fontWeight: '500',
    maxWidth: 180,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.25)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.xxl,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.surfaceBorder,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.surfaceBorderStrong,
    alignSelf: 'center',
    marginBottom: SPACING.lg,
  },
  title: {
    color: COLORS.textMuted,
    fontSize: FONTS.sizes.xs,
    fontWeight: '600',
    letterSpacing: 0.8,
    paddingHorizontal: SPACING.xl,
    paddingBottom: SPACING.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.lg,
  },
  rowBorder: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.surfaceBorder,
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  rowText: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.md,
    fontWeight: '400',
  },
  rowTextActive: {
    color: COLORS.textPrimary,
    fontWeight: '600',
  },
});
