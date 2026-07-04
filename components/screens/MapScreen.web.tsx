import React, { useCallback, useMemo, useRef, useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ActivityIndicator, Modal, Pressable } from 'react-native';
import BottomSheet from '@gorhom/bottom-sheet';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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

import { CityGeoData, CityStatus } from '../../types';
import { COLORS, FONTS, RADIUS, SPACING, STATUS_COLORS } from '../../constants/colors';

const STATUS_LABELS: Record<CityStatus, string> = {
  all: 'Todos compraram',
  partial: 'Compras parciais',
  none: 'Nenhum comprou',
  'no-clients': 'Sem clientes',
};

/**
 * O mapa nativo (react-native-maps) não roda no navegador — na web mostramos
 * a mesma navegação por cidade em formato de lista.
 */
export default function MapScreenWeb() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const bottomSheetRef = useRef<BottomSheet>(null);
  const [search, setSearch] = useState('');
  const [selectedCity, setSelectedCity] = useState<CityGeoData | null>(null);
  const [selectedCollectionId, setSelectedCollectionId] = useState<string | null>(null);
  const [showCollectionPicker, setShowCollectionPicker] = useState(false);

  const { user, can: canDo } = useAuth();
  const {
    categories: userCategories,
    filter: categoryFilter,
    setFilter: setCategoryFilter,
    effectiveFilter,
    allowedCategoryIds,
  } = useCategoryFilter();
  const canManageClients = canDo('manage_clients');
  const { cities, loading: geoLoading, error: geoError } = useGeoJSON();
  const { clients } = useClients();
  const { collections } = useCollections();
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

  const activeCollectionId = selectedCollectionId || visibleCollections[0]?.id || null;
  const activeCollection = visibleCollections.find((c) => c.id === activeCollectionId) || null;

  const { getCityStatus } = useCityStatus(filteredClients, purchases, activeCollectionId);

  const filteredCities = useMemo(() => {
    const withClients = cities.filter(
      (c) => filteredClients.some((cl) => cl.cityCode === c.code)
    );
    const base = withClients.length > 0 ? withClients : cities;
    if (!search.trim()) return base;
    const q = search.toLowerCase();
    return base.filter((c) => c.name.toLowerCase().includes(q));
  }, [cities, filteredClients, search]);

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

  const headerTop = insets.top + 4;
  const selectedCityClients = selectedCity
    ? filteredClients.filter((c) => c.cityCode === selectedCity.code)
    : [];
  const selectedCityStatus = selectedCity ? getCityStatus(selectedCity.code) : 'no-clients';

  if (geoError && cities.length === 0) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorIcon}>🌐</Text>
        <Text style={styles.errorTitle}>Erro ao carregar cidades</Text>
        <Text style={styles.errorText}>{geoError}</Text>
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={styles.root}>
      <View style={styles.container}>
        <View style={[styles.topUI, { paddingTop: headerTop }]}>
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

        <View style={[styles.listWrap, { paddingTop: headerTop + 96 }]}>
          {geoLoading && cities.length === 0 ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="small" color={COLORS.primary} />
              <Text style={styles.loadingText}>Carregando cidades...</Text>
            </View>
          ) : (
            filteredCities.map((city) => {
              const status = getCityStatus(city.code);
              const clientCount = filteredClients.filter((c) => c.cityCode === city.code).length;
              return (
                <TouchableOpacity
                  key={city.code}
                  style={styles.cityRow}
                  activeOpacity={0.7}
                  onPress={() => handleCityPress(city)}
                >
                  <View style={styles.cityRowLeft}>
                    <View style={[styles.statusDot, { backgroundColor: STATUS_COLORS[status] }]} />
                    <View>
                      <Text style={styles.cityName}>{city.name}</Text>
                      <Text style={styles.cityMeta}>
                        {clientCount === 0
                          ? 'Sem clientes'
                          : `${clientCount} cliente${clientCount !== 1 ? 's' : ''} · ${STATUS_LABELS[status]}`}
                      </Text>
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
                </TouchableOpacity>
              );
            })
          )}
        </View>

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
  root: { flex: 1, backgroundColor: COLORS.backgroundSubtle },
  container: { flex: 1 },
  topUI: {
    zIndex: 10,
    backgroundColor: COLORS.backgroundSubtle,
    paddingBottom: SPACING.sm,
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
  listWrap: {
    flex: 1,
    paddingHorizontal: SPACING.lg,
  },
  loadingBox: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.xxl,
  },
  loadingText: { color: COLORS.textSecondary, fontSize: FONTS.sizes.sm },
  cityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.surfaceBorder,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    marginBottom: SPACING.sm,
  },
  cityRowLeft: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  cityName: { color: COLORS.textPrimary, fontSize: FONTS.sizes.md, fontWeight: '600' },
  cityMeta: { color: COLORS.textMuted, fontSize: FONTS.sizes.xs, marginTop: 2 },
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
