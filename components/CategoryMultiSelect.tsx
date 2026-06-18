import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { Category } from '../types';
import { FONTS, RADIUS, SPACING } from '../constants/colors';
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
        const slug = category.id.replace('cat_', '');
        const { bg, text } = getCategoryPillStyle(slug, category.name);

        return (
          <TouchableOpacity
            key={category.id}
            style={[
              styles.chip,
              { backgroundColor: active ? bg : '#F1F1EF' },
              active && styles.chipActive,
            ]}
            onPress={() => toggle(category.id)}
            activeOpacity={0.8}
          >
            <Text style={[styles.chipText, { color: active ? text : '#787774' }]}>
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
    gap: SPACING.sm,
  },
  chip: {
    flex: 1,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.sm,
    alignItems: 'center',
  },
  chipActive: {
    opacity: 1,
  },
  chipText: {
    fontSize: FONTS.sizes.sm,
    fontWeight: '600',
  },
});
