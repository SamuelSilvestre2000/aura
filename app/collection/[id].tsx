import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { Alert } from '../../utils/alert';
import { useAuth } from '../../hooks/useAuth';
import { useCollections } from '../../hooks/useCollections';
import { useClients } from '../../hooks/useClients';
import { usePurchases } from '../../hooks/usePurchases';
import { CollectionGoalSheet } from '../../components/CollectionGoalSheet';
import { CategoryPill } from '../../components/CategoryPill';
import { categoryLabel, filterClientsByCategory } from '../../utils/categoryFilter';
import { getAllowedCategoriesForUser } from '../../services/categories';
import { Category } from '../../types';
import { NotionHeader } from '../../components/NotionHeader';
import { HeaderBackButton } from '../../components/HeaderBackButton';
import { HeaderLinkButton } from '../../components/HeaderLinkButton';
import { StackedBarChart } from '../../components/collection/StackedBarChart';
import { COLORS, FONTS, RADIUS, SPACING } from '../../constants/colors';
import { formatDateTimeBR, formatPeriodBR } from '../../utils/dates';
import { formatBRL } from '../../utils/money';
import {
  getBoughtClientsForCollection,
  getCollectionProgress,
  progressColor,
} from '../../utils/collectionStats';
import { isCollectionClosed } from '../../utils/collectionStatus';

function ProgressRow({ percent, meta }: { percent: number; meta: string }) {
  const color = progressColor(percent);
  return (
    <View style={styles.progressBlock}>
      <View style={styles.progressMetaRow}>
        <Text style={styles.progressMeta}>{meta}</Text>
        <Text style={[styles.progressPct, { color }]}>{percent}%</Text>
      </View>
      <View style={styles.progressTrack}>
        <View
          style={[styles.progressFill, { width: `${percent}%`, backgroundColor: color }]}
        />
      </View>
    </View>
  );
}

export default function CollectionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user, isAdmin, can: canDo } = useAuth();
  const canManageCollections = canDo('manage_collections');
  const { collections, loading, refresh, closeCollection, deleteCollection } = useCollections();
  const { clients } = useClients();
  const { purchases, sales, refresh: refreshPurchases } = usePurchases();
  const [showGoalSheet, setShowGoalSheet] = useState(false);
  const [buyersExpanded, setBuyersExpanded] = useState(false);
  const [goalCategories, setGoalCategories] = useState<Category[]>(user?.categories ?? []);

  useEffect(() => {
    async function load() {
      if (!user) {
        setGoalCategories([]);
        return;
      }
      setGoalCategories(await getAllowedCategoriesForUser(user.id, user.role));
    }
    void load();
  }, [user]);

  const collection = collections.find((c) => c.id === id);

  const scopedClients = useMemo(() => {
    const allowedIds = goalCategories.map((c) => c.id);
    if (collection?.categoryId) {
      return filterClientsByCategory(clients, collection.categoryId, allowedIds);
    }
    return filterClientsByCategory(clients, 'all', allowedIds);
  }, [clients, collection, goalCategories]);

  useFocusEffect(
    useCallback(() => {
      refresh();
      refreshPurchases();
    }, [refresh, refreshPurchases])
  );

  const progress = useMemo(
    () => (id ? getCollectionProgress(id, scopedClients, purchases) : null),
    [id, scopedClients, purchases]
  );

  const boughtClients = useMemo(
    () => (id ? getBoughtClientsForCollection(id, scopedClients, purchases, sales) : []),
    [id, scopedClients, purchases, sales]
  );

  const showCategoryBadge = goalCategories.length > 1;

  if (loading && !collection) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (!collection || !progress) {
    return (
      <View style={styles.center}>
        <Ionicons name="albums-outline" size={40} color={COLORS.textMuted} />
        <Text style={styles.notFoundText}>Coleção não encontrada</Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.outlineButton}>
          <Ionicons name="arrow-back" size={16} color={COLORS.primary} />
          <Text style={styles.outlineButtonText}>Voltar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const soldAmount = collection.mySoldAmount ?? 0;
  const goalAmount = collection.myGoalAmount ?? 0;
  const hasGoal = goalAmount > 0;
  const remaining = Math.max(0, goalAmount - soldAmount);
  const salesPercent = hasGoal ? Math.min(100, Math.round((soldAmount / goalAmount) * 100)) : 0;

  const period =
    collection.startDate && collection.endDate
      ? formatPeriodBR(collection.startDate, collection.endDate)
      : 'Período não definido';

  const showFinancial = hasGoal || soldAmount > 0;
  const isClosed = isCollectionClosed(collection);

  const handleCloseCollection = () => {
    Alert.alert(
      'Fechar coleção',
      `Deseja fechar "${collection.name}"? Não será mais possível registrar novas vendas nesta coleção.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Fechar',
          style: 'destructive',
          onPress: async () => {
            try {
              await closeCollection(collection.id);
              await refresh();
            } catch (err) {
              Alert.alert(
                'Erro',
                err instanceof Error ? err.message : 'Não foi possível fechar a coleção.'
              );
            }
          },
        },
      ]
    );
  };

  const handleDeleteCollection = () => {
    Alert.alert(
      'Remover coleção',
      `Deseja remover "${collection.name}"? Todos os dados de compra serão perdidos.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Remover',
          style: 'destructive',
          onPress: async () => {
            await deleteCollection(collection.id);
            router.back();
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.headerSafe}>
        <NotionHeader
          title={collection.name}
          showBorder
          compact
          leftAction={<HeaderBackButton onPress={() => router.back()} />}
          rightAction={
            !isAdmin && !isClosed ? (
              <HeaderLinkButton
                label={hasGoal ? 'Editar meta' : 'Definir meta'}
                onPress={() => setShowGoalSheet(true)}
              />
            ) : undefined
          }
        />
      </SafeAreaView>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={[styles.profileCard, isClosed && styles.profileCardClosed]}>
          <View style={[styles.profileIcon, isClosed && styles.profileIconClosed]}>
            <Ionicons
              name={isClosed ? 'lock-closed-outline' : 'albums-outline'}
              size={28}
              color={isClosed ? COLORS.textMuted : COLORS.primary}
            />
          </View>
          {isClosed ? (
            <View style={styles.closedStatusBadge}>
              <Text style={styles.closedStatusText}>Coleção fechada</Text>
            </View>
          ) : null}
          <View style={styles.periodRow}>
            <Ionicons name="calendar-outline" size={14} color={COLORS.textMuted} />
            <Text style={styles.periodText}>{period}</Text>
          </View>
          {showCategoryBadge ? (
            <CategoryPill
              label={categoryLabel(collection.categoryId)}
              slug={collection.categoryId?.replace('cat_', '')}
              compact
            />
          ) : null}

          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Text style={[styles.statValue, styles.statSuccess]}>{progress.bought}</Text>
              <Text style={styles.statLabel}>Compraram</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.stat}>
              <Text style={[styles.statValue, styles.statPending]}>{progress.pending}</Text>
              <Text style={styles.statLabel}>Pendentes</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.stat}>
              <Text style={styles.statValue}>
                {progress.completedCities}/{progress.totalCities}
              </Text>
              <Text style={styles.statLabel}>Cidades</Text>
            </View>
          </View>
        </View>

        {showFinancial && (
          <View style={styles.section}>
            <Text style={styles.sectionLabelOutside}>RESUMO FINANCEIRO</Text>
            <View style={styles.card}>
              <View style={styles.statsRow}>
                <View style={styles.stat}>
                  <Text style={[styles.statValue, styles.statSuccess]}>{formatBRL(soldAmount)}</Text>
                  <Text style={styles.statLabel}>Vendido</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.stat}>
                  <Text style={styles.statValue}>
                    {hasGoal ? formatBRL(goalAmount) : '—'}
                  </Text>
                  <Text style={styles.statLabel}>Meta</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.stat}>
                  <Text style={[styles.statValue, styles.statWarning]}>
                    {hasGoal ? formatBRL(remaining) : '—'}
                  </Text>
                  <Text style={styles.statLabel}>Faltam</Text>
                </View>
              </View>
              {hasGoal && (
                <ProgressRow
                  percent={salesPercent}
                  meta={`${formatBRL(soldAmount)} de ${formatBRL(goalAmount)}`}
                />
              )}
            </View>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionLabelOutside}>COBERTURA</Text>
          <View style={styles.card}>
            <StackedBarChart
              title="CLIENTES"
              segments={[
                { value: progress.bought, color: COLORS.success, label: 'Compraram' },
                { value: progress.pending, color: COLORS.surfaceBorderStrong, label: 'Pendentes' },
              ]}
              height={8}
            />
            <ProgressRow
              percent={progress.clientPercent}
              meta={`${progress.bought}/${progress.total} clientes na base`}
            />

            <View style={styles.cardInnerDivider} />

            <StackedBarChart
              title="CIDADES"
              segments={[
                { value: progress.completedCities, color: COLORS.success, label: 'Completas' },
                {
                  value: Math.max(0, progress.totalCities - progress.completedCities),
                  color: COLORS.surfaceBorder,
                  label: 'Em aberto',
                },
              ]}
              height={8}
            />
            <ProgressRow
              percent={progress.cityPercent}
              meta={`${progress.completedCities}/${progress.totalCities} cidades completas`}
            />
          </View>
        </View>

        <View style={styles.section}>
          <TouchableOpacity
            style={styles.sectionToggle}
            onPress={() => setBuyersExpanded((v) => !v)}
            activeOpacity={0.7}
          >
            <Text style={styles.sectionLabel}>
              CLIENTES QUE COMPRARAM ({boughtClients.length})
            </Text>
            <Ionicons
              name={buyersExpanded ? 'chevron-up' : 'chevron-down'}
              size={16}
              color={COLORS.textMuted}
            />
          </TouchableOpacity>

          {buyersExpanded &&
            (boughtClients.length === 0 ? (
              <View style={styles.card}>
                <Text style={styles.emptyText}>Nenhuma compra registrada ainda</Text>
              </View>
            ) : (
              <View style={styles.card}>
                {boughtClients.map((row, index) => (
                  <React.Fragment key={row.client.id}>
                    {index > 0 && <View style={styles.rowDivider} />}
                    <TouchableOpacity
                      style={styles.buyerRow}
                      onPress={() => router.push(`/client/${row.client.id}`)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.buyerAvatar}>
                        <Text style={styles.buyerAvatarText}>
                          {row.client.name.charAt(0).toUpperCase()}
                        </Text>
                      </View>
                      <View style={styles.buyerBody}>
                        <Text style={styles.buyerName} numberOfLines={1}>
                          {row.client.name}
                        </Text>
                        <View style={styles.buyerMetaRow}>
                          <Ionicons name="location-outline" size={12} color={COLORS.textMuted} />
                          <Text style={styles.buyerMeta} numberOfLines={1}>
                            {row.client.city}, PI
                            {row.purchasedAt ? ` · ${formatDateTimeBR(row.purchasedAt)}` : ''}
                          </Text>
                        </View>
                      </View>
                      <View style={styles.buyerRight}>
                        {row.sale ? (
                          <Text style={styles.buyerAmount}>{formatBRL(row.sale.amount)}</Text>
                        ) : null}
                        <Ionicons name="chevron-forward" size={16} color={COLORS.textMuted} />
                      </View>
                    </TouchableOpacity>
                  </React.Fragment>
                ))}
              </View>
            ))}
        </View>

        {canManageCollections && !isClosed && (
          <View style={styles.section}>
            <Text style={styles.sectionLabelOutside}>GERENCIAR</Text>
            <View style={styles.manageCard}>
              <TouchableOpacity
                style={styles.manageRow}
                onPress={handleCloseCollection}
                activeOpacity={0.7}
              >
                <View style={styles.manageIconWrap}>
                  <Ionicons name="lock-closed-outline" size={20} color={COLORS.textSecondary} />
                </View>
                <View style={styles.manageInfo}>
                  <Text style={styles.manageTitle}>Fechar coleção</Text>
                  <Text style={styles.manageSubtitle}>
                    Encerra vendas nesta coleção; o histórico permanece disponível
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={COLORS.textMuted} />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {isAdmin && (
          <View style={styles.section}>
            <Text style={styles.sectionLabelOutside}>ADMINISTRAÇÃO</Text>
            <View style={styles.dangerCard}>
              <TouchableOpacity
                style={styles.dangerRow}
                onPress={handleDeleteCollection}
                activeOpacity={0.7}
              >
                <View style={styles.dangerIconWrap}>
                  <Ionicons name="trash-outline" size={20} color={COLORS.error} />
                </View>
                <View style={styles.dangerInfo}>
                  <Text style={styles.dangerTitle}>Remover coleção</Text>
                  <Text style={styles.dangerSubtitle}>
                    Apaga a coleção e todos os dados de compra
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={COLORS.textMuted} />
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>

      <CollectionGoalSheet
        visible={showGoalSheet}
        collection={collection}
        userId={user?.id ?? ''}
        userRole={user?.role ?? 'representative'}
        isRepresentative={!isAdmin}
        categories={goalCategories}
        onClose={() => setShowGoalSheet(false)}
        onSaved={refresh}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.backgroundSubtle,
  },
  headerSafe: {
    backgroundColor: COLORS.backgroundSubtle,
  },
  center: {
    flex: 1,
    backgroundColor: COLORS.backgroundSubtle,
    justifyContent: 'center',
    alignItems: 'center',
    gap: SPACING.md,
    paddingHorizontal: SPACING.xl,
  },
  content: {
    padding: SPACING.lg,
    gap: SPACING.lg,
    paddingBottom: 48,
  },
  profileCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.xl,
    alignItems: 'center',
    gap: SPACING.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.surfaceBorder,
  },
  profileIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.primaryBg,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  profileCardClosed: {
    backgroundColor: COLORS.backgroundSubtle,
  },
  profileIconClosed: {
    backgroundColor: COLORS.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.surfaceBorder,
  },
  closedStatusBadge: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.md,
    paddingVertical: 4,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.surfaceBorderStrong,
  },
  closedStatusText: {
    color: COLORS.textMuted,
    fontSize: FONTS.sizes.xs,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  periodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  periodText: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.sm,
    fontWeight: '500',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.lg,
    paddingTop: SPACING.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.surfaceBorder,
    width: '100%',
  },
  stat: { flex: 1, alignItems: 'center' },
  statValue: {
    color: COLORS.textPrimary,
    fontSize: FONTS.sizes.lg,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  statSuccess: { color: COLORS.success },
  statPending: { color: COLORS.textSecondary },
  statWarning: { color: COLORS.warning },
  statLabel: {
    color: COLORS.textMuted,
    fontSize: FONTS.sizes.xs,
    marginTop: 2,
    fontWeight: '500',
    textAlign: 'center',
  },
  statDivider: {
    width: StyleSheet.hairlineWidth,
    height: 28,
    backgroundColor: COLORS.surfaceBorder,
  },
  section: { gap: SPACING.sm },
  sectionToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.xs,
    gap: SPACING.sm,
  },
  sectionLabelOutside: {
    color: COLORS.textMuted,
    fontSize: FONTS.sizes.xs,
    fontWeight: '600',
    letterSpacing: 0.6,
    paddingHorizontal: SPACING.xs,
  },
  sectionLabel: {
    flex: 1,
    color: COLORS.textMuted,
    fontSize: FONTS.sizes.xs,
    fontWeight: '600',
    letterSpacing: 0.6,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.surfaceBorder,
    padding: SPACING.lg,
    gap: SPACING.md,
  },
  cardInnerDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: COLORS.surfaceBorder,
    marginVertical: SPACING.xs,
  },
  progressBlock: { gap: SPACING.sm },
  progressMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.sm,
  },
  progressMeta: {
    flex: 1,
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.sm,
    fontWeight: '500',
  },
  progressTrack: {
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
    fontSize: FONTS.sizes.xs,
    fontWeight: '600',
    minWidth: 32,
    textAlign: 'right',
  },
  emptyText: {
    color: COLORS.textMuted,
    fontSize: FONTS.sizes.sm,
    textAlign: 'center',
  },
  rowDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: COLORS.surfaceBorder,
    marginHorizontal: -SPACING.lg,
  },
  buyerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    paddingVertical: SPACING.xs,
  },
  buyerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primaryBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buyerAvatarText: {
    color: COLORS.primary,
    fontSize: FONTS.sizes.md,
    fontWeight: '700',
  },
  buyerBody: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  buyerName: {
    color: COLORS.textPrimary,
    fontSize: FONTS.sizes.md,
    fontWeight: '600',
  },
  buyerMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  buyerMeta: {
    flex: 1,
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.sm,
  },
  buyerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    flexShrink: 0,
  },
  buyerAmount: {
    color: COLORS.textPrimary,
    fontSize: FONTS.sizes.sm,
    fontWeight: '600',
  },
  outlineButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    borderRadius: RADIUS.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.surfaceBorder,
    backgroundColor: COLORS.surface,
  },
  outlineButtonText: {
    color: COLORS.primary,
    fontSize: FONTS.sizes.sm,
    fontWeight: '600',
  },
  notFoundText: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.md,
    textAlign: 'center',
  },
  dangerCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.surfaceBorder,
  },
  dangerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.lg,
    gap: SPACING.md,
  },
  dangerIconWrap: {
    width: 28,
    alignItems: 'center',
  },
  dangerInfo: { flex: 1 },
  dangerTitle: {
    color: COLORS.error,
    fontSize: FONTS.sizes.md,
    fontWeight: '500',
  },
  dangerSubtitle: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.sm,
    marginTop: 2,
  },
  manageCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.surfaceBorder,
  },
  manageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.lg,
    gap: SPACING.md,
  },
  manageIconWrap: {
    width: 28,
    alignItems: 'center',
  },
  manageInfo: { flex: 1 },
  manageTitle: {
    color: COLORS.textPrimary,
    fontSize: FONTS.sizes.md,
    fontWeight: '500',
  },
  manageSubtitle: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.sm,
    marginTop: 2,
  },
});
