import React from 'react';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

type Props = {
  size: number;
  color: string;
};

/**
 * Paths copiados literalmente do mockup (Apple Maps concept, viewBox 24x24) —
 * nenhum ícone do Ionicons reproduz cabeça pequena + arco largo de ombro.
 */
export function PersonRailIcon({ size, color }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={8} r={3.6} stroke={color} strokeWidth={2} />
      <Path
        d="M5 20c0-4 3-6.5 7-6.5s7 2.5 7 6.5"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

/**
 * Três barras arredondadas SÓ DE CONTORNO — diferente do reorder-three do
 * Ionicons, que são linhas finas sem espessura visível.
 */
export function CollectionsRailIcon({ size, color }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x={4} y={5} width={16} height={4.2} rx={1.4} stroke={color} strokeWidth={2} />
      <Rect x={4} y={10.9} width={16} height={4.2} rx={1.4} stroke={color} strokeWidth={2} />
      <Rect x={4} y={16.8} width={16} height={4.2} rx={1.4} stroke={color} strokeWidth={2} />
    </Svg>
  );
}
