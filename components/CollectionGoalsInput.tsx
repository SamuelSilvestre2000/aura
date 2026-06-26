import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Category } from '../types';
import { MoneyInput } from './MoneyInput';
import { COLORS, FONTS, SPACING } from '../constants/colors';

type Props = {
  categories: Category[];
  values: Record<string, number>;
  onChange: (categoryId: string, amount: number) => void;
  sectionLabel?: string;
};

export function CollectionGoalsInput({
  categories,
  values,
  onChange,
  sectionLabel = 'METAS POR CATEGORIA',
}: Props) {
  if (categories.length === 0) return null;

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{sectionLabel}</Text>
      {categories.map((cat) => (
        <MoneyInput
          key={cat.id}
          label={categories.length === 1 ? 'META' : `META ${cat.name.toUpperCase()}`}
          value={values[cat.id] ?? 0}
          onChange={(amount) => onChange(cat.id, amount)}
        />
      ))}
      <Text style={styles.hint}>
        {categories.length === 1
          ? 'Valor em reais da sua meta para esta coleção.'
          : 'Defina a meta de cada linha. Os valores podem ser iguais ou diferentes.'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: SPACING.md },
  label: {
    color: COLORS.textMuted,
    fontSize: FONTS.sizes.xs,
    fontWeight: '600',
    letterSpacing: 0.6,
  },
  hint: {
    color: COLORS.textPlaceholder,
    fontSize: FONTS.sizes.xs,
    marginTop: -SPACING.sm,
  },
});
