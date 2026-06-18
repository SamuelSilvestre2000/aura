import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Linking,
  Platform,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useClients } from '../../hooks/useClients';
import { useAuth } from '../../hooks/useAuth';
import { useCollections } from '../../hooks/useCollections';
import { usePurchases } from '../../hooks/usePurchases';
import { COLORS, FONTS, RADIUS, SPACING } from '../../constants/colors';
import { CategoryPillRow } from '../../components/CategoryPill';
import { labelsFromCategoryIds } from '../../constants/categoryPills';
import { PurchaseChip } from '../../components/PurchaseChip';

export default function ClientDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const { clients, deleteClient, loading: clientsLoading } = useClients();
  const { can: canDo } = useAuth();
  const canManageClients = canDo('manage_clients');
  const { collections } = useCollections();
  const { togglePurchase, getPurchaseStatus } = usePurchases();

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
              router.back();
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
        <TouchableOpacity onPress={() => router.back()} style={styles.outlineButton}>
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

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn} hitSlop={8}>
            <Ionicons name="chevron-back" size={22} color={COLORS.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>{client.name}</Text>
          {canManageClients ? (
            <TouchableOpacity
              onPress={() => router.push(`/client/edit?id=${client.id}`)}
              style={styles.headerBtn}
              hitSlop={8}
            >
              <Ionicons name="create-outline" size={20} color={COLORS.textSecondary} />
            </TouchableOpacity>
          ) : (
            <View style={styles.headerBtn} />
          )}
        </View>
      </SafeAreaView>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{client.name.charAt(0).toUpperCase()}</Text>
          </View>
          <Text style={styles.clientName}>{client.name}</Text>
          {labels.length > 0 && (
            <CategoryPillRow labels={labels} slugs={slugs} />
          )}
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

        {client.phone && (
          <View style={styles.actionsRow}>
            <TouchableOpacity style={styles.outlineButton} onPress={handleCall} activeOpacity={0.7}>
              <Ionicons name="call-outline" size={18} color={COLORS.primary} />
              <Text style={styles.outlineButtonText}>Ligar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.outlineButton, styles.whatsappButton]}
              onPress={handleWhatsApp}
              activeOpacity={0.7}
            >
              <Ionicons name="logo-whatsapp" size={18} color="#25D366" />
              <Text style={[styles.outlineButtonText, { color: '#25D366' }]}>WhatsApp</Text>
            </TouchableOpacity>
          </View>
        )}

        {client.notes ? (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>OBSERVAÇÕES</Text>
            <View style={styles.card}>
              <Text style={styles.notesText}>{client.notes}</Text>
            </View>
          </View>
        ) : null}

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>COLEÇÕES</Text>
          {collections.length === 0 ? (
            <View style={styles.card}>
              <Text style={styles.emptyText}>Nenhuma coleção cadastrada</Text>
            </View>
          ) : (
            <View style={styles.card}>
              {collections.map((col, index) => {
                const purchased = getPurchaseStatus(client.id, col.id);
                return (
                  <React.Fragment key={col.id}>
                    {index > 0 && <View style={styles.rowDivider} />}
                    <TouchableOpacity
                      style={styles.collectionRow}
                      onPress={() => togglePurchase(client.id, col.id)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.collectionName}>{col.name}</Text>
                      <PurchaseChip purchased={purchased} />
                    </TouchableOpacity>
                  </React.Fragment>
                );
              })}
            </View>
          )}
        </View>

        {canManageClients && (
          <TouchableOpacity style={styles.deleteButton} onPress={handleDelete} activeOpacity={0.7}>
            <Ionicons name="trash-outline" size={16} color={COLORS.error} />
            <Text style={styles.deleteButtonText}>Remover cliente</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.backgroundSubtle,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  center: {
    flex: 1,
    backgroundColor: COLORS.backgroundSubtle,
    justifyContent: 'center',
    alignItems: 'center',
    gap: SPACING.md,
    paddingHorizontal: SPACING.xl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.background,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.surfaceBorder,
    gap: SPACING.sm,
  },
  headerBtn: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    flex: 1,
    color: COLORS.textPrimary,
    fontSize: FONTS.sizes.lg,
    fontWeight: '600',
    letterSpacing: -0.3,
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
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.primaryBg,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  avatarText: {
    color: COLORS.primary,
    fontSize: FONTS.sizes.xxl,
    fontWeight: '700',
  },
  clientName: {
    color: COLORS.textPrimary,
    fontSize: FONTS.sizes.xl,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: -0.3,
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
  actionsRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  outlineButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.surfaceBorder,
    backgroundColor: COLORS.surface,
  },
  whatsappButton: {
    borderColor: '#25D36644',
    backgroundColor: '#25D36608',
  },
  outlineButtonText: {
    color: COLORS.primary,
    fontSize: FONTS.sizes.sm,
    fontWeight: '600',
  },
  section: { gap: SPACING.sm },
  sectionLabel: {
    color: COLORS.textMuted,
    fontSize: FONTS.sizes.xs,
    fontWeight: '600',
    letterSpacing: 0.6,
    paddingHorizontal: SPACING.xs,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.surfaceBorder,
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
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    gap: SPACING.md,
  },
  collectionName: {
    color: COLORS.textPrimary,
    fontSize: FONTS.sizes.md,
    fontWeight: '500',
    flex: 1,
  },
  rowDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: COLORS.surfaceBorder,
    marginHorizontal: SPACING.lg,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.errorBg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: `${COLORS.error}33`,
  },
  deleteButtonText: {
    color: COLORS.error,
    fontWeight: '600',
    fontSize: FONTS.sizes.sm,
  },
  notFoundText: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.md,
    textAlign: 'center',
  },
});
