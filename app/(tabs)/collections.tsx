import React, { useState, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useCollections } from '../../hooks/useCollections';
import { useClients } from '../../hooks/useClients';
import { usePurchases } from '../../hooks/usePurchases';
import { useAuth } from '../../hooks/useAuth';
import { Collection } from '../../types';
import { COLORS, FONTS, RADIUS, SPACING } from '../../constants/colors';
import { TAB_BAR_CONTENT_HEIGHT } from '../../components/CustomTabBar';
import { NotionHeader } from '../../components/NotionHeader';
import { CollectionGoalSheet } from '../../components/CollectionGoalSheet';
import { formatPeriodBR } from '../../utils/dates';
import { formatBRL } from '../../utils/money';

function progressColor(percent: number): string {
  if (percent === 100) return COLORS.success;
  if (percent > 50) return COLORS.warning;
  return COLORS.error;
}

export default function CollectionsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, can: canDo, isAdmin } = useAuth();
  const canManageCollections = canDo('manage_collections');
  const { collections, loading, deleteCollection, refresh } = useCollections();
  const { clients } = useClients();
  const { purchases } = usePurchases();

  const [selectedCollection, setSelectedCollection] = useState<Collection | null>(null);
  const [showGoalSheet, setShowGoalSheet] = useState(false);

  const listBottom = TAB_BAR_CONTENT_HEIGHT + insets.bottom + SPACING.lg;

  const openCreateScreen = () => router.push('/collection/new');

  const openCollection = (col: Collection) => {
    setSelectedCollection(col);
    setShowGoalSheet(true);
  };

  const getProgress = useCallback(
    (collectionId: string) => {
      if (clients.length === 0) return { percent: 0, bought: 0, total: 0, cities: 0, totalCities: 0 };
      const collectionPurchases = purchases.filter(
        (p) => p.collectionId === collectionId && p.purchased === 1
      );
      const boughtClientIds = new Set(collectionPurchases.map((p) => p.clientId));
      const bought = clients.filter((c) => boughtClientIds.has(c.id)).length;
      const percent = clients.length > 0 ? Math.round((bought / clients.length) * 100) : 0;
      const cityCodes = [...new Set(clients.map((c) => c.cityCode))];
      const completedCities = cityCodes.filter((code) => {
        const cityClients = clients.filter((c) => c.cityCode === code);
        return cityClients.every((c) => boughtClientIds.has(c.id));
      }).length;
      return { percent, bought, total: clients.length, cities: completedCities, totalCities: cityCodes.length };
    },
    [clients, purchases]
  );

  const handleDelete = (col: Collection) => {
    Alert.alert(
      'Remover coleção',
      `Deseja remover "${col.name}"? Todos os dados de compra serão perdidos.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Remover', style: 'destructive', onPress: () => deleteCollection(col.id) },
      ]
    );
  };

  const renderCollection = ({ item, index }: { item: Collection; index: number }) => {
    const progress = getProgress(item.id);
    const fillColor = progressColor(progress.percent);
    const period =
      item.startDate && item.endDate
        ? formatPeriodBR(item.startDate, item.endDate)
        : null;

    return (
      <TouchableOpacity
        style={[styles.row, index > 0 && styles.rowBorder]}
        onPress={() => openCollection(item)}
        activeOpacity={0.7}
      >
        <View style={styles.rowIcon}>
          <Ionicons name="albums-outline" size={20} color={COLORS.textSecondary} />
        </View>

        <View style={styles.rowBody}>
          <View style={styles.rowTop}>
            <Text style={styles.rowTitle} numberOfLines={1}>{item.name}</Text>
            {canManageCollections && (
              <TouchableOpacity
                onPress={(e) => {
                  e.stopPropagation?.();
                  handleDelete(item);
                }}
                hitSlop={10}
                style={styles.deleteBtn}
                activeOpacity={0.6}
              >
                <Ionicons name="trash-outline" size={18} color={COLORS.textMuted} />
              </TouchableOpacity>
            )}
          </View>

          {period ? <Text style={styles.rowPeriod}>{period}</Text> : null}

          {!isAdmin && (
            <Text style={styles.rowGoal}>
              {item.myGoalAmount != null && item.myGoalAmount > 0
                ? `Meta: ${formatBRL(item.myGoalAmount)}`
                : 'Definir meta'}
            </Text>
          )}

          <Text style={styles.rowMeta}>
            {progress.bought}/{progress.total} clientes · {progress.cities}/{progress.totalCities} cidades
          </Text>

          <View style={styles.progressRow}>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${progress.percent}%`, backgroundColor: fillColor }]} />
            </View>
            <Text style={[styles.progressPct, { color: fillColor }]}>{progress.percent}%</Text>
          </View>
        </View>

        <Ionicons name="chevron-forward" size={16} color={COLORS.textMuted} />
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']}>
        <NotionHeader
          title="Coleções"
          showBorder
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
      </SafeAreaView>

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
        <View style={[styles.listWrap, { paddingBottom: listBottom }]}>
          <Text style={styles.sectionLabel}>
            {collections.length} {collections.length === 1 ? 'coleção' : 'coleções'}
          </Text>
          <View style={styles.cardList}>
            <FlatList
              data={collections}
              keyExtractor={(item) => item.id}
              renderItem={renderCollection}
              showsVerticalScrollIndicator={false}
              style={styles.cardFlatList}
            />
          </View>
          {canManageCollections && (
            <TouchableOpacity
              style={styles.addRow}
              onPress={openCreateScreen}
              activeOpacity={0.7}
            >
              <Ionicons name="add" size={18} color={COLORS.textMuted} />
              <Text style={styles.addRowText}>Nova coleção</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      <CollectionGoalSheet
        visible={showGoalSheet}
        collection={selectedCollection}
        userId={user?.id ?? ''}
        isRepresentative={!isAdmin}
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
  listWrap: {
    flex: 1,
  },
  sectionLabel: {
    color: COLORS.textMuted,
    fontSize: FONTS.sizes.xs,
    fontWeight: '600',
    letterSpacing: 0.6,
    marginTop: SPACING.xs,
    marginBottom: SPACING.sm,
    marginHorizontal: SPACING.lg,
    paddingHorizontal: SPACING.xs,
  },
  cardList: {
    flex: 1,
    marginHorizontal: SPACING.lg,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.surfaceBorder,
    overflow: 'hidden',
  },
  cardFlatList: { flex: 1 },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.md,
    paddingVertical: SPACING.lg,
    paddingHorizontal: SPACING.lg,
    backgroundColor: COLORS.surface,
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
  rowTitle: {
    flex: 1,
    color: COLORS.textPrimary,
    fontSize: FONTS.sizes.md,
    fontWeight: '600',
  },
  deleteBtn: { padding: 2 },
  rowPeriod: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.sm,
  },
  rowGoal: {
    color: COLORS.primary,
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
  addRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.lg,
    paddingHorizontal: SPACING.lg,
    marginHorizontal: SPACING.lg,
    marginTop: SPACING.sm,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.surfaceBorder,
  },
  addRowText: {
    color: COLORS.textMuted,
    fontSize: FONTS.sizes.sm,
    fontWeight: '500',
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
