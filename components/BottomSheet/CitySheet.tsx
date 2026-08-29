import React, { useCallback, useMemo } from 'react';
import { StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import BottomSheet, { BottomSheetFlatList } from '@gorhom/bottom-sheet';
import { Ionicons } from '@expo/vector-icons';
import { CityGeoData, Client, CityStatus, Collection, Sale } from '../../types';
import {
  STATUS_COLORS,
  STATUS_ICONS,
  STATUS_TEXT_COLORS,
  COLORS,
  FONTS,
  HIT_TARGET,
  RADIUS,
  SPACING,
} from '../../constants/colors';
import { useCityExclusions } from '../../hooks/useCityExclusions';
import { isCollectionClosed } from '../../utils/collectionStatus';
import { formatBRL } from '../../utils/money';
import { ClientCard } from './ClientCard';

type Props = {
  bottomSheetRef: React.RefObject<BottomSheet>;
  selectedCity: CityGeoData | null;
  cityStatus: CityStatus;
  clients: Client[];
  activeCollection: Collection | null;
  onTogglePurchase: (clientId: string) => void;
  getPurchaseStatus: (clientId: string, collectionId: string) => boolean;
  getSaleForClientCollection: (clientId: string, collectionId: string) => Sale | undefined;
  onAddClient: () => void;
  onClose: () => void;
  canManageClients?: boolean;
  showCategoryBadges?: boolean;
  /** Espaço (em px) reservado no topo que o sheet nunca deve cobrir. */
  topInset?: number;
  /** Cliente encontrado pela busca — recebe destaque visual na lista. */
  highlightedClientId?: string | null;
};

const STATUS_LABELS: Record<CityStatus, string> = {
  all: 'Todos compraram',
  partial: 'Compras parciais',
  none: 'Nenhum comprou',
  'no-clients': 'Sem clientes',
};

export function CitySheet({
  bottomSheetRef,
  selectedCity,
  cityStatus,
  clients,
  activeCollection,
  onTogglePurchase,
  getPurchaseStatus,
  getSaleForClientCollection,
  onAddClient,
  onClose,
  canManageClients = true,
  showCategoryBadges = true,
  topInset = 0,
  highlightedClientId = null,
}: Props) {
  const snapPoints = useMemo(() => ['40%', '70%', '100%'], []);
  const statusColor = STATUS_TEXT_COLORS[cityStatus];
  const statusIcon = STATUS_ICONS[cityStatus];

  const countLabel =
    clients.length === 0
      ? 'Nenhum cliente'
      : `${clients.length} cliente${clients.length !== 1 ? 's' : ''}`;

  /** Mesmos números do painel do desktop (CityDetailsPanel). */
  const { boughtCount, totalSold } = useMemo(() => {
    if (!activeCollection) return { boughtCount: 0, totalSold: 0 };
    let bought = 0;
    let sold = 0;
    for (const client of clients) {
      if (getPurchaseStatus(client.id, activeCollection.id)) bought += 1;
      sold += getSaleForClientCollection(client.id, activeCollection.id)?.amount ?? 0;
    }
    return { boughtCount: bought, totalSold: sold };
  }, [activeCollection, clients, getPurchaseStatus, getSaleForClientCollection]);

  const collectionEndLabel = useMemo(() => {
    if (!activeCollection?.endDate) return null;
    const date = new Date(activeCollection.endDate);
    if (Number.isNaN(date.getTime())) return null;
    const label = date.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' });
    return `até ${label.replace('.', '')}`;
  }, [activeCollection]);

  /**
   * Mesmo cabeçalho do painel do desktop (CityDetailsPanel): título da praça
   * em corpo grande, status, coleção e o progresso num cartão. Aqui não há X —
   * a folha fecha arrastando, que é o gesto da própria folha.
   */
  const { isCityExcluded, setCityExcluded } = useCityExclusions();
  const excluded = selectedCity ? isCityExcluded(selectedCity.code) : false;

  const renderHeader = useCallback(() => {
    if (!selectedCity) return null;
    return (
      <View style={styles.header}>
        {/*
          Criar cliente mora na quina do cabeçalho, como nas telas de Clientes e
          Coleções. Aqui a quina é do criar: quem fecha a folha é o arraste.
        */}
        <View style={styles.titleRow}>
          <View style={styles.titleBlock}>
            <Text style={styles.title} numberOfLines={1}>
              {selectedCity.name}
            </Text>
            <Text style={styles.subtitle}>Piauí · {countLabel}</Text>
          </View>
          {canManageClients ? (
            <TouchableOpacity
              onPress={onAddClient}
              style={styles.addButton}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={`Novo cliente em ${selectedCity.name}`}
            >
              <View style={styles.addCircle}>
                <Ionicons name="add" size={22} color={COLORS.primary} />
              </View>
            </TouchableOpacity>
          ) : null}
        </View>

        <View
          style={[
            styles.statusChip,
            { backgroundColor: `${STATUS_COLORS[cityStatus]}28` },
          ]}
        >
          <Ionicons name={statusIcon} size={14} color={statusColor} />
          <Text style={[styles.statusText, { color: statusColor }]}>
            {STATUS_LABELS[cityStatus]}
          </Text>
        </View>

        {activeCollection ? (
          <View style={styles.collectionRow}>
            <Ionicons name="albums-outline" size={17} color={COLORS.primary} />
            <Text style={styles.collectionName} numberOfLines={1}>
              {activeCollection.name}
            </Text>
            {collectionEndLabel ? (
              <Text style={styles.collectionPeriod}>{collectionEndLabel}</Text>
            ) : null}
          </View>
        ) : null}

        {activeCollection && clients.length > 0 ? (
          <View style={styles.progressCard}>
            <View style={styles.progressTop}>
              <Text style={styles.progressCount}>
                <Text style={styles.progressCountStrong}>{boughtCount}</Text>
                {' de '}
                {clients.length} compraram
              </Text>
              <Text style={styles.progressAmount}>{formatBRL(totalSold)}</Text>
            </View>
            <View style={styles.progressTrack}>
              {boughtCount > 0 ? (
                <View style={[styles.progressFill, { flex: boughtCount }]} />
              ) : null}
              {clients.length - boughtCount > 0 ? (
                <View style={[styles.progressRest, { flex: clients.length - boughtCount }]} />
              ) : null}
            </View>
          </View>
        ) : null}

        {/*
          A cidade pode simplesmente não comportar a marca: sem economia local,
          não há lojista para vender. Sem declarar isso, ela fica vermelha no
          mapa como qualquer cidade sem venda, e o mapa passa a cobrar uma
          venda que não existe para ser feita.
        */}
        {canManageClients ? (
          <View style={styles.viabilityRow}>
            <View style={styles.viabilityInfo}>
              <Text style={styles.viabilityTitle}>Cidade sem praça para a marca</Text>
              <Text style={styles.viabilitySubtitle}>
                {excluded
                  ? 'Aparece esmaecida no mapa, fora da cobrança de vendas'
                  : 'Marque se a cidade não tem economia para uma loja da marca'}
              </Text>
            </View>
            <Switch
              value={excluded}
              onValueChange={(next) => void setCityExcluded(selectedCity.code, next)}
              trackColor={{ false: COLORS.surfaceBorderStrong, true: COLORS.textMuted }}
              thumbColor="#fff"
            />
          </View>
        ) : null}

        {clients.length > 0 ? <Text style={styles.sectionLabel}>Clientes</Text> : null}
      </View>
    );
  }, [
    selectedCity,
    cityStatus,
    statusColor,
    statusIcon,
    countLabel,
    canManageClients,
    onAddClient,
    excluded,
    setCityExcluded,
    activeCollection,
    collectionEndLabel,
    boughtCount,
    totalSold,
    clients.length,
  ]);

  const renderEmpty = useCallback(() => {
    if (clients.length > 0) return null;
    return (
      <View style={styles.empty}>
        <View style={styles.emptyIconWrap}>
          <Ionicons name="storefront-outline" size={32} color={COLORS.textMuted} />
        </View>
        <Text style={styles.emptyTitle}>Nenhum cliente em {selectedCity?.name}</Text>
        <Text style={styles.emptySubtitle}>
          {canManageClients
            ? 'Cadastre o primeiro cliente desta cidade para acompanhar no mapa.'
            : 'Nenhum cliente cadastrado nesta cidade.'}
        </Text>
        {canManageClients && (
          <TouchableOpacity style={styles.addRow} onPress={onAddClient} activeOpacity={0.7}>
            <Ionicons name="add" size={18} color={COLORS.textMuted} />
            <Text style={styles.addRowText}>Novo cliente</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }, [clients.length, selectedCity?.name, canManageClients, onAddClient]);

  const collectionClosed = activeCollection ? isCollectionClosed(activeCollection) : false;

  const renderItem = useCallback(
    ({ item, index }: { item: Client; index: number }) => (
      <ClientCard
        client={item}
        index={index}
        isLast={index === clients.length - 1}
        collectionId={activeCollection?.id ?? null}
        purchased={activeCollection ? getPurchaseStatus(item.id, activeCollection.id) : false}
        onToggle={() => onTogglePurchase(item.id)}
        showCategoryBadges={showCategoryBadges}
        highlighted={item.id === highlightedClientId}
        closed={collectionClosed}
        saleAmount={
          activeCollection ? getSaleForClientCollection(item.id, activeCollection.id)?.amount : undefined
        }
      />
    ),
    [
      activeCollection,
      clients.length,
      getPurchaseStatus,
      getSaleForClientCollection,
      onTogglePurchase,
      showCategoryBadges,
      highlightedClientId,
      collectionClosed,
    ]
  );

  return (
    <BottomSheet
      ref={bottomSheetRef}
      index={-1}
      topInset={topInset}
      snapPoints={snapPoints}
      enablePanDownToClose
      enableOverDrag={false}
      onClose={onClose}
      backgroundStyle={styles.sheetBg}
      handleIndicatorStyle={styles.handle}
      containerStyle={styles.sheetContainer}
      style={styles.sheet}
    >
      <BottomSheetFlatList
        data={clients}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        ListHeaderComponent={renderHeader}
          ListEmptyComponent={renderEmpty}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  sheetContainer: { zIndex: 50, elevation: 50 },
  sheet: { zIndex: 50, elevation: 50 },
  sheetBg: {
    backgroundColor: COLORS.backgroundSubtle,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.surfaceBorder,
  },
  handle: {
    backgroundColor: COLORS.surfaceBorderStrong,
    width: 36,
    height: 4,
    borderRadius: 2,
  },
  header: {
    marginHorizontal: -SPACING.lg,
    paddingBottom: SPACING.sm,
    gap: SPACING.sm,
    backgroundColor: COLORS.backgroundSubtle,
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
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.md,
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
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.md,
  },
  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 5,
    height: 26,
    paddingLeft: SPACING.sm,
    paddingRight: SPACING.md,
    borderRadius: RADIUS.full,
  },
  collectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    minHeight: 24,
  },
  collectionName: {
    flex: 1,
    minWidth: 0,
    color: COLORS.textPrimary,
    fontSize: FONTS.sizes.lg,
    fontWeight: '600',
  },
  collectionPeriod: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.sm,
  },
  progressCard: {
    gap: SPACING.sm,
    padding: SPACING.md,
    borderRadius: RADIUS.xl,
    backgroundColor: COLORS.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.surfaceBorder,
  },
  progressTop: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: SPACING.sm,
  },
  progressCount: {
    ...FONTS.tabular,
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.md,
  },
  progressCountStrong: {
    ...FONTS.text.title1,
    color: COLORS.textPrimary,
  },
  progressAmount: {
    ...FONTS.tabular,
    color: COLORS.textPrimary,
    fontSize: FONTS.sizes.lg,
    fontWeight: '600',
  },
  progressTrack: {
    flexDirection: 'row',
    gap: 3,
    height: 6,
  },
  progressFill: {
    borderRadius: 3,
    backgroundColor: STATUS_COLORS.all,
  },
  progressRest: {
    borderRadius: 3,
    backgroundColor: COLORS.fillStrong,
  },
  statusText: { fontSize: FONTS.sizes.md, fontWeight: '600' },
  // Cabeçalho de seção da lista, no mesmo estilo das outras telas.
  viabilityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    paddingVertical: SPACING.md,
  },
  viabilityInfo: { flex: 1 },
  viabilityTitle: {
    color: COLORS.textPrimary,
    fontSize: FONTS.sizes.md,
    fontWeight: '500',
  },
  viabilitySubtitle: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.sm,
    marginTop: 2,
  },
  sectionLabel: {
    ...FONTS.text.sectionHeader,
    color: COLORS.textSecondary,
    paddingHorizontal: SPACING.lg,
    marginTop: SPACING.xs,
  },
  listContent: {
    flexGrow: 1,
    paddingBottom: 48,
    paddingHorizontal: SPACING.lg,
    backgroundColor: COLORS.backgroundSubtle,
  },
  empty: {
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.xxl,
    gap: SPACING.sm,
  },
  emptyIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.surfaceBorder,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  emptyTitle: {
    color: COLORS.textPrimary,
    fontSize: FONTS.sizes.lg,
    fontWeight: '600',
    textAlign: 'center',
  },
  // Usados no estado vazio (renderEmpty), quando a cidade nao tem cliente.
  addRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginTop: SPACING.lg,
    minHeight: HIT_TARGET,
    paddingVertical: SPACING.md,
  },
  addRowText: {
    color: COLORS.primary,
    fontSize: FONTS.sizes.lg,
  },
  emptySubtitle: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.sm,
    textAlign: 'center',
    lineHeight: 20,
  },
});
