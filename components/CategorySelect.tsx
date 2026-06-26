import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Category } from '../types';
import { COLORS, FONTS, RADIUS, SPACING } from '../constants/colors';
import { getCategoryPillStyle } from '../constants/categoryPills';

type Props = {
  label?: string;
  categories: Category[];
  value: string | null;
  onChange: (categoryId: string | null) => void;
  includeAll?: boolean;
  allLabel?: string;
};

export function CategorySelect({
  label = 'CATEGORIA',
  categories,
  value,
  onChange,
  includeAll = true,
  allLabel = 'Ambas',
}: Props) {
  const options: { id: string | null; label: string; slug?: string }[] = includeAll
    ? [{ id: null, label: allLabel }, ...categories.map((c) => ({ id: c.id, label: c.name, slug: c.slug }))]
    : categories.map((c) => ({ id: c.id, label: c.name, slug: c.slug }));

  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.row}>
        {options.map((opt) => {
          const active = value === opt.id;
          const pill = opt.id === null
            ? { bg: COLORS.surfaceBorder, text: COLORS.textPrimary }
            : getCategoryPillStyle(opt.slug, opt.label);
          return (
            <TouchableOpacity
              key={opt.id ?? 'all'}
              style={[
                styles.chip,
                active && { backgroundColor: pill.bg, borderColor: pill.bg },
              ]}
              onPress={() => onChange(opt.id)}
              activeOpacity={0.75}
            >
              <Text style={[styles.chipText, active && { color: pill.text, fontWeight: '600' }]}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          );
        })}
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
    letterSpacing: 0.6,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  chip: {
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.surfaceBorder,
    backgroundColor: COLORS.surface,
  },
  chipText: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.sm,
    fontWeight: '500',
  },
});
