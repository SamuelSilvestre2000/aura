import { useEffect, useState } from 'react';
import { Keyboard, Platform } from 'react-native';

/**
 * Altura do teclado, para caber conteúdo no espaço que sobra.
 *
 * O valor devolvido é o quanto o teclado *cobre* a janela, e não a altura dele:
 * no Android o modo padrão do Expo é `resize`, então a própria janela encolhe e
 * `useWindowDimensions` já desconta o teclado — descontar de novo encolheria o
 * dobro. Por isso lá o retorno é 0. No iOS o teclado se sobrepõe à janela, que
 * continua do mesmo tamanho, e aí a altura importa.
 */
export function useKeyboardOverlap(): number {
  const [overlap, setOverlap] = useState(0);

  useEffect(() => {
    if (Platform.OS !== 'ios') return;

    // No iOS há aviso antes da animação, então o layout acompanha o teclado.
    const show = Keyboard.addListener('keyboardWillShow', (e) =>
      setOverlap(e.endCoordinates.height)
    );
    const hide = Keyboard.addListener('keyboardWillHide', () => setOverlap(0));

    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  return overlap;
}
