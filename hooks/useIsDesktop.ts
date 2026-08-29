import { useEffect, useState } from 'react';
import { Platform, useWindowDimensions } from 'react-native';

/** Larguras >= este valor, na web e com ponteiro fino, usam o layout de barra única (topo). */
export const DESKTOP_BREAKPOINT = 900;

const COARSE_POINTER_QUERY = '(pointer: coarse)';

/**
 * `matchMedia` é API de navegador: no nativo `window` não existe. A checagem
 * mora aqui porque as regras de hooks proíbem chamada condicional — o hook
 * abaixo roda em toda plataforma e precisa se proteger por dentro.
 */
function supportsMatchMedia(): boolean {
  return (
    Platform.OS === 'web' &&
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function'
  );
}

/**
 * `true` quando o ponteiro primário é o dedo — tablet, celular, 2-em-1 em modo
 * tablete. Note que é `pointer` e não `any-pointer`: um iPad com trackpad
 * acoplado continua reportando toque como primário, e continua sendo uma tela
 * que se toca.
 */
function useHasCoarsePointer(): boolean {
  const [coarse, setCoarse] = useState(() =>
    supportsMatchMedia() ? window.matchMedia(COARSE_POINTER_QUERY).matches : false
  );

  useEffect(() => {
    if (!supportsMatchMedia()) return;

    const query = window.matchMedia(COARSE_POINTER_QUERY);
    const onChange = (event: MediaQueryListEvent) => setCoarse(event.matches);

    // Reavalia na montagem: entre o estado inicial e este efeito o usuário pode
    // ter conectado ou removido um dispositivo.
    setCoarse(query.matches);
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);

  return coarse;
}

/**
 * O layout de desktop pressupõe ponteiro: quina que fecha painel, trilha
 * lateral, alvos menores. Por isso a decisão não é só de largura.
 *
 * Largura sozinha não separa os casos: um iPad de 13" em paisagem tem 1366px,
 * exatamente como um notebook comum. Pior, um iPad de 11" cruza o limiar ao
 * girar — 820px em retrato, 1180px em paisagem — e trocava o app inteiro de
 * layout no meio do uso, fazendo o painel lateral aberto desaparecer.
 */
export function useIsDesktop(): boolean {
  const { width } = useWindowDimensions();
  const coarsePointer = useHasCoarsePointer();

  return Platform.OS === 'web' && width >= DESKTOP_BREAKPOINT && !coarsePointer;
}
