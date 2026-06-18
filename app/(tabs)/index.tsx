import React, { useRef, useState, useCallback, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  StatusBar,
  Modal,
  Pressable,
} from 'react-native';
import MapView, { PROVIDER_GOOGLE, Region } from 'react-native-maps';
import BottomSheet from '@gorhom/bottom-sheet';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useGeoJSON } from '../../hooks/useGeoJSON';
import { useClients } from '../../hooks/useClients';
import { useCollections } from '../../hooks/useCollections';
import { usePurchases } from '../../hooks/usePurchases';
import { useCityStatus } from '../../hooks/useCityStatus';
import { useMapTheme } from '../../hooks/useMapTheme';
import { useAuth } from '../../hooks/useAuth';

import { CityPolygon } from '../../components/MapView/CityPolygon';
import { PiauiFocusMask } from '../../components/MapView/PiauiFocusMask';
import { SearchBar } from '../../components/SearchBar';
import { CitySheet } from '../../components/BottomSheet/CitySheet';
import { Ionicons } from '@expo/vector-icons';

import { CityGeoData } from '../../types';
import { COLORS, FONTS, RADIUS, SPACING } from '../../constants/colors';
import { DARK_MAP_STYLE, LIGHT_MAP_STYLE } from '../../constants/mapStyles';
import {
  clampMapRegion,
  clampMapZoom,
  DEFAULT_MAP_REGION,
  getCenterBoundsForRegion,
  isZoomOutOfBounds,
  mapRegionChanged,
  MAP_MAX_ZOOM_LEVEL,
  MAP_MIN_ZOOM_LEVEL,
} from '../../constants/mapBounds';

export default function MapScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const mapRef = useRef<MapView>(null);
  const bottomSheetRef = useRef<BottomSheet>(null);
  const [mapRegion, setMapRegion] = useState<Region>(DEFAULT_MAP_REGION);
  const isIos = Platform.OS === 'ios';
  const [search, setSearch] = useState('');
  const [selectedCity, setSelectedCity] = useState<CityGeoData | null>(null);
  const [selectedCollectionId, setSelectedCollectionId] = useState<string | null>(null);
  const [showCollectionPicker, setShowCollectionPicker] = useState(false);

  const { theme: mapTheme } = useMapTheme();
  const { user, can: canDo } = useAuth();
  const canManageClients = canDo('manage_clients');
  const { cities, loading: geoLoading, refreshing: geoRefreshing, error: geoError } = useGeoJSON();
  const { clients, getClientsByCity } = useClients();
  const { collections } = useCollections();
  const { purchases, togglePurchase, getPurchaseStatus } = usePurchases();

  const activeCollectionId = selectedCollectionId || collections[0]?.id || null;
  const activeCollection = collections.find((c) => c.id === activeCollectionId) || null;

  const { getCityStatus } = useCityStatus(clients, purchases, activeCollectionId);

  const filteredCities = useMemo(() => {
    if (!search.trim()) return cities;
    const q = search.toLowerCase();
    return cities.filter((c) => c.name.toLowerCase().includes(q));
  }, [cities, search]);

  const handleCityPress = useCallback((city: CityGeoData) => {
    setSelectedCity(city);
    bottomSheetRef.current?.snapToIndex(0);
  }, []);

  const handleTogglePurchase = useCallback(
    async (clientId: string) => {
      if (!activeCollectionId) return;
      await togglePurchase(clientId, activeCollectionId);
    },
    [activeCollectionId, togglePurchase]
  );

  const openNewClient = useCallback(
    (city?: CityGeoData | null) => {
      if (city) {
        router.push({
          pathname: '/client/new',
          params: {
            city: city.name,
            cityCode: city.code,
            lat: String(city.centroid[1]),
            lng: String(city.centroid[0]),
          },
        });
      } else {
        router.push('/client/new');
      }
    },
    [router]
  );

  const handleAddClient = useCallback(() => {
    const city = selectedCity;
    bottomSheetRef.current?.close();
    openNewClient(city);
  }, [selectedCity, openNewClient]);

  const handleCloseSheet = useCallback(() => {
    setSelectedCity(null);
  }, []);

  const applyNativeCenterBounds = useCallback((region: Region) => {
    if (isIos) return;
    const { northEast, southWest } = getCenterBoundsForRegion(region);
    mapRef.current?.setMapBoundaries(northEast, southWest);
  }, [isIos]);

  const handleMapReady = useCallback(() => {
    applyNativeCenterBounds(DEFAULT_MAP_REGION);
  }, [applyNativeCenterBounds]);

  const handleRegionChange = useCallback(
    (region: Region) => {
      if (isIos) {
        setMapRegion((prev) => {
          const clamped = clampMapRegion(region);
          return mapRegionChanged(prev, clamped) ? clamped : prev;
        });
        return;
      }
      applyNativeCenterBounds(region);
    },
    [applyNativeCenterBounds, isIos]
  );

  const handleRegionChangeComplete = useCallback(
    (region: Region) => {
      if (!isZoomOutOfBounds(region)) return;

      const zoom = clampMapZoom(region);
      const corrected: Region = { ...region, ...zoom };

      if (isIos) {
        setMapRegion(clampMapRegion(corrected));
      } else {
        applyNativeCenterBounds(corrected);
        mapRef.current?.animateToRegion(corrected, 0);
      }
    },
    [applyNativeCenterBounds, isIos]
  );

  const handleCenterMap = useCallback(() => {
    if (isIos) {
      setMapRegion(DEFAULT_MAP_REGION);
    } else {
      applyNativeCenterBounds(DEFAULT_MAP_REGION);
      mapRef.current?.animateToRegion(DEFAULT_MAP_REGION, 400);
    }
  }, [applyNativeCenterBounds, isIos]);

  const handleSearchClear = useCallback(() => setSearch(''), []);

  if (geoError && cities.length === 0) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorIcon}>🌐</Text>
        <Text style={styles.errorTitle}>Erro ao carregar mapa</Text>
        <Text style={styles.errorText}>{geoError}</Text>
      </View>
    );
  }

  const selectedCityClients = selectedCity ? getClientsByCity(selectedCity.code) : [];
  const selectedCityStatus = selectedCity ? getCityStatus(selectedCity.code) : 'no-clients';
  const hasCities = cities.length > 0;
  const headerTop = insets.top + 4;
  const tabBarOffset = 56 + insets.bottom;
  const mapCustomStyle = mapTheme === 'dark' ? DARK_MAP_STYLE : LIGHT_MAP_STYLE;

  return (
    <GestureHandlerRootView style={styles.root}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor="transparent"
        translucent
      />
      <View style={styles.container}>
        <MapView
          key={mapTheme}
          ref={mapRef}
          style={StyleSheet.absoluteFillObject}
          provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
          {...(isIos
            ? { region: mapRegion }
            : { initialRegion: DEFAULT_MAP_REGION })}
          onMapReady={handleMapReady}
          onRegionChange={handleRegionChange}
          onRegionChangeComplete={handleRegionChangeComplete}
          customMapStyle={mapCustomStyle}
          showsUserLocation
          showsMyLocationButton={false}
          showsCompass={false}
          showsScale={false}
          rotateEnabled={false}
          pitchEnabled={false}
          minZoomLevel={MAP_MIN_ZOOM_LEVEL}
          maxZoomLevel={MAP_MAX_ZOOM_LEVEL}
        >
          {hasCities && (
            <>
              <PiauiFocusMask cities={cities} mapTheme={mapTheme} />
              {filteredCities.map((city) => (
                <CityPolygon
                  key={city.code}
                  city={city}
                  status={getCityStatus(city.code)}
                  onPress={handleCityPress}
                />
              ))}
            </>
          )}
        </MapView>

        {geoLoading && !hasCities && (
          <View style={[styles.initialLoadingBanner, { top: headerTop + 56 }]}>
            <ActivityIndicator size="small" color={COLORS.primary} />
            <Text style={styles.initialLoadingText}>Baixando mapa do Piauí...</Text>
          </View>
        )}

        {geoRefreshing && hasCities && (
          <View style={[styles.refreshBanner, { top: headerTop + 56 }]}>
            <ActivityIndicator size="small" color={COLORS.primary} />
            <Text style={styles.refreshBannerText}>Atualizando dados...</Text>
          </View>
        )}

        <View style={[styles.topUI, { paddingTop: headerTop }]} pointerEvents="box-none">
          <View style={styles.searchContainer}>
            <SearchBar
              variant="map"
              value={search}
              onChangeText={setSearch}
              onClear={handleSearchClear}
              placeholder="Pesquisar cidade..."
              onProfilePress={() => router.push('/(tabs)/settings')}
              profileInitial={user?.name.charAt(0).toUpperCase()}
              profileImageUri={user?.photoUri}
            />
          </View>

          {activeCollection && (
            <View style={styles.collectionContainer}>
              {collections.length > 1 ? (
                <TouchableOpacity
                  style={styles.collectionPill}
                  onPress={() => setShowCollectionPicker(true)}
                  activeOpacity={0.75}
                >
                  <Ionicons name="albums-outline" size={14} color={COLORS.primary} />
                  <Text style={styles.collectionPillText} numberOfLines={1}>
                    {activeCollection.name}
                  </Text>
                  <Ionicons name="chevron-down" size={13} color={COLORS.textMuted} />
                </TouchableOpacity>
              ) : (
                <View style={styles.collectionPill}>
                  <Ionicons name="albums-outline" size={14} color={COLORS.primary} />
                  <Text style={styles.collectionPillText} numberOfLines={1}>
                    {activeCollection.name}
                  </Text>
                </View>
              )}
            </View>
          )}
        </View>

        {!selectedCity && (
          <View style={[styles.bottomControls, { paddingBottom: tabBarOffset + 8 }]} pointerEvents="box-none">
            <TouchableOpacity style={styles.mapActionBtn} onPress={handleCenterMap} activeOpacity={0.7}>
              <Ionicons name="locate-outline" size={20} color={COLORS.textSecondary} />
            </TouchableOpacity>
            {canManageClients && (
              <TouchableOpacity style={styles.mapActionBtn} onPress={() => openNewClient()} activeOpacity={0.7}>
                <Ionicons name="add" size={22} color={COLORS.primary} />
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Modal seleção de coleção */}
        <Modal
          visible={showCollectionPicker}
          transparent
          animationType="fade"
          onRequestClose={() => setShowCollectionPicker(false)}
        >
          <Pressable style={styles.pickerOverlay} onPress={() => setShowCollectionPicker(false)}>
            <View style={styles.pickerSheet}>
              <View style={styles.pickerHandle} />
              <Text style={styles.pickerTitle}>Coleção ativa</Text>
              {collections.map((col, i) => {
                const active = col.id === activeCollectionId;
                return (
                  <TouchableOpacity
                    key={col.id}
                    style={[styles.pickerRow, i > 0 && styles.pickerRowBorder]}
                    onPress={() => {
                      setSelectedCollectionId(col.id);
                      setShowCollectionPicker(false);
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={styles.pickerRowLeft}>
                      <Ionicons
                        name={active ? 'albums' : 'albums-outline'}
                        size={18}
                        color={active ? COLORS.primary : COLORS.textMuted}
                      />
                      <Text style={[styles.pickerRowText, active && styles.pickerRowTextActive]}>
                        {col.name}
                      </Text>
                    </View>
                    {active && (
                      <Ionicons name="checkmark" size={18} color={COLORS.primary} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </Pressable>
        </Modal>

        <CitySheet
          bottomSheetRef={bottomSheetRef}
          selectedCity={selectedCity}
          cityStatus={selectedCityStatus}
          clients={selectedCityClients}
          activeCollection={activeCollection}
          onTogglePurchase={handleTogglePurchase}
          getPurchaseStatus={getPurchaseStatus}
          onAddClient={handleAddClient}
          onClose={handleCloseSheet}
          canManageClients={canManageClients}
        />

      </View>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#E8EFF7',
  },
  container: {
    flex: 1,
  },
  topUI: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  searchContainer: {
    marginHorizontal: 12,
  },
  collectionContainer: {
    marginTop: 6,
    marginHorizontal: 12,
  },
  collectionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.md,
    paddingVertical: 6,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.surfaceBorder,
  },
  collectionPillText: {
    color: COLORS.textPrimary,
    fontSize: FONTS.sizes.sm,
    fontWeight: '500',
    maxWidth: 180,
  },
  pickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.25)',
    justifyContent: 'flex-end',
  },
  pickerSheet: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.xxl,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.surfaceBorder,
  },
  pickerHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.surfaceBorderStrong,
    alignSelf: 'center',
    marginBottom: SPACING.lg,
  },
  pickerTitle: {
    color: COLORS.textMuted,
    fontSize: FONTS.sizes.xs,
    fontWeight: '600',
    letterSpacing: 0.8,
    paddingHorizontal: SPACING.xl,
    paddingBottom: SPACING.sm,
  },
  pickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.lg,
  },
  pickerRowBorder: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.surfaceBorder,
  },
  pickerRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  pickerRowText: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.md,
    fontWeight: '400',
  },
  pickerRowTextActive: {
    color: COLORS.textPrimary,
    fontWeight: '600',
  },
  initialLoadingBanner: {
    position: 'absolute',
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: 'rgba(255,255,255,0.97)',
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    zIndex: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  initialLoadingText: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.sm,
  },
  refreshBanner: {
    position: 'absolute',
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: 'rgba(255,255,255,0.97)',
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.md,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    zIndex: 20,
  },
  refreshBannerText: {
    color: COLORS.textMuted,
    fontSize: FONTS.sizes.xs,
  },
  bottomControls: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    left: 0,
    paddingHorizontal: SPACING.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    zIndex: 5,
    pointerEvents: 'box-none',
  },
  mapActionBtn: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.surfaceBorder,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  errorContainer: {
    flex: 1,
    backgroundColor: COLORS.backgroundSubtle,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xxl,
    gap: SPACING.md,
  },
  errorIcon: { fontSize: 40, color: COLORS.textMuted },
  errorTitle: {
    color: COLORS.textPrimary,
    fontSize: FONTS.sizes.xl,
    fontWeight: '700',
    textAlign: 'center',
  },
  errorText: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.sm,
    textAlign: 'center',
  },
});
