import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, View, Text, TextInput, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Alert } from '../../utils/alert';
import { useCollections } from '../../hooks/useCollections';
import { useAuth } from '../../hooks/useAuth';
import { usePanelNav } from '../../hooks/usePanelNav';
import { FormScreen } from '../../components/FormScreen';
import { FormSection } from '../../components/FormSection';
import { FormRow } from '../../components/FormRow';
import { HeaderLinkButton } from '../../components/HeaderLinkButton';
import { DateField } from '../../components/DateField';
import { CategorySelect } from '../../components/CategorySelect';
import { CollectionTypeSelect } from '../../components/CollectionTypeSelect';
import { CollectionGoalsInput } from '../../components/CollectionGoalsInput';
import { COLORS, FONTS, HIT_TARGET, RADIUS, SPACING } from '../../constants/colors';
import { addMonths, toISODate } from '../../utils/dates';
import { getAllowedCategoriesForUser } from '../../services/categories';
import { listCollectionTypes } from '../../services/collectionTypes';
import { CollectionType } from '../../types';
import { applicableGoalCategories } from '../../utils/collectionGoalCategories';

export default function NewCollectionScreen() {
  const router = useRouter();
  const nav = usePanelNav();
  const { user, can: canDo } = useAuth();
  const { createCollection, refresh } = useCollections();

  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(addMonths(new Date(), 3));
  const [goalsByCategory, setGoalsByCategory] = useState<Record<string, number>>({});
  /** '' = ainda não escolhida; null = "Ambas" escolhido explicitamente; string = categoria específica. */
  const [categoryId, setCategoryId] = useState<string | null>('');
  const [categories, setCategories] = useState(user?.categories ?? []);
  const [collectionTypeId, setCollectionTypeId] = useState<string | null>(null);
  const [collectionTypes, setCollectionTypes] = useState<CollectionType[]>([]);
  const [setAsVigente, setSetAsVigente] = useState(true);
  const [creating, setCreating] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (canDo('manage_collections')) return;
    if (nav.isDesktop) {
      nav.back();
      return;
    }
    router.replace('/(tabs)/collections');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canDo, router]);

  const loadCategories = useCallback(async () => {
    if (!user) {
      setCategories([]);
      return;
    }
    setCategories(await getAllowedCategoriesForUser(user.id, user.role));
  }, [user]);

  const loadCollectionTypes = useCallback(async () => {
    setCollectionTypes(await listCollectionTypes());
  }, []);

  useEffect(() => {
    void loadCategories();
  }, [loadCategories]);

  useEffect(() => {
    void loadCollectionTypes();
  }, [loadCollectionTypes]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([loadCategories(), loadCollectionTypes()]);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (categories.length === 1) {
      setCategoryId(categories[0].id);
    }
  }, [categories]);

  const goalCategories = useMemo(
    () => applicableGoalCategories(categoryId, categories),
    [categoryId, categories]
  );

  useEffect(() => {
    setGoalsByCategory((prev) => {
      const next: Record<string, number> = {};
      for (const cat of goalCategories) {
        next[cat.id] = prev[cat.id] ?? 0;
      }
      return next;
    });
  }, [goalCategories]);

  const canCreate =
    name.trim().length > 0 &&
    toISODate(endDate) >= toISODate(startDate) &&
    categories.length > 0 &&
    (categories.length > 1 ? categoryId !== '' : categoryId != null);

  const handleGoalChange = (catId: string, amount: number) => {
    setGoalsByCategory((prev) => ({ ...prev, [catId]: amount }));
  };

  const handleCreate = async () => {
    if (!canCreate || creating) return;
    setCreating(true);
    try {
      const goals = goalCategories
        .map((cat) => ({
          categoryId: cat.id,
          goalAmount: goalsByCategory[cat.id] ?? 0,
        }))
        .filter((g) => g.goalAmount > 0);

      await createCollection({
        name: name.trim(),
        startDate: toISODate(startDate),
        endDate: toISODate(endDate),
        categoryId: categoryId === '' ? null : categoryId,
        collectionTypeId,
        goals,
        userId: user?.id,
        userRole: user?.role,
        isVigente: setAsVigente,
      });
      await refresh();
      nav.back();
    } catch (err) {
      Alert.alert('Erro', err instanceof Error ? err.message : 'Não foi possível criar a coleção.');
    } finally {
      setCreating(false);
    }
  };

  return (
    <FormScreen
      title="Nova coleção"
      onBack={() => nav.back()}
      onRefresh={handleRefresh}
      refreshing={refreshing}
      headerRight={
        <HeaderLinkButton
          label="Criar"
          onPress={handleCreate}
          disabled={!canCreate}
          loading={creating}
        />
      }
    >
      <FormSection title="Informações básicas">
        <FormRow label="Nome" required first>
          <TextInput
            style={styles.rowInput}
            placeholder="Ex: Verão 2026"
            placeholderTextColor={COLORS.textPlaceholder}
            value={name}
            onChangeText={setName}
            returnKeyType="next"
            autoFocus
          />
        </FormRow>
      </FormSection>

      {/*
        Seletores e campos de data trazem o próprio layout, então ficam em
        seções `plain`, que preservam o respiro interno do cartão.
      */}
      {categories.length > 1 ? (
        <FormSection title="Linha" variant="plain">
          <CategorySelect
            categories={categories}
            value={categoryId}
            onChange={setCategoryId}
            includeAll
            required
          />
        </FormSection>
      ) : null}

      <FormSection title="Temporada" variant="plain">
        <CollectionTypeSelect
          types={collectionTypes}
          value={collectionTypeId}
          onChange={setCollectionTypeId}
        />
      </FormSection>

      <FormSection title="Período" variant="plain">
        <DateField label="Data inicial" value={startDate} onChange={setStartDate} required />
        <DateField
          label="Data final"
          value={endDate}
          onChange={setEndDate}
          minimumDate={startDate}
          required
        />

        <TouchableOpacity
          style={styles.checkboxRow}
          onPress={() => setSetAsVigente((prev) => !prev)}
          activeOpacity={0.7}
        >
          <Ionicons
            name={setAsVigente ? 'checkbox' : 'square-outline'}
            size={22}
            color={setAsVigente ? COLORS.primary : COLORS.textMuted}
          />
          <View style={styles.checkboxBody}>
            <Text style={styles.checkboxLabel}>Definir como vigente</Text>
            <Text style={styles.checkboxHint}>
              Esta será a coleção em destaque para vendas — substitui a vigente atual.
            </Text>
          </View>
        </TouchableOpacity>
      </FormSection>

      {goalCategories.length > 0 ? (
        <FormSection title="Metas" variant="plain">
          <CollectionGoalsInput
            categories={goalCategories}
            values={goalsByCategory}
            onChange={handleGoalChange}
            sectionLabel=""
          />
        </FormSection>
      ) : null}
    </FormScreen>
  );
}

const styles = StyleSheet.create({
  rowInput: {
    color: COLORS.textPrimary,
    fontSize: FONTS.sizes.lg,
    paddingVertical: 0,
    textAlign: 'right',
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm,
  },
  checkboxBody: { flex: 1, gap: 2 },
  checkboxLabel: {
    color: COLORS.textPrimary,
    fontSize: FONTS.sizes.md,
    fontWeight: '600',
  },
  checkboxHint: {
    color: COLORS.textMuted,
    fontSize: FONTS.sizes.xs,
    lineHeight: 16,
  },
});
