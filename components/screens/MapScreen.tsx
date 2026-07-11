import React, { useRef, useState, useCallback, useMemo, useEffect } from 'react';
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
import { useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Location from 'expo-location';

import { useGeoJSON } from '../../hooks/useGeoJSON';
import { useClients } from '../../hooks/useClients';
import { useCollections } from '../../hooks/useCollections';
import { usePurchases } from '../../hooks/usePurchases';
import { useCityStatus } from '../../hooks/useCityStatus';
import { useMapTheme } from '../../hooks/useMapTheme';
import { useAuth } from '../../hooks/useAuth';
import { useCategoryFilter } from '../../hooks/useCategoryFilter';
import {
  filterClientsByCategory,
  filterCollectionsByCategory,
} from '../../utils/categoryFilter';
import { filterOpenCollections } from '../../utils/collectionStatus';
import { getVigenteCollectionId } from '../../utils/collectionVigente';
import { CategoryPickerPill } from '../CategoryPickerPill';

import { CityPolygon } from '../MapView/CityPolygon';
import { PiauiFocusMask } from '../MapView/PiauiFocusMask';
import { SearchBar } from '../SearchBar';
import { CitySheet } from '../BottomSheet/CitySheet';
import { Ionicons } from '@expo/vector-icons';

import { getTabBarBottomInset } from '../CustomTabBar';
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
  regionFromUserCoordinates,
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
  const [highlightedClientId, setHighlightedClientId] = useState<string | null>(null);
  const [selectedCollectionId, setSelectedCollectionId] = useState<string | null>(null);
  const [showCollectionPicker, setShowCollectionPicker] = useState(false);
  const [topUIHeight, setTopUIHeight] = useState(0);
  const [refreshingMap, setRefreshingMap] = useState(false);
  const didInitialLocate = useRef(false);
  const mapRegionRef = useRef<Region>(DEFAULT_MAP_REGION);
  const programmaticRegionChangeRef = useRef(false);
  const pendingProgrammaticRegionRef = useRef<Region | null>(null);
  const programmaticRegionClearTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const locateInFlightRef = useRef(false);

  const { theme: mapTheme } = useMapTheme();
  const { user, can: canDo } = useAuth();
  const {
    categories: userCategories,
    filter: categoryFilter,
    setFilter: setCategoryFilter,
    effectiveFilter,
    allowedCategoryIds,
  } = useCategoryFilter();
  const canManageClients = canDo('manage_clients');
  const {
    cities,
    cityByCode,
    loading: geoLoading,
    refreshing: geoRefreshing,
    error: geoError,
    refresh: refreshCities,
  } = useGeoJSON();
  const { clients, refresh: refreshClients } = useClients();
  const { collections, refresh: refreshCollections } = useCollections();
  const { purchases, refresh: refreshPurchases, getPurchaseStatus } = usePurchases();

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

  /**
   * Cada tela usa sua própria instância dos hooks de dados — ao voltar para
   * o mapa (ex: depois de criar um cliente em outra tela) é preciso recarregar
   * explicitamente, já que o mapa não some/remonta ao navegar de volta.
   */
  useFocusEffect(
    useCallback(() => {
      void refreshClients();
      void refreshCollections(effectiveFilter);
      void refreshPurchases();
    }, [refreshClients, refreshCollections, refreshPurchases, effectiveFilter])
  );

  useEffect(() => {
    if (
      selectedCollectionId &&
      !visibleCollections.some((c) => c.id === selectedCollectionId)
    ) {
      setSelectedCollectionId(null);
    }
  }, [effectiveFilter, visibleCollections, selectedCollectionId]);

  const activeCollectionId =
    selectedCollectionId ||
    getVigenteCollectionId(visibleCollections) ||
    visibleCollections[0]?.id ||
    null;
  const activeCollection = visibleCollections.find((c) => c.id === activeCollectionId) || null;

  const { getCityStatus } = useCityStatus(filteredClients, purchases, activeCollectionId);

  const searchQuery = search.trim().toLowerCase();

  const filteredCities = useMemo(() => {
    if (!searchQuery) return cities;
    return cities.filter((c) => c.name.toLowerCase().includes(searchQuery));
  }, [cities, searchQuery]);

  const citySearchResults = useMemo(() => filteredCities.slice(0, 5), [filteredCities]);

  const clientSearchResults = useMemo(() => {
    if (!searchQuery) return [];
    return filteredClients
      .filter((c) => `${c.name} ${c.tradeName ?? ''}`.toLowerCase().includes(searchQuery))
      .slice(0, 5);
  }, [filteredClients, searchQuery]);

  const showSearchResults = searchQuery.length > 0;

  const handleCityPress = useCallback((city: CityGeoData) => {
    setSelectedCity(city);
    setHighlightedClientId(null);
    bottomSheetRef.current?.snapToIndex(0);
  }, []);

  const handleSelectSearchCity = useCallback(
    (city: CityGeoData) => {
      handleCityPress(city);
      setSearch('');
    },
    [handleCityPress]
  );

  const handleSelectSearchClient = useCallback(
    (client: (typeof filteredClients)[number]) => {
      const city = cityByCode.get(client.cityCode);
      if (!city) return;
      handleCityPress(city);
      setHighlightedClientId(client.id);
      setSearch('');
    },
    [cityByCode, handleCityPress]
  );

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
    setHighlightedClientId(null);
  }, []);

  const clearProgrammaticRegionGuard = useCallback((finalRegion?: Region) => {
    if (programmaticRegionClearTimerRef.current) {
      clearTimeout(programmaticRegionClearTimerRef.current);
      programmaticRegionClearTimerRef.current = null;
    }
    programmaticRegionChangeRef.current = false;
    pendingProgrammaticRegionRef.current = null;
    if (finalRegion) {
      const clamped = clampMapRegion(finalRegion);
      mapRegionRef.current = clamped;
      setMapRegion(clamped);
    }
  }, []);

  const beginProgrammaticRegionChange = useCallback(
    (region: Region, animated: boolean) => {
      pendingProgrammaticRegionRef.current = region;
      programmaticRegionChangeRef.current = true;
      if (programmaticRegionClearTimerRef.current) {
        clearTimeout(programmaticRegionClearTimerRef.current);
      }
      programmaticRegionClearTimerRef.current = setTimeout(() => {
        clearProgrammaticRegionGuard(pendingProgrammaticRegionRef.current ?? undefined);
      }, animated ? 900 : 200);
    },
    [clearProgrammaticRegionGuard]
  );

  const applyNativeCenterBounds = useCallback((region: Region) => {
    if (isIos) return;
    const { northEast, southWest } = getCenterBoundsForRegion(region);
    mapRef.current?.setMapBoundaries(northEast, southWest);
  }, [isIos]);

  const applyRegionToMap = useCallback(
    (region: Region, animated = true) => {
      const clamped = clampMapRegion(region);
      mapRegionRef.current = clamped;
      beginProgrammaticRegionChange(clamped, animated);
      setMapRegion(clamped);
      applyNativeCenterBounds(clamped);
      mapRef.current?.animateToRegion(clamped, animated ? 600 : 0);
    },
    [applyNativeCenterBounds, beginProgrammaticRegionChange]
  );

  const resolveUserRegion = useCallback(
    async (options?: { preferFresh?: boolean }): Promise<Region | null> => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return null;

      if (!options?.preferFresh) {
        const lastKnown = await Location.getLastKnownPositionAsync();
        if (lastKnown) {
          const fromLast = regionFromUserCoordinates(
            lastKnown.coords.latitude,
            lastKnown.coords.longitude
          );
          if (fromLast) return fromLast;
        }
      }

      const current = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      return regionFromUserCoordinates(current.coords.latitude, current.coords.longitude);
    },
    []
  );

  const centerOnUserLocation = useCallback(
    async (options?: { preferFresh?: boolean }): Promise<boolean> => {
      try {
        const region = await resolveUserRegion(options);
        if (!region) return false;
        applyRegionToMap(region, true);
        return true;
      } catch {
        return false;
      }
    },
    [applyRegionToMap, resolveUserRegion]
  );

  useEffect(() => {
    if (didInitialLocate.current) return;
    didInitialLocate.current = true;
    void centerOnUserLocation();
  }, [centerOnUserLocation]);

  const handleMapReady = useCallback(() => {
    applyNativeCenterBounds(mapRegion);
  }, [applyNativeCenterBounds, mapRegion]);

  const handleRegionChange = useCallback(
    (region: Region) => {
      if (programmaticRegionChangeRef.current) return;

      if (isIos) {
        setMapRegion((prev) => {
          const clamped = clampMapRegion(region);
          if (!mapRegionChanged(prev, clamped)) return prev;
          mapRegionRef.current = clamped;
          return clamped;
        });
        return;
      }
      applyNativeCenterBounds(region);
    },
    [applyNativeCenterBounds, isIos]
  );

  const handleRegionChangeComplete = useCallback(
    (region: Region) => {
      if (programmaticRegionChangeRef.current) {
        const target = pendingProgrammaticRegionRef.current ?? clampMapRegion(region);
        clearProgrammaticRegionGuard(target);
        applyNativeCenterBounds(target);
        if (mapRegionChanged(region, target)) {
          mapRef.current?.animateToRegion(target, 0);
        }
        return;
      }

      if (!isZoomOutOfBounds(region)) return;

      const zoom = clampMapZoom(region);
      const corrected: Region = { ...region, ...zoom };

      if (isIos) {
        const clamped = clampMapRegion(corrected);
        mapRegionRef.current = clamped;
        setMapRegion(clamped);
      } else {
        applyNativeCenterBounds(corrected);
        mapRef.current?.animateToRegion(corrected, 0);
      }
    },
    [applyNativeCenterBounds, clearProgrammaticRegionGuard, isIos]
  );

  const handleCenterMap = useCallback(async () => {
    if (locateInFlightRef.current) return;
    locateInFlightRef.current = true;
    try {
      const centered = await centerOnUserLocation({ preferFresh: true });
      if (!centered) {
        applyRegionToMap(DEFAULT_MAP_REGION, true);
      }
    } finally {
      locateInFlightRef.current = false;
    }
  }, [applyRegionToMap, centerOnUserLocation]);

  const handleRefreshMap = useCallback(async () => {
    if (refreshingMap) return;
    setRefreshingMap(true);
    try {
      await Promise.all([
        refreshClients(),
        refreshCollections(effectiveFilter),
        refreshPurchases(),
        refreshCities(),
      ]);
    } finally {
      setRefreshingMap(false);
    }
  }, [refreshingMap, refreshClients, refreshCollections, refreshPurchases, refreshCities, effectiveFilter]);

  const handleSearchClear = useCallback(() => setSearch(''), []);

  const citySheetTopInset = topUIHeight ? topUIHeight + SPACING.lg : 0;

  if (geoError && cities.length === 0) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorIcon}>🌐</Text>
        <Text style={styles.errorTitle}>Erro ao carregar mapa</Text>
        <Text style={styles.errorText}>{geoError}</Text>
      </View>
    );
  }

  const selectedCityClients = selectedCity
    ? filteredClients.filter((c) => c.cityCode === selectedCity.code)
    : [];
  const selectedCityStatus = selectedCity ? getCityStatus(selectedCity.code) : 'no-clients';
  const hasCities = cities.length > 0;
  const headerTop = insets.top + 4;
  const tabBarOffset = getTabBarBottomInset(insets, SPACING.sm);
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

        <View
          style={[styles.topUI, { paddingTop: headerTop }]}
          pointerEvents="box-none"
          onLayout={(e) => setTopUIHeight(e.nativeEvent.layout.height)}
        >
          <View style={styles.searchContainer}>
            <SearchBar
              variant="map"
              value={search}
              onChangeText={setSearch}
              onClear={handleSearchClear}
              placeholder="Pesquisar cidade ou cliente..."
              onProfilePress={() => router.push('/(tabs)/settings')}
              profileInitial={user?.name.charAt(0).toUpperCase()}
              profileImageUri={user?.photoUri}
            />

            {showSearchResults && (
              <View style={styles.searchResults}>
                {citySearchResults.length === 0 && clientSearchResults.length === 0 ? (
                  <Text style={styles.searchResultsEmpty}>Nenhum resultado encontrado</Text>
                ) : (
                  <>
                    {citySearchResults.length > 0 && (
                      <>
                        <Text style={styles.searchResultsLabel}>Cidades</Text>
                        {citySearchResults.map((city) => (
                          <TouchableOpacity
                            key={city.code}
                            style={styles.searchResultRow}
                            onPress={() => handleSelectSearchCity(city)}
                            activeOpacity={0.7}
                          >
                            <Ionicons name="location-outline" size={16} color={COLORS.textMuted} />
                            <Text style={styles.searchResultText} numberOfLines={1}>
                              {city.name}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </>
                    )}
                    {clientSearchResults.length > 0 && (
                      <>
                        <Text style={styles.searchResultsLabel}>Clientes</Text>
                        {clientSearchResults.map((client) => (
                          <TouchableOpacity
                            key={client.id}
                            style={styles.searchResultRow}
                            onPress={() => handleSelectSearchClient(client)}
                            activeOpacity={0.7}
                          >
                            <Ionicons name="storefront-outline" size={16} color={COLORS.textMuted} />
                            <View style={styles.searchResultBody}>
                              <Text style={styles.searchResultText} numberOfLines={1}>
                                {client.name}
                              </Text>
                              <Text style={styles.searchResultSubtext} numberOfLines={1}>
                                {client.city}
                              </Text>
                            </View>
                          </TouchableOpacity>
                        ))}
                      </>
                    )}
                  </>
                )}
              </View>
            )}
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
            <TouchableOpacity style={styles.mapActionBtn} onPress={handleRefreshMap} activeOpacity={0.7}>
              {refreshingMap ? (
                <ActivityIndicator size="small" color={COLORS.primary} />
              ) : (
                <Ionicons name="refresh-outline" size={22} color={COLORS.primary} />
              )}
            </TouchableOpacity>
            <TouchableOpacity style={styles.mapActionBtn} onPress={handleCenterMap} activeOpacity={0.7}>
              <Ionicons name="locate-outline" size={22} color={COLORS.primary} />
            </TouchableOpacity>
            {/* {canManageClients && (
              <TouchableOpacity style={styles.mapActionBtn} onPress={() => openNewClient()} activeOpacity={0.7}>
                <Ionicons name="add" size={22} color={COLORS.primary} />
              </TouchableOpacity>
            )} */}
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
          showCategoryBadges={userCategories.length > 1}
          topInset={citySheetTopInset}
          highlightedClientId={highlightedClientId}
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
  searchResults: {
    marginTop: 6,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.surfaceBorder,
    paddingVertical: SPACING.xs,
    maxHeight: 320,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  searchResultsEmpty: {
    color: COLORS.textMuted,
    fontSize: FONTS.sizes.sm,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  searchResultsLabel: {
    color: COLORS.textMuted,
    fontSize: FONTS.sizes.xs,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.sm,
    paddingBottom: 4,
  },
  searchResultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
  },
  searchResultBody: { flex: 1 },
  searchResultText: {
    color: COLORS.textPrimary,
    fontSize: FONTS.sizes.md,
  },
  searchResultSubtext: {
    color: COLORS.textMuted,
    fontSize: FONTS.sizes.xs,
    marginTop: 1,
  },
  collectionContainer: {
    marginTop: 6,
    marginHorizontal: 12,
  },
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
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
    justifyContent: 'flex-end',
    alignItems: 'flex-end',
    gap: SPACING.sm,
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
