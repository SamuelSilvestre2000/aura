import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ActivityIndicator, Modal, Pressable } from 'react-native';
import BottomSheet from '@gorhom/bottom-sheet';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MapContainer, TileLayer, Polygon, CircleMarker, useMap } from 'react-leaflet';
import type { Map as LeafletMapInstance } from 'leaflet';
import 'leaflet/dist/leaflet.css';

import { useGeoJSON } from '../../hooks/useGeoJSON';
import { useClients } from '../../hooks/useClients';
import { useCollections } from '../../hooks/useCollections';
import { usePurchases } from '../../hooks/usePurchases';
import { useCityStatus } from '../../hooks/useCityStatus';
import { useAuth } from '../../hooks/useAuth';
import { useCategoryFilter } from '../../hooks/useCategoryFilter';
import {
  filterClientsByCategory,
  filterCollectionsByCategory,
} from '../../utils/categoryFilter';
import { filterOpenCollections } from '../../utils/collectionStatus';
import { CategoryPickerPill } from '../CategoryPickerPill';

import { SearchBar } from '../SearchBar';
import { CitySheet } from '../BottomSheet/CitySheet';
import { Ionicons } from '@expo/vector-icons';

import { getTabBarBottomInset } from '../CustomTabBar';
import { CityGeoData } from '../../types';
import { COLORS, FONTS, RADIUS, SPACING, STATUS_COLORS, STATUS_FILL_OPACITY, PIAUI_REGION } from '../../constants/colors';
import { OUTER_BOUNDS } from '../../constants/mapBounds';

const MAP_CENTER: [number, number] = [PIAUI_REGION.latitude, PIAUI_REGION.longitude];
const MAP_BOUNDS: [[number, number], [number, number]] = [
  [OUTER_BOUNDS.south, OUTER_BOUNDS.west],
  [OUTER_BOUNDS.north, OUTER_BOUNDS.east],
];

function hexAlpha(color: string, opacity: number): string {
  return `${color}${Math.round(opacity * 255).toString(16).padStart(2, '0')}`;
}

function FlyToUser({ target }: { target: [number, number] | null }) {
  const map = useMap();
  useEffect(() => {
    if (target) map.flyTo(target, 9);
  }, [map, target]);
  return null;
}

/**
 * O mapa nativo (react-native-maps) não roda no navegador — na web usamos
 * Leaflet + OpenStreetMap (gratuito, sem chave de API) com os mesmos
 * polígonos de cidade (IBGE) do app nativo.
 */
export default function MapScreenWeb() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const bottomSheetRef = useRef<BottomSheet>(null);
  const mapRef = useRef<LeafletMapInstance | null>(null);
  const [search, setSearch] = useState('');
  const [selectedCity, setSelectedCity] = useState<CityGeoData | null>(null);
  const [selectedCollectionId, setSelectedCollectionId] = useState<string | null>(null);
  const [showCollectionPicker, setShowCollectionPicker] = useState(false);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [locating, setLocating] = useState(false);

  const { user, can: canDo } = useAuth();
  const {
    categories: userCategories,
    filter: categoryFilter,
    setFilter: setCategoryFilter,
    effectiveFilter,
    allowedCategoryIds,
  } = useCategoryFilter();
  const canManageClients = canDo('manage_clients');
  const { cities, loading: geoLoading, refreshing: geoRefreshing, error: geoError } = useGeoJSON();
  const { clients } = useClients();
  const { collections, refresh: refreshCollections } = useCollections();
  const { purchases, getPurchaseStatus } = usePurchases();

  const filteredClients = useMemo(
    () => filterClientsByCategory(clients, effectiveFilter, allowedCategoryIds),
    [clients, effectiveFilter, allowedCategoryIds]
  );

  const visibleCollections = useMemo(
    () =>
      filterOpenCollections(
        filterCollectionsByCategory(collections, effectiveFilter, allowedCategoryIds)
      ),
    [collections, effectiveFilter, allowedCategoryIds]
  );

  useEffect(() => {
    void refreshCollections(effectiveFilter);
  }, [effectiveFilter, refreshCollections]);

  const activeCollectionId = selectedCollectionId || visibleCollections[0]?.id || null;
  const activeCollection = visibleCollections.find((c) => c.id === activeCollectionId) || null;

  const { getCityStatus } = useCityStatus(filteredClients, purchases, activeCollectionId);

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
    (clientId: string) => {
      if (!activeCollectionId) return;
      router.push({
        pathname: '/sale/[clientId]',
        params: { clientId, collectionId: activeCollectionId },
      });
    },
    [activeCollectionId, router]
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

  const handleLocateMe = useCallback(() => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        if (
          latitude >= OUTER_BOUNDS.south &&
          latitude <= OUTER_BOUNDS.north &&
          longitude >= OUTER_BOUNDS.west &&
          longitude <= OUTER_BOUNDS.east
        ) {
          setUserLocation([latitude, longitude]);
        }
        setLocating(false);
      },
      () => setLocating(false),
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }, []);

  const headerTop = insets.top + 4;
  const tabBarOffset = getTabBarBottomInset(insets, SPACING.sm);
  const selectedCityClients = selectedCity
    ? filteredClients.filter((c) => c.cityCode === selectedCity.code)
    : [];
  const selectedCityStatus = selectedCity ? getCityStatus(selectedCity.code) : 'no-clients';
  const hasCities = cities.length > 0;

  if (geoError && cities.length === 0) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorIcon}>🌐</Text>
        <Text style={styles.errorTitle}>Erro ao carregar mapa</Text>
        <Text style={styles.errorText}>{geoError}</Text>
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={styles.root}>
      <View style={styles.container}>
        <View style={StyleSheet.absoluteFillObject}>
          <MapContainer
            ref={mapRef}
            center={MAP_CENTER}
            zoom={7}
            minZoom={6}
            maxZoom={14}
            maxBounds={MAP_BOUNDS}
            maxBoundsViscosity={1.0}
            style={{ width: '100%', height: '100%' }}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            />
            {hasCities &&
              filteredCities.map((city) => {
                const status = getCityStatus(city.code);
                const ring = city.coordinates[0];
                if (!ring || ring.length < 3) return null;
                const positions: [number, number][] = ring.map(([lng, lat]) => [lat, lng]);
                return (
                  <Polygon
                    key={city.code}
                    positions={positions}
                    pathOptions={{
                      color: `${STATUS_COLORS[status]}CC`,
                      weight: status === 'no-clients' ? 1 : 1.5,
                      fillColor: hexAlpha(STATUS_COLORS[status], STATUS_FILL_OPACITY[status]),
                      fillOpacity: 1,
                    }}
                    eventHandlers={{ click: () => handleCityPress(city) }}
                  />
                );
              })}
            {userLocation && (
              <CircleMarker
                center={userLocation}
                radius={7}
                pathOptions={{ color: '#ffffff', weight: 2, fillColor: COLORS.primary, fillOpacity: 1 }}
              />
            )}
            <FlyToUser target={userLocation} />
          </MapContainer>
        </View>

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
              onClear={() => setSearch('')}
              placeholder="Pesquisar cidade..."
              onProfilePress={() => router.push('/(tabs)/settings')}
              profileInitial={user?.name.charAt(0).toUpperCase()}
              profileImageUri={user?.photoUri}
            />
          </View>

          {activeCollection && (
            <View style={styles.collectionContainer}>
              <View style={styles.pillRow}>
                {visibleCollections.length > 1 ? (
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

                <CategoryPickerPill
                  categories={userCategories}
                  value={categoryFilter}
                  onChange={setCategoryFilter}
                />
              </View>
            </View>
          )}
        </View>

        {!selectedCity && (
          <View style={[styles.bottomControls, { paddingBottom: tabBarOffset + 8 }]} pointerEvents="box-none">
            <TouchableOpacity style={styles.mapActionBtn} onPress={handleLocateMe} activeOpacity={0.7}>
              {locating ? (
                <ActivityIndicator size="small" color={COLORS.primary} />
              ) : (
                <Ionicons name="locate-outline" size={22} color={COLORS.primary} />
              )}
            </TouchableOpacity>
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
              {visibleCollections.map((col, i) => {
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
                    {active && <Ionicons name="checkmark" size={18} color={COLORS.primary} />}
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
          showCategoryBadges={userCategories.length > 1}
        />
      </View>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#E8EFF7' },
  container: { flex: 1 },
  topUI: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  searchContainer: { marginHorizontal: 12 },
  collectionContainer: { marginTop: 6, marginHorizontal: 12 },
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
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
  },
  initialLoadingText: { color: COLORS.textSecondary, fontSize: FONTS.sizes.sm },
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
  refreshBannerText: { color: COLORS.textMuted, fontSize: FONTS.sizes.xs },
  bottomControls: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    left: 0,
    paddingHorizontal: SPACING.lg,
    flexDirection: 'row',
    justifyContent: 'flex-end',
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
  },
  pickerOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.25)', justifyContent: 'flex-end' },
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
  pickerRowBorder: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: COLORS.surfaceBorder },
  pickerRowLeft: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
  pickerRowText: { color: COLORS.textSecondary, fontSize: FONTS.sizes.md, fontWeight: '400' },
  pickerRowTextActive: { color: COLORS.textPrimary, fontWeight: '600' },
  errorContainer: {
    flex: 1,
    backgroundColor: COLORS.backgroundSubtle,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xxl,
    gap: SPACING.md,
  },
  errorIcon: { fontSize: 40, color: COLORS.textMuted },
  errorTitle: { color: COLORS.textPrimary, fontSize: FONTS.sizes.xl, fontWeight: '700', textAlign: 'center' },
  errorText: { color: COLORS.textSecondary, fontSize: FONTS.sizes.sm, textAlign: 'center' },
});
