import { Tabs } from 'expo-router';
import { StyleSheet } from 'react-native';
import { MapThemeProvider } from '../../hooks/useMapTheme';
import { CustomTabBar, renderTabIcon } from '../../components/CustomTabBar';
import { COLORS } from '../../constants/colors';

export default function TabsLayout() {
  return (
    <MapThemeProvider>
      <Tabs
        initialRouteName="index"
        tabBar={(props) => <CustomTabBar {...props} />}
        safeAreaInsets={{ top: 0, right: 0, bottom: 0, left: 0 }}
        screenOptions={{
          headerShown: false,
          sceneContainerStyle: styles.scene,
          tabBarStyle: styles.hiddenTabBar,
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            tabBarIcon: ({ focused }) => renderTabIcon('index', focused),
          }}
        />
        <Tabs.Screen
          name="clients"
          options={{
            tabBarIcon: ({ focused }) => renderTabIcon('clients', focused),
          }}
        />
        <Tabs.Screen
          name="collections"
          options={{
            tabBarIcon: ({ focused }) => renderTabIcon('collections', focused),
          }}
        />
        <Tabs.Screen
          name="settings"
          options={{
            tabBarIcon: ({ focused }) => renderTabIcon('settings', focused),
          }}
        />
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
