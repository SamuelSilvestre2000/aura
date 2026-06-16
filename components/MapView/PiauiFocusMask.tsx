import React, { memo, useMemo } from 'react';
import { Polygon } from 'react-native-maps';
import { CityGeoData } from '../../types';
import { MapTheme } from '../../services/preferences';

type LatLng = { latitude: number; longitude: number };

/** Retângulo amplo cobrindo a área visível ao redor do Brasil. */
const OUTER_MASK_RING: LatLng[] = [
  { latitude: 6, longitude: -76 },
  { latitude: 6, longitude: -28 },
  { latitude: -42, longitude: -28 },
  { latitude: -42, longitude: -76 },
];

const MASK_COLORS: Record<MapTheme, string> = {
  light: 'rgba(170, 192, 218, 0.72)',
  dark: 'rgba(10, 20, 40, 0.74)',
};

function ringToLatLng(ring: number[][]): LatLng[] {
  return ring.map(([lng, lat]) => ({ latitude: lat, longitude: lng }));
}

type Props = {
  cities: CityGeoData[];
  mapTheme?: MapTheme;
};

function PiauiFocusMaskComponent({ cities, mapTheme = 'light' }: Props) {
  const holes = useMemo(() => {
    const result: LatLng[][] = [];

    for (const city of cities) {
      const ring = city.coordinates?.[0];
      if (!ring || ring.length < 3) continue;
      result.push(ringToLatLng(ring));
    }

    return result;
  }, [cities]);

  if (holes.length === 0) return null;

  return (
    <Polygon
      key={`mask-${mapTheme}`}
      coordinates={OUTER_MASK_RING}
      holes={holes}
      fillColor={MASK_COLORS[mapTheme]}
      strokeColor="transparent"
      strokeWidth={0}
      tappable={false}
      zIndex={1}
    />
  );
}

export const PiauiFocusMask = memo(PiauiFocusMaskComponent);
