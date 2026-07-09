import React, { useEffect, useRef, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Alert } from '../../utils/alert';
import { goBack } from '../../utils/navigation';
import { useClients } from '../../hooks/useClients';
import { useCollections } from '../../hooks/useCollections';
import { usePurchases } from '../../hooks/usePurchases';
import { useAuth } from '../../hooks/useAuth';
import { NotionHeader } from '../../components/NotionHeader';
import { HeaderBackButton } from '../../components/HeaderBackButton';
import { MoneyInput } from '../../components/MoneyInput';
import { COLORS, FONTS, RADIUS, SPACING } from '../../constants/colors';
import { formatBRL } from '../../utils/money';

export default function SaleScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { clientId, collectionId } = useLocalSearchParams<{
    clientId: string;
    collectionId: string;
  }>();

  const { user } = useAuth();
  const { clients } = useClients();
  const { collections, refresh: refreshCollections } = useCollections();
  const { getPurchaseStatus, getSaleForClientCollection, recordSale, clearSale } =
    usePurchases();

  const client = clients.find((c) => c.id === clientId);
  const collection = collections.find((c) => c.id === collectionId);
  const purchased =
    clientId && collectionId ? getPurchaseStatus(clientId, collectionId) : false;
  const initialAmount =
    clientId && collectionId
      ? getSaleForClientCollection(clientId, collectionId)?.amount ?? 0
      : 0;

  const [amount, setAmount] = useState(0);
  const [saving, setSaving] = useState(false);
  const [clearing, setClearing] = useState(false);
  const didInit = useRef(false);

  useEffect(() => {
    if (didInit.current || !client || !collection) return;
    didInit.current = true;
    setAmount(initialAmount);
  }, [client, collection, initialAmount]);

  const handleSave = async () => {
    if (!clientId || !collectionId || !user) return;
    if (amount <= 0) {
      Alert.alert('Valor inválido', 'Informe um valor de compra maior que zero.');
      return;
    }
    setSaving(true);
    try {
      await recordSale(clientId, collectionId, user.id, amount);
      await refreshCollections();
      goBack(router);
    } catch (err) {
      Alert.alert(
        'Erro',
        err instanceof Error ? err.message : 'Não foi possível registrar a venda.'
      );
    } finally {
      setSaving(false);
    }
  };

  const handleClear = () => {
    Alert.alert(
      'Marcar como pendente',
      'Deseja remover esta venda e marcar o cliente como pendente?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar',
          style: 'destructive',
          onPress: async () => {
            if (!clientId || !collectionId) return;
            setClearing(true);
            try {
              await clearSale(clientId, collectionId);
              await refreshCollections();
              goBack(router);
            } catch (err) {
              Alert.alert(
                'Erro',
                err instanceof Error ? err.message : 'Não foi possível remover a venda.'
              );
            } finally {
              setClearing(false);
            }
          },
        },
      ]
    );
  };

  if (!client || !collection) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.headerSafe}>
        <NotionHeader
          title={purchased ? 'Venda registrada' : 'Registrar venda'}
          showBorder
          leftAction={<HeaderBackButton onPress={() => goBack(router)} />}
        />
      </SafeAreaView>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.card}>
            <Text style={styles.cardLabel}>CLIENTE</Text>
            <Text style={styles.cardValue}>{client.name}</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardLabel}>COLEÇÃO</Text>
            <Text style={styles.cardValue}>{collection.name}</Text>
          </View>

          <View style={styles.card}>
            <MoneyInput label="VALOR DA COMPRA" value={amount} onChange={setAmount} />
            {purchased && initialAmount > 0 && (
              <Text style={styles.hint}>Valor atual: {formatBRL(initialAmount)}</Text>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, SPACING.md) }]}>
        <View style={styles.actions}>
          {purchased ? (
            <TouchableOpacity
              style={styles.clearBtn}
              onPress={handleClear}
              disabled={clearing || saving}
              activeOpacity={0.7}
            >
              {clearing ? (
                <ActivityIndicator size="small" color={COLORS.error} />
              ) : (
                <Text style={styles.clearText}>Marcar pendente</Text>
              )}
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={() => goBack(router)}
              activeOpacity={0.7}
            >
              <Text style={styles.cancelText}>Cancelar</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[styles.saveBtn, (saving || clearing) && styles.saveBtnDisabled]}
            onPress={handleSave}
            disabled={saving || clearing}
            activeOpacity={0.85}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.saveText}>
                {purchased ? 'Atualizar valor' : 'Registrar venda'}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
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
  flex: { flex: 1 },
  center: {
    flex: 1,
    backgroundColor: COLORS.backgroundSubtle,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    padding: SPACING.lg,
    paddingBottom: SPACING.xxl,
    gap: SPACING.md,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.surfaceBorder,
    gap: SPACING.sm,
  },
  cardLabel: {
    color: COLORS.textMuted,
    fontSize: FONTS.sizes.xs,
    fontWeight: '600',
    letterSpacing: 0.6,
  },
  cardValue: {
    color: COLORS.textPrimary,
    fontSize: FONTS.sizes.md,
    fontWeight: '500',
  },
  hint: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.sm,
  },
  footer: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    backgroundColor: COLORS.backgroundSubtle,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.surfaceBorder,
  },
  actions: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.surfaceBorder,
    alignItems: 'center',
    backgroundColor: COLORS.surface,
  },
  clearBtn: {
    flex: 1,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: `${COLORS.error}44`,
    alignItems: 'center',
    backgroundColor: COLORS.errorBg,
  },
  cancelText: {
    color: COLORS.textSecondary,
    fontWeight: '500',
    fontSize: FONTS.sizes.md,
  },
  clearText: {
    color: COLORS.error,
    fontWeight: '600',
    fontSize: FONTS.sizes.md,
  },
  saveBtn: {
    flex: 1,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: FONTS.sizes.md,
  },
});
