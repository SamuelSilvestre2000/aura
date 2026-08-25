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
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getScreenBottomInset } from '../../utils/safeArea';
import { useCollections } from '../../hooks/useCollections';
import { useClients } from '../../hooks/useClients';
import { usePurchases } from '../../hooks/usePurchases';
import { useAuth } from '../../hooks/useAuth';
import { useCategoryFilter } from '../../hooks/useCategoryFilter';
import { usePanelNav } from '../../hooks/usePanelNav';
import { CategoryPickerPill } from '../../components/CategoryPickerPill';
import {
  filterClientsByCategory,
  filterCollectionsByCategory,
  categoryLabel,
} from '../../utils/categoryFilter';
import { Collection } from '../../types';
import { COLORS, FONTS, HIT_TARGET, RADIUS, SPACING } from '../../constants/colors';
import { PullToRefresh } from '../../components/PullToRefresh';
import { formatPeriodBR } from '../../utils/dates';
import { formatBRL } from '../../utils/money';
import { getCollectionProgress, progressColor } from '../../utils/collectionStats';
import {
  filterCollectionsByYear,
  getAvailableCollectionYears,
  getCollectionYear,
} from '../../utils/collectionYears';
import { getVigenteCollectionId } from '../../utils/collectionVigente';
import { isCollectionClosed } from '../../utils/collectionStatus';
import CollectionDetailScreen from '../collection/[id]';
import NewCollectionScreen from '../collection/new';
import { useIsDesktop } from '../../hooks/useIsDesktop';
import { useScreenTopInset } from '../../hooks/useScreenTopInset';
import { PanelCloseButton } from '../../components/PanelCloseButton';

const CURRENT_YEAR = new Date().getFullYear();

export default function CollectionsScreen() {
  const nav = usePanelNav();
  const insets = useSafeAreaInsets();
  const isDesktop = useIsDesktop();
  const topInset = useScreenTopInset('tab');
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

  const listBottom = getScreenBottomInset(insets);

  useFocusEffect(
    useCallback(() => {
      refresh(effectiveFilter);
      refreshPurchases();
      refreshClients();
    }, [refresh, refreshPurchases, refreshClients, effectiveFilter])
  );

  const openCreateScreen = () =>
    nav.open('collection-new', <NewCollectionScreen />, '/collection/new');

  const openCollection = (col: Collection) => {
    nav.open(
      `collection-${col.id}`,
      <CollectionDetailScreen id={col.id} />,
      '/collection/[id]',
      { id: col.id }
    );
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

  /**
   * O estado da coleção passa a ser a seção onde ela está, em vez de faixa
   * colorida + fundo tintado + badge + ícone trocado + opacidade — cinco
   * codificações do mesmo bit. Encerradas descem para o fim em vez de serem
   * esmaecidas, que derrubava o contraste do texto junto.
   */
  const collectionSections = useMemo(() => {
    const vigente: Collection[] = [];
    const abertas: Collection[] = [];
    const encerradas: Collection[] = [];

    for (const collection of filteredCollections) {
      if (isCollectionClosed(collection)) encerradas.push(collection);
      else if (collection.id === vigenteCollectionId) vigente.push(collection);
      else abertas.push(collection);
    }

    return [
      { title: 'Vigente', data: vigente },
      { title: 'Abertas', data: abertas },
      { title: 'Encerradas', data: encerradas },
    ].filter((section) => section.data.length > 0);
  }, [filteredCollections, vigenteCollectionId]);

  /**
   * Título e uma linha de apoio. Meta, faltam, clientes e cidades saíram para a
   * tela de detalhe, que já mostra tudo isso — na lista eram sete níveis de
   * informação empilhados numa linha de ~200 px.
   */
  const renderCollection = (item: Collection, index: number) => {
    const soldAmount = item.mySoldAmount ?? 0;
    const goalAmount = item.myGoalAmount ?? 0;
    const hasGoal = goalAmount > 0;
    const salesPercent = hasGoal
      ? Math.min(100, Math.round((soldAmount / goalAmount) * 100))
      : 0;
    const period =
      item.startDate && item.endDate
        ? formatPeriodBR(item.startDate, item.endDate)
        : null;
    const subtitle = [period, showCategoryBadges ? categoryLabel(item.categoryId) : '']
      .filter(Boolean)
      .join(' · ');

    return (
      <TouchableOpacity
        key={item.id}
        style={[styles.row, index > 0 && styles.rowBorder]}
        onPress={() => openCollection(item)}
        activeOpacity={0.7}
      >
        <View style={styles.rowIcon}>
          <Ionicons name="albums-outline" size={20} color={COLORS.textSecondary} />
        </View>

        <View style={styles.rowBody}>
          <Text style={styles.rowTitle} numberOfLines={1}>{item.name}</Text>
          {subtitle ? (
            <Text style={styles.rowSubtitle} numberOfLines={1}>{subtitle}</Text>
          ) : null}

          {hasGoal ? (
            <View style={styles.progressRow}>
              <View style={styles.progressTrack}>
                <View
                  style={[
                    styles.progressFill,
                    { width: `${salesPercent}%`, backgroundColor: progressColor(salesPercent) },
                  ]}
                />
              </View>
              {/* A largura da barra já codifica o avanço; o número evita que a
                  leitura dependa de distinguir a cor. */}
              <Text style={styles.progressPct}>{salesPercent}% da meta</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.rowTrailing}>
          {soldAmount > 0 ? (
            <Text style={styles.rowAmount}>{formatBRL(soldAmount)}</Text>
          ) : null}
          <Ionicons name="chevron-forward" size={16} color={COLORS.textMuted} />
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, isDesktop && styles.containerDesktop]}>
      {/*
        Mesmo cabeçalho do painel de cidade: nome da tela em corpo grande, a
        contagem como linha de apoio e a ação num botão circular no canto.
      */}
      <View style={[styles.titleRow, { paddingTop: topInset }]}>
        <View style={styles.titleBlock}>
          <Text style={styles.title}>Coleções</Text>
          <Text style={styles.subtitle}>
            {filteredCollections.length}{' '}
            {filteredCollections.length === 1 ? 'coleção' : 'coleções'} em {selectedYear}
          </Text>
        </View>
        {/* Criar fica à esquerda; a quina é sempre fechar. */}
        <View style={styles.headerActions}>
          {canManageCollections ? (
            <TouchableOpacity
              style={styles.addButton}
              onPress={openCreateScreen}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Nova coleção"
            >
              <View style={styles.addCircle}>
                <Ionicons name="add" size={22} color={COLORS.primary} />
              </View>
            </TouchableOpacity>
          ) : null}
          <PanelCloseButton />
        </View>
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
            collectionSections.map((section) => (
              <View key={section.title} style={styles.section}>
                <Text style={styles.sectionHeaderText}>{section.title}</Text>
                <View style={styles.cardList}>
                  {section.data.map((item, index) => renderCollection(item, index))}
                </View>
              </View>
            ))
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
  // No painel flutuante do desktop, deixa o vidro do painel (DesktopSidePanel)
  // aparecer nos vãos em vez de cobrir tudo com fundo opaco. Totalmente
  // transparente (não translúcido) — empilhar duas camadas translúcidas soma
  // as opacidades e o vidro acaba quase opaco de novo.
  containerDesktop: {
    backgroundColor: 'transparent',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.md,
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.sm,
  },
  titleBlock: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  title: {
    ...FONTS.text.largeTitle,
    color: COLORS.textPrimary,
  },
  subtitle: {
    ...FONTS.tabular,
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.md,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  addButton: {
    minWidth: HIT_TARGET,
    minHeight: HIT_TARGET,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  addCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.fill,
    alignItems: 'center',
    justifyContent: 'center',
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
  rowTitle: {
    flexShrink: 1,
    color: COLORS.textPrimary,
    fontSize: FONTS.sizes.lg,
    fontWeight: '600',
  },
  rowSubtitle: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.md,
  },
  rowTrailing: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  rowAmount: {
    ...FONTS.tabular,
    color: COLORS.textPrimary,
    fontSize: FONTS.sizes.md,
    fontWeight: '600',
  },
  section: {
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  sectionHeaderText: {
    ...FONTS.text.sectionHeader,
    color: COLORS.textSecondary,
    paddingHorizontal: SPACING.lg,
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
  progressFill: {
    height: '100%',
    borderRadius: 2,
    minWidth: 0,
  },
  progressPct: {
    ...FONTS.tabular,
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.sm,
    minWidth: 88,
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
