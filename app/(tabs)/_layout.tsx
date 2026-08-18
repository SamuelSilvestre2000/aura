import { Tabs } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { MapThemeProvider } from '../../hooks/useMapTheme';
import { TopBarSlotsProvider } from '../../contexts/TopBarSlots';
import { DesktopPanelProvider } from '../../contexts/DesktopPanel';
import { TopTabBar } from '../../components/TopTabBar';
import { DesktopSideRail } from '../../components/DesktopSideRail';
import { DesktopSidePanel } from '../../components/DesktopSidePanel';
import { COLORS } from '../../constants/colors';

export default function TabsLayout() {
  return (
    <MapThemeProvider>
      <TopBarSlotsProvider>
        <DesktopPanelProvider>
          <View style={styles.root}>
            <Tabs
              initialRouteName="index"
              tabBar={(props) => <TopTabBar {...props} />}
              safeAreaInsets={{ top: 0, right: 0, bottom: 0, left: 0 }}
              screenOptions={{
                headerShown: false,
                sceneContainerStyle: styles.scene,
                tabBarStyle: styles.hiddenTabBar,
              }}
            >
              <Tabs.Screen name="index" />
              <Tabs.Screen name="clients" />
              <Tabs.Screen name="collections" />
              <Tabs.Screen name="settings" />
            </Tabs>
            <DesktopSidePanel />
            <DesktopSideRail />
          </View>
        </DesktopPanelProvider>
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
