import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { FONTS, RADIUS, SPACING } from '../constants/colors';
import { getCategoryPillStyle } from '../constants/categoryPills';

type Props = {
  label: string;
  slug?: string;
  compact?: boolean;
};

export function CategoryPill({ label, slug, compact }: Props) {
  const { bg, text } = getCategoryPillStyle(slug, label);

  return (
    <View style={[styles.pill, compact && styles.pillCompact, { backgroundColor: bg }]}>
      <Text style={[styles.text, compact && styles.textCompact, { color: text }]}>{label}</Text>
    </View>
  );
}

type RowProps = {
  labels: string[];
  slugs?: string[];
};

export function CategoryPillRow({ labels, slugs = [] }: RowProps) {
  if (labels.length === 0) return null;
  return (
    <View style={styles.row}>
      {labels.map((label, i) => (
        <CategoryPill key={`${label}-${i}`} label={label} slug={slugs[i]} compact />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.xs,
  },
  pill: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: RADIUS.sm,
  },
  pillCompact: {
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  text: {
    fontSize: FONTS.sizes.sm,
    fontWeight: '500',
  },
  textCompact: {
    fontSize: FONTS.sizes.xs,
  },
});
