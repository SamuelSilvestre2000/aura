import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { COLORS, FONTS, RADIUS, SPACING } from '../../constants/colors';

export type Segment = {
  value: number;
  color: string;
  label: string;
};

type Props = {
  title: string;
  segments: Segment[];
  height?: number;
};

export function StackedBarChart({ title, segments, height = 14 }: Props) {
  const total = segments.reduce((sum, s) => sum + s.value, 0);
  const safeTotal = total > 0 ? total : 1;

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>{title}</Text>
      <View style={[styles.track, { height }]}>
        {segments.map((segment, index) => {
          if (segment.value <= 0) return null;
          const flex = segment.value / safeTotal;
          return (
            <View
              key={segment.label}
              style={[
                styles.segment,
                {
                  flex,
                  backgroundColor: segment.color,
                  borderTopLeftRadius: index === 0 ? RADIUS.full : 0,
                  borderBottomLeftRadius: index === 0 ? RADIUS.full : 0,
                  borderTopRightRadius: index === segments.length - 1 ? RADIUS.full : 0,
                  borderBottomRightRadius: index === segments.length - 1 ? RADIUS.full : 0,
                },
              ]}
            />
          );
        })}
      </View>
      <View style={styles.legend}>
        {segments.map((segment) => (
          <View key={segment.label} style={styles.legendItem}>
            <View style={[styles.dot, { backgroundColor: segment.color }]} />
            <Text style={styles.legendText}>
              {segment.label} · {segment.value}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: SPACING.sm },
  title: {
    color: COLORS.textMuted,
    fontSize: FONTS.sizes.xs,
    fontWeight: '600',
    letterSpacing: 0.6,
  },
  track: {
    flexDirection: 'row',
    borderRadius: RADIUS.full,
    overflow: 'hidden',
    backgroundColor: COLORS.surfaceBorder,
  },
  segment: {
    minWidth: 4,
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.md,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.sm,
    fontWeight: '500',
  },
});
