import React from 'react';
import { Animated, Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, HIT_TARGET, MATERIALS, RADIUS, SPACING } from '../constants/colors';
import { useIsDesktop } from '../hooks/useIsDesktop';
import { useDesktopPanel, DesktopPanelName } from '../contexts/DesktopPanel';
import { useAuth } from '../hooks/useAuth';
import { Avatar } from './Avatar';
import { PersonRailIcon, CollectionsRailIcon } from './icons/RailIcons';

const AVATAR_SIZE = 34;
/** O avatar continua desenhando 34 px — o que precisa medir 44 é o alvo. */
const BTN_SIZE = HIT_TARGET;

/** `backdropFilter` não existe no ViewStyle do React Native — só roda na web (isDesktop já exige Platform.OS === 'web'), então nativo nunca chega a montar isto. */
const WEB_BLUR = {
  backdropFilter: MATERIALS.regular.blur,
  WebkitBackdropFilter: MATERIALS.regular.blur,
} as any;

type RailItem = {
  name: DesktopPanelName;
  renderIcon: (color: string) => React.ReactNode;
};

// Mesmo traço fino ativo ou não — no mockup o ícone não troca pra preenchido,
// só a cor muda. "Clientes" e "Coleções" usam os paths exatos do mockup
// (nenhum ícone do Ionicons reproduz a cabeça pequena + arco de ombro, ou as
// barras arredondadas com espessura visível).
const RAIL_ITEMS: RailItem[] = [
  { name: 'search', renderIcon: (color) => <Ionicons name="search-outline" size={20} color={color} /> },
  { name: 'clients', renderIcon: (color) => <PersonRailIcon size={20} color={color} /> },
  { name: 'collections', renderIcon: (color) => <CollectionsRailIcon size={20} color={color} /> },
];

/**
 * Cápsula fixa (estilo Apple Maps: mesmo material dos controles de zoom/bússola
 * flutuando sobre o mapa). Só ícones — sem estados de texto — e a altura
 * acompanha o conteúdo em vez de esticar a tela toda. O avatar da conta entra
 * na mesma cápsula, como último botão, e abre o painel de Configurações.
 */
export function DesktopSideRail() {
  const isDesktop = useIsDesktop();
  const { user } = useAuth();
  const { panel, togglePanel, railWidthAnim } = useDesktopPanel();

  if (!isDesktop) return null;

  const isSettingsActive = panel === 'settings';

  return (
    <Animated.View style={[styles.rail, { width: railWidthAnim }, WEB_BLUR]}>
      <View style={styles.items}>
        {RAIL_ITEMS.map((item) => {
          const isActive = panel === item.name;
          return (
            <Pressable
              key={item.name}
              style={[styles.btn, isActive && styles.btnActive]}
              onPress={() => togglePanel(item.name)}
              accessibilityRole="button"
              accessibilityState={{ selected: isActive }}
              accessibilityLabel={item.name}
            >
              {item.renderIcon(isActive ? '#FFFFFF' : COLORS.textMuted)}
            </Pressable>
          );
        })}
      </View>

      <Pressable
        style={styles.accountBtn}
        onPress={() => togglePanel('settings')}
        accessibilityRole="button"
        accessibilityState={{ selected: isSettingsActive }}
        accessibilityLabel="Minha conta"
      >
        <Avatar
          uri={user?.photoUri}
          name={user?.name ?? '?'}
          imageStyle={styles.avatarImage}
          fallbackStyle={[styles.avatarFallback, isSettingsActive && styles.avatarFallbackActive]}
          fallbackTextStyle={styles.avatarFallbackText}
        />
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  rail: {
    position: 'absolute',
    left: SPACING.md,
    top: SPACING.md,
    zIndex: 20,
    backgroundColor: MATERIALS.regular.background,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.floatingBorder,
    borderRadius: BTN_SIZE / 2 + SPACING.sm,
    paddingVertical: SPACING.sm,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.16,
    shadowRadius: 28,
    elevation: 10,
  },
  items: {
    gap: 4,
  },
  btn: {
    width: BTN_SIZE,
    height: BTN_SIZE,
    borderRadius: BTN_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnActive: {
    backgroundColor: COLORS.primary,
  },
  accountBtn: {
    width: BTN_SIZE,
    height: BTN_SIZE,
    marginTop: SPACING.sm,
    borderRadius: BTN_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImage: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
  },
  avatarFallback: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
  },
  avatarFallbackActive: {
    backgroundColor: COLORS.primaryDark,
  },
  avatarFallbackText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
});
