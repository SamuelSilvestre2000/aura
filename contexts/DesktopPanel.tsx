import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { Animated } from 'react-native';
import { NodeSlot, useNodeSlot, useNodeSlotRef, usePublishNodeSlot } from './nodeSlot';

export type DesktopPanelName = 'search' | 'clients' | 'collections' | 'settings' | 'city';

/** Largura fixa da cápsula de ícones (estilo Apple Maps: não expande). */
export const RAIL_WIDTH = 64;
/** Largura do painel de conteúdo flutuante (DesktopSidePanel) — mesmo valor usado lá. */
export const PANEL_WIDTH = 520;

type StackEntry = { key: string; node: React.ReactNode };

type DesktopPanelValue = {
  panel: DesktopPanelName | null;
  /**
   * Conteúdo dos painéis de cidade e de busca, publicado pelo mapa (dados e
   * estado ficam lá). Ficam em slots fora do state — ver contexts/nodeSlot.ts
   * para o porquê. Prefira os hooks no fim deste arquivo a mexer nos slots.
   */
  citySlot: NodeSlot;
  searchSlot: NodeSlot;
  openPanel: (name: DesktopPanelName) => void;
  closePanel: () => void;
  togglePanel: (name: DesktopPanelName) => void;
  /** Telas de detalhe/edição empilhadas por cima do painel base atual (ex: cliente, editar, venda). */
  stack: StackEntry[];
  pushScreen: (key: string, node: React.ReactNode) => void;
  popScreen: () => void;
  /**
   * Animated.Value fixa (RAIL_WIDTH) compartilhada com o painel de conteúdo,
   * que soma essa largura pra saber onde começar — mantém as duas em sincronia
   * mesmo que a cápsula volte a animar largura no futuro.
   */
  railWidthAnim: Animated.Value;
};

const DesktopPanelContext = createContext<DesktopPanelValue | null>(null);

export function DesktopPanelProvider({ children }: { children: React.ReactNode }) {
  const [panel, setPanel] = useState<DesktopPanelName | null>(null);
  const citySlot = useNodeSlotRef();
  const searchSlot = useNodeSlotRef();
  const [stack, setStack] = useState<StackEntry[]>([]);
  const railWidthAnim = useRef(new Animated.Value(RAIL_WIDTH)).current;

  /**
   * Trocar de painel base (ou fechar a sidebar) descarta qualquer tela
   * empilhada por cima — sem isso um detalhe de cliente aberto a partir da
   * cidade X ficaria "preso" por cima do painel de Coleções depois de trocar
   * de aba.
   */
  const openPanel = useCallback((name: DesktopPanelName) => {
    setPanel(name);
    setStack([]);
  }, []);
  const closePanel = useCallback(() => {
    setPanel(null);
    setStack([]);
  }, []);
  const togglePanel = useCallback((name: DesktopPanelName) => {
    setPanel((current) => (current === name ? null : name));
    setStack([]);
  }, []);

  const pushScreen = useCallback((key: string, node: React.ReactNode) => {
    setStack((current) => [...current, { key, node }]);
  }, []);
  const popScreen = useCallback(() => {
    setStack((current) => current.slice(0, -1));
  }, []);

  const value = useMemo(
    () => ({
      panel,
      citySlot,
      searchSlot,
      openPanel,
      closePanel,
      togglePanel,
      stack,
      pushScreen,
      popScreen,
      railWidthAnim,
    }),
    [
      panel,
      citySlot,
      searchSlot,
      openPanel,
      closePanel,
      togglePanel,
      stack,
      pushScreen,
      popScreen,
      railWidthAnim,
    ]
  );

  return <DesktopPanelContext.Provider value={value}>{children}</DesktopPanelContext.Provider>;
}

export function useDesktopPanel() {
  const ctx = useContext(DesktopPanelContext);
  if (!ctx) throw new Error('useDesktopPanel deve ser usado dentro de DesktopPanelProvider');
  return ctx;
}

/** Lado que renderiza os painéis (DesktopSidePanel). */
export function useDesktopPanelContent() {
  const { citySlot, searchSlot } = useDesktopPanel();
  return {
    cityContent: useNodeSlot(citySlot),
    searchContent: useNodeSlot(searchSlot),
  };
}

/** Lado que publica: o mapa passa o node e se está no layout desktop. */
export function usePublishCityContent(node: React.ReactNode, active: boolean) {
  const { citySlot } = useDesktopPanel();
  usePublishNodeSlot(citySlot, node, active);
}

export function usePublishSearchContent(node: React.ReactNode, active: boolean) {
  const { searchSlot } = useDesktopPanel();
  usePublishNodeSlot(searchSlot, node, active);
}
