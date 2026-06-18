import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Collection } from '../types';
import { COLORS, FONTS, RADIUS, SPACING } from '../constants/colors';
import { NotionHeader } from './NotionHeader';
import { MoneyInput } from './MoneyInput';
import { AppBottomSheet } from './AppBottomSheet';
import { formatPeriodBR } from '../utils/dates';
import { formatBRL } from '../utils/money';
import { setGoalForUser } from '../services/collectionGoals';

type Props = {
  visible: boolean;
  collection: Collection | null;
  userId: string;
  isRepresentative: boolean;
  onClose: () => void;
  onSaved: () => void;
};

export function CollectionGoalSheet({
  visible,
  collection,
  userId,
  isRepresentative,
  onClose,
  onSaved,
}: Props) {
  const [goalAmount, setGoalAmount] = useState(0);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!visible || !collection) return;
    setGoalAmount(collection.myGoalAmount ?? 0);
    setSaving(false);
  }, [visible, collection]);

  const handleSave = async () => {
    if (!collection) return;
    if (goalAmount <= 0) {
      Alert.alert('Meta inválida', 'Informe um valor maior que zero.');
      return;
    }
    setSaving(true);
    try {
      await setGoalForUser(collection.id, userId, goalAmount);
      onSaved();
      onClose();
    } catch (err) {
      Alert.alert('Erro', err instanceof Error ? err.message : 'Não foi possível salvar a meta.');
    } finally {
      setSaving(false);
    }
  };

  if (!collection) return null;

  const period =
    collection.startDate && collection.endDate
      ? formatPeriodBR(collection.startDate, collection.endDate)
      : 'Período não definido';

  const footer = (
    <View style={styles.actions}>
      <TouchableOpacity style={styles.cancelBtn} onPress={onClose} activeOpacity={0.7}>
        <Text style={styles.cancelText}>Fechar</Text>
      </TouchableOpacity>
      {isRepresentative && (
        <TouchableOpacity
          style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
          onPress={handleSave}
          disabled={saving}
          activeOpacity={0.85}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.saveText}>Salvar meta</Text>
          )}
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <AppBottomSheet
      visible={visible}
      onClose={onClose}
      footer={footer}
      snapPoints={['38%', '62%', '88%']}
    >
      <NotionHeader title={collection.name} variant="sheet" />

      <View style={styles.body}>
        <View style={styles.card}>
          <Text style={styles.cardLabel}>PERÍODO</Text>
          <Text style={styles.periodText}>{period}</Text>
        </View>

        {isRepresentative ? (
          <View style={styles.card}>
            <MoneyInput label="SUA META" value={goalAmount} onChange={setGoalAmount} />
            {collection.myGoalAmount != null && collection.myGoalAmount > 0 && (
              <Text style={styles.hint}>
                Meta atual: {formatBRL(collection.myGoalAmount)}
              </Text>
            )}
          </View>
        ) : (
          <View style={styles.card}>
            <Text style={styles.cardLabel}>META</Text>
            <Text style={styles.hint}>
              Cada representante define a própria meta nesta coleção.
            </Text>
          </View>
        )}
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
  periodText: {
    color: COLORS.textPrimary,
    fontSize: FONTS.sizes.md,
    fontWeight: '500',
  },
  hint: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.sm,
    lineHeight: 20,
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
  cancelText: {
    color: COLORS.textSecondary,
    fontWeight: '500',
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
