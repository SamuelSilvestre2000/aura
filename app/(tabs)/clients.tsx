import React, { useMemo, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useClients } from '../../hooks/useClients';
import { useAuth } from '../../hooks/useAuth';
import { Client } from '../../types';
import { COLORS, FONTS, RADIUS, SPACING } from '../../constants/colors';
import { SearchBar } from '../../components/SearchBar';
import { TAB_BAR_CONTENT_HEIGHT } from '../../components/CustomTabBar';
import { CategoryPillRow } from '../../components/CategoryPill';
import { labelsFromCategoryIds } from '../../constants/categoryPills';
import { NotionHeader } from '../../components/NotionHeader';

export default function ClientsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { can: canDo } = useAuth();
  const canManageClients = canDo('manage_clients');
  const { clients, loading } = useClients();
  const [search, setSearch] = useState('');

  const listBottom = TAB_BAR_CONTENT_HEIGHT + insets.bottom + SPACING.lg;

  const filteredClients = useMemo(() => {
    if (!search.trim()) return clients;
    const q = search.toLowerCase();
    return clients.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.city.toLowerCase().includes(q) ||
        (c.phone && c.phone.includes(q))
    );
  }, [clients, search]);

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
          {labels.length > 0 ? (
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
    : `${clients.length} cliente${clients.length !== 1 ? 's' : ''}`;

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']}>
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
      </SafeAreaView>

      <View style={styles.searchWrap}>
        <SearchBar
          value={search}
          onChangeText={setSearch}
          onClear={() => setSearch('')}
          placeholder="Pesquisar cliente ou cidade..."
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
            {search.trim() ? 'Nenhum resultado' : 'Nenhum cliente'}
          </Text>
          <Text style={styles.emptySubtitle}>
            {search.trim()
              ? 'Tente outro nome ou cidade'
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
        <View style={[styles.listWrap, { paddingBottom: listBottom }]}>
          <Text style={styles.sectionLabel}>{countLabel}</Text>
          <View style={styles.cardList}>
            <FlatList
              data={filteredClients}
              keyExtractor={(item) => item.id}
              renderItem={renderClient}
              showsVerticalScrollIndicator={false}
              style={styles.cardFlatList}
              keyboardShouldPersistTaps="handled"
            />
          </View>
          {canManageClients && (
            <TouchableOpacity
              style={styles.addRow}
              onPress={() => router.push('/client/new')}
              activeOpacity={0.7}
            >
              <Ionicons name="add" size={18} color={COLORS.textMuted} />
              <Text style={styles.addRowText}>Novo cliente</Text>
            </TouchableOpacity>
          )}
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
