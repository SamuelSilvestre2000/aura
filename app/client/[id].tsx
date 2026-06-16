import React, { useState } from 'react';
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
import { useClients } from '../../hooks/useClients';
import { useAuth } from '../../hooks/useAuth';
import { useCollections } from '../../hooks/useCollections';
import { usePurchases } from '../../hooks/usePurchases';
import { COLORS, FONTS, RADIUS, SPACING, STATUS_COLORS } from '../../constants/colors';

export default function ClientDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const { clients, deleteClient, loading: clientsLoading } = useClients();
  const { can: canDo } = useAuth();
  const canManageClients = canDo('manage_clients');
  const { collections } = useCollections();
  const { purchases, togglePurchase, getPurchaseStatus } = usePurchases();

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
    if (client?.phone) {
      Linking.openURL(`tel:${client.phone}`);
    }
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
        <Text style={styles.notFoundText}>Cliente não encontrado</Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Voltar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const boughtCount = collections.filter((col) =>
    getPurchaseStatus(client.id, col.id)
  ).length;

  return (
    <View style={styles.container}>
      <SafeAreaView>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={8}>
            <Text style={styles.backBtnText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>{client.name}</Text>
          {canManageClients ? (
            <TouchableOpacity
              onPress={() => router.push(`/client/edit?id=${client.id}`)}
              style={styles.editBtn}
            >
              <Text style={styles.editBtnText}>✏️</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.editBtn} />
          )}
        </View>
      </SafeAreaView>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Info card */}
        <View style={styles.infoCard}>
          <View style={styles.clientAvatar}>
            <Text style={styles.clientAvatarText}>
              {client.name.charAt(0).toUpperCase()}
            </Text>
          </View>
          <Text style={styles.clientName}>{client.name}</Text>
          <View style={styles.locationBadge}>
            <Text style={styles.locationBadgeText}>📍 {client.city}, PI</Text>
          </View>

          {/* Stats */}
          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{collections.length}</Text>
              <Text style={styles.statLabel}>Coleções</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.stat}>
              <Text style={[styles.statValue, { color: COLORS.success }]}>{boughtCount}</Text>
              <Text style={styles.statLabel}>Compradas</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.stat}>
              <Text style={[styles.statValue, { color: COLORS.error }]}>{collections.length - boughtCount}</Text>
              <Text style={styles.statLabel}>Pendentes</Text>
            </View>
          </View>
        </View>

        {/* Ações rápidas */}
        {client.phone && (
          <View style={styles.actionsRow}>
            <TouchableOpacity style={styles.actionBtn} onPress={handleCall}>
              <Text style={styles.actionBtnIcon}>📞</Text>
              <Text style={styles.actionBtnLabel}>Ligar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionBtn, styles.actionBtnWhats]} onPress={handleWhatsApp}>
              <Text style={styles.actionBtnIcon}>💬</Text>
              <Text style={styles.actionBtnLabel}>WhatsApp</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Notas */}
        {client.notes && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>OBSERVAÇÕES</Text>
            <View style={styles.card}>
              <Text style={styles.notesText}>{client.notes}</Text>
            </View>
          </View>
        )}

        {/* Coleções */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>COLEÇÕES</Text>
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
                      <View style={styles.collectionLeft}>
                        <View style={[
                          styles.collectionDot,
                          { backgroundColor: purchased ? STATUS_COLORS.all : STATUS_COLORS.none }
                        ]} />
                        <Text style={styles.collectionName}>{col.name}</Text>
                      </View>
                      <View style={[styles.toggle, purchased && styles.toggleActive]}>
                        <Text style={[styles.toggleText, purchased && styles.toggleTextActive]}>
                          {purchased ? '✓ Comprou' : 'Pendente'}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  </React.Fragment>
                );
              })}
            </View>
          )}
        </View>

        {canManageClients && (
          <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
            <Text style={styles.deleteButtonText}>🗑 Remover cliente</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  center: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
    gap: SPACING.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.surfaceBorder,
    gap: SPACING.md,
  },
  backBtn: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backBtnText: { color: COLORS.primary, fontSize: 24 },
  headerTitle: {
    flex: 1,
    color: COLORS.textPrimary,
    fontSize: FONTS.sizes.lg,
    fontWeight: '700',
  },
  editBtn: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  editBtnText: { fontSize: 20 },
  content: {
    padding: SPACING.lg,
    gap: SPACING.xl,
    paddingBottom: 60,
  },
  infoCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: SPACING.xl,
    alignItems: 'center',
    gap: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
  },
  clientAvatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: `${COLORS.primary}33`,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: `${COLORS.primary}66`,
  },
  clientAvatarText: {
    color: COLORS.primary,
    fontSize: 32,
    fontWeight: '700',
  },
  clientName: {
    color: COLORS.textPrimary,
    fontSize: FONTS.sizes.xl,
    fontWeight: '700',
    textAlign: 'center',
  },
  locationBadge: {
    backgroundColor: COLORS.surfaceElevated,
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.md,
    paddingVertical: 4,
  },
  locationBadgeText: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.sm,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.md,
    width: '100%',
  },
  stat: { flex: 1, alignItems: 'center' },
  statValue: {
    color: COLORS.textPrimary,
    fontSize: FONTS.sizes.xxl,
    fontWeight: '700',
  },
  statLabel: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.sm,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: COLORS.surfaceBorder,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    paddingVertical: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
  },
  actionBtnWhats: {
    backgroundColor: `#25D36622`,
    borderColor: '#25D36644',
  },
  actionBtnIcon: { fontSize: 20 },
  actionBtnLabel: {
    color: COLORS.textPrimary,
    fontSize: FONTS.sizes.md,
    fontWeight: '600',
  },
  section: { gap: SPACING.sm },
  sectionTitle: {
    color: COLORS.textMuted,
    fontSize: FONTS.sizes.xs,
    fontWeight: '700',
    letterSpacing: 1.2,
    paddingHorizontal: SPACING.sm,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    overflow: 'hidden',
    borderWidth: 1,
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
  },
  collectionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    flex: 1,
  },
  collectionDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  collectionName: {
    color: COLORS.textPrimary,
    fontSize: FONTS.sizes.md,
    fontWeight: '500',
  },
  rowDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: COLORS.surfaceBorder,
    marginHorizontal: SPACING.lg,
  },
  toggle: {
    paddingHorizontal: SPACING.md,
    paddingVertical: 6,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.surfaceElevated,
    borderWidth: 1.5,
    borderColor: COLORS.surfaceBorder,
  },
  toggleActive: {
    backgroundColor: `${STATUS_COLORS.all}22`,
    borderColor: STATUS_COLORS.all,
  },
  toggleText: {
    color: COLORS.textMuted,
    fontSize: FONTS.sizes.sm,
    fontWeight: '600',
  },
  toggleTextActive: { color: STATUS_COLORS.all },
  deleteButton: {
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.lg,
    backgroundColor: `${COLORS.error}11`,
    borderWidth: 1,
    borderColor: `${COLORS.error}33`,
    alignItems: 'center',
  },
  deleteButtonText: {
    color: COLORS.error,
    fontWeight: '600',
    fontSize: FONTS.sizes.md,
  },
  notFoundText: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.lg,
  },
  backButton: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
  },
  backButtonText: { color: '#fff', fontWeight: '700' },
});
