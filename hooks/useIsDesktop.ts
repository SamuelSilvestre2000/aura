import { Platform, useWindowDimensions } from 'react-native';

/** Larguras >= este valor, na web, usam o layout de barra única (topo). */
export const DESKTOP_BREAKPOINT = 900;

export function useIsDesktop(): boolean {
  const { width } = useWindowDimensions();
  return Platform.OS === 'web' && width >= DESKTOP_BREAKPOINT;
}
