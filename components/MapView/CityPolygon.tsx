import React, { memo } from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import MapView, { Polygon } from 'react-native-maps';
import { CityGeoData, CityStatus } from '../../types';
import { STATUS_COLORS, STATUS_FILL_OPACITY, COLORS } from '../../constants/colors';

type Props = {
  city: CityGeoData;
  status: CityStatus;
  onPress: (city: CityGeoData) => void;
};

function CityPolygonComponent({ city, status, onPress }: Props) {
  const color = STATUS_COLORS[status];
  const opacity = STATUS_FILL_OPACITY[status];

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
      strokeColor={`${color}CC`}
      strokeWidth={status === 'no-clients' ? 0.5 : 1.5}
      tappable
      zIndex={2}
      onPress={() => onPress(city)}
    />
  );
}

export const CityPolygon = memo(CityPolygonComponent);
