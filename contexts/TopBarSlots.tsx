import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useIsFocused } from '@react-navigation/native';

type TopBarSlotsValue = {
  toggles: React.ReactNode;
  setToggles: (node: React.ReactNode) => void;
};

const TopBarSlotsContext = createContext<TopBarSlotsValue | null>(null);

export function TopBarSlotsProvider({ children }: { children: React.ReactNode }) {
  const [toggles, setToggles] = useState<React.ReactNode>(null);
  const value = useMemo(() => ({ toggles, setToggles }), [toggles]);
  return <TopBarSlotsContext.Provider value={value}>{children}</TopBarSlotsContext.Provider>;
}

/** Consumido pela TopTabBar para renderizar o que a tela focada registrou. */
export function useTopBarSlots() {
  const ctx = useContext(TopBarSlotsContext);
  if (!ctx) throw new Error('useTopBarSlots deve ser usado dentro de TopBarSlotsProvider');
  return { toggles: ctx.toggles };
}

/**
 * Cada tela chama isso para "publicar" seus toggles (filtros de coleção/ano/
 * categoria) na barra superior no layout desktop. Só registra enquanto a
 * tela está em foco — as telas de tabs continuam montadas em segundo plano,
 * então sem isso a última a re-renderizar "roubaria" a barra de qualquer
 * outra aba.
 */
export function useSetTopBarSlots(toggles: React.ReactNode) {
  const ctx = useContext(TopBarSlotsContext);
  if (!ctx) throw new Error('useSetTopBarSlots deve ser usado dentro de TopBarSlotsProvider');
  const { setToggles } = ctx;
  const isFocused = useIsFocused();

  useEffect(() => {
    if (!isFocused) return;
    setToggles(toggles);
    return () => {
      setToggles(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isFocused, toggles]);
}
