import { Tabs } from 'expo-router';
import { StyleSheet } from 'react-native';
import { MapThemeProvider } from '../../hooks/useMapTheme';
import { TopTabBar } from '../../components/TopTabBar';
import { COLORS } from '../../constants/colors';

export default function TabsLayout() {
  return (
    <MapThemeProvider>
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
    </MapThemeProvider>
  );
}

const styles = StyleSheet.create({
  scene: {
    flex: 1,
    backgroundColor: COLORS.backgroundSubtle,
  },
  hiddenTabBar: {
    display: 'none',
    height: 0,
  },
});
