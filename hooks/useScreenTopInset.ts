import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useIsDesktop } from './useIsDesktop';
import { getScreenTopInset, PANEL_TOP_INSET } from '../utils/safeArea';
import { getTopBarInset } from '../components/TopTabBar';

/**
 * Margem superior do conteúdo de uma tela — uma só regra para todas, para que
 * o título fique na mesma altura em qualquer tela.
 *
 * - `tab`: aba principal, que no celular tem a TopTabBar flutuando por cima e
 *   precisa reservar esse espaço.
 * - `modal`: tela de detalhe/formulário, que no celular ocupa a página inteira
 *   sem barra por cima.
 *
 * No desktop as duas vivem dentro do painel flutuante, e ali a moldura do
 * próprio painel já é a margem: reservar o espaço da TopTabBar (que nem passa
 * por cima do painel) abria um vazio de ~60 px antes do título.
 */
export function useScreenTopInset(kind: 'tab' | 'modal' = 'tab'): number {
  const insets = useSafeAreaInsets();
  const isDesktop = useIsDesktop();

  if (isDesktop) return PANEL_TOP_INSET;
  // No celular não há barra por cima em nenhum dos dois casos: as abas têm a
  // dock embaixo, e as telas de detalhe são página cheia.
  return getScreenTopInset(insets);
}
