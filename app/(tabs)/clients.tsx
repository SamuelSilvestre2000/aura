import React, { useCallback, useMemo, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getScreenBottomInset } from '../../utils/safeArea';
import { useClients } from '../../hooks/useClients';
import { useAuth } from '../../hooks/useAuth';
import { useCategoryFilter } from '../../hooks/useCategoryFilter';
import { Client } from '../../types';
import { COLORS, FONTS, RADIUS, SPACING } from '../../constants/colors';
import { SearchBar } from '../../components/SearchBar';
import { CategoryPickerPill } from '../../components/CategoryPickerPill';
import { getTopBarInset } from '../../components/TopTabBar';
import { CategoryPillRow } from '../../components/CategoryPill';
import { labelsFromCategoryIds } from '../../constants/categoryPills';
import { NotionHeader } from '../../components/NotionHeader';
import { PullToRefresh } from '../../components/PullToRefresh';
import { displayClientName } from '../../utils/clientName';
import { filterClientsByCategory } from '../../utils/categoryFilter';

export default function ClientsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { can: canDo } = useAuth();
  const {
    categories: userCategories,
    filter: categoryFilter,
    setFilter: setCategoryFilter,
    effectiveFilter,
    allowedCategoryIds,
  } = useCategoryFilter();
  const canManageClients = canDo('manage_clients');
  const { clients, loading, refresh } = useClients();
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refresh();
    } finally {
      setRefreshing(false);
    }
  };

  /**
   * Cada tela mantém sua própria cópia local dos clientes — sem isso, criar,
   * editar ou remover um cliente em outra tela não refletia aqui até recarregar
   * a página inteira.
   */
  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh])
  );

  const listBottom = getScreenBottomInset(insets);

  const categoryScopedClients = useMemo(
    () => filterClientsByCategory(clients, effectiveFilter, allowedCategoryIds),
    [clients, effectiveFilter, allowedCategoryIds]
  );

  const filteredClients = useMemo(() => {
    if (!search.trim()) return categoryScopedClients;
    const q = search.toLowerCase();
    return categoryScopedClients.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.city.toLowerCase().includes(q) ||
        (c.phone && c.phone.includes(q))
    );
  }, [categoryScopedClients, search]);

  const showCategoryBadges = userCategories.length > 1;

  const renderClient = ({ item, index }: { item: Client; index: number }) => {
    const { labels, slugs } = labelsFromCategoryIds(item.categoryIds);
    const name = displayClientName(item);
    const isLast = index === filteredClients.length - 1;
    return (
      <TouchableOpacity
        style={[
          styles.row,
          index === 0 && styles.rowFirst,
          index > 0 && styles.rowBorder,
          isLast && styles.rowLast,
        ]}
        activeOpacity={0.7}
        onPress={() => router.push(`/client/${item.id}`)}
      >
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{name.charAt(0).toUpperCase()}</Text>
        </View>
        <View style={styles.rowBody}>
          <Text style={styles.rowTitle} numberOfLines={1}>{name}</Text>
          {showCategoryBadges && labels.length > 0 ? (
            <CategoryPillRow labels={labels} slugs={slugs} />
          ) : null}
          <View style={styles.rowMeta}>
            <Ionicons name="location-outline" size={12} color={COLORS.textMuted} />
            <Text style={styles.rowMetaText} numberOfLines={1}>{item.city}, PI</Text>
          </View>
          {item.phone ? (
            <Text style={styles.rowPhone} numberOfLines={1}>{item.phone}</Text>
          ) : null}
        </View>
        <Ionicons name="chevron-forward" size={16} color={COLORS.textMuted} />
      </TouchableOpacity>
    );
  };

  const countLabel = search.trim()
    ? `${filteredClients.length} resultado${filteredClients.length !== 1 ? 's' : ''}`
    : `${categoryScopedClients.length} cliente${categoryScopedClients.length !== 1 ? 's' : ''}`;

  return (
    <View style={styles.container}>
      <View style={{ paddingTop: getTopBarInset(insets) }}>
        <NotionHeader
          title="Clientes"
          showBorder
          rightAction={
            canManageClients ? (
              <TouchableOpacity
                style={styles.newButton}
                onPress={() => router.push('/client/new')}
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
      ) : clients.length === 0 ? (
        <View style={styles.emptyState}>
          <View style={styles.emptyIconWrap}>
            <Ionicons name="person-outline" size={32} color={COLORS.textMuted} />
          </View>
          <Text style={styles.emptyTitle}>Nenhum cliente</Text>
          <Text style={styles.emptySubtitle}>Cadastre clientes pelo mapa ou aqui</Text>
          {canManageClients && (
            <TouchableOpacity
              style={styles.emptyButton}
              onPress={() => router.push('/client/new')}
              activeOpacity={0.85}
            >
              <Ionicons name="add" size={18} color="#fff" />
              <Text style={styles.emptyButtonText}>Novo cliente</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <PullToRefresh refreshing={refreshing} onRefresh={handleRefresh}>
          <FlatList
            data={filteredClients}
            keyExtractor={(item) => item.id}
            renderItem={renderClient}
            showsVerticalScrollIndicator={false}
            style={styles.listScroll}
            contentContainerStyle={{ paddingBottom: listBottom, flexGrow: 1 }}
            keyboardShouldPersistTaps="handled"
            ListHeaderComponent={
              <>
                <View style={styles.searchWrap}>
                  <SearchBar
                    value={search}
                    onChangeText={setSearch}
                    onClear={() => setSearch('')}
                    placeholder="Pesquisar cliente ou cidade..."
                  />
                  <CategoryPickerPill
                    categories={userCategories}
                    value={categoryFilter}
                    onChange={setCategoryFilter}
                  />
                </View>
                <Text style={styles.sectionLabel}>{countLabel}</Text>
              </>
            }
            ListEmptyComponent={
              <View style={styles.emptyStateInline}>
                <View style={styles.emptyIconWrap}>
                  <Ionicons
                    name={search.trim() ? 'search-outline' : 'person-outline'}
                    size={32}
                    color={COLORS.textMuted}
                  />
                </View>
                <Text style={styles.emptyTitle}>
                  {search.trim() ? 'Nenhum resultado' : 'Nenhum cliente nesta categoria'}
                </Text>
                <Text style={styles.emptySubtitle}>
                  {search.trim() ? 'Tente outro nome ou cidade' : 'Selecione outra categoria ou Todas'}
                </Text>
              </View>
            }
          />
        </PullToRefresh>
      )}
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
  searchWrap: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.xs,
    paddingBottom: SPACING.sm,
    backgroundColor: COLORS.backgroundSubtle,
    gap: SPACING.sm,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listScroll: {
    flex: 1,
  },
  sectionLabel: {
    color: COLORS.textMuted,
    fontSize: FONTS.sizes.xs,
    fontWeight: '600',
    letterSpacing: 0.6,
    marginBottom: SPACING.sm,
    marginHorizontal: SPACING.lg,
    paddingHorizontal: SPACING.xs,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    marginHorizontal: SPACING.lg,
    backgroundColor: COLORS.surface,
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderRightWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.surfaceBorder,
  },
  rowFirst: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopLeftRadius: RADIUS.lg,
    borderTopRightRadius: RADIUS.lg,
  },
  rowLast: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomLeftRadius: RADIUS.lg,
    borderBottomRightRadius: RADIUS.lg,
  },
  rowBorder: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.surfaceBorder,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.primaryBg,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  avatarText: {
    color: COLORS.primary,
    fontSize: FONTS.sizes.md,
    fontWeight: '700',
  },
  rowBody: {
    flex: 1,
    gap: 4,
  },
  rowTitle: {
    color: COLORS.textPrimary,
    fontSize: FONTS.sizes.md,
    fontWeight: '600',
  },
  rowMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  rowMetaText: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.sm,
    flex: 1,
  },
  rowPhone: {
    color: COLORS.textMuted,
    fontSize: FONTS.sizes.sm,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.xxl,
    gap: SPACING.sm,
  },
  emptyStateInline: {
    alignItems: 'center',
    paddingHorizontal: SPACING.xxl,
    paddingTop: SPACING.xl,
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
