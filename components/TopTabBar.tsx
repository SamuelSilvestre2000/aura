import React from 'react';
import { Animated, Pressable, StyleSheet, View } from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, RADIUS, SPACING } from '../constants/colors';
import { useAuth } from '../hooks/useAuth';
import { useIsDesktop } from '../hooks/useIsDesktop';
import { useTopBarSlots } from '../contexts/TopBarSlots';
import { useDesktopPanel, PANEL_WIDTH } from '../contexts/DesktopPanel';
import { getScreenTopInset } from '../utils/safeArea';
import { Avatar } from './Avatar';

/** Altura interna da barra (área dos ícones). */
export const TOP_BAR_CONTENT_HEIGHT = 40;

const WRAPPER_PADDING_BOTTOM = 8;

type NavRoute = {
  name: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  iconActive: React.ComponentProps<typeof Ionicons>['name'];
};

const NAV_ROUTES: NavRoute[] = [
  { name: 'index', icon: 'map-outline', iconActive: 'map' },
  { name: 'clients', icon: 'person-outline', iconActive: 'person' },
  { name: 'collections', icon: 'albums-outline', iconActive: 'albums' },
];

/** Espaço total ocupado no topo da tela por essa barra (para as telas reservarem). */
export function getTopBarInset(insets: { top: number }, extra = 0): number {
  return getScreenTopInset(insets) + TOP_BAR_CONTENT_HEIGHT + WRAPPER_PADDING_BOTTOM + extra;
}

export function TopTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const isDesktop = useIsDesktop();
  const { toggles } = useTopBarSlots();
  const { panel, stack, railWidthAnim } = useDesktopPanel();

  // Enquanto o painel de conteúdo estiver aberto, os pills do topo precisam
  // começar depois dele também — senão ficam escondidos atrás (o painel tem
  // zIndex maior). Só depois da rail não é suficiente.
  const panelOpen = !!panel || stack.length > 0;
  const desktopPillsLeft = Animated.add(
    railWidthAnim,
    panelOpen ? SPACING.md * 2 + PANEL_WIDTH + SPACING.md : 0
  );

  return (
    <View style={[styles.wrapper, { paddingTop: getScreenTopInset(insets) }]}>
      <Animated.View
        style={[
          styles.row,
          { minHeight: TOP_BAR_CONTENT_HEIGHT },
          isDesktop && { paddingLeft: desktopPillsLeft },
        ]}
      >
        {!isDesktop && (
          <Pressable
            style={styles.avatarPill}
            onPress={() => router.push('/(tabs)/settings')}
            accessibilityRole="button"
            accessibilityLabel="Minha conta"
          >
            <Avatar
              uri={user?.photoUri}
              name={user?.name ?? '?'}
              imageStyle={styles.avatarImage}
              fallbackStyle={styles.avatarFallback}
              fallbackTextStyle={styles.avatarFallbackText}
            />
          </Pressable>
        )}

        {!isDesktop && (
          <View style={styles.navGroup}>
            {NAV_ROUTES.map((tab) => {
              const routeIndex = state.routes.findIndex((r) => r.name === tab.name);
              if (routeIndex === -1) return null;
              const route = state.routes[routeIndex];
              const isFocused = state.index === routeIndex;

              const onPress = () => {
                const event = navigation.emit({
                  type: 'tabPress',
                  target: route.key,
                  canPreventDefault: true,
                });
                if (!isFocused && !event.defaultPrevented) {
                  navigation.navigate(route.name, route.params);
                }
              };

              return (
                <Pressable
                  key={route.key}
                  style={[styles.navPill, isFocused && styles.navPillActive]}
                  onPress={onPress}
                  accessibilityRole="button"
                  accessibilityState={isFocused ? { selected: true } : {}}
                >
                  <Ionicons
                    name={isFocused ? tab.iconActive : tab.icon}
                    size={19}
                    color={isFocused ? COLORS.textPrimary : COLORS.textMuted}
                  />
                </Pressable>
              );
            })}
          </View>
        )}

        {isDesktop && toggles ? <View style={styles.desktopTogglesSlot}>{toggles}</View> : null}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    paddingHorizontal: SPACING.lg,
    paddingBottom: WRAPPER_PADDING_BOTTOM,
    backgroundColor: 'transparent',
    zIndex: 30,
    pointerEvents: 'box-none',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  avatarPill: {
    width: TOP_BAR_CONTENT_HEIGHT,
    height: TOP_BAR_CONTENT_HEIGHT,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.surfaceBorder,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 6,
  },
  avatarImage: {
    width: TOP_BAR_CONTENT_HEIGHT,
    height: TOP_BAR_CONTENT_HEIGHT,
    borderRadius: RADIUS.full,
  },
  avatarFallback: {
    width: TOP_BAR_CONTENT_HEIGHT,
    height: TOP_BAR_CONTENT_HEIGHT,
    borderRadius: RADIUS.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primaryBg,
  },
  avatarFallbackText: {
    color: COLORS.primary,
    fontSize: FONTS.sizes.sm,
    fontWeight: '700',
  },
  navGroup: {
    flex: 1,
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  navPill: {
    flex: 1,
    height: TOP_BAR_CONTENT_HEIGHT,
    borderRadius: RADIUS.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.surfaceBorder,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 6,
  },
  navPillActive: {
    backgroundColor: '#E9E9E7',
  },
  desktopTogglesSlot: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    flexShrink: 0,
  },
});
