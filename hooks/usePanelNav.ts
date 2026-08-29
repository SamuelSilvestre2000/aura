import React from 'react';
import { useRouter } from 'expo-router';
import { useIsDesktop } from './useIsDesktop';
import { useDesktopPanel } from '../contexts/DesktopPanel';
import { goBack } from '../utils/navigation';

/**
 * Telas de detalhe/edição (cliente, coleção, venda, usuário...) são rotas
 * irmãs de `(tabs)` — navegar até elas com `router.push` desmonta a sidebar
 * e o mapa do desktop inteiros. Este hook decide: no desktop, empilha o
 * componente da tela por cima do painel lateral atual; no mobile, mantém a
 * navegação real do expo-router como sempre foi.
 */
export function usePanelNav() {
  const isDesktop = useIsDesktop();
  const router = useRouter();
  const { pushScreen, popScreen } = useDesktopPanel();

  const open = (
    key: string,
    node: React.ReactNode,
    mobilePath: string,
    mobileParams?: Record<string, string>
  ) => {
    if (isDesktop) {
      pushScreen(key, node);
      return;
    }
    if (mobileParams) {
      router.push({ pathname: mobilePath as any, params: mobileParams });
    } else {
      router.push(mobilePath as any);
    }
  };

  const back = () => {
    if (isDesktop) {
      popScreen();
      return;
    }
    goBack(router);
  };

  return { isDesktop, open, back };
}
