import React from 'react';
import { StyleSheet, View, TextInput, TouchableOpacity, type TextStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, RADIUS, SPACING } from '../constants/colors';

/** Remove o contorno azul de foco que o navegador desenha em <input> na web (RNW-only). */
const NO_OUTLINE_STYLE = { outlineStyle: 'none' } as unknown as TextStyle;

type Props = {
  value: string;
  onChangeText: (text: string) => void;
  onClear: () => void;
  placeholder?: string;
  variant?: 'default' | 'map';
};

export function SearchBar({
  value,
  onChangeText,
  onClear,
  placeholder = 'Buscar...',
  variant = 'default',
}: Props) {
  const isMap = variant === 'map';

  return (
    <View style={[styles.container, isMap && styles.containerMap]}>
      <Ionicons
        name="search-outline"
        size={18}
        color={COLORS.textMuted}
        style={styles.searchIcon}
      />

      <TextInput
        style={[styles.input, NO_OUTLINE_STYLE]}
        placeholder={placeholder}
        placeholderTextColor={COLORS.textPlaceholder}
        value={value}
        onChangeText={onChangeText}
        returnKeyType="search"
        clearButtonMode="never"
      />

      {value.length > 0 && (
        <TouchableOpacity onPress={onClear} hitSlop={8} activeOpacity={0.7}>
          <Ionicons name="close-circle" size={18} color={COLORS.textMuted} />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.surfaceBorder,
    gap: SPACING.sm,
  },
  containerMap: {
    borderRadius: RADIUS.full,
    paddingLeft: SPACING.md,
    paddingRight: SPACING.sm,
    paddingVertical: 6,
    minHeight: 44,
    backgroundColor: COLORS.surface,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  searchIcon: {
    marginRight: 2,
  },
  input: {
    flex: 1,
    color: COLORS.textPrimary,
    fontSize: FONTS.sizes.md,
    paddingVertical: 0,
  },
});
