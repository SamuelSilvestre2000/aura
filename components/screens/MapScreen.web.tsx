import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ActivityIndicator, Modal, Pressable, ScrollView } from 'react-native';
import BottomSheet from '@gorhom/bottom-sheet';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MapContainer, TileLayer, Polygon, CircleMarker, useMap } from 'react-leaflet';
import type { Map as LeafletMapInstance } from 'leaflet';
import 'leaflet/dist/leaflet.css';

import { getScreenBottomInset, PANEL_TOP_INSET } from '../../utils/safeArea';
import { getTopBarInset, TOP_BAR_CONTENT_HEIGHT } from '../TopTabBar';
import { useGeoJSON } from '../../hooks/useGeoJSON';
import { useClients } from '../../hooks/useClients';
import { useCollections } from '../../hooks/useCollections';
import { usePurchases } from '../../hooks/usePurchases';
import { useCityStatus } from '../../hooks/useCityStatus';
import { useAuth } from '../../hooks/useAuth';
import { useCategoryFilter } from '../../hooks/useCategoryFilter';
import { useIsDesktop } from '../../hooks/useIsDesktop';
import { usePanelNav } from '../../hooks/usePanelNav';
import { useSetTopBarSlots } from '../../contexts/TopBarSlots';
import {
  useDesktopPanel,
  usePublishCityContent,
  usePublishSearchContent,
} from '../../contexts/DesktopPanel';
import {
  filterClientsByCategory,
  filterCollectionsByCategory,
} from '../../utils/categoryFilter';
import { isCollectionClosed } from '../../utils/collectionStatus';
import { getVigenteCollectionId } from '../../utils/collectionVigente';
import {
  findCollectionTypeYearSibling,
  findMostRecentCollectionInSeries,
  getCollectionYear,
} from '../../utils/collectionYears';
import { CategoryPickerPill } from '../CategoryPickerPill';

import { SearchBar } from '../SearchBar';
import { PanelCloseButton } from '../PanelCloseButton';
import { CitySheet } from '../BottomSheet/CitySheet';
import { CityDetailsPanel } from '../BottomSheet/CityDetailsPanel';
import { Ionicons } from '@expo/vector-icons';
import SaleScreen from '../../app/sale/[clientId]';
import NewClientScreen from '../../app/client/new';

import { CityGeoData } from '../../types';
import {
  COLORS,
  FONTS,
  HIT_TARGET,
  MATERIALS,
  RADIUS,
  SPACING,
  STATUS_COLORS,
  STATUS_FILL_OPACITY,
  STATUS_STROKE,
  PIAUI_REGION,
} from '../../constants/colors';
import { clientInitials, displayClientName } from '../../utils/clientName';
import { getAvatarColor } from '../../utils/avatarColor';
import { OUTER_BOUNDS } from '../../constants/mapBounds';

/** `backdropFilter` não existe no ViewStyle do React Native — só roda na web (isDesktop já exige Platform.OS === 'web'), então nativo nunca chega a montar isto. */
const WEB_BLUR = {
  backdropFilter: MATERIALS.thin.blur,
  WebkitBackdropFilter: MATERIALS.thin.blur,
} as any;

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
  const insets = useSafeAreaInsets();
  const isDesktop = useIsDesktop();
  const nav = usePanelNav();
  const { panel, openPanel, closePanel } = useDesktopPanel();
  const bottomSheetRef = useRef<BottomSheet>(null);
  const mapRef = useRef<LeafletMapInstance | null>(null);
  const [search, setSearch] = useState('');
  const [selectedCity, setSelectedCity] = useState<CityGeoData | null>(null);
  const [highlightedClientId, setHighlightedClientId] = useState<string | null>(null);
  const [selectedCollectionId, setSelectedCollectionId] = useState<string | null>(null);
  const [showCollectionPicker, setShowCollectionPicker] = useState(false);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [locating, setLocating] = useState(false);
  const [refreshingMap, setRefreshingMap] = useState(false);
  const [topUIHeight, setTopUIHeight] = useState(0);
  const [bottomUIHeight, setBottomUIHeight] = useState(0);

  /**
   * O Leaflet não percebe sozinho quando o container dele muda de tamanho
   * (ex: painel lateral do desktop abrindo/fechando e empurrando o mapa) —
   * sem isso os tiles ficam cortados/desalinhados até o usuário redimensionar
   * a janela manualmente.
   */
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const container = map.getContainer();
    const observer = new ResizeObserver(() => {
      map.invalidateSize();
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  const { can: canDo } = useAuth();
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
  const {
    purchases,
    refresh: refreshPurchases,
    getPurchaseStatus,
    getSaleForClientCollection,
  } = usePurchases();

  const filteredClients = useMemo(
    () => filterClientsByCategory(clients, effectiveFilter, allowedCategoryIds),
    [clients, effectiveFilter, allowedCategoryIds]
  );

  const visibleCollections = useMemo(
    () => filterCollectionsByCategory(collections, effectiveFilter, allowedCategoryIds),
    [collections, effectiveFilter, allowedCategoryIds]
  );

  useEffect(() => {
    void refreshCollections(effectiveFilter);
  }, [effectiveFilter, refreshCollections]);

  /**
   * Ao voltar para o mapa (ex: depois de criar um cliente ou sair de outra tela),
   * os hooks de dados desta tela não recarregam sozinhos — cada tela tem seu
   * próprio estado local. Sem isso o mapa fica com dados desatualizados e o
   * Leaflet, cujo container ficou fora de tela, precisa recalcular o tamanho
   * (senão os tiles somem/o mapa parece travado).
   */
  useFocusEffect(
    useCallback(() => {
      void refreshClients();
      void refreshCollections(effectiveFilter);
      void refreshPurchases();
      requestAnimationFrame(() => mapRef.current?.invalidateSize());
    }, [refreshClients, refreshCollections, refreshPurchases, effectiveFilter])
  );

  const defaultCollectionId =
    getVigenteCollectionId(visibleCollections) ||
    visibleCollections.find((c) => !isCollectionClosed(c))?.id ||
    visibleCollections[0]?.id ||
    null;
  const defaultCollection = visibleCollections.find((c) => c.id === defaultCollectionId) || null;
  // Sem seleção manual, abre sempre no ano mais novo já cadastrado da mesma
  // temporada — não só na coleção marcada como vigente.
  const mostRecentDefaultCollection = defaultCollection
    ? findMostRecentCollectionInSeries(collections, defaultCollection)
    : null;
  const isMostRecentDefaultVisible =
    !!mostRecentDefaultCollection &&
    visibleCollections.some((c) => c.id === mostRecentDefaultCollection.id);

  const activeCollectionId =
    selectedCollectionId ||
    (isMostRecentDefaultVisible ? mostRecentDefaultCollection!.id : defaultCollectionId);
  const activeCollection = visibleCollections.find((c) => c.id === activeCollectionId) || null;

  // Segmentos em posição fixa: o ano mais novo da série sempre à esquerda,
  // o ano anterior sempre à direita — só a coleção destacada (azul) muda.
  const currentYearCollection = activeCollection
    ? findMostRecentCollectionInSeries(collections, activeCollection)
    : null;
  const previousYearCollection = currentYearCollection
    ? findCollectionTypeYearSibling(collections, currentYearCollection, -1)
    : null;
  const yearToggleSegments =
    currentYearCollection && previousYearCollection
      ? [currentYearCollection, previousYearCollection]
      : null;

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

  const handleCityPress = useCallback(
    (city: CityGeoData) => {
      setSelectedCity(city);
      setHighlightedClientId(null);
      if (isDesktop) {
        openPanel('city');
      } else {
        bottomSheetRef.current?.snapToIndex(0);
      }
    },
    [isDesktop, openPanel]
  );

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
      nav.open(
        `sale-${clientId}-${activeCollectionId}`,
        <SaleScreen clientId={clientId} collectionId={activeCollectionId} />,
        '/sale/[clientId]',
        { clientId, collectionId: activeCollectionId }
      );
    },
    [activeCollectionId, nav]
  );

  const openNewClient = useCallback(
    (city?: CityGeoData | null) => {
      if (city) {
        const params = {
          city: city.name,
          cityCode: city.code,
          lat: String(city.centroid[1]),
          lng: String(city.centroid[0]),
        };
        nav.open(`client-new-${city.code}`, <NewClientScreen {...params} />, '/client/new', params);
      } else {
        nav.open('client-new', <NewClientScreen />, '/client/new');
      }
    },
    [nav]
  );

  const handleAddClient = useCallback(() => {
    const city = selectedCity;
    bottomSheetRef.current?.close();
    openNewClient(city);
  }, [selectedCity, openNewClient]);

  const handleCloseSheet = useCallback(() => {
    setSelectedCity(null);
    setHighlightedClientId(null);
    closePanel();
  }, [closePanel]);

  /**
   * No desktop o painel de cidade não é fechado só pelo próprio X — trocar de
   * aba (Mapa/Clientes/Coleções/Conta) também fecha, e sem isso o mapa
   * ficaria com uma cidade "presa" selecionada (botões flutuantes escondidos)
   * mesmo depois do painel sumir.
   */
  useEffect(() => {
    if (isDesktop && panel !== 'city' && selectedCity) {
      setSelectedCity(null);
      setHighlightedClientId(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [panel, isDesktop]);

  const handleZoomIn = useCallback(() => {
    mapRef.current?.zoomIn();
  }, []);

  const handleZoomOut = useCallback(() => {
    mapRef.current?.zoomOut();
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

  const headerTop = getTopBarInset(insets);
  const bottomOffset = getScreenBottomInset(insets, SPACING.sm);
  const selectedCityClients = selectedCity
    ? filteredClients.filter((c) => c.cityCode === selectedCity.code)
    : [];
  const selectedCityStatus = selectedCity ? getCityStatus(selectedCity.code) : 'no-clients';
  const hasCities = cities.length > 0;

  const cityPanelNode = (
    <CityDetailsPanel
      selectedCity={selectedCity}
      cityStatus={selectedCityStatus}
      clients={selectedCityClients}
      activeCollection={activeCollection}
      onTogglePurchase={handleTogglePurchase}
      getPurchaseStatus={getPurchaseStatus}
      getSaleForClientCollection={getSaleForClientCollection}
      onAddClient={handleAddClient}
      onClose={handleCloseSheet}
      canManageClients={canManageClients}
      showCategoryBadges={userCategories.length > 1}
      highlightedClientId={highlightedClientId}
    />
  );

  usePublishCityContent(cityPanelNode, isDesktop);

  const searchResultsContent = !showSearchResults ? null : citySearchResults.length === 0 &&
    clientSearchResults.length === 0 ? (
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
              <View style={styles.searchResultIcon}>
                <Ionicons name="location" size={17} color={COLORS.primary} />
              </View>
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
              <View
                style={[
                  styles.searchResultAvatar,
                  { backgroundColor: getAvatarColor(client.id) },
                ]}
              >
                <Text style={styles.searchResultAvatarText}>
                  {clientInitials(displayClientName(client))}
                </Text>
              </View>
              <View style={styles.searchResultBody}>
                <Text style={styles.searchResultText} numberOfLines={1}>
                  {displayClientName(client)}
                </Text>
                <Text style={styles.searchResultSubtext} numberOfLines={1}>
                  {client.city}, PI
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </>
      )}
    </>
  );

  const searchPanelNode = (
    <View style={styles.searchPanel}>
      {/*
        Mesmo cabeçalho do painel de cidade: nome da tela em corpo grande,
        alinhado à esquerda, sem barra de navegação.
      */}
      <View style={[styles.searchPanelTitleRow, { paddingTop: PANEL_TOP_INSET }]}>
        <Text style={styles.searchPanelTitle}>Buscar</Text>
        <PanelCloseButton />
      </View>
      <View style={styles.searchPanelInputWrap}>
        <SearchBar
          value={search}
          onChangeText={setSearch}
          onClear={() => setSearch('')}
          placeholder="Pesquisar cidade ou cliente..."
        />
      </View>
      <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        {showSearchResults ? (
          searchResultsContent
        ) : (
          <Text style={styles.searchPanelHint}>Digite para encontrar uma cidade ou cliente</Text>
        )}
      </ScrollView>
    </View>
  );

  usePublishSearchContent(searchPanelNode, isDesktop);

  const collectionPillNode = !activeCollection ? null : visibleCollections.length > 1 ? (
    <TouchableOpacity
      style={[styles.collectionPill, isDesktop && styles.pillGlass]}
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
    <View style={[styles.collectionPill, isDesktop && styles.pillGlass]}>
      <Ionicons name="albums-outline" size={14} color={COLORS.primary} />
      <Text style={styles.collectionPillText} numberOfLines={1}>
        {activeCollection.name}
      </Text>
    </View>
  );

  const yearTogglePillNode = yearToggleSegments ? (
    <View style={[styles.yearTogglePill, isDesktop && styles.pillGlass]}>
      {yearToggleSegments.map((seg) => {
        const isActive = seg.id === activeCollection?.id;
        return (
          <TouchableOpacity
            key={seg.id}
            style={[styles.yearToggleSegment, isActive && styles.yearToggleSegmentActive]}
            onPress={() => setSelectedCollectionId(seg.id)}
            activeOpacity={0.75}
            accessibilityLabel={`Ver ${seg.name}`}
          >
            <Text
              style={[
                styles.yearToggleSegmentText,
                isActive && styles.yearToggleSegmentTextActive,
              ]}
            >
              {getCollectionYear(seg)}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  ) : null;

  const categoryPillNode = (
    <CategoryPickerPill
      categories={userCategories}
      value={categoryFilter}
      onChange={setCategoryFilter}
      style={[styles.toolbarPillShadow, isDesktop && styles.pillGlass]}
    />
  );

  const desktopTogglesNode = activeCollection ? (
    <View style={styles.pillRow}>
      {collectionPillNode}
      {yearTogglePillNode}
      {categoryPillNode}
    </View>
  ) : null;

  useSetTopBarSlots(isDesktop ? desktopTogglesNode : null);

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
            zoomControl={false}
            style={{ width: '100%', height: '100%' }}
          >
            {/*
              Basemap claro e dessaturado: o dado desta tela sao os poligonos de
              status, e o tile padrao do OSM (verdes e beges saturados) disputa
              atencao com eles. Servico externo de uso justo, atribuicao abaixo.
            */}
            <TileLayer
              url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
              subdomains={['a', 'b', 'c', 'd']}
              maxZoom={20}
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
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
                      weight: STATUS_STROKE[status].width,
                      dashArray: STATUS_STROKE[status].dash?.join(' '),
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
          <View style={[styles.initialLoadingBanner, { top: Math.max(topUIHeight, headerTop) + SPACING.sm }]}>
            <ActivityIndicator size="small" color={COLORS.primary} />
            <Text style={styles.initialLoadingText}>Baixando mapa do Piauí...</Text>
          </View>
        )}

        {geoRefreshing && hasCities && (
          <View style={[styles.refreshBanner, { top: Math.max(topUIHeight, headerTop) + SPACING.sm }]}>
            <ActivityIndicator size="small" color={COLORS.primary} />
            <Text style={styles.refreshBannerText}>Atualizando dados...</Text>
          </View>
        )}

        <View
          style={[styles.topUI, { paddingTop: headerTop }]}
          pointerEvents="box-none"
          onLayout={(e) => setTopUIHeight(e.nativeEvent.layout.height)}
        >
          {!isDesktop && activeCollection && (
            <View style={styles.collectionContainer}>
              <View style={styles.pillRow}>
                {collectionPillNode}
                {categoryPillNode}
              </View>
            </View>
          )}
        </View>

        {!selectedCity && (
          <View
            style={[styles.bottomControls, { paddingBottom: bottomUIHeight + SPACING.sm }]}
            pointerEvents="box-none"
          >
            <View style={styles.zoomControl}>
              <TouchableOpacity style={styles.zoomButton} onPress={handleZoomIn} activeOpacity={0.7}>
                <Ionicons name="add" size={20} color={COLORS.primary} />
              </TouchableOpacity>
              <View style={styles.zoomDivider} />
              <TouchableOpacity style={styles.zoomButton} onPress={handleZoomOut} activeOpacity={0.7}>
                <Ionicons name="remove" size={20} color={COLORS.primary} />
              </TouchableOpacity>
            </View>
            <TouchableOpacity style={styles.mapActionBtn} onPress={handleRefreshMap} activeOpacity={0.7}>
              {refreshingMap ? (
                <ActivityIndicator size="small" color={COLORS.primary} />
              ) : (
                <Ionicons name="refresh-outline" size={22} color={COLORS.primary} />
              )}
            </TouchableOpacity>
            <TouchableOpacity style={styles.mapActionBtn} onPress={handleLocateMe} activeOpacity={0.7}>
              {locating ? (
                <ActivityIndicator size="small" color={COLORS.primary} />
              ) : (
                <Ionicons name="locate-outline" size={22} color={COLORS.primary} />
              )}
            </TouchableOpacity>
          </View>
        )}

        {!isDesktop && (
          <View
            style={[styles.bottomSearchWrapper, { paddingBottom: bottomOffset }]}
            pointerEvents="box-none"
            onLayout={(e) => setBottomUIHeight(e.nativeEvent.layout.height)}
          >
            <View style={styles.searchAnchor}>
              {showSearchResults && (
                <View style={styles.searchResults} pointerEvents="auto">
                  {searchResultsContent}
                </View>
              )}

              <SearchBar
                variant="map"
                value={search}
                onChangeText={setSearch}
                onClear={() => setSearch('')}
                placeholder="Pesquisar cidade ou cliente..."
              />
            </View>
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
                const closed = isCollectionClosed(col);
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
                        name={closed ? 'lock-closed' : active ? 'albums' : 'albums-outline'}
                        size={18}
                        color={active ? COLORS.primary : COLORS.textMuted}
                      />
                      <Text
                        style={[
                          styles.pickerRowText,
                          active && styles.pickerRowTextActive,
                          closed && styles.pickerRowTextClosed,
                        ]}
                      >
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

        {!isDesktop && (
          <CitySheet
            bottomSheetRef={bottomSheetRef}
            selectedCity={selectedCity}
            cityStatus={selectedCityStatus}
            clients={selectedCityClients}
            activeCollection={activeCollection}
            onTogglePurchase={handleTogglePurchase}
            getPurchaseStatus={getPurchaseStatus}
            getSaleForClientCollection={getSaleForClientCollection}
            onAddClient={handleAddClient}
            onClose={handleCloseSheet}
            canManageClients={canManageClients}
            showCategoryBadges={userCategories.length > 1}
            highlightedClientId={highlightedClientId}
          />
        )}
      </View>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.mapBackground },
  container: { flex: 1 },
  topUI: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  bottomSearchWrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 12,
    paddingTop: SPACING.sm,
    zIndex: 10,
  },
  searchAnchor: { position: 'relative' },
  searchResults: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: '100%',
    marginBottom: 6,
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
  searchPanel: {
    flex: 1,
    // Transparente (não translúcido) — só é usado dentro do painel flutuante
    // do desktop, que já é translúcido com blur; uma segunda camada
    // translúcida por cima somaria as opacidades e ficaria quase opaco.
    backgroundColor: 'transparent',
    borderRadius: RADIUS.xxl,
    overflow: 'hidden',
  },
  searchPanelTitleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: SPACING.md,
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.sm,
  },
  searchPanelTitle: {
    ...FONTS.text.largeTitle,
    color: COLORS.textPrimary,
  },
  searchPanelInputWrap: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.sm,
  },
  searchPanelHint: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.md,
    textAlign: 'center',
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.xl,
  },
  searchResultsEmpty: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.md,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  searchResultsLabel: {
    ...FONTS.text.sectionHeader,
    color: COLORS.textSecondary,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    paddingBottom: 4,
  },
  searchResultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    minHeight: HIT_TARGET,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
  },
  searchResultIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.fill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchResultAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchResultAvatarText: {
    color: '#FFFFFF',
    fontSize: FONTS.sizes.xs,
    fontWeight: '600',
  },
  searchResultBody: { flex: 1, minWidth: 0 },
  searchResultText: {
    color: COLORS.textPrimary,
    fontSize: FONTS.sizes.lg,
  },
  searchResultSubtext: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.sm,
    marginTop: 1,
  },
  collectionContainer: { marginTop: 6, marginHorizontal: 12 },
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  // Só no desktop: mesmo material de vidro da rail/painel (translúcido + blur),
  // no lugar do branco opaco — substitui backgroundColor/borderColor do pill.
  pillGlass: {
    backgroundColor: MATERIALS.thin.background,
    borderColor: COLORS.floatingBorder,
    ...WEB_BLUR,
  },
  // Mesmo padrão visual dos botões "Clientes"/"Coleções" da TopTabBar:
  // fundo branco, borda hairline cinza, sombra suave, altura fixa, full rounded.
  toolbarPillShadow: {
    height: TOP_BAR_CONTENT_HEIGHT,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 6,
  },
  collectionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    height: TOP_BAR_CONTENT_HEIGHT,
    gap: 6,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.surfaceBorder,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 6,
  },
  collectionPillText: {
    color: COLORS.textPrimary,
    fontSize: FONTS.sizes.sm,
    fontWeight: '500',
    maxWidth: 180,
  },
  yearTogglePill: {
    flexDirection: 'row',
    alignSelf: 'flex-start',
    alignItems: 'center',
    height: TOP_BAR_CONTENT_HEIGHT,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.full,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.surfaceBorder,
    padding: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 6,
  },
  yearToggleSegment: {
    height: '100%',
    paddingHorizontal: SPACING.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: RADIUS.full,
  },
  yearToggleSegmentActive: {
    backgroundColor: COLORS.fill,
  },
  yearToggleSegmentText: {
    color: COLORS.textMuted,
    fontSize: FONTS.sizes.sm,
    fontWeight: '600',
  },
  yearToggleSegmentTextActive: {
    color: COLORS.textPrimary,
    fontWeight: '700',
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
    flexDirection: 'column',
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
  },
  /** Pill único (+ em cima, − embaixo) estilo Apple Maps, nas cores do app. */
  zoomControl: {
    width: 44,
    borderRadius: 14,
    backgroundColor: COLORS.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.surfaceBorder,
    overflow: 'hidden',
  },
  zoomButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  zoomDivider: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: 8,
    backgroundColor: COLORS.surfaceBorder,
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
  pickerRowTextClosed: { color: COLORS.textMuted },
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
