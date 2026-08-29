import React, { useCallback, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { Alert } from '../../utils/alert';
import { useClients } from '../../hooks/useClients';
import { useAuth } from '../../hooks/useAuth';
import { useCategoryFilter } from '../../hooks/useCategoryFilter';
import { useCollections } from '../../hooks/useCollections';
import { usePurchases } from '../../hooks/usePurchases';
import { usePanelNav } from '../../hooks/usePanelNav';
import { useIsDesktop } from '../../hooks/useIsDesktop';
import { useScreenTopInset } from '../../hooks/useScreenTopInset';
import { NotionHeader } from '../../components/NotionHeader';
import { HeaderBackButton } from '../../components/HeaderBackButton';
import { HeaderLinkButton } from '../../components/HeaderLinkButton';
import ClientEditScreen from './edit';
import { labelsFromCategoryIds } from '../../constants/categoryPills';
import { PurchaseChip } from '../../components/PurchaseChip';
import { PullToRefresh } from '../../components/PullToRefresh';
import { SaleSheet } from '../../components/SaleSheet';
import { isCollectionClosed } from '../../utils/collectionStatus';
import { Client } from '../../types';
import { COLORS, FONTS, RADIUS, SPACING } from '../../constants/colors';
import { formatBRL } from '../../utils/money';
import { formatCnpj } from '../../utils/cnpj';
import { clientInitials, displayClientName } from '../../utils/clientName';
import { getAvatarColor } from '../../utils/avatarColor';

type SaleTarget = {
  collectionId: string;
  collectionName: string;
};

type Props = { id?: string };

export default function ClientDetailScreen({ id: propId }: Props = {}) {
  const params = useLocalSearchParams<{ id: string }>();
  const id = propId ?? params.id;
  const nav = usePanelNav();
  const isDesktop = useIsDesktop();
  const topInset = useScreenTopInset('modal');
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
  const [visibleCollectionsCount, setVisibleCollectionsCount] = useState(3);

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
      `Deseja remover "${client ? displayClientName(client) : ''}"? Isso apagará todas as compras registradas.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Remover',
          style: 'destructive',
          onPress: async () => {
            if (id) {
              await deleteClient(id);
              nav.back();
            }
          },
        },
      ]
    );
  };

  /**
   * wa.me em vez do esquema whatsapp://: o esquema falha em silêncio quando o
   * app não está instalado, e no navegador não abre nada. O link https abre o
   * app quando ele existe e cai no WhatsApp Web quando não.
   *
   * O 55 é fixo porque os cadastros guardam só o número nacional — se um dia
   * entrar cliente de fora do país, este pedaço precisa sair daqui.
   */
  const handleWhatsApp = (value: string) => {
    const digits = value.replace(/\D/g, '');
    const withCountry = digits.startsWith('55') && digits.length > 11 ? digits : `55${digits}`;
    Linking.openURL(`https://wa.me/${withCountry}`);
  };

  /** Toque num telefone liga, como em qualquer lugar do sistema. */
  const handleCall = (value: string) => {
    Linking.openURL(`tel:${value.replace(/\D/g, '')}`);
  };

  const handleEmail = (value: string) => {
    Linking.openURL(`mailto:${value}`);
  };

  /** Copiar continua possível, agora onde se espera: no toque longo. */
  const handleCopy = (value: string) => {
    void Clipboard.setStringAsync(value);
  };

  /**
   * O representante vai à loja: tendo endereço, abrir a rota é a ação óbvia.
   * Cada plataforma tem seu esquema; na web cai no Google Maps.
   */
  const handleRoute = (target: Client) => {
    const query = encodeURIComponent(
      [target.street, target.neighborhood, target.city, 'PI'].filter(Boolean).join(', ')
    );
    const url =
      Platform.OS === 'ios'
        ? `maps://?q=${query}`
        : Platform.OS === 'android'
          ? `geo:0,0?q=${query}`
          : `https://www.google.com/maps/search/?api=1&query=${query}`;
    Linking.openURL(url);
  };

  if (clientsLoading) {
    return (
      <View style={[styles.center, isDesktop && styles.containerDesktop]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (!client) {
    return (
      <View style={[styles.center, isDesktop && styles.containerDesktop]}>
        <Ionicons name="person-outline" size={40} color={COLORS.textMuted} />
        <Text style={styles.notFoundText}>Cliente não encontrado</Text>
        <TouchableOpacity onPress={() => nav.back()} style={styles.outlineButton}>
          <Ionicons name="arrow-back" size={16} color={COLORS.primary} />
          <Text style={styles.outlineButtonText}>Voltar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const { labels } = labelsFromCategoryIds(client.categoryIds);
  const name = displayClientName(client);
  const primaryPhone = client.mobile || client.phone;
  const hasAddress = Boolean(client.street || client.neighborhood || client.city);
  /** Rua, bairro e a linha de cidade/CEP — o endereço como se escreve num envelope. */
  const addressLines = [
    client.street,
    client.neighborhood,
    [`${client.city}, PI`, client.zipCode].filter(Boolean).join(' · '),
  ].filter(Boolean) as string[];
  const purchasedCollections = collections.filter((col) =>
    getPurchaseStatus(client.id, col.id)
  );
  const boughtCount = purchasedCollections.length;
  const openPurchasedCollections = purchasedCollections.filter((col) => !isCollectionClosed(col));

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
          title={name}
          showBorder
          compact
          leftAction={<HeaderBackButton onPress={() => nav.back()} />}
          rightAction={
            canManageClients ? (
              <HeaderLinkButton
                label="Editar"
                onPress={() =>
                  nav.open(
                    `client-edit-${client.id}`,
                    <ClientEditScreen id={client.id} />,
                    '/client/edit',
                    { id: client.id }
                  )
                }
              />
            ) : undefined
          }
        />
      </View>

      <PullToRefresh refreshing={refreshing} onRefresh={handleRefresh}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.profileCard}>
          <View style={[styles.avatar, { backgroundColor: getAvatarColor(client.id) }]}>
            <Text style={styles.avatarText}>{clientInitials(name)}</Text>
          </View>
          <Text style={styles.clientName}>{name}</Text>
          {client.tradeName && client.tradeName !== name ? (
            <Text style={styles.clientTradeName}>{client.tradeName}</Text>
          ) : null}
          <Text style={styles.clientSubtitle}>
            {[`${client.city}, PI`, showCategoryBadges ? labels.join(', ') : '']
              .filter(Boolean)
              .join(' · ')}
          </Text>

          {/*
            Fileira de ações logo abaixo do nome, como em Contatos: num app de
            campo, ligar e traçar rota são o que se faz aqui — antes ficavam
            escondidos numa linha no meio da seção de contato.
          */}
          <View style={styles.actionsRow}>
            {primaryPhone ? (
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => handleCall(primaryPhone)}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel="Ligar"
              >
                <Ionicons name="call" size={20} color={COLORS.primary} />
                <Text style={styles.actionButtonText}>Ligar</Text>
              </TouchableOpacity>
            ) : null}
            {client.mobile ? (
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => handleWhatsApp(client.mobile!)}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel="WhatsApp"
              >
                <Ionicons name="logo-whatsapp" size={20} color={COLORS.primary} />
                <Text style={styles.actionButtonText}>WhatsApp</Text>
              </TouchableOpacity>
            ) : null}
            {hasAddress ? (
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => handleRoute(client)}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel="Rota"
              >
                <Ionicons name="navigate" size={20} color={COLORS.primary} />
                <Text style={styles.actionButtonText}>Rota</Text>
              </TouchableOpacity>
            ) : null}
            {client.email ? (
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => handleEmail(client.email!)}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel="Email"
              >
                <Ionicons name="mail" size={20} color={COLORS.primary} />
                <Text style={styles.actionButtonText}>Email</Text>
              </TouchableOpacity>
            ) : null}
          </View>

          <Text style={styles.summaryText}>
            {boughtCount} de {collections.length}{' '}
            {collections.length === 1 ? 'coleção comprada' : 'coleções compradas'}
          </Text>
        </View>

        {client.cnpj || client.phone || client.mobile || client.email ? (
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
                      <Text style={styles.infoValueNumeric}>{formatCnpj(client.cnpj)}</Text>
                    </View>
                  </View>
                  {client.phone || client.mobile || client.email ? (
                    <View style={styles.rowDivider} />
                  ) : null}
                </>
              ) : null}
              {client.phone || client.mobile ? (
                <>
                  <View style={styles.phoneRow}>
                    {client.mobile ? (
                      <TouchableOpacity
                        style={styles.phoneCol}
                        onPress={() => handleCall(client.mobile!)}
                        onLongPress={() => handleCopy(client.mobile!)}
                        activeOpacity={0.7}
                      >
                        <View style={styles.infoIconWrap}>
                          <Ionicons name="phone-portrait-outline" size={18} color={COLORS.textSecondary} />
                        </View>
                        <View style={styles.infoBody}>
                          <Text style={styles.infoLabel}>Celular</Text>
                          <Text style={styles.infoValueAction} numberOfLines={1}>
                            {client.mobile}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    ) : null}
                    {client.mobile && client.phone ? <View style={styles.phoneColDivider} /> : null}
                    {client.phone ? (
                      <TouchableOpacity
                        style={styles.phoneCol}
                        onPress={() => handleCall(client.phone!)}
                        onLongPress={() => handleCopy(client.phone!)}
                        activeOpacity={0.7}
                      >
                        <View style={styles.infoIconWrap}>
                          <Ionicons name="call-outline" size={18} color={COLORS.textSecondary} />
                        </View>
                        <View style={styles.infoBody}>
                          <Text style={styles.infoLabel}>Telefone</Text>
                          <Text style={styles.infoValueAction} numberOfLines={1}>
                            {client.phone}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    ) : null}
                  </View>
                  {client.email ? <View style={styles.rowDivider} /> : null}
                </>
              ) : null}
              {client.email ? (
                <TouchableOpacity
                  style={styles.infoRow}
                  onPress={() => handleEmail(client.email!)}
                  onLongPress={() => handleCopy(client.email!)}
                  activeOpacity={0.7}
                >
                  <View style={styles.infoIconWrap}>
                    <Ionicons name="mail-outline" size={18} color={COLORS.textSecondary} />
                  </View>
                  <View style={styles.infoBody}>
                    <Text style={styles.infoLabel}>Email</Text>
                    <Text style={styles.infoValueAction} numberOfLines={1}>
                      {client.email}
                    </Text>
                  </View>
                </TouchableOpacity>
              ) : null}
            </View>
          </View>
        ) : null}

        {hasAddress ? (
          <View style={styles.section}>
            <Text style={styles.sectionLabelOutside}>ENDEREÇO</Text>
            <View style={styles.card}>
              {/*
                Endereço é um dado só, então é uma linha só — em três linhas
                rotuladas (logradouro, bairro, CEP) o representante precisava
                remontar mentalmente o endereço para saber onde fica. Tocar
                abre a rota, como em Contatos.
              */}
              <TouchableOpacity
                style={styles.infoRow}
                onPress={() => handleRoute(client)}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel="Abrir rota"
              >
                <View style={styles.infoIconWrap}>
                  <Ionicons name="location-outline" size={18} color={COLORS.textSecondary} />
                </View>
                <View style={styles.infoBody}>
                  <Text style={styles.infoLabel}>Endereço</Text>
                  <Text style={styles.addressText}>{addressLines.join('\n')}</Text>
                </View>
                <Ionicons name="navigate" size={17} color={COLORS.primary} />
              </TouchableOpacity>
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
          <Text style={styles.sectionLabelOutside}>
            COLEÇÕES ({purchasedCollections.length})
          </Text>
          {(purchasedCollections.length === 0 ? (
            <View style={styles.card}>
              <Text style={styles.emptyText}>Nenhuma compra registrada</Text>
            </View>
          ) : (
            <View style={styles.card}>
              {purchasedCollections.slice(0, visibleCollectionsCount).map((col, index) => {
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
              {visibleCollectionsCount < purchasedCollections.length ? (
                <>
                  <View style={styles.rowDivider} />
                  <TouchableOpacity
                    style={styles.loadMoreRow}
                    onPress={() => setVisibleCollectionsCount((v) => v + 3)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.loadMoreText}>Carregar mais</Text>
                  </TouchableOpacity>
                </>
              ) : null}
            </View>
          ))}
          {openPurchasedCollections.length === 0 && purchasedCollections.length > 0 ? (
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
        clientName={name}
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
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  clientName: {
    color: COLORS.textPrimary,
    fontSize: FONTS.sizes.lg,
    fontWeight: '600',
    textAlign: 'center',
    letterSpacing: -0.2,
  },
  clientTradeName: {
    color: COLORS.textMuted,
    fontSize: FONTS.sizes.sm,
    textAlign: 'center',
    marginTop: -2,
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: FONTS.sizes.xl,
    fontWeight: '600',
  },
  clientSubtitle: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.md,
    textAlign: 'center',
  },
  // Alvo de 44 de altura; o rótulo cabe embaixo do símbolo, como em Contatos.
  actionsRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    alignSelf: 'stretch',
    marginTop: SPACING.lg,
  },
  actionButton: {
    flex: 1,
    minHeight: 56,
    gap: 4,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.fill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButtonText: {
    color: COLORS.primary,
    fontSize: FONTS.sizes.xs,
    fontWeight: '500',
  },
  summaryText: {
    ...FONTS.tabular,
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.sm,
    marginTop: SPACING.lg,
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
  infoValueAction: {
    color: COLORS.primary,
    fontSize: FONTS.sizes.md,
    fontWeight: '500',
  },
  addressText: {
    color: COLORS.textPrimary,
    fontSize: FONTS.sizes.md,
    fontWeight: '500',
    lineHeight: 21,
  },
  infoValueNumeric: {
    ...FONTS.tabular,
    color: COLORS.textPrimary,
    fontSize: FONTS.sizes.md,
    fontWeight: '500',
  },
  infoValue: {
    color: COLORS.textPrimary,
    fontSize: FONTS.sizes.md,
    fontWeight: '500',
  },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  phoneCol: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.lg,
    gap: SPACING.sm,
    minWidth: 0,
  },
  phoneColDivider: {
    width: StyleSheet.hairlineWidth,
    backgroundColor: COLORS.surfaceBorder,
    marginVertical: SPACING.sm,
  },
  loadMoreRow: {
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    alignItems: 'center',
  },
  loadMoreText: {
    color: COLORS.primary,
    fontSize: FONTS.sizes.sm,
    fontWeight: '600',
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
    ...FONTS.tabular,
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
