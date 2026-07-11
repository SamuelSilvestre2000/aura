import React, { useCallback, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Alert } from '../../utils/alert';
import { goBack } from '../../utils/navigation';
import { getScreenTopInset } from '../../utils/safeArea';
import { useClients } from '../../hooks/useClients';
import { useAuth } from '../../hooks/useAuth';
import { useCategoryFilter } from '../../hooks/useCategoryFilter';
import { useCollections } from '../../hooks/useCollections';
import { usePurchases } from '../../hooks/usePurchases';
import { NotionHeader } from '../../components/NotionHeader';
import { HeaderBackButton } from '../../components/HeaderBackButton';
import { HeaderLinkButton } from '../../components/HeaderLinkButton';
import { CategoryPillRow } from '../../components/CategoryPill';
import { labelsFromCategoryIds } from '../../constants/categoryPills';
import { PurchaseChip } from '../../components/PurchaseChip';
import { PullToRefresh } from '../../components/PullToRefresh';
import { SaleSheet } from '../../components/SaleSheet';
import { isCollectionClosed } from '../../utils/collectionStatus';
import { COLORS, FONTS, RADIUS, SPACING } from '../../constants/colors';
import { formatBRL } from '../../utils/money';
import { formatCnpj } from '../../utils/cnpj';

type SaleTarget = {
  collectionId: string;
  collectionName: string;
};

export default function ClientDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const { clients, deleteClient, loading: clientsLoading, refresh: refreshClients } = useClients();
  const { can: canDo, user } = useAuth();
  const { categories: userCategories } = useCategoryFilter();
  const canManageClients = canDo('manage_clients');
  const showCategoryBadges = userCategories.length > 1;
  const { collections, refresh: refreshCollections } = useCollections();
  const {
    getPurchaseStatus,
    getSaleForClientCollection,
    recordSale,
    clearSale,
    refresh: refreshPurchases,
  } = usePurchases();

  const [saleTarget, setSaleTarget] = useState<SaleTarget | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  /**
   * Cada tela mantém sua própria cópia local dos dados — sem isso, criar,
   * editar ou remover cliente/coleção/venda em outra tela não refletia aqui
   * até recarregar a página inteira.
   */
  useFocusEffect(
    useCallback(() => {
      void refreshClients();
      void refreshCollections();
      void refreshPurchases();
    }, [refreshClients, refreshCollections, refreshPurchases])
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([refreshClients(), refreshCollections(), refreshPurchases()]);
    } finally {
      setRefreshing(false);
    }
  };

  const client = clients.find((c) => c.id === id);

  const handleDelete = () => {
    Alert.alert(
      'Remover cliente',
      `Deseja remover "${client?.name}"? Isso apagará todas as compras registradas.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Remover',
          style: 'destructive',
          onPress: async () => {
            if (id) {
              await deleteClient(id);
              goBack(router);
            }
          },
        },
      ]
    );
  };

  const handleCall = () => {
    if (client?.phone) Linking.openURL(`tel:${client.phone}`);
  };

  const handleWhatsApp = () => {
    if (client?.phone) {
      const phone = client.phone.replace(/\D/g, '');
      Linking.openURL(`whatsapp://send?phone=55${phone}`);
    }
  };

  if (clientsLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (!client) {
    return (
      <View style={styles.center}>
        <Ionicons name="person-outline" size={40} color={COLORS.textMuted} />
        <Text style={styles.notFoundText}>Cliente não encontrado</Text>
        <TouchableOpacity onPress={() => goBack(router)} style={styles.outlineButton}>
          <Ionicons name="arrow-back" size={16} color={COLORS.primary} />
          <Text style={styles.outlineButtonText}>Voltar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const { labels, slugs } = labelsFromCategoryIds(client.categoryIds);
  const boughtCount = collections.filter((col) =>
    getPurchaseStatus(client.id, col.id)
  ).length;
  const openCollections = collections.filter((col) => !isCollectionClosed(col));

  return (
    <View style={styles.container}>
      <View style={[styles.headerSafe, { paddingTop: getScreenTopInset(insets) }]}>
        <NotionHeader
          title={client.name}
          showBorder
          compact
          leftAction={<HeaderBackButton onPress={() => goBack(router)} />}
          rightAction={
            canManageClients ? (
              <HeaderLinkButton
                label="Editar"
                onPress={() => router.push(`/client/edit?id=${client.id}`)}
              />
            ) : undefined
          }
        />
      </View>

      <PullToRefresh refreshing={refreshing} onRefresh={handleRefresh}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{client.name.charAt(0).toUpperCase()}</Text>
          </View>
          <Text style={styles.clientName}>{client.name}</Text>
          {showCategoryBadges && labels.length > 0 ? (
            <CategoryPillRow labels={labels} slugs={slugs} />
          ) : null}
          <View style={styles.locationRow}>
            <Ionicons name="location-outline" size={14} color={COLORS.textMuted} />
            <Text style={styles.locationText}>{client.city}, PI</Text>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{collections.length}</Text>
              <Text style={styles.statLabel}>Coleções</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.stat}>
              <Text style={[styles.statValue, styles.statSuccess]}>{boughtCount}</Text>
              <Text style={styles.statLabel}>Compradas</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.stat}>
              <Text style={[styles.statValue, styles.statPending]}>
                {collections.length - boughtCount}
              </Text>
              <Text style={styles.statLabel}>Pendentes</Text>
            </View>
          </View>
        </View>

        {client.phone || client.cnpj ? (
          <View style={styles.section}>
            <Text style={styles.sectionLabelOutside}>CONTATO</Text>
            <View style={styles.card}>
              {client.cnpj ? (
                <>
                  <View style={styles.infoRow}>
                    <View style={styles.infoIconWrap}>
                      <Ionicons name="document-text-outline" size={18} color={COLORS.textSecondary} />
                    </View>
                    <View style={styles.infoBody}>
                      <Text style={styles.infoLabel}>CNPJ</Text>
                      <Text style={styles.infoValue}>{formatCnpj(client.cnpj)}</Text>
                    </View>
                  </View>
                  {client.phone ? <View style={styles.rowDivider} /> : null}
                </>
              ) : null}
              {client.phone ? (
                <>
                  <View style={styles.infoRow}>
                    <View style={styles.infoIconWrap}>
                      <Ionicons name="call-outline" size={18} color={COLORS.textSecondary} />
                    </View>
                    <View style={styles.infoBody}>
                      <Text style={styles.infoLabel}>Telefone</Text>
                      <Text style={styles.infoValue}>{client.phone}</Text>
                    </View>
                  </View>
                  <View style={styles.rowDivider} />
                  <TouchableOpacity style={styles.actionRow} onPress={handleCall} activeOpacity={0.7}>
                    <Text style={styles.actionLink}>Ligar</Text>
                  </TouchableOpacity>
                  <View style={styles.rowDivider} />
                  <TouchableOpacity style={styles.actionRow} onPress={handleWhatsApp} activeOpacity={0.7}>
                    <Text style={[styles.actionLink, styles.whatsappLink]}>WhatsApp</Text>
                  </TouchableOpacity>
                </>
              ) : null}
            </View>
          </View>
        ) : null}

        {client.notes ? (
          <View style={styles.section}>
            <Text style={styles.sectionLabelOutside}>OBSERVAÇÕES</Text>
            <View style={styles.card}>
              <Text style={styles.notesText}>{client.notes}</Text>
            </View>
          </View>
        ) : null}

        <View style={styles.section}>
          <Text style={styles.sectionLabelOutside}>COLEÇÕES</Text>
          {collections.length === 0 ? (
            <View style={styles.card}>
              <Text style={styles.emptyText}>Nenhuma coleção cadastrada</Text>
            </View>
          ) : (
            <View style={styles.card}>
              {collections.map((col, index) => {
                const purchased = getPurchaseStatus(client.id, col.id);
                const sale = getSaleForClientCollection(client.id, col.id);
                const closed = isCollectionClosed(col);
                return (
                  <React.Fragment key={col.id}>
                    {index > 0 && <View style={styles.rowDivider} />}
                    <TouchableOpacity
                      style={[styles.collectionRow, closed && styles.collectionRowClosed]}
                      onPress={() => {
                        if (closed) return;
                        setSaleTarget({ collectionId: col.id, collectionName: col.name });
                      }}
                      activeOpacity={closed ? 1 : 0.7}
                      disabled={closed}
                    >
                      <View style={styles.collectionIcon}>
                        <Ionicons
                          name={closed ? 'lock-closed-outline' : 'albums-outline'}
                          size={18}
                          color={closed ? COLORS.textMuted : COLORS.textSecondary}
                        />
                      </View>
                      <View style={styles.collectionInfo}>
                        <Text style={[styles.collectionName, closed && styles.collectionNameClosed]}>
                          {col.name}
                        </Text>
                        {closed ? (
                          <Text style={styles.collectionMeta}>Coleção fechada</Text>
                        ) : sale ? (
                          <Text style={styles.collectionAmount}>{formatBRL(sale.amount)}</Text>
                        ) : null}
                      </View>
                      {!closed ? <PurchaseChip purchased={purchased} /> : null}
                    </TouchableOpacity>
                  </React.Fragment>
                );
              })}
            </View>
          )}
          {openCollections.length === 0 && collections.length > 0 ? (
            <Text style={styles.sectionHint}>
              Todas as coleções estão fechadas — vendas não podem ser alteradas.
            </Text>
          ) : null}
        </View>

        {canManageClients && (
          <View style={styles.section}>
            <Text style={styles.sectionLabelOutside}>ADMINISTRAÇÃO</Text>
            <View style={styles.dangerCard}>
              <TouchableOpacity style={styles.dangerRow} onPress={handleDelete} activeOpacity={0.7}>
                <View style={styles.dangerIconWrap}>
                  <Ionicons name="trash-outline" size={20} color={COLORS.error} />
                </View>
                <View style={styles.dangerInfo}>
                  <Text style={styles.dangerTitle}>Remover cliente</Text>
                  <Text style={styles.dangerSubtitle}>
                    Apaga o cliente e todas as compras registradas
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={COLORS.textMuted} />
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>
      </PullToRefresh>

      <SaleSheet
        visible={saleTarget != null}
        clientName={client.name}
        collectionName={saleTarget?.collectionName ?? ''}
        purchased={
          saleTarget ? getPurchaseStatus(client.id, saleTarget.collectionId) : false
        }
        initialAmount={
          saleTarget
            ? getSaleForClientCollection(client.id, saleTarget.collectionId)?.amount ?? 0
            : 0
        }
        onClose={() => setSaleTarget(null)}
        onSave={async (amount) => {
          if (!saleTarget || !user) return;
          await recordSale(client.id, saleTarget.collectionId, user.id, amount);
          await refreshCollections();
        }}
        onClear={async () => {
          if (!saleTarget) return;
          await clearSale(client.id, saleTarget.collectionId);
          await refreshCollections();
        }}
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
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.primaryBg,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  avatarText: {
    color: COLORS.primary,
    fontSize: FONTS.sizes.xl,
    fontWeight: '700',
  },
  clientName: {
    color: COLORS.textPrimary,
    fontSize: FONTS.sizes.lg,
    fontWeight: '600',
    textAlign: 'center',
    letterSpacing: -0.2,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: SPACING.xs,
  },
  locationText: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.sm,
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
    fontSize: FONTS.sizes.xl,
    fontWeight: '700',
  },
  statSuccess: { color: COLORS.success },
  statPending: { color: COLORS.textSecondary },
  statLabel: {
    color: COLORS.textMuted,
    fontSize: FONTS.sizes.xs,
    marginTop: 2,
    fontWeight: '500',
  },
  statDivider: {
    width: StyleSheet.hairlineWidth,
    height: 28,
    backgroundColor: COLORS.surfaceBorder,
  },
  section: { gap: SPACING.sm },
  sectionLabelOutside: {
    color: COLORS.textMuted,
    fontSize: FONTS.sizes.xs,
    fontWeight: '600',
    letterSpacing: 0.6,
    paddingHorizontal: SPACING.xs,
  },
  sectionHint: {
    color: COLORS.textMuted,
    fontSize: FONTS.sizes.xs,
    paddingHorizontal: SPACING.xs,
    lineHeight: 18,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.surfaceBorder,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.lg,
    gap: SPACING.md,
  },
  infoIconWrap: {
    width: 28,
    alignItems: 'center',
  },
  infoBody: { flex: 1, gap: 2 },
  infoLabel: {
    color: COLORS.textMuted,
    fontSize: FONTS.sizes.xs,
    fontWeight: '600',
    letterSpacing: 0.4,
  },
  infoValue: {
    color: COLORS.textPrimary,
    fontSize: FONTS.sizes.md,
    fontWeight: '500',
  },
  actionRow: {
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
  },
  actionLink: {
    color: COLORS.primary,
    fontSize: FONTS.sizes.sm,
    fontWeight: '600',
  },
  whatsappLink: {
    color: '#25D366',
  },
  notesText: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.md,
    lineHeight: 22,
    padding: SPACING.lg,
  },
  emptyText: {
    color: COLORS.textMuted,
    fontSize: FONTS.sizes.sm,
    padding: SPACING.lg,
    textAlign: 'center',
  },
  collectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    gap: SPACING.md,
  },
  collectionRowClosed: {
    opacity: 0.65,
  },
  collectionIcon: {
    width: 28,
    alignItems: 'center',
  },
  collectionInfo: {
    flex: 1,
    gap: 2,
  },
  collectionName: {
    color: COLORS.textPrimary,
    fontSize: FONTS.sizes.md,
    fontWeight: '500',
  },
  collectionNameClosed: {
    color: COLORS.textSecondary,
  },
  collectionMeta: {
    color: COLORS.textMuted,
    fontSize: FONTS.sizes.sm,
  },
  collectionAmount: {
    color: COLORS.primary,
    fontSize: FONTS.sizes.sm,
    fontWeight: '500',
  },
  rowDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: COLORS.surfaceBorder,
    marginHorizontal: SPACING.lg,
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
});
