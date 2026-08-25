import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useFocusEffect } from 'expo-router';
import { Alert } from '../../utils/alert';
import { useAuth } from '../../hooks/useAuth';
import { useCollections } from '../../hooks/useCollections';
import { useClients } from '../../hooks/useClients';
import { usePurchases } from '../../hooks/usePurchases';
import { usePanelNav } from '../../hooks/usePanelNav';
import { useIsDesktop } from '../../hooks/useIsDesktop';
import { useScreenTopInset } from '../../hooks/useScreenTopInset';
import { CollectionGoalSheet } from '../../components/CollectionGoalSheet';
import { PullToRefresh } from '../../components/PullToRefresh';
import { categoryLabel, filterClientsByCategory } from '../../utils/categoryFilter';
import { getAllowedCategoriesForUser } from '../../services/categories';
import { Category } from '../../types';
import { NotionHeader } from '../../components/NotionHeader';
import { HeaderBackButton } from '../../components/HeaderBackButton';
import { HeaderLinkButton } from '../../components/HeaderLinkButton';
import { StackedBarChart } from '../../components/collection/StackedBarChart';
import ClientDetailScreen from '../client/[id]';
import { COLORS, FONTS, RADIUS, SPACING, STATUS_COLORS } from '../../constants/colors';
import { clientInitials, displayClientName } from '../../utils/clientName';
import { getAvatarColor } from '../../utils/avatarColor';
import { formatDateBR, formatPeriodBR } from '../../utils/dates';
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
        {/* O número fica neutro: a largura da barra já é o sinal, e a cor
            deixa de ser a única codificação. */}
        <Text style={styles.progressPct}>{percent}%</Text>
      </View>
      <View style={styles.progressTrack}>
        <View
          style={[styles.progressFill, { width: `${percent}%`, backgroundColor: color }]}
        />
      </View>
    </View>
  );
}

type Props = { id?: string };

export default function CollectionDetailScreen({ id: propId }: Props = {}) {
  const params = useLocalSearchParams<{ id: string }>();
  const id = propId ?? params.id;
  const nav = usePanelNav();
  const isDesktop = useIsDesktop();
  const topInset = useScreenTopInset('modal');
  const insets = useSafeAreaInsets();
  const { user, isAdmin, can: canDo } = useAuth();
  const canManageCollections = canDo('manage_collections');
  const { collections, loading, refresh, closeCollection, deleteCollection, setVigente } =
    useCollections();
  const [togglingVigente, setTogglingVigente] = useState(false);
  const { clients, refresh: refreshClients } = useClients();
  const { purchases, sales, refresh: refreshPurchases } = usePurchases();
  const [showGoalSheet, setShowGoalSheet] = useState(false);
  const [goalCategories, setGoalCategories] = useState<Category[]>(user?.categories ?? []);
  const [refreshing, setRefreshing] = useState(false);

  const loadGoalCategories = useCallback(async () => {
    if (!user) {
      setGoalCategories([]);
      return;
    }
    setGoalCategories(await getAllowedCategoriesForUser(user.id, user.role));
  }, [user]);

  useEffect(() => {
    void loadGoalCategories();
  }, [loadGoalCategories]);

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
      refreshClients();
    }, [refresh, refreshPurchases, refreshClients])
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([refresh(), refreshPurchases(), refreshClients(), loadGoalCategories()]);
    } finally {
      setRefreshing(false);
    }
  };

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
      <View style={[styles.center, isDesktop && styles.containerDesktop]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (!collection || !progress) {
    return (
      <View style={[styles.center, isDesktop && styles.containerDesktop]}>
        <Ionicons name="albums-outline" size={40} color={COLORS.textMuted} />
        <Text style={styles.notFoundText}>Coleção não encontrada</Text>
        <TouchableOpacity onPress={() => nav.back()} style={styles.outlineButton}>
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

  const handleToggleVigente = async (value: boolean) => {
    if (togglingVigente) return;
    setTogglingVigente(true);
    try {
      await setVigente(collection.id, value);
    } catch (err) {
      Alert.alert('Erro', err instanceof Error ? err.message : 'Não foi possível atualizar.');
    } finally {
      setTogglingVigente(false);
    }
  };

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
            nav.back();
          },
        },
      ]
    );
  };

  return (
    <View style={[styles.container, isDesktop && styles.containerDesktop]}>
      <View
        style={[
          styles.headerSafe,
          isDesktop && styles.containerDesktop,
          { paddingTop: topInset },
        ]}
      >
        <NotionHeader
          title={collection.name}
          showBorder
          compact
          leftAction={<HeaderBackButton onPress={() => nav.back()} />}
          rightAction={
            !isAdmin && !isClosed ? (
              <HeaderLinkButton
                label={hasGoal ? 'Editar meta' : 'Definir meta'}
                onPress={() => setShowGoalSheet(true)}
              />
            ) : undefined
          }
        />
      </View>

      <PullToRefresh refreshing={refreshing} onRefresh={handleRefresh}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/*
          O nome da coleção aparece aqui, não só na barra de navegação. Estado
          e período viram uma linha de apoio — antes "fechada" era dita quatro
          vezes: badge, fundo do cartão, fundo do ícone e cadeado.
        */}
        <View style={styles.profileCard}>
          <View style={styles.profileIcon}>
            <Ionicons
              name={isClosed ? 'lock-closed-outline' : 'albums-outline'}
              size={28}
              color={isClosed ? COLORS.textSecondary : COLORS.primary}
            />
          </View>
          <Text style={styles.collectionName}>{collection.name}</Text>
          <Text style={styles.collectionSubtitle}>
            {[isClosed ? 'Fechada' : null, period, showCategoryBadge ? categoryLabel(collection.categoryId) : null]
              .filter(Boolean)
              .join(' · ')}
          </Text>
          <Text style={styles.summaryText}>
            {progress.bought} de {progress.total}{' '}
            {progress.total === 1 ? 'cliente comprou' : 'clientes compraram'}
            {progress.totalCities > 0
              ? ` · ${progress.completedCities}/${progress.totalCities} cidades`
              : ''}
          </Text>
        </View>

        {showFinancial && (
          <View style={styles.section}>
            <Text style={styles.sectionLabelOutside}>RESUMO FINANCEIRO</Text>
            <View style={styles.card}>
              {/* Dinheiro em lista de chave-valor, com o valor alinhado à
                  direita: é assim que se compara uma coluna de números. */}
              <View style={styles.moneyRow}>
                <Text style={styles.moneyLabel}>Vendido</Text>
                <Text style={styles.moneyValue}>{formatBRL(soldAmount)}</Text>
              </View>
              <View style={styles.rowDivider} />
              <View style={styles.moneyRow}>
                <Text style={styles.moneyLabel}>Meta</Text>
                <Text style={styles.moneyValue}>{hasGoal ? formatBRL(goalAmount) : '—'}</Text>
              </View>
              <View style={styles.rowDivider} />
              <View style={styles.moneyRow}>
                <Text style={styles.moneyLabel}>Faltam</Text>
                <Text style={styles.moneyValue}>{hasGoal ? formatBRL(remaining) : '—'}</Text>
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
              title="Clientes"
              segments={[
                { value: progress.bought, color: STATUS_COLORS.all, label: 'Compraram' },
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
              title="Cidades"
              segments={[
                { value: progress.completedCities, color: STATUS_COLORS.all, label: 'Completas' },
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
          <Text style={styles.sectionLabelOutside}>
            CLIENTES QUE COMPRARAM ({boughtClients.length})
          </Text>

          {(boughtClients.length === 0 ? (
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
                      onPress={() =>
                        nav.open(
                          `client-${row.client.id}`,
                          <ClientDetailScreen id={row.client.id} />,
                          `/client/${row.client.id}`
                        )
                      }
                      activeOpacity={0.7}
                    >
                      <View
                        style={[
                          styles.buyerAvatar,
                          { backgroundColor: getAvatarColor(row.client.id) },
                        ]}
                      >
                        <Text style={styles.buyerAvatarText}>
                          {clientInitials(displayClientName(row.client))}
                        </Text>
                      </View>
                      <View style={styles.buyerBody}>
                        <Text style={styles.buyerName} numberOfLines={1}>
                          {displayClientName(row.client)}
                        </Text>
                        <Text style={styles.buyerMeta} numberOfLines={1}>
                          {row.client.city}, PI
                          {row.purchasedAt ? ` · ${formatDateBR(row.purchasedAt)}` : ''}
                        </Text>
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
              <View style={styles.manageRow}>
                <View style={styles.manageIconWrap}>
                  <Ionicons
                    name="flash-outline"
                    size={20}
                    color={collection.isVigente ? COLORS.success : COLORS.textSecondary}
                  />
                </View>
                <View style={styles.manageInfo}>
                  <Text style={styles.manageTitle}>Tornar vigente</Text>
                  <Text style={styles.manageSubtitle}>
                    {collection.isVigente
                      ? 'Esta é a coleção em destaque para vendas'
                      : 'Define esta como a coleção em destaque para vendas'}
                  </Text>
                </View>
                <Switch
                  value={collection.isVigente}
                  onValueChange={handleToggleVigente}
                  disabled={togglingVigente}
                  trackColor={{ false: COLORS.surfaceBorderStrong, true: COLORS.success }}
                  thumbColor="#fff"
                />
              </View>
              <View style={styles.rowDivider} />
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

        {canManageCollections && (
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
      </PullToRefresh>

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
  // No painel flutuante do desktop, deixa o vidro do painel (DesktopSidePanel)
  // aparecer em vez de cobrir tudo com fundo opaco. Totalmente transparente
  // (não translúcido) — empilhar duas camadas translúcidas soma opacidade.
  containerDesktop: {
    backgroundColor: 'transparent',
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
  collectionName: {
    color: COLORS.textPrimary,
    fontSize: FONTS.sizes.xl,
    fontWeight: '700',
    letterSpacing: -0.3,
    textAlign: 'center',
  },
  collectionSubtitle: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.md,
    textAlign: 'center',
  },
  summaryText: {
    ...FONTS.tabular,
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.sm,
    textAlign: 'center',
    marginTop: SPACING.sm,
  },
  moneyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.md,
    minHeight: 44,
    paddingHorizontal: SPACING.lg,
  },
  moneyLabel: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.md,
  },
  moneyValue: {
    ...FONTS.tabular,
    color: COLORS.textPrimary,
    fontSize: FONTS.sizes.md,
    fontWeight: '600',
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
  section: { gap: SPACING.sm },
  sectionLabelOutside: {
    color: COLORS.textMuted,
    fontSize: FONTS.sizes.xs,
    fontWeight: '600',
    letterSpacing: 0.6,
    paddingHorizontal: SPACING.xs,
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
    ...FONTS.tabular,
    color: COLORS.textSecondary,
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
    alignItems: 'center',
    justifyContent: 'center',
  },
  buyerAvatarText: {
    color: '#FFFFFF',
    fontSize: FONTS.sizes.sm,
    fontWeight: '600',
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
    ...FONTS.tabular,
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
