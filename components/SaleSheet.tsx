import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { COLORS, FONTS, RADIUS, SPACING } from '../constants/colors';
import { NotionHeader } from './NotionHeader';
import { MoneyInput } from './MoneyInput';
import { AppBottomSheet } from './AppBottomSheet';
import { formatBRL } from '../utils/money';

type Props = {
  visible: boolean;
  clientName: string;
  collectionName: string;
  purchased: boolean;
  initialAmount?: number;
  onClose: () => void;
  onSave: (amount: number) => Promise<void>;
  onClear: () => Promise<void>;
};

export function SaleSheet({
  visible,
  clientName,
  collectionName,
  purchased,
  initialAmount = 0,
  onClose,
  onSave,
  onClear,
}: Props) {
  const [amount, setAmount] = useState(0);
  const [saving, setSaving] = useState(false);
  const [clearing, setClearing] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setAmount(initialAmount > 0 ? initialAmount : 0);
    setSaving(false);
    setClearing(false);
  }, [visible, initialAmount]);

  const handleSave = async () => {
    if (amount <= 0) {
      Alert.alert('Valor inválido', 'Informe um valor de compra maior que zero.');
      return;
    }
    setSaving(true);
    try {
      await onSave(amount);
      onClose();
    } catch (err) {
      Alert.alert('Erro', err instanceof Error ? err.message : 'Não foi possível registrar a venda.');
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
            setClearing(true);
            try {
              await onClear();
              onClose();
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

  const footer = (
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
        <TouchableOpacity style={styles.cancelBtn} onPress={onClose} activeOpacity={0.7}>
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
          <Text style={styles.saveText}>{purchased ? 'Atualizar valor' : 'Registrar venda'}</Text>
        )}
      </TouchableOpacity>
    </View>
  );

  return (
    <AppBottomSheet visible={visible} onClose={onClose} footer={footer} snapPoints={['42%', '68%']}>
      <NotionHeader title={purchased ? 'Venda registrada' : 'Registrar venda'} variant="sheet" />

      <View style={styles.body}>
        <View style={styles.card}>
          <Text style={styles.cardLabel}>CLIENTE</Text>
          <Text style={styles.cardValue}>{clientName}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardLabel}>COLEÇÃO</Text>
          <Text style={styles.cardValue}>{collectionName}</Text>
        </View>

        <View style={styles.card}>
          <MoneyInput label="VALOR DA COMPRA" value={amount} onChange={setAmount} />
          {purchased && initialAmount > 0 && (
            <Text style={styles.hint}>Valor atual: {formatBRL(initialAmount)}</Text>
          )}
        </View>
      </View>
    </AppBottomSheet>
  );
}

const styles = StyleSheet.create({
  body: { gap: SPACING.md, paddingTop: SPACING.xs },
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
