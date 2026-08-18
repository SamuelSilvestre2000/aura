import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { CollectionType } from '../types';
import { COLORS, FONTS, RADIUS, SPACING } from '../constants/colors';

type Props = {
  label?: string;
  types: CollectionType[];
  value: string | null;
  onChange: (collectionTypeId: string | null) => void;
};

/**
 * Tipo/temporada da coleção (Alto Verão, Outono/Inverno, Primavera, ...).
 * Opcional: "Sem tipo" cobre coleções pontuais que não são uma temporada —
 * só coleções com tipo entram no alternador de ano do mapa.
 */
export function CollectionTypeSelect({ label = 'TIPO', types, value, onChange }: Props) {
  const options: { id: string | null; label: string }[] = [
    { id: null, label: 'Sem tipo' },
    ...types.map((t) => ({ id: t.id, label: t.name })),
  ];

  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.row}>
        {options.map((opt) => {
          const active = value === opt.id;
          return (
            <TouchableOpacity
              key={opt.id ?? 'none'}
              style={[styles.chip, active && styles.chipActive]}
              onPress={() => onChange(opt.id)}
              activeOpacity={0.75}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>
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
    color: COLORS.textPrimary,
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
  chipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  chipText: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.sm,
    fontWeight: '500',
  },
  chipTextActive: {
    color: '#fff',
    fontWeight: '700',
  },
});
