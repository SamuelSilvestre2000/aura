import React, { useCallback, useMemo } from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import BottomSheet, { BottomSheetFlatList } from '@gorhom/bottom-sheet';
import { CityGeoData, Client, CityStatus, Collection } from '../../types';
import { STATUS_COLORS, COLORS, FONTS, RADIUS, SPACING } from '../../constants/colors';
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
}: Props) {
  const snapPoints = useMemo(() => ['40%', '70%', '92%'], []);
  const statusColor = STATUS_COLORS[cityStatus];

  const renderHeader = useCallback(() => {
    if (!selectedCity) return null;
    return (
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={styles.headerLeft}>
            <Text style={styles.cityName}>{selectedCity.name}</Text>
            <Text style={styles.clientCount}>
              {clients.length === 0
                ? 'Nenhum cliente cadastrado'
                : `${clients.length} cliente${clients.length !== 1 ? 's' : ''}`}
            </Text>
          </View>
          <View style={styles.headerRight}>
            <View style={[styles.statusPill, { backgroundColor: `${statusColor}18`, borderColor: `${statusColor}44` }]}>
              <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
              <Text style={[styles.statusText, { color: statusColor }]}>{STATUS_LABELS[cityStatus]}</Text>
            </View>
            {canManageClients && (
              <TouchableOpacity onPress={onAddClient} style={styles.addBtn} activeOpacity={0.8}>
                <Text style={styles.addBtnText}>+ Novo</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
        {activeCollection && (
          <View style={styles.collectionBadge}>
            <Text style={styles.collectionBadgeText}>{activeCollection.name}</Text>
          </View>
        )}
      </View>
    );
  }, [selectedCity, cityStatus, statusColor, clients.length, canManageClients, onAddClient, activeCollection]);

  const renderEmpty = useCallback(() => {
    if (clients.length > 0) return null;
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyTitle}>Nenhum cliente em {selectedCity?.name}</Text>
        <Text style={styles.emptySubtitle}>
          {canManageClients ? 'Adicione o primeiro cliente desta cidade.' : 'Nenhum cliente cadastrado aqui.'}
        </Text>
        {canManageClients && (
          <TouchableOpacity style={styles.emptyBtn} onPress={onAddClient} activeOpacity={0.8}>
            <Text style={styles.emptyBtnText}>+ Adicionar cliente</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }, [clients.length, selectedCity?.name, canManageClients, onAddClient]);

  const renderItem = useCallback(
    ({ item }: { item: Client }) => (
      <ClientCard
        client={item}
        collectionId={activeCollection?.id ?? null}
        purchased={activeCollection ? getPurchaseStatus(item.id, activeCollection.id) : false}
        onToggle={() => onTogglePurchase(item.id)}
      />
    ),
    [activeCollection, getPurchaseStatus, onTogglePurchase]
  );

  return (
    <BottomSheet
      ref={bottomSheetRef}
      index={-1}
      snapPoints={snapPoints}
      enablePanDownToClose
      onClose={onClose}
      backgroundStyle={styles.sheetBg}
      handleIndicatorStyle={styles.handle}
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
  sheet: { zIndex: 50, elevation: 50 },
  sheetBg: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderRightWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.surfaceBorder,
  },
  handle: {
    backgroundColor: COLORS.surfaceBorderStrong,
    width: 36,
    height: 4,
    borderRadius: 2,
  },
  header: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.surfaceBorder,
    gap: SPACING.sm,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: SPACING.md,
  },
  headerLeft: { flex: 1, gap: 2 },
  headerRight: { alignItems: 'flex-end', gap: SPACING.sm },
  cityName: {
    color: COLORS.textPrimary,
    fontSize: FONTS.sizes.xl,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  clientCount: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.sm,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
    borderWidth: 1,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: FONTS.sizes.xs, fontWeight: '600' },
  addBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.md,
    paddingVertical: 6,
  },
  addBtnText: { color: '#fff', fontWeight: '600', fontSize: FONTS.sizes.sm },
  collectionBadge: {
    alignSelf: 'flex-start',
    backgroundColor: COLORS.backgroundSubtle,
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
  },
  collectionBadgeText: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.xs,
    fontWeight: '500',
  },
  listContent: { flexGrow: 1, paddingBottom: 48 },
  empty: {
    alignItems: 'center',
    paddingHorizontal: SPACING.xxl,
    paddingVertical: SPACING.xxl,
    gap: SPACING.sm,
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
  emptyBtn: {
    marginTop: SPACING.md,
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
  },
  emptyBtnText: { color: '#fff', fontWeight: '600', fontSize: FONTS.sizes.md },
});
