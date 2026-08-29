import React from 'react';
import { Image, StyleSheet, Text, TextInput, TouchableOpacity, View, type TextStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, HIT_TARGET, RADIUS, SPACING } from '../constants/colors';

/** Remove o contorno azul de foco que o navegador desenha em <input> na web (RNW-only). */
const NO_OUTLINE_STYLE = { outlineStyle: 'none' } as unknown as TextStyle;

type Props = {
  value: string;
  onChangeText: (text: string) => void;
  onClear: () => void;
  placeholder?: string;
  variant?: 'default' | 'map';
  /** No mapa a busca carrega o atalho da conta, como no campo de busca do sistema. */
  onProfilePress?: () => void;
  profileImageUri?: string | null;
  profileInitial?: string;
  /** Focar a busca é entrar em outro contexto: quem chama aproveita para fechar o que estava aberto. */
  onFocus?: () => void;
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
  onFocus,
}: Props) {
  const isMap = variant === 'map';

  const rootStyle = [styles.container, isMap && styles.containerMap];

  const content = (
    <>
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
        onFocus={onFocus}
      />

      {value.length > 0 && (
        <TouchableOpacity onPress={onClear} hitSlop={8} activeOpacity={0.7}>
          <Ionicons name="close-circle" size={18} color={COLORS.textMuted} />
        </TouchableOpacity>
      )}
      {isMap && onProfilePress ? (
        <>
          <View style={styles.divider} />
          <TouchableOpacity
            onPress={onProfilePress}
            style={styles.profileBtn}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Minha conta"
          >
            {profileImageUri ? (
              <Image source={{ uri: profileImageUri }} style={styles.profileImg} />
            ) : (
              <View style={styles.profilePlaceholder}>
                <Text style={styles.profileInitial}>{profileInitial ?? '?'}</Text>
              </View>
            )}
          </TouchableOpacity>
        </>
      ) : null}
    </>
  );

  return <View style={rootStyle}>{content}</View>;
}

const styles = StyleSheet.create({
  // A altura mora aqui, no container: com o minHeight no input ela somava ao
  // padding e o campo virava 60 px. O fundo e o raio seguem o campo de busca
  // do sistema — preenchimento neutro, sem borda.
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: HIT_TARGET,
    backgroundColor: COLORS.fill,
    borderRadius: RADIUS.lg,
    paddingHorizontal: SPACING.md,
    paddingVertical: 0,
    gap: SPACING.sm,
  },
  containerMap: {
    borderRadius: RADIUS.full,
    paddingLeft: SPACING.md,
    paddingRight: SPACING.sm,
    paddingVertical: 6,
    minHeight: 44,
    backgroundColor: COLORS.surface,
    borderColor: COLORS.floatingBorder,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 18,
    elevation: 6,
  },
  searchIcon: {
    marginRight: 2,
  },
  divider: {
    width: StyleSheet.hairlineWidth,
    height: 22,
    backgroundColor: COLORS.surfaceBorder,
    marginHorizontal: 2,
  },
  profileBtn: {
    padding: 2,
  },
  profileImg: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  profilePlaceholder: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.primaryBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileInitial: {
    color: COLORS.primary,
    fontSize: FONTS.sizes.sm,
    fontWeight: '700',
  },
  input: {
    flex: 1,
    color: COLORS.textPrimary,
    fontSize: FONTS.sizes.lg,
    paddingVertical: 0,
  },
});
