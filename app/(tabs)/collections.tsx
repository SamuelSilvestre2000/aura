import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  Pressable,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getScreenTopInset } from '../../utils/safeArea';
import { useCollections } from '../../hooks/useCollections';
import { useClients } from '../../hooks/useClients';
import { usePurchases } from '../../hooks/usePurchases';
import { useAuth } from '../../hooks/useAuth';
import { useCategoryFilter } from '../../hooks/useCategoryFilter';
import { CategoryPickerPill } from '../../components/CategoryPickerPill';
import { CategoryPill } from '../../components/CategoryPill';
import {
  filterClientsByCategory,
  filterCollectionsByCategory,
  categoryLabel,
} from '../../utils/categoryFilter';
import { Collection } from '../../types';
import { COLORS, FONTS, RADIUS, SPACING } from '../../constants/colors';
import { getTabBarBottomInset } from '../../components/CustomTabBar';
import { NotionHeader } from '../../components/NotionHeader';
import { PullToRefresh } from '../../components/PullToRefresh';
import { formatPeriodBR } from '../../utils/dates';
import { formatBRL } from '../../utils/money';
import { getCollectionProgress, progressColor, progressColorOnTintedBg } from '../../utils/collectionStats';
import {
  filterCollectionsByYear,
  getAvailableCollectionYears,
  getCollectionYear,
} from '../../utils/collectionYears';
import { getVigenteCollectionId } from '../../utils/collectionVigente';
import { isCollectionClosed } from '../../utils/collectionStatus';

const CURRENT_YEAR = new Date().getFullYear();

export default function CollectionsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { can: canDo, isAdmin } = useAuth();
  const {
    categories: userCategories,
    filter: categoryFilter,
    setFilter: setCategoryFilter,
    effectiveFilter,
    allowedCategoryIds,
  } = useCategoryFilter();
  const canManageCollections = canDo('manage_collections');
  const { collections, loading, refresh, activeCollection } = useCollections();
  const { clients, refresh: refreshClients } = useClients();
  const { purchases, refresh: refreshPurchases } = usePurchases();
  const [selectedYear, setSelectedYear] = useState(CURRENT_YEAR);
  const [yearInitialized, setYearInitialized] = useState(false);
  const [showYearPicker, setShowYearPicker] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const vigenteCollectionId = useMemo(
    () => getVigenteCollectionId(collections, activeCollection?.id ?? null),
    [collections, activeCollection?.id]
  );

  /**
   * Por padrão a tela abre no ano corrente, mas a coleção vigente pode ter um
   * período em outro ano (ex: coleção de verão criada com datas do ano
   * seguinte) — nesse caso ela ficaria escondida do filtro sem essa correção,
   * mesmo sendo a coleção ativa mostrada na tela inicial.
   */
  useEffect(() => {
    if (yearInitialized || collections.length === 0) return;
    const vigente = collections.find((c) => c.id === vigenteCollectionId);
    if (vigente) setSelectedYear(getCollectionYear(vigente));
    setYearInitialized(true);
  }, [collections, vigenteCollectionId, yearInitialized]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([refresh(), refreshPurchases(), refreshClients()]);
    } finally {
      setRefreshing(false);
    }
  };

  const availableYears = useMemo(
    () => getAvailableCollectionYears(collections),
    [collections]
  );

  const filteredCollections = useMemo(
    () =>
      filterCollectionsByYear(
        filterCollectionsByCategory(collections, effectiveFilter, allowedCategoryIds),
        selectedYear
      ),
    [collections, effectiveFilter, allowedCategoryIds, selectedYear]
  );

  const scopedClients = useMemo(
    () => filterClientsByCategory(clients, effectiveFilter, allowedCategoryIds),
    [clients, effectiveFilter, allowedCategoryIds]
  );

  const listBottom = getTabBarBottomInset(insets);

  useFocusEffect(
    useCallback(() => {
      refresh(effectiveFilter);
      refreshPurchases();
      refreshClients();
    }, [refresh, refreshPurchases, refreshClients, effectiveFilter])
  );

  const openCreateScreen = () => router.push('/collection/new');

  const openCollection = (col: Collection) => {
    router.push({ pathname: '/collection/[id]', params: { id: col.id } });
  };

  const getProgress = useCallback(
    (collectionId: string) => {
      const stats = getCollectionProgress(collectionId, scopedClients, purchases);
      return {
        percent: stats.clientPercent,
        bought: stats.bought,
        total: stats.total,
        cities: stats.completedCities,
        totalCities: stats.totalCities,
      };
    },
    [scopedClients, purchases]
  );

  const showCategoryBadges = userCategories.length > 1;

  const renderCollection = ({ item, index }: { item: Collection; index: number }) => {
    const progress = getProgress(item.id);
    const soldAmount = item.mySoldAmount ?? 0;
    const goalAmount = item.myGoalAmount ?? 0;
    const hasGoal = goalAmount > 0;
    const remaining = Math.max(0, goalAmount - soldAmount);
    const salesPercent = hasGoal
      ? Math.min(100, Math.round((soldAmount / goalAmount) * 100))
      : 0;
    const period =
      item.startDate && item.endDate
        ? formatPeriodBR(item.startDate, item.endDate)
        : null;
    const isClosed = isCollectionClosed(item);
    const isVigente = !isClosed && item.id === vigenteCollectionId;
    const resolveProgressColor = (percent: number) =>
      isVigente ? progressColorOnTintedBg(percent) : progressColor(percent);
    const salesFillColor = resolveProgressColor(salesPercent);

    return (
      <TouchableOpacity
        key={item.id}
        style={[
          styles.row,
          index > 0 && styles.rowBorder,
          isVigente && styles.rowVigente,
          isVigente && styles.rowVigenteClip,
          isClosed && styles.rowClosed,
        ]}
        onPress={() => openCollection(item)}
        activeOpacity={0.7}
      >
        {isVigente ? <View style={styles.vigenteAccent} pointerEvents="none" /> : null}

        <View style={styles.rowIcon}>
          <Ionicons
            name={isVigente ? 'albums' : isClosed ? 'lock-closed-outline' : 'albums-outline'}
            size={20}
            color={isVigente ? COLORS.success : isClosed ? COLORS.textMuted : COLORS.textSecondary}
          />
        </View>

        <View style={styles.rowBody}>
          <View style={styles.rowTop}>
            <View style={styles.rowTitleWrap}>
              <Text style={styles.rowTitle} numberOfLines={1}>{item.name}</Text>
              {isVigente ? (
                <View style={styles.vigenteBadge}>
                  <Text style={styles.vigenteBadgeText}>Vigente</Text>
                </View>
              ) : isClosed ? (
                <View style={styles.closedBadge}>
                  <Text style={styles.closedBadgeText}>Fechada</Text>
                </View>
              ) : null}
            </View>
          </View>

          {period ? <Text style={styles.rowPeriod}>{period}</Text> : null}

          {showCategoryBadges ? (
            <CategoryPill
              label={categoryLabel(item.categoryId)}
              slug={item.categoryId?.replace('cat_', '')}
              compact
            />
          ) : null}

          {item.myGoalAmount != null && item.myGoalAmount > 0 ? (
            <Text style={styles.rowGoal}>Meta: {formatBRL(item.myGoalAmount)}</Text>
          ) : !isAdmin ? (
            <Text style={styles.rowGoalMuted}>Definir meta</Text>
          ) : null}

          {hasGoal ? (
            <Text style={styles.rowSales}>
              Vendido: {formatBRL(soldAmount)} · Faltam: {formatBRL(remaining)}
            </Text>
          ) : soldAmount > 0 ? (
            <Text style={styles.rowSales}>Vendido: {formatBRL(soldAmount)}</Text>
          ) : null}

          <Text style={styles.rowMeta}>
            {progress.bought}/{progress.total} clientes · {progress.cities}/{progress.totalCities} cidades
          </Text>

          {hasGoal ? (
            <View style={styles.progressRow}>
              <View style={[styles.progressTrack, isVigente && styles.progressTrackVigente]}>
                <View
                  style={[
                    styles.progressFill,
                    { width: `${salesPercent}%`, backgroundColor: salesFillColor },
                  ]}
                />
              </View>
              <Text style={[styles.progressPct, { color: salesFillColor }]}>
                Meta {salesPercent}%
              </Text>
            </View>
          ) : null}
        </View>

        <Ionicons name="chevron-forward" size={16} color={COLORS.textMuted} />
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={{ paddingTop: getScreenTopInset(insets) }}>
        <NotionHeader
          title="Coleções"
          showBorder
          compact
          rightAction={
            canManageCollections ? (
              <TouchableOpacity
                style={styles.newButton}
                onPress={openCreateScreen}
                activeOpacity={0.7}
                hitSlop={8}
              >
                <Text style={styles.newButtonText}>Adicionar</Text>
              </TouchableOpacity>
            ) : undefined
          }
        />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : collections.length === 0 ? (
        <View style={styles.emptyState}>
          <View style={styles.emptyIconWrap}>
            <Ionicons name="albums-outline" size={32} color={COLORS.textMuted} />
          </View>
          <Text style={styles.emptyTitle}>Nenhuma coleção</Text>
          <Text style={styles.emptySubtitle}>Crie sua primeira coleção de produtos</Text>
          {canManageCollections && (
            <TouchableOpacity
              style={styles.emptyButton}
              onPress={openCreateScreen}
              activeOpacity={0.85}
            >
              <Ionicons name="add" size={18} color="#fff" />
              <Text style={styles.emptyButtonText}>Criar coleção</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <PullToRefresh refreshing={refreshing} onRefresh={handleRefresh}>
        <ScrollView
          style={styles.listScroll}
          contentContainerStyle={{ paddingBottom: listBottom }}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.listHeader}>
            <View style={styles.pillRow}>
              {availableYears.length > 1 ? (
                <TouchableOpacity
                  style={styles.yearPill}
                  onPress={() => setShowYearPicker(true)}
                  activeOpacity={0.75}
                >
                  <Ionicons name="calendar-outline" size={14} color={COLORS.primary} />
                  <Text style={styles.yearPillText}>{selectedYear}</Text>
                  <Ionicons name="chevron-down" size={13} color={COLORS.textMuted} />
                </TouchableOpacity>
              ) : (
                <View style={styles.yearPillStatic}>
                  <Ionicons name="calendar-outline" size={14} color={COLORS.textMuted} />
                  <Text style={styles.yearPillTextStatic}>{selectedYear}</Text>
                </View>
              )}
              <CategoryPickerPill
                categories={userCategories}
                value={categoryFilter}
                onChange={setCategoryFilter}
              />
            </View>
            <Text style={styles.sectionLabel}>
              {filteredCollections.length}{' '}
              {filteredCollections.length === 1 ? 'coleção' : 'coleções'}
            </Text>
          </View>

          {filteredCollections.length === 0 ? (
            <View style={styles.yearEmptyState}>
              <Text style={styles.yearEmptyTitle}>Nenhuma coleção em {selectedYear}</Text>
              <Text style={styles.yearEmptySubtitle}>
                {availableYears.length > 1
                  ? 'Selecione outro ano para ver coleções anteriores.'
                  : 'As coleções cadastradas aparecerão aqui.'}
              </Text>
            </View>
          ) : (
            <View style={styles.cardList}>
              {filteredCollections.map((item, index) =>
                renderCollection({ item, index })
              )}
            </View>
          )}
        </ScrollView>
        </PullToRefresh>
      )}

      <Modal
        visible={showYearPicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowYearPicker(false)}
      >
        <Pressable style={styles.pickerOverlay} onPress={() => setShowYearPicker(false)}>
          <View style={styles.pickerSheet}>
            <View style={styles.pickerHandle} />
            <Text style={styles.pickerTitle}>Ano</Text>
            {availableYears.map((year, index) => {
              const active = year === selectedYear;
              return (
                <TouchableOpacity
                  key={year}
                  style={[styles.pickerRow, index > 0 && styles.pickerRowBorder]}
                  onPress={() => {
                    setSelectedYear(year);
                    setShowYearPicker(false);
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.pickerRowText, active && styles.pickerRowTextActive]}>
                    {year}
                    {year === CURRENT_YEAR ? ' (atual)' : ''}
                  </Text>
                  {active && <Ionicons name="checkmark" size={18} color={COLORS.primary} />}
                </TouchableOpacity>
              );
            })}
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.backgroundSubtle,
  },
  newButton: {
    paddingVertical: 6,
    paddingHorizontal: SPACING.xs,
    backgroundColor: 'transparent',
  },
  newButtonText: {
    color: COLORS.primary,
    fontWeight: '600',
    fontSize: FONTS.sizes.sm,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listScroll: {
    flex: 1,
  },
  listHeader: {
    gap: SPACING.sm,
    marginTop: SPACING.xs,
    marginBottom: SPACING.sm,
    marginHorizontal: SPACING.lg,
    paddingHorizontal: SPACING.xs,
  },
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  yearPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.md,
    paddingVertical: 6,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.surfaceBorder,
  },
  yearPillStatic: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
  },
  yearPillText: {
    color: COLORS.textPrimary,
    fontSize: FONTS.sizes.sm,
    fontWeight: '600',
  },
  yearPillTextStatic: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.sm,
    fontWeight: '600',
  },
  sectionLabel: {
    color: COLORS.textMuted,
    fontSize: FONTS.sizes.xs,
    fontWeight: '600',
    letterSpacing: 0.6,
  },
  yearEmptyState: {
    alignItems: 'center',
    paddingHorizontal: SPACING.xxl,
    paddingVertical: SPACING.xxl,
    gap: SPACING.sm,
  },
  yearEmptyTitle: {
    color: COLORS.textPrimary,
    fontSize: FONTS.sizes.lg,
    fontWeight: '600',
    textAlign: 'center',
  },
  yearEmptySubtitle: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.sm,
    textAlign: 'center',
    lineHeight: 20,
  },
  cardList: {
    alignSelf: 'stretch',
    marginHorizontal: SPACING.lg,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.surfaceBorder,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.md,
    paddingVertical: SPACING.lg,
    paddingHorizontal: SPACING.lg,
    backgroundColor: COLORS.surface,
    position: 'relative',
  },
  rowVigente: {
    backgroundColor: COLORS.successBg,
  },
  rowVigenteClip: {
    overflow: 'hidden',
  },
  rowClosed: {
    opacity: 0.72,
  },
  vigenteAccent: {
    position: 'absolute',
    left: 0,
    top: SPACING.md,
    bottom: SPACING.md,
    width: 3,
    borderRadius: 2,
    backgroundColor: COLORS.success,
  },
  rowBorder: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.surfaceBorder,
  },
  rowIcon: {
    width: 28,
    paddingTop: 2,
    alignItems: 'center',
  },
  rowBody: { flex: 1, gap: SPACING.xs },
  rowTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.sm,
  },
  rowTitleWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    minWidth: 0,
  },
  rowTitle: {
    flexShrink: 1,
    color: COLORS.textPrimary,
    fontSize: FONTS.sizes.md,
    fontWeight: '600',
  },
  vigenteBadge: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.full,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.success,
  },
  vigenteBadgeText: {
    color: COLORS.success,
    fontSize: FONTS.sizes.xs,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  closedBadge: {
    backgroundColor: COLORS.backgroundSubtle,
    borderRadius: RADIUS.full,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.surfaceBorderStrong,
  },
  closedBadgeText: {
    color: COLORS.textMuted,
    fontSize: FONTS.sizes.xs,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  rowPeriod: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.sm,
  },
  rowGoal: {
    color: COLORS.primary,
    fontSize: FONTS.sizes.sm,
    fontWeight: '500',
  },
  rowGoalMuted: {
    color: COLORS.textMuted,
    fontSize: FONTS.sizes.sm,
    fontWeight: '500',
  },
  rowSales: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.sm,
    fontWeight: '500',
  },
  rowMeta: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.sm,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginTop: 4,
  },
  progressTrack: {
    flex: 1,
    height: 4,
    backgroundColor: COLORS.surfaceBorder,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressTrackVigente: {
    height: 5,
    backgroundColor: COLORS.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(47, 107, 79, 0.35)',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
    minWidth: 0,
  },
  progressPct: {
    fontSize: FONTS.sizes.xs,
    fontWeight: '600',
    minWidth: 32,
    textAlign: 'right',
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
    marginBottom: SPACING.md,
  },
  pickerTitle: {
    color: COLORS.textMuted,
    fontSize: FONTS.sizes.xs,
    fontWeight: '600',
    letterSpacing: 0.6,
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.sm,
  },
  pickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
  },
  pickerRowBorder: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.surfaceBorder,
  },
  pickerRowText: {
    color: COLORS.textPrimary,
    fontSize: FONTS.sizes.md,
    fontWeight: '500',
  },
  pickerRowTextActive: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xxl,
    gap: SPACING.sm,
  },
  emptyIconWrap: {
    width: 64,
    height: 64,
    borderRadius: RADIUS.xl,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  emptyTitle: {
    color: COLORS.textPrimary,
    fontSize: FONTS.sizes.xl,
    fontWeight: '600',
    textAlign: 'center',
  },
  emptySubtitle: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.sm,
    textAlign: 'center',
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.lg,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
    marginTop: SPACING.lg,
  },
  emptyButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: FONTS.sizes.md,
  },
});
