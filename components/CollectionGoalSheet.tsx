import React, { useEffect, useMemo, useState } from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Category, Collection, UserRole } from '../types';
import { COLORS, FONTS, RADIUS, SPACING } from '../constants/colors';
import { NotionHeader } from './NotionHeader';
import { CollectionGoalsInput } from './CollectionGoalsInput';
import { AppBottomSheet } from './AppBottomSheet';
import { formatPeriodBR } from '../utils/dates';
import { formatBRL } from '../utils/money';
import {
  getGoalsForCollectionAndUser,
  setGoalsForUser,
} from '../services/collectionGoals';
import { validateCategoryIdsForUser } from '../services/categories';
import { applicableGoalCategories } from '../utils/collectionGoalCategories';

type Props = {
  visible: boolean;
  collection: Collection | null;
  userId: string;
  userRole: UserRole;
  isRepresentative: boolean;
  categories: Category[];
  onClose: () => void;
  onSaved: () => void;
};

export function CollectionGoalSheet({
  visible,
  collection,
  userId,
  userRole,
  isRepresentative,
  categories,
  onClose,
  onSaved,
}: Props) {
  const [goalsByCategory, setGoalsByCategory] = useState<Record<string, number>>({});
  const [saving, setSaving] = useState(false);

  const goalCategories = useMemo(
    () => (collection ? applicableGoalCategories(collection.categoryId, categories) : []),
    [collection, categories]
  );

  useEffect(() => {
    if (!visible || !collection || !userId) return;

    let cancelled = false;
    (async () => {
      const saved = await getGoalsForCollectionAndUser(collection.id, userId);
      if (cancelled) return;
      const initial: Record<string, number> = {};
      for (const cat of goalCategories) {
        initial[cat.id] = saved.get(cat.id) ?? 0;
      }
      setGoalsByCategory(initial);
      setSaving(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [visible, collection, userId, goalCategories]);

  const handleGoalChange = (categoryId: string, amount: number) => {
    setGoalsByCategory((prev) => ({ ...prev, [categoryId]: amount }));
  };

  const handleSave = async () => {
    if (!collection) return;

    const goals = goalCategories
      .map((cat) => ({
        categoryId: cat.id,
        goalAmount: goalsByCategory[cat.id] ?? 0,
      }))
      .filter((g) => g.goalAmount > 0);

    if (goals.length === 0) {
      Alert.alert('Meta inválida', 'Informe ao menos uma meta maior que zero.');
      return;
    }

    setSaving(true);
    try {
      await validateCategoryIdsForUser(
        userId,
        userRole,
        goals.map((g) => g.categoryId)
      );
      await setGoalsForUser(collection.id, userId, goals);
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

  const soldAmount = collection.mySoldAmount ?? 0;
  const savedGoalAmount = collection.myGoalAmount ?? 0;
  const remaining = Math.max(0, savedGoalAmount - soldAmount);
  const salesPercent =
    savedGoalAmount > 0 ? Math.min(100, Math.round((soldAmount / savedGoalAmount) * 100)) : 0;

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
            <Text style={styles.saveText}>Salvar metas</Text>
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
      snapPoints={['42%', '68%', '92%']}
    >
      <NotionHeader title={collection.name} variant="sheet" />

      <View style={styles.body}>
        <View style={styles.card}>
          <Text style={styles.cardLabel}>PERÍODO</Text>
          <Text style={styles.periodText}>{period}</Text>
        </View>

        {savedGoalAmount > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardLabel}>DESEMPENHO</Text>
            <Text style={styles.statLine}>Vendido: {formatBRL(soldAmount)}</Text>
            <Text style={styles.statLine}>Meta: {formatBRL(savedGoalAmount)}</Text>
            <Text style={styles.statLine}>
              Faltam: {formatBRL(remaining)} ({100 - salesPercent}% restante)
            </Text>
          </View>
        )}

        {isRepresentative ? (
          <View style={styles.card}>
            <CollectionGoalsInput
              categories={goalCategories}
              values={goalsByCategory}
              onChange={handleGoalChange}
              sectionLabel="SUAS METAS"
            />
          </View>
        ) : (
          <View style={styles.card}>
            <Text style={styles.cardLabel}>METAS</Text>
            <Text style={styles.hint}>
              Cada representante define metas por categoria nesta coleção.
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
  statLine: {
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
