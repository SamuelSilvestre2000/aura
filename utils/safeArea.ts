import { Platform } from 'react-native';

/**
 * Na web não existe entalhe/status bar — o insets.top do SafeAreaProvider
 * sempre vem 0, deixando cabeçalhos colados no topo da janela do navegador.
 * No nativo os insets já refletem o device corretamente, então não mexemos.
 */
const WEB_MIN_TOP_INSET = 20;

export function getScreenTopInset(insets: { top: number }, extra = 0): number {
  const top = Platform.OS === 'web' ? Math.max(insets.top, WEB_MIN_TOP_INSET) : insets.top;
  return top + extra;
}
