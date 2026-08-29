import React, { useEffect, useRef, useSyncExternalStore } from 'react';

/**
 * Canal para uma tela "publicar" um pedaço de UI que é renderizado por outro
 * componente (barra superior, painel lateral do desktop).
 *
 * O node fica fora do state do React de propósito. Guardá-lo em useState no
 * provider fecha um ciclo, porque quem publica está dentro do provider:
 * publicar re-renderiza o provider → re-renderiza a tela → o JSX publicado é
 * um elemento novo (referência nova) → o effect que publica dispara outra vez
 * → "Maximum update depth exceeded". Com um store externo, publicar notifica
 * só quem consome o slot, e o ciclo não existe.
 */
export type NodeSlot = {
  get: () => React.ReactNode;
  set: (node: React.ReactNode) => void;
  subscribe: (listener: () => void) => () => void;
};

export function createNodeSlot(): NodeSlot {
  let current: React.ReactNode = null;
  const listeners = new Set<() => void>();

  return {
    get: () => current,
    set: (node) => {
      if (node === current) return;
      current = node;
      listeners.forEach((listener) => listener());
    },
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}

/** Slot estável por instância de provider. */
export function useNodeSlotRef(): NodeSlot {
  const ref = useRef<NodeSlot | null>(null);
  if (!ref.current) ref.current = createNodeSlot();
  return ref.current;
}

/** Lado consumidor: re-renderiza quando o publicador troca o node. */
export function useNodeSlot(slot: NodeSlot): React.ReactNode {
  return useSyncExternalStore(slot.subscribe, slot.get, slot.get);
}

/**
 * Lado publicador: escreve o node no slot sem re-renderizar a própria árvore.
 *
 * `active` desliga a publicação (tela fora de foco, layout mobile). A limpeza
 * mora num effect separado do que publica para não passar por null a cada
 * troca de node — isso faria o consumidor piscar entre vazio e conteúdo.
 */
export function usePublishNodeSlot(slot: NodeSlot, node: React.ReactNode, active = true): void {
  const publishedRef = useRef<React.ReactNode>(null);

  useEffect(() => {
    if (!active) return;
    slot.set(node);
    publishedRef.current = node;
  }, [slot, node, active]);

  useEffect(() => {
    if (!active) return;
    return () => {
      // Só limpa o que ainda é nosso: outra tela pode ter assumido o slot.
      if (slot.get() === publishedRef.current) slot.set(null);
      publishedRef.current = null;
    };
  }, [slot, active]);
}
