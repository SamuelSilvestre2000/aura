import React, { useCallback, useMemo } from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import BottomSheet, { BottomSheetFlatList } from '@gorhom/bottom-sheet';
import { Ionicons } from '@expo/vector-icons';
import { CityGeoData, Client, CityStatus, Collection } from '../../types';
import { STATUS_COLORS, COLORS, FONTS, RADIUS, SPACING } from '../../constants/colors';
import { NotionHeader } from '../NotionHeader';
import { ClientCard } from './ClientCard';

type Props = {
  bottomSheetRef: React.RefObject<BottomSheet>;
  selectedCity: CityGeoData | null;
  cityStatus: CityStatus;
  clients: Client[];
  activeCollection: Collection | null;
  onTogglePurchase: (clientId: string) => void;
  getPurchaseStatus: (clientId: string, collectionId: string) => boolean;
  onAddClient: () => void;
  onClose: () => void;
  canManageClients?: boolean;
  showCategoryBadges?: boolean;
  /** Espaço (em px) reservado no topo que o sheet nunca deve cobrir. */
  topInset?: number;
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
  onAddClient,
  onClose,
  canManageClients = true,
  showCategoryBadges = true,
  topInset = 0,
}: Props) {
  const snapPoints = useMemo(() => ['40%', '70%', '100%'], []);
  const statusColor = STATUS_COLORS[cityStatus];

  const countLabel =
    clients.length === 0
      ? 'Nenhum cliente'
      : `${clients.length} cliente${clients.length !== 1 ? 's' : ''}`;

  const renderHeader = useCallback(() => {
    if (!selectedCity) return null;
    return (
      <View style={styles.header}>
        <NotionHeader
          title={selectedCity.name}
          showBorder
          rightAction={
            canManageClients ? (
              <TouchableOpacity
                onPress={onAddClient}
                style={styles.newButton}
                activeOpacity={0.7}
                hitSlop={8}
              >
                <Text style={styles.newButtonText}>Adicionar</Text>
              </TouchableOpacity>
            ) : undefined
          }
        />

        <View style={styles.metaRow}>
          <View style={[styles.statusPill, { borderColor: `${statusColor}55` }]}>
            <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
            <Text style={[styles.statusText, { color: statusColor }]}>
              {STATUS_LABELS[cityStatus]}
            </Text>
          </View>
          {activeCollection && (
            <View style={styles.collectionPill}>
              <Ionicons name="albums-outline" size={13} color={COLORS.textMuted} />
              <Text style={styles.collectionPillText} numberOfLines={1}>
                {activeCollection.name}
              </Text>
            </View>
          )}
        </View>

        {clients.length > 0 && (
          <Text style={styles.sectionLabel}>{countLabel}</Text>
        )}
      </View>
    );
  }, [
    selectedCity,
    cityStatus,
    statusColor,
    countLabel,
    canManageClients,
    onAddClient,
    activeCollection,
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
      />
    ),
    [activeCollection, clients.length, getPurchaseStatus, onTogglePurchase, showCategoryBadges]
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
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.lg,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
    borderWidth: StyleSheet.hairlineWidth,
    backgroundColor: COLORS.surface,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: FONTS.sizes.xs, fontWeight: '600' },
  collectionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.surfaceBorder,
    backgroundColor: COLORS.surface,
    maxWidth: 160,
  },
  collectionPillText: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.xs,
    fontWeight: '500',
    flexShrink: 1,
  },
  sectionLabel: {
    color: COLORS.textMuted,
    fontSize: FONTS.sizes.xs,
    fontWeight: '600',
    letterSpacing: 0.6,
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
  emptySubtitle: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.sm,
    textAlign: 'center',
    lineHeight: 20,
  },
  addRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginTop: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  addRowText: {
    color: COLORS.textMuted,
    fontSize: FONTS.sizes.sm,
    fontWeight: '500',
  },
});
