import React from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, MATERIALS, RADIUS, SPACING } from '../constants/colors';
import { useAuth } from '../hooks/useAuth';

/** Altura interna do dock (área dos ícones). */
export const TAB_BAR_CONTENT_HEIGHT = 52;

const DOCK_WRAPPER_PADDING_TOP = 8;

/**
 * A dock flutua sobre o mapa e sobre as listas, então usa o mesmo material da
 * cápsula do desktop. Espesso de propósito: `backdropFilter` não existe no
 * ViewStyle do React Native, só na web — e sem o desfoque um material fino
 * deixaria o texto da lista passar nítido por trás da barra.
 */
const DOCK_BLUR =
  Platform.OS === 'web'
    ? ({
        backdropFilter: MATERIALS.regular.blur,
        WebkitBackdropFilter: MATERIALS.regular.blur,
      } as any)
    : null;

export const TAB_ORDER = ['index', 'clients', 'collections', 'settings'] as const;
type TabName = (typeof TAB_ORDER)[number];

type TabMeta = {
  label: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  iconActive: React.ComponentProps<typeof Ionicons>['name'];
};

export const TAB_META: Record<TabName, TabMeta> = {
  index: { label: 'Mapa', icon: 'map-outline', iconActive: 'map' },
  clients: { label: 'Clientes', icon: 'person-outline', iconActive: 'person' },
  collections: { label: 'Coleções', icon: 'albums-outline', iconActive: 'albums' },
  settings: { label: 'Config', icon: 'settings-outline', iconActive: 'settings' },
};

/** Espaço reservado acima do dock para listas e controles flutuantes. */
export function getTabBarBottomInset(insets: { bottom: number }, extra: number = SPACING.lg): number {
  return TAB_BAR_CONTENT_HEIGHT + DOCK_WRAPPER_PADDING_TOP + Math.max(insets.bottom, 6) + extra;
}

export function renderTabIcon(routeName: TabName, focused: boolean) {
  const { icon, iconActive } = TAB_META[routeName];
  return (
    <Ionicons
      name={focused ? iconActive : icon}
      size={22}
      color={focused ? COLORS.textPrimary : COLORS.textMuted}
    />
  );
}

export function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { isAdmin } = useAuth();
  const bottomPad = Math.max(insets.bottom, 6);

  /**
   * "Configurações" continua acessível (ex: avatar no mapa) mesmo para
   * representantes — só o botão no dock some, ficando exclusivo de admin.
   */
  const visibleTabs = isAdmin ? TAB_ORDER : TAB_ORDER.filter((name) => name !== 'settings');
  const orderedRoutes = visibleTabs.map((name) => state.routes.find((r) => r.name === name)).filter(
    (r): r is (typeof state.routes)[number] => r != null
  );

  return (
    <View style={[styles.wrapper, { paddingBottom: bottomPad }]}>
      <View style={[styles.dock, { height: TAB_BAR_CONTENT_HEIGHT }, DOCK_BLUR]}>
        {orderedRoutes.map((route) => {
          const { options } = descriptors[route.key];
          const routeIndex = state.routes.findIndex((r) => r.key === route.key);
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

          const onLongPress = () =>
            navigation.emit({ type: 'tabLongPress', target: route.key });

          return (
            <Pressable
              key={route.key}
              accessibilityRole="button"
              accessibilityState={isFocused ? { selected: true } : {}}
              accessibilityLabel={options.tabBarAccessibilityLabel}
              onPress={onPress}
              onLongPress={onLongPress}
              style={[styles.tabPill, isFocused && styles.tabPillActive]}
            >
              {options.tabBarIcon?.({
                focused: isFocused,
                color: isFocused ? COLORS.textPrimary : COLORS.textMuted,
                size: 22,
              })}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: SPACING.lg,
    paddingTop: DOCK_WRAPPER_PADDING_TOP,
    backgroundColor: 'transparent',
    pointerEvents: 'box-none',
  },
  dock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    padding: 4,
    backgroundColor: MATERIALS.thick.background,
    borderRadius: RADIUS.full,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.floatingBorder,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 8,
  },
  tabPill: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: 44,
    borderRadius: RADIUS.full,
  },
  tabPillActive: {
    backgroundColor: COLORS.fill,
  },
});
