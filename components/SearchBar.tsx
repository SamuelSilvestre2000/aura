import React from 'react';
import { StyleSheet, View, Text, TextInput, TouchableOpacity, Image } from 'react-native';
import { COLORS, FONTS, RADIUS, SPACING } from '../constants/colors';

type Props = {
  value: string;
  onChangeText: (text: string) => void;
  onClear: () => void;
  placeholder?: string;
  variant?: 'default' | 'map';
  onProfilePress?: () => void;
  profileImageUri?: string | null;
  profileInitial?: string;
};

export function SearchBar({
  value,
  onChangeText,
  onClear,
  placeholder = 'Buscar...',
  variant = 'default',
  onProfilePress,
  profileImageUri,
  profileInitial,
}: Props) {
  const isMap = variant === 'map';

  return (
    <View style={[styles.container, isMap && styles.containerMap]}>
      <Text style={styles.searchIcon}>⌕</Text>

      <TextInput
        style={styles.input}
        placeholder={placeholder}
        placeholderTextColor={COLORS.textPlaceholder}
        value={value}
        onChangeText={onChangeText}
        returnKeyType="search"
        clearButtonMode="never"
      />

      {value.length > 0 && (
        <TouchableOpacity onPress={onClear} hitSlop={8}>
          <View style={styles.clearBtn}>
            <Text style={styles.clearBtnText}>✕</Text>
          </View>
        </TouchableOpacity>
      )}

      {isMap && onProfilePress && (
        <>
          <View style={styles.divider} />
          <TouchableOpacity onPress={onProfilePress} style={styles.profileBtn} activeOpacity={0.8} hitSlop={4}>
            {profileImageUri ? (
              <Image source={{ uri: profileImageUri }} style={styles.profileImg} />
            ) : (
              <View style={styles.profilePlaceholder}>
                <Text style={styles.profileInitial}>{profileInitial ?? '?'}</Text>
              </View>
            )}
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    gap: SPACING.sm,
  },
  containerMap: {
    borderRadius: 28,
    paddingLeft: 14,
    paddingRight: 8,
    paddingVertical: 6,
    minHeight: 46,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.10,
    shadowRadius: 6,
    elevation: 4,
    borderColor: 'transparent',
    borderWidth: 0,
  },
  searchIcon: {
    fontSize: 18,
    color: COLORS.textMuted,
    width: 20,
    textAlign: 'center',
  },
  input: {
    flex: 1,
    color: COLORS.textPrimary,
    fontSize: FONTS.sizes.md,
    paddingVertical: 0,
  },
  clearBtn: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: COLORS.surfaceBorderStrong,
    justifyContent: 'center',
    alignItems: 'center',
  },
  clearBtnText: {
    color: COLORS.textSecondary,
    fontSize: 9,
    fontWeight: '700',
  },
  divider: {
    width: 1,
    height: 22,
    backgroundColor: COLORS.surfaceBorder,
  },
  profileBtn: { padding: 2 },
  profileImg: { width: 32, height: 32, borderRadius: 16 },
  profilePlaceholder: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.primaryBg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileInitial: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.primary,
  },
});
