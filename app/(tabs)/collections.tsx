import React, { useState, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  StatusBar,
  Platform,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useCollections } from '../../hooks/useCollections';
import { useClients } from '../../hooks/useClients';
import { usePurchases } from '../../hooks/usePurchases';
import { useAuth } from '../../hooks/useAuth';
import { Collection } from '../../types';
import { COLORS, FONTS, RADIUS, SPACING } from '../../constants/colors';
import { TAB_BAR_CONTENT_HEIGHT } from '../../components/CustomTabBar';

function progressColor(percent: number): string {
  if (percent === 100) return COLORS.success;
  if (percent > 50) return COLORS.warning;
  return COLORS.error;
}

export default function CollectionsScreen() {
  const insets = useSafeAreaInsets();
  const { can: canDo } = useAuth();
  const canManageCollections = canDo('manage_collections');
  const { collections, loading, createCollection, deleteCollection } = useCollections();
  const { clients } = useClients();
  const { purchases } = usePurchases();

  const [showModal, setShowModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);

  const listBottom = TAB_BAR_CONTENT_HEIGHT + insets.bottom + SPACING.lg;

  const getProgress = useCallback(
    (collectionId: string) => {
      if (clients.length === 0) return { percent: 0, bought: 0, total: 0, cities: 0, totalCities: 0 };
      const collectionPurchases = purchases.filter(
        (p) => p.collectionId === collectionId && p.purchased === 1
      );
      const boughtClientIds = new Set(collectionPurchases.map((p) => p.clientId));
      const bought = clients.filter((c) => boughtClientIds.has(c.id)).length;
      const percent = clients.length > 0 ? Math.round((bought / clients.length) * 100) : 0;
      const cityCodes = [...new Set(clients.map((c) => c.cityCode))];
      const completedCities = cityCodes.filter((code) => {
        const cityClients = clients.filter((c) => c.cityCode === code);
        return cityClients.every((c) => boughtClientIds.has(c.id));
      }).length;
      return { percent, bought, total: clients.length, cities: completedCities, totalCities: cityCodes.length };
    },
    [clients, purchases]
  );

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      await createCollection(newName.trim());
      setNewName('');
      setShowModal(false);
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = (col: Collection) => {
    Alert.alert(
      'Remover coleção',
      `Deseja remover "${col.name}"? Todos os dados de compra serão perdidos.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Remover', style: 'destructive', onPress: () => deleteCollection(col.id) },
      ]
    );
  };

  const renderCollection = ({ item, index }: { item: Collection; index: number }) => {
    const progress = getProgress(item.id);
    const fillColor = progressColor(progress.percent);

    return (
      <View style={[styles.row, index > 0 && styles.rowBorder]}>
        <View style={styles.rowIcon}>
          <Ionicons name="albums-outline" size={20} color={COLORS.textSecondary} />
        </View>

        <View style={styles.rowBody}>
          <View style={styles.rowTop}>
            <Text style={styles.rowTitle} numberOfLines={1}>{item.name}</Text>
            {canManageCollections && (
              <TouchableOpacity
                onPress={() => handleDelete(item)}
                hitSlop={10}
                style={styles.deleteBtn}
                activeOpacity={0.6}
              >
                <Ionicons name="trash-outline" size={18} color={COLORS.textMuted} />
              </TouchableOpacity>
            )}
          </View>

          <Text style={styles.rowMeta}>
            {progress.bought}/{progress.total} clientes · {progress.cities}/{progress.totalCities} cidades
          </Text>

          <View style={styles.progressRow}>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${progress.percent}%`, backgroundColor: fillColor }]} />
            </View>
            <Text style={[styles.progressPct, { color: fillColor }]}>{progress.percent}%</Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Coleções</Text>
          {canManageCollections && (
            <TouchableOpacity
              style={styles.newButton}
              onPress={() => setShowModal(true)}
              activeOpacity={0.7}
            >
              <Ionicons name="add" size={18} color={COLORS.primary} />
              <Text style={styles.newButtonText}>Nova</Text>
            </TouchableOpacity>
          )}
        </View>
      </SafeAreaView>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : collections.length === 0 ? (
        <View style={styles.emptyState}>
          <View style={styles.emptyIconWrap}>
            <Ionicons name="albums-outline" size={32} color={COLORS.textMuted} />
          </View>
          <Text style={styles.emptyTitle}>Nenhuma coleção</Text>
          <Text style={styles.emptySubtitle}>Crie sua primeira coleção de produtos</Text>
          {canManageCollections && (
            <TouchableOpacity
              style={styles.emptyButton}
              onPress={() => setShowModal(true)}
              activeOpacity={0.85}
            >
              <Ionicons name="add" size={18} color="#fff" />
              <Text style={styles.emptyButtonText}>Criar coleção</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <View style={[styles.listWrap, { paddingBottom: listBottom }]}>
          <Text style={styles.sectionLabel}>
            {collections.length} {collections.length === 1 ? 'coleção' : 'coleções'}
          </Text>
          <View style={styles.cardList}>
            <FlatList
              data={collections}
              keyExtractor={(item) => item.id}
              renderItem={renderCollection}
              showsVerticalScrollIndicator={false}
              style={styles.cardFlatList}
            />
          </View>
          {canManageCollections && (
            <TouchableOpacity
              style={styles.addRow}
              onPress={() => setShowModal(true)}
              activeOpacity={0.7}
            >
              <Ionicons name="add" size={18} color={COLORS.textMuted} />
              <Text style={styles.addRowText}>Nova coleção</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      <Modal
        visible={showModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowModal(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setShowModal(false)}>
          <Pressable style={styles.modal} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Nova coleção</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Ex: Verão 2026"
              placeholderTextColor={COLORS.textPlaceholder}
              value={newName}
              onChangeText={setNewName}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={handleCreate}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancel}
                onPress={() => { setNewName(''); setShowModal(false); }}
                activeOpacity={0.7}
              >
                <Text style={styles.modalCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalConfirm, !newName.trim() && styles.modalConfirmDisabled]}
                onPress={handleCreate}
                disabled={!newName.trim() || creating}
                activeOpacity={0.85}
              >
                {creating ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.modalConfirmText}>Criar</Text>
                )}
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.backgroundSubtle,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.background,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.surfaceBorder,
  },
  headerTitle: {
    color: COLORS.textPrimary,
    fontSize: FONTS.sizes.xxl,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  newButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: SPACING.md,
    paddingVertical: 6,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    backgroundColor: COLORS.background,
  },
  newButtonText: {
    color: COLORS.primary,
    fontWeight: '600',
    fontSize: FONTS.sizes.sm,
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
    marginTop: SPACING.lg,
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
    alignItems: 'flex-start',
    gap: SPACING.md,
    paddingVertical: SPACING.lg,
    paddingHorizontal: SPACING.lg,
    backgroundColor: COLORS.surface,
  },
  rowBorder: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.surfaceBorder,
  },
  rowIcon: {
    width: 28,
    paddingTop: 2,
    alignItems: 'center',
  },
  rowBody: { flex: 1, gap: SPACING.xs },
  rowTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.sm,
  },
  rowTitle: {
    flex: 1,
    color: COLORS.textPrimary,
    fontSize: FONTS.sizes.md,
    fontWeight: '600',
  },
  deleteBtn: { padding: 2 },
  rowMeta: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.sm,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginTop: 4,
  },
  progressTrack: {
    flex: 1,
    height: 4,
    backgroundColor: COLORS.surfaceBorder,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
    minWidth: 0,
  },
  progressPct: {
    fontSize: FONTS.sizes.xs,
    fontWeight: '600',
    minWidth: 32,
    textAlign: 'right',
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
    padding: SPACING.xxl,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.25)',
    justifyContent: 'flex-end',
  },
  modal: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingHorizontal: SPACING.xl,
    paddingBottom: SPACING.xxl + 16,
    paddingTop: SPACING.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.surfaceBorder,
    gap: SPACING.lg,
  },
  modalHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.surfaceBorderStrong,
    alignSelf: 'center',
    marginBottom: SPACING.xs,
  },
  modalTitle: {
    color: COLORS.textPrimary,
    fontSize: FONTS.sizes.lg,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  modalInput: {
    backgroundColor: COLORS.backgroundSubtle,
    borderRadius: RADIUS.lg,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    color: COLORS.textPrimary,
    fontSize: FONTS.sizes.md,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
  },
  modalActions: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  modalCancel: {
    flex: 1,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  modalCancelText: {
    color: COLORS.textSecondary,
    fontWeight: '500',
    fontSize: FONTS.sizes.md,
  },
  modalConfirm: {
    flex: 1,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
  },
  modalConfirmDisabled: { opacity: 0.45 },
  modalConfirmText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: FONTS.sizes.md,
  },
});
