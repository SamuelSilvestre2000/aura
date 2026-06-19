import { Region } from 'react-native-maps';
import { PIAUI_REGION } from './colors';

/** Extremos do estado (IBGE). */
export const PIAUI_BOUNDS = {
  north: -2.74,
  south: -10.92,
  west: -46.0,
  east: -40.37,
} as const;

/** Margem ao redor do Piauí — limite máximo de visualização. */
const OUTER_MARGIN = 0.9;

/** Caixa fixa: Piauí + pequena área ao redor. */
export const OUTER_BOUNDS = {
  north: PIAUI_BOUNDS.north + OUTER_MARGIN,
  south: PIAUI_BOUNDS.south - OUTER_MARGIN,
  west: PIAUI_BOUNDS.west - OUTER_MARGIN,
  east: PIAUI_BOUNDS.east + OUTER_MARGIN,
} as const;

const OUTER_LAT_SPAN = OUTER_BOUNDS.north - OUTER_BOUNDS.south;
const OUTER_LNG_SPAN = OUTER_BOUNDS.east - OUTER_BOUNDS.west;

export const MAX_LATITUDE_DELTA = OUTER_LAT_SPAN;
export const MAX_LONGITUDE_DELTA = OUTER_LNG_SPAN;

export const MIN_LATITUDE_DELTA = 0.28;
export const MIN_LONGITUDE_DELTA = 0.22;

export const MAP_MIN_ZOOM_LEVEL = 5.2;
export const MAP_MAX_ZOOM_LEVEL = 10.5;

export const DEFAULT_MAP_REGION: Region = {
  latitude: PIAUI_REGION.latitude,
  longitude: PIAUI_REGION.longitude,
  latitudeDelta: PIAUI_REGION.latitudeDelta,
  longitudeDelta: PIAUI_REGION.longitudeDelta,
};

export type CenterBounds = {
  northEast: { latitude: number; longitude: number };
  southWest: { latitude: number; longitude: number };
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function clampMapZoom(region: Region): Pick<Region, 'latitudeDelta' | 'longitudeDelta'> {
  return {
    latitudeDelta: clamp(region.latitudeDelta, MIN_LATITUDE_DELTA, MAX_LATITUDE_DELTA),
    longitudeDelta: clamp(region.longitudeDelta, MIN_LONGITUDE_DELTA, MAX_LONGITUDE_DELTA),
  };
}

/** Limites do centro do mapa para a tela não sair de OUTER_BOUNDS (depende do zoom). */
export function getCenterBoundsForRegion(region: Region): CenterBounds {
  const { latitudeDelta, longitudeDelta } = clampMapZoom(region);
  const halfLat = latitudeDelta / 2;
  const halfLng = longitudeDelta / 2;

  return {
    northEast: {
      latitude: OUTER_BOUNDS.north - halfLat,
      longitude: OUTER_BOUNDS.east - halfLng,
    },
    southWest: {
      latitude: OUTER_BOUNDS.south + halfLat,
      longitude: OUTER_BOUNDS.west + halfLng,
    },
  };
}

/** iOS: limita zoom e centro sem recentralizar. */
export function clampMapRegion(region: Region): Region {
  const { latitudeDelta, longitudeDelta } = clampMapZoom(region);
  const halfLat = latitudeDelta / 2;
  const halfLng = longitudeDelta / 2;

  const minLat = OUTER_BOUNDS.south + halfLat;
  const maxLat = OUTER_BOUNDS.north - halfLat;
  const minLng = OUTER_BOUNDS.west + halfLng;
  const maxLng = OUTER_BOUNDS.east - halfLng;

  const latitude =
    minLat > maxLat
      ? (OUTER_BOUNDS.north + OUTER_BOUNDS.south) / 2
      : clamp(region.latitude, minLat, maxLat);

  const longitude =
    minLng > maxLng
      ? (OUTER_BOUNDS.east + OUTER_BOUNDS.west) / 2
      : clamp(region.longitude, minLng, maxLng);

  return { latitude, longitude, latitudeDelta, longitudeDelta };
}

export function isCoordinateInOuterBounds(latitude: number, longitude: number): boolean {
  return (
    latitude >= OUTER_BOUNDS.south &&
    latitude <= OUTER_BOUNDS.north &&
    longitude >= OUTER_BOUNDS.west &&
    longitude <= OUTER_BOUNDS.east
  );
}

/** Zoom regional ao focar na posição do usuário. */
export const USER_LOCATION_MAP_ZOOM = {
  latitudeDelta: 2.4,
  longitudeDelta: 2.4,
} as const;

/** Região centrada no usuário, ou null se estiver fora da área do app. */
export function regionFromUserCoordinates(
  latitude: number,
  longitude: number
): Region | null {
  if (!isCoordinateInOuterBounds(latitude, longitude)) return null;
  return clampMapRegion({
    latitude,
    longitude,
    ...USER_LOCATION_MAP_ZOOM,
  });
}

export function mapRegionChanged(a: Region, b: Region, epsilon = 0.001): boolean {
  return (
    Math.abs(a.latitude - b.latitude) > epsilon ||
    Math.abs(a.longitude - b.longitude) > epsilon ||
    Math.abs(a.latitudeDelta - b.latitudeDelta) > epsilon ||
    Math.abs(a.longitudeDelta - b.longitudeDelta) > epsilon
  );
}

export function isZoomOutOfBounds(region: Region): boolean {
  const zoom = clampMapZoom(region);
  return (
    Math.abs(region.latitudeDelta - zoom.latitudeDelta) > 0.001 ||
    Math.abs(region.longitudeDelta - zoom.longitudeDelta) > 0.001
  );
}
