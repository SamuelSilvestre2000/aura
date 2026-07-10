import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Category } from '../types';
import { COLORS, FONTS, RADIUS, SPACING } from '../constants/colors';
import { getCategoryPillStyle } from '../constants/categoryPills';

type Props = {
  categories: Category[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
};

export function CategoryMultiSelect({ categories, selectedIds, onChange }: Props) {
  const toggle = (id: string) => {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((item) => item !== id));
      return;
    }
    onChange([...selectedIds, id]);
  };

  return (
    <View style={styles.row}>
      {categories.map((category) => {
        const active = selectedIds.includes(category.id);
        const pill = getCategoryPillStyle(category.slug, category.name);

        return (
          <TouchableOpacity
            key={category.id}
            style={[
              styles.chip,
              active && { backgroundColor: pill.bg, borderColor: pill.bg },
            ]}
            onPress={() => toggle(category.id)}
            activeOpacity={0.8}
          >
            {active && (
              <Ionicons name="checkmark" size={14} color={pill.text} style={styles.chipIcon} />
            )}
            <Text style={[styles.chipText, active && { color: pill.text, fontWeight: '600' }]}>
              {category.name}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: 8,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.surface,
    borderWidth: 1.5,
    borderColor: COLORS.surfaceBorder,
  },
  chipIcon: {
    marginRight: 4,
  },
  chipText: {
    fontSize: FONTS.sizes.sm,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
});
