import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { Animated } from 'react-native';

export type DesktopPanelName = 'search' | 'clients' | 'collections' | 'settings' | 'city';

/** Largura fixa da cápsula de ícones (estilo Apple Maps: não expande). */
export const RAIL_WIDTH = 64;
/** Largura do painel de conteúdo flutuante (DesktopSidePanel) — mesmo valor usado lá. */
export const PANEL_WIDTH = 520;

type StackEntry = { key: string; node: React.ReactNode };

type DesktopPanelValue = {
  panel: DesktopPanelName | null;
  /** Conteúdo do painel de cidade, publicado pelo mapa (dados/estado ficam lá). */
  cityContent: React.ReactNode;
  setCityContent: (node: React.ReactNode) => void;
  /** Conteúdo do painel de busca, publicado pelo mapa (mesma lógica de busca do mapa). */
  searchContent: React.ReactNode;
  setSearchContent: (node: React.ReactNode) => void;
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
  const [cityContent, setCityContent] = useState<React.ReactNode>(null);
  const [searchContent, setSearchContent] = useState<React.ReactNode>(null);
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
      cityContent,
      setCityContent,
      searchContent,
      setSearchContent,
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
      cityContent,
      searchContent,
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
