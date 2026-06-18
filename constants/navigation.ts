import { Platform } from 'react-native';
import type { NativeStackNavigationOptions } from '@react-navigation/native-stack';

/** Transição estilo Notion: nova página desliza da direita, tela anterior fica parcialmente visível. */
export const NOTION_MODAL_OPTIONS: NativeStackNavigationOptions = {
  headerShown: false,
  presentation: 'card',
  animation: Platform.OS === 'android' ? 'ios_from_right' : 'default',
  gestureEnabled: true,
  gestureDirection: 'horizontal',
  fullScreenGestureEnabled: true,
};
