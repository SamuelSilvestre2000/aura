import React, { useEffect, useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '../../hooks/useAuth';
import { NewClientSheet, InitialCity } from '../../components/NewClientSheet';
import { COLORS } from '../../constants/colors';

export default function NewClientScreen() {
  const router = useRouter();
  const { can: canDo } = useAuth();
  const params = useLocalSearchParams<{
    city?: string;
    cityCode?: string;
    lat?: string;
    lng?: string;
  }>();

  useEffect(() => {
    if (!canDo('manage_clients')) router.replace('/(tabs)');
  }, [canDo, router]);

  const initialCity = useMemo<InitialCity | null>(() => {
    if (!params.cityCode) return null;
    return {
      code: params.cityCode,
      name: params.city || '',
      lat: parseFloat(params.lat || '0'),
      lng: parseFloat(params.lng || '0'),
    };
  }, [params.city, params.cityCode, params.lat, params.lng]);

  return (
    <View style={styles.container}>
      <NewClientSheet
        visible
        initialCity={initialCity}
        onClose={() => router.back()}
        onCreated={() => router.back()}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.backgroundSubtle,
  },
});
