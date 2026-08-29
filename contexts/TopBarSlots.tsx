import React, { createContext, useContext } from 'react';
import { useIsFocused } from '@react-navigation/native';
import { NodeSlot, useNodeSlot, useNodeSlotRef, usePublishNodeSlot } from './nodeSlot';

const TopBarSlotsContext = createContext<NodeSlot | null>(null);

function useTogglesSlot(hookName: string): NodeSlot {
  const slot = useContext(TopBarSlotsContext);
  if (!slot) throw new Error(`${hookName} deve ser usado dentro de TopBarSlotsProvider`);
  return slot;
}

export function TopBarSlotsProvider({ children }: { children: React.ReactNode }) {
  // O slot é estável, então publicar toggles nunca re-renderiza esta árvore.
  const slot = useNodeSlotRef();
  return <TopBarSlotsContext.Provider value={slot}>{children}</TopBarSlotsContext.Provider>;
}

/** Consumido pela TopTabBar para renderizar o que a tela focada registrou. */
export function useTopBarSlots() {
  const slot = useTogglesSlot('useTopBarSlots');
  return { toggles: useNodeSlot(slot) };
}

/**
 * Cada tela chama isso para "publicar" seus toggles (filtros de coleção/ano/
 * categoria) na barra superior no layout desktop. Só registra enquanto a
 * tela está em foco — as telas de tabs continuam montadas em segundo plano,
 * então sem isso a última a re-renderizar "roubaria" a barra de qualquer
 * outra aba.
 */
export function useSetTopBarSlots(toggles: React.ReactNode) {
  const slot = useTogglesSlot('useSetTopBarSlots');
  const isFocused = useIsFocused();
  usePublishNodeSlot(slot, toggles, isFocused);
}
