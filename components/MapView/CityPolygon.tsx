import React, { memo } from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import MapView, { Polygon } from 'react-native-maps';
import { CityGeoData, CityStatus } from '../../types';
import {
  CITY_EXCLUDED,
  STATUS_COLORS,
  STATUS_FILL_OPACITY,
  STATUS_STROKE,
  STATUS_STROKE_ALPHA,
  COLORS,
} from '../../constants/colors';

type Props = {
  city: CityGeoData;
  status: CityStatus;
  /** Cidade sem praça para a marca: sai da escala de status e vira cinza denso. */
  excluded?: boolean;
  onPress: (city: CityGeoData) => void;
};

function CityPolygonComponent({ city, status, excluded = false, onPress }: Props) {
  const color = excluded ? CITY_EXCLUDED.color : STATUS_COLORS[status];
  const opacity = excluded ? CITY_EXCLUDED.fillOpacity : STATUS_FILL_OPACITY[status];
  const stroke = excluded
    ? { width: CITY_EXCLUDED.strokeWidth, dash: undefined }
    : STATUS_STROKE[status];

  // Converter coordenadas GeoJSON [lng, lat] → {latitude, longitude}
  const coordinates = city.coordinates[0].map(([lng, lat]: number[]) => ({
    latitude: lat,
    longitude: lng,
  }));

  // Para alguns municípios pode haver coordenadas inválidas
  if (coordinates.length < 3) return null;

  return (
    <Polygon
      coordinates={coordinates}
      fillColor={`${color}${Math.round(opacity * 255).toString(16).padStart(2, '0')}`}
      strokeColor={`${color}${excluded ? CITY_EXCLUDED.strokeAlpha : STATUS_STROKE_ALPHA}`}
      strokeWidth={stroke.width}
      lineDashPattern={stroke.dash}
      tappable
      zIndex={2}
      onPress={() => onPress(city)}
    />
  );
}

export const CityPolygon = memo(CityPolygonComponent);
