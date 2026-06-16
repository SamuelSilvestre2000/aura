import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS } from '../constants/colors';

export const TAB_BAR_CONTENT_HEIGHT = 54;

export const TAB_ORDER = ['index', 'clients', 'collections', 'settings'] as const;
type TabName = (typeof TAB_ORDER)[number];

type TabMeta = {
  label: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  iconActive: React.ComponentProps<typeof Ionicons>['name'];
};

export const TAB_META: Record<TabName, TabMeta> = {
  index:       { label: 'Mapa',     icon: 'map-outline',      iconActive: 'map'      },
  clients:     { label: 'Clientes', icon: 'person-outline',   iconActive: 'person'   },
  collections: { label: 'Coleções', icon: 'albums-outline',   iconActive: 'albums'   },
  settings:    { label: 'Config',   icon: 'settings-outline', iconActive: 'settings' },
};

export function renderTabIcon(routeName: TabName, focused: boolean) {
  const { label, icon, iconActive } = TAB_META[routeName];
  return (
    <View style={tabStyles.item}>
      <Ionicons
        name={focused ? iconActive : icon}
        size={24}
        color={focused ? COLORS.primary : COLORS.tabInactive}
      />
      <Text style={[tabStyles.label, focused && tabStyles.labelActive]}>{label}</Text>
    </View>
  );
}

export function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const bottomPad = Math.max(insets.bottom, 8);

  const orderedRoutes = TAB_ORDER
    .map((name) => state.routes.find((r) => r.name === name))
    .filter((r): r is (typeof state.routes)[number] => r != null);

  return (
    <View style={[styles.bar, { paddingBottom: bottomPad, height: TAB_BAR_CONTENT_HEIGHT + bottomPad }]}>
      {orderedRoutes.map((route) => {
        const { options } = descriptors[route.key];
        const routeIndex = state.routes.findIndex((r) => r.key === route.key);
        const isFocused = state.index === routeIndex;

        const onPress = () => {
          const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          if (!isFocused && !event.defaultPrevented) navigation.navigate(route.name, route.params);
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
            style={styles.tabButton}
          >
            {options.tabBarIcon?.({
              focused: isFocused,
              color: isFocused ? COLORS.primary : COLORS.tabInactive,
              size: 24,
            })}
          </Pressable>
        );
      })}
    </View>
  );
}

const tabStyles = StyleSheet.create({
  item: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  label: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.tabInactive,
    fontWeight: '400',
  },
  labelActive: {
    color: COLORS.primary,
    fontWeight: '600',
  },
});

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    paddingTop: 6,
    backgroundColor: COLORS.tabBackground,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.surfaceBorder,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
