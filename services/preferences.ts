import AsyncStorage from '@react-native-async-storage/async-storage';

const MAP_THEME_KEY = '@aura/map_theme';

export type MapTheme = 'light' | 'dark';

export async function getMapTheme(): Promise<MapTheme> {
  const value = await AsyncStorage.getItem(MAP_THEME_KEY);
  return value === 'dark' ? 'dark' : 'light';
}

export async function setMapTheme(theme: MapTheme): Promise<void> {
  await AsyncStorage.setItem(MAP_THEME_KEY, theme);
}
