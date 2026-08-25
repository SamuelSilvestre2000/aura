import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  SectionList,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getScreenBottomInset } from '../../utils/safeArea';
import { useClients } from '../../hooks/useClients';
import { useAuth } from '../../hooks/useAuth';
import { useCategoryFilter } from '../../hooks/useCategoryFilter';
import { usePanelNav } from '../../hooks/usePanelNav';
import { Client } from '../../types';
import ClientDetailScreen from '../client/[id]';
import NewClientScreen from '../client/new';
import { COLORS, FONTS, HIT_TARGET, RADIUS, SPACING } from '../../constants/colors';
import { SearchBar } from '../../components/SearchBar';
import { CategoryPickerPill } from '../../components/CategoryPickerPill';
import { labelsFromCategoryIds } from '../../constants/categoryPills';
import { PullToRefresh } from '../../components/PullToRefresh';
import { clientInitials, displayClientName, nameIndexLetter } from '../../utils/clientName';
import { filterClientsByCategory } from '../../utils/categoryFilter';
import { getAvatarColor } from '../../utils/avatarColor';
import { useIsDesktop } from '../../hooks/useIsDesktop';
import { useScreenTopInset } from '../../hooks/useScreenTopInset';

export default function ClientsScreen() {
  const nav = usePanelNav();
  const insets = useSafeAreaInsets();
  const isDesktop = useIsDesktop();
  const topInset = useScreenTopInset('tab');
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

  /**
   * Com centenas de clientes, uma lista plana obriga a rolar às cegas. Seções
   * por letra + o índice A–Z ao lado é como Contatos resolve o mesmo problema.
   * Durante uma busca não faz sentido seccionar: o resultado já é curto.
   */
  const isSearching = search.trim().length > 0;

  const sections = useMemo(() => {
    const byLetter = new Map<string, Client[]>();
    for (const client of filteredClients) {
      const letter = nameIndexLetter(displayClientName(client));
      const bucket = byLetter.get(letter);
      if (bucket) bucket.push(client);
      else byLetter.set(letter, [client]);
    }

    const collator = new Intl.Collator('pt-BR');
    return [...byLetter.entries()]
      .sort(([a], [b]) => (a === '#' ? 1 : b === '#' ? -1 : collator.compare(a, b)))
      .map(([title, data]) => ({
        title,
        data: data.sort((a, b) => collator.compare(displayClientName(a), displayClientName(b))),
      }));
  }, [filteredClients]);

  const listSections = useMemo(
    () => (isSearching ? [{ title: '', data: filteredClients }] : sections),
    [isSearching, filteredClients, sections]
  );

  const listRef = useRef<SectionList<Client>>(null);

  const jumpToSection = useCallback((sectionIndex: number) => {
    listRef.current?.scrollToLocation({ sectionIndex, itemIndex: 0, animated: false });
  }, []);

  /**
   * Título e uma linha de apoio, como em qualquer lista do sistema: o nome
   * carrega a identificação e o resto cabe numa frase. Telefone saiu — é ação,
   * não dado de lista, e mora na tela do cliente.
   */
  const renderClient = ({
    item,
    index,
    section,
  }: {
    item: Client;
    index: number;
    section: { data: readonly Client[] };
  }) => {
    const { labels } = labelsFromCategoryIds(item.categoryIds);
    const name = displayClientName(item);
    const isLast = index === section.data.length - 1;
    const subtitle = [`${item.city}, PI`, showCategoryBadges ? labels.join(', ') : '']
      .filter(Boolean)
      .join(' · ');

    return (
      <TouchableOpacity
        style={[
          styles.row,
          index === 0 && styles.rowFirst,
          index > 0 && styles.rowBorder,
          isLast && styles.rowLast,
        ]}
        activeOpacity={0.7}
        onPress={() =>
          nav.open(`client-${item.id}`, <ClientDetailScreen id={item.id} />, `/client/${item.id}`)
        }
      >
        <View style={[styles.avatar, { backgroundColor: getAvatarColor(item.id) }]}>
          <Text style={styles.avatarText}>{clientInitials(name)}</Text>
        </View>
        <View style={styles.rowBody}>
          <Text style={styles.rowTitle} numberOfLines={1}>{name}</Text>
          <Text style={styles.rowSubtitle} numberOfLines={1}>{subtitle}</Text>
        </View>
        <Ionicons name="chevron-forward" size={16} color={COLORS.textMuted} />
      </TouchableOpacity>
    );
  };

  const countLabel = search.trim()
    ? `${filteredClients.length} resultado${filteredClients.length !== 1 ? 's' : ''}`
    : `${categoryScopedClients.length} cliente${categoryScopedClients.length !== 1 ? 's' : ''}`;

  return (
    <View style={[styles.container, isDesktop && styles.containerDesktop]}>
      {/*
        Mesmo cabeçalho do painel de cidade: o nome da tela em corpo grande, a
        contagem como linha de apoio, e a ação num botão circular no canto — em
        vez de barra de navegação com título centralizado.
      */}
      <View style={[styles.titleRow, { paddingTop: topInset }]}>
        <View style={styles.titleBlock}>
          <Text style={styles.title}>Clientes</Text>
          <Text style={styles.subtitle}>{countLabel}</Text>
        </View>
        {canManageClients ? (
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => nav.open('client-new', <NewClientScreen />, '/client/new')}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Novo cliente"
          >
            <View style={styles.addCircle}>
              <Ionicons name="add" size={22} color={COLORS.primary} />
            </View>
          </TouchableOpacity>
        ) : null}
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
              onPress={() => nav.open('client-new', <NewClientScreen />, '/client/new')}
              activeOpacity={0.85}
            >
              <Ionicons name="add" size={18} color="#fff" />
              <Text style={styles.emptyButtonText}>Novo cliente</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <PullToRefresh refreshing={refreshing} onRefresh={handleRefresh}>
          <SectionList
            ref={listRef}
            sections={listSections}
            keyExtractor={(item) => item.id}
            renderItem={renderClient}
            renderSectionHeader={({ section }) =>
              section.title ? (
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionHeaderText}>{section.title}</Text>
                </View>
              ) : null
            }
            stickySectionHeadersEnabled
            showsVerticalScrollIndicator={false}
            style={styles.listScroll}
            contentContainerStyle={{ paddingBottom: listBottom, flexGrow: 1 }}
            keyboardShouldPersistTaps="handled"
            ListHeaderComponent={
              <>
                <View style={[styles.searchWrap, isDesktop && styles.containerDesktop]}>
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
              </>
            }
            ListFooterComponent={<View style={styles.listFooterSpace} />}
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

      {!isSearching && sections.length > 1 ? (
        <View style={styles.indexBar}>
          {sections.map((section, sectionIndex) => (
            <TouchableOpacity
              key={section.title}
              onPress={() => jumpToSection(sectionIndex)}
              hitSlop={6}
              style={styles.indexTouch}
              accessibilityRole="button"
              accessibilityLabel={`Ir para ${section.title}`}
            >
              <Text style={styles.indexLetter}>{section.title}</Text>
            </TouchableOpacity>
          ))}
        </View>
      ) : null}
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
  // A divisória começa alinhada ao texto, não sob o avatar: é o que dá à lista
  // o ritmo de coluna em vez de fatiar a linha inteira.
  rowBorder: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.surfaceBorder,
    marginLeft: 36 + SPACING.md,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  rowBody: {
    flex: 1,
    gap: 4,
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: FONTS.sizes.sm,
    fontWeight: '600',
  },
  rowTitle: {
    color: COLORS.textPrimary,
    fontSize: FONTS.sizes.lg,
    fontWeight: '600',
  },
  rowSubtitle: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.md,
  },
  sectionHeader: {
    backgroundColor: COLORS.backgroundSubtle,
    paddingHorizontal: SPACING.lg,
    paddingVertical: 3,
  },
  sectionHeaderText: {
    ...FONTS.text.sectionHeader,
    color: COLORS.textSecondary,
  },
  listFooterSpace: {
    height: SPACING.lg,
  },
  indexBar: {
    position: 'absolute',
    right: 2,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: SPACING.xl,
  },
  indexTouch: {
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  indexLetter: {
    color: COLORS.primary,
    fontSize: 11,
    fontWeight: '600',
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
