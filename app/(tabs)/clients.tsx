import React, { useMemo, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getScreenTopInset } from '../../utils/safeArea';
import { useClients } from '../../hooks/useClients';
import { useAuth } from '../../hooks/useAuth';
import { useCategoryFilter } from '../../hooks/useCategoryFilter';
import { Client } from '../../types';
import { COLORS, FONTS, RADIUS, SPACING } from '../../constants/colors';
import { SearchBar } from '../../components/SearchBar';
import { CategoryPickerPill } from '../../components/CategoryPickerPill';
import { getTabBarBottomInset } from '../../components/CustomTabBar';
import { CategoryPillRow } from '../../components/CategoryPill';
import { labelsFromCategoryIds } from '../../constants/categoryPills';
import { NotionHeader } from '../../components/NotionHeader';
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
  const { clients, loading } = useClients();
  const [search, setSearch] = useState('');

  const listBottom = getTabBarBottomInset(insets);

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
    return (
      <TouchableOpacity
        style={[styles.row, index > 0 && styles.rowBorder]}
        activeOpacity={0.7}
        onPress={() => router.push(`/client/${item.id}`)}
      >
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{item.name.charAt(0).toUpperCase()}</Text>
        </View>
        <View style={styles.rowBody}>
          <Text style={styles.rowTitle} numberOfLines={1}>{item.name}</Text>
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
      <View style={{ paddingTop: getScreenTopInset(insets) }}>
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

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : filteredClients.length === 0 ? (
        <View style={styles.emptyState}>
          <View style={styles.emptyIconWrap}>
            <Ionicons
              name={search.trim() ? 'search-outline' : 'person-outline'}
              size={32}
              color={COLORS.textMuted}
            />
          </View>
          <Text style={styles.emptyTitle}>
            {search.trim()
              ? 'Nenhum resultado'
              : categoryScopedClients.length === 0 && clients.length > 0
                ? 'Nenhum cliente nesta categoria'
                : 'Nenhum cliente'}
          </Text>
          <Text style={styles.emptySubtitle}>
            {search.trim()
              ? 'Tente outro nome ou cidade'
              : categoryScopedClients.length === 0 && clients.length > 0
                ? 'Selecione outra categoria ou Todas'
                : 'Cadastre clientes pelo mapa ou aqui'}
          </Text>
          {canManageClients && !search.trim() && (
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
        <View style={styles.listWrap}>
          <Text style={styles.sectionLabel}>{countLabel}</Text>
          <View style={styles.cardList}>
            <FlatList
              data={filteredClients}
              keyExtractor={(item) => item.id}
              renderItem={renderClient}
              showsVerticalScrollIndicator={false}
              style={styles.cardFlatList}
              contentContainerStyle={{ paddingBottom: listBottom }}
              keyboardShouldPersistTaps="handled"
            />
          </View>
        </View>
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
  listWrap: {
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
    alignItems: 'center',
    gap: SPACING.md,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    backgroundColor: COLORS.surface,
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
