import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text, TextInput, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useCollections } from '../../hooks/useCollections';
import { useAuth } from '../../hooks/useAuth';
import { FormScreen } from '../../components/FormScreen';
import { HeaderLinkButton } from '../../components/HeaderLinkButton';
import { DateField } from '../../components/DateField';
import { MoneyInput } from '../../components/MoneyInput';
import { COLORS, FONTS, RADIUS, SPACING } from '../../constants/colors';
import { addMonths, toISODate } from '../../utils/dates';
import { setGoalForUser } from '../../services/collectionGoals';

export default function NewCollectionScreen() {
  const router = useRouter();
  const { user, can: canDo } = useAuth();
  const { createCollection, refresh } = useCollections();

  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(addMonths(new Date(), 3));
  const [goalAmount, setGoalAmount] = useState(0);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!canDo('manage_collections')) router.replace('/(tabs)/collections');
  }, [canDo, router]);

  const canCreate =
    name.trim().length > 0 && toISODate(endDate) >= toISODate(startDate);

  const handleCreate = async () => {
    if (!canCreate || creating) return;
    setCreating(true);
    try {
      const collection = await createCollection({
        name: name.trim(),
        startDate: toISODate(startDate),
        endDate: toISODate(endDate),
      });
      if (goalAmount > 0 && user?.id) {
        await setGoalForUser(collection.id, user.id, goalAmount);
      }
      await refresh();
      router.back();
    } catch (err) {
      Alert.alert('Erro', err instanceof Error ? err.message : 'Não foi possível criar a coleção.');
    } finally {
      setCreating(false);
    }
  };

  return (
    <FormScreen
      title="Nova coleção"
      onBack={() => router.back()}
      headerRight={
        <HeaderLinkButton
          label="Criar"
          onPress={handleCreate}
          disabled={!canCreate}
          loading={creating}
        />
      }
    >
      <View style={styles.field}>
        <Text style={styles.label}>NOME</Text>
        <TextInput
          style={styles.input}
          placeholder="Ex: Verão 2026"
          placeholderTextColor={COLORS.textPlaceholder}
          value={name}
          onChangeText={setName}
          returnKeyType="next"
          autoFocus
        />
      </View>
      <DateField label="DATA INICIAL" value={startDate} onChange={setStartDate} />
      <DateField
        label="DATA FINAL"
        value={endDate}
        onChange={setEndDate}
        minimumDate={startDate}
      />
      <MoneyInput label="META" value={goalAmount} onChange={setGoalAmount} />
      <Text style={styles.hint}>Valor em reais da sua meta para esta coleção.</Text>
    </FormScreen>
  );
}

const styles = StyleSheet.create({
  field: { gap: SPACING.sm },
  label: {
    color: COLORS.textMuted,
    fontSize: FONTS.sizes.xs,
    fontWeight: '600',
    letterSpacing: 0.6,
  },
  input: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    color: COLORS.textPrimary,
    fontSize: FONTS.sizes.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.surfaceBorder,
  },
  hint: {
    color: COLORS.textPlaceholder,
    fontSize: FONTS.sizes.xs,
    marginTop: -SPACING.sm,
  },
});
