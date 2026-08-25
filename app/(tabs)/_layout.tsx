import { Tabs } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { MapThemeProvider } from '../../hooks/useMapTheme';
import { TopBarSlotsProvider } from '../../contexts/TopBarSlots';
import { TopTabBar } from '../../components/TopTabBar';
import { CustomTabBar, renderTabIcon } from '../../components/CustomTabBar';
import { useIsDesktop } from '../../hooks/useIsDesktop';
import { DesktopSideRail } from '../../components/DesktopSideRail';
import { DesktopSidePanel } from '../../components/DesktopSidePanel';
import { COLORS } from '../../constants/colors';

export default function TabsLayout() {
  const isDesktop = useIsDesktop();

  return (
    <MapThemeProvider>
      <TopBarSlotsProvider>
          <View style={styles.root}>
            {/*
              No celular a navegação é a dock flutuante embaixo, ao alcance do
              polegar. No desktop ela é a cápsula lateral, e a barra de cima
              carrega os filtros que o mapa publica.
            */}
            <Tabs
              initialRouteName="index"
              tabBar={(props) =>
                isDesktop ? <TopTabBar {...props} /> : <CustomTabBar {...props} />
              }
              safeAreaInsets={{ top: 0, right: 0, bottom: 0, left: 0 }}
              screenOptions={{
                headerShown: false,
                sceneContainerStyle: styles.scene,
                tabBarStyle: styles.hiddenTabBar,
              }}
            >
              {/* A dock desenha o icone que cada aba declara aqui. */}
              <Tabs.Screen
                name="index"
                options={{ tabBarIcon: ({ focused }) => renderTabIcon('index', focused) }}
              />
              <Tabs.Screen
                name="clients"
                options={{ tabBarIcon: ({ focused }) => renderTabIcon('clients', focused) }}
              />
              <Tabs.Screen
                name="collections"
                options={{ tabBarIcon: ({ focused }) => renderTabIcon('collections', focused) }}
              />
              <Tabs.Screen
                name="settings"
                options={{ tabBarIcon: ({ focused }) => renderTabIcon('settings', focused) }}
              />
            </Tabs>
            <DesktopSidePanel />
            <DesktopSideRail />
          </View>
      </TopBarSlotsProvider>
    </MapThemeProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  scene: {
    flex: 1,
    backgroundColor: COLORS.backgroundSubtle,
  },
  hiddenTabBar: {
    display: 'none',
    height: 0,
  },
});
