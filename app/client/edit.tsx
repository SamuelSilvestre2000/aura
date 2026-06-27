import React, { useEffect, useMemo, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useClients } from '../../hooks/useClients';
import { useGeoJSON } from '../../hooks/useGeoJSON';
import { useAuth } from '../../hooks/useAuth';
import { getAllowedCategoriesForUser } from '../../services/categories';
import { Category } from '../../types';
import { CategoryMultiSelect } from '../../components/CategoryMultiSelect';
import { FormScreen } from '../../components/FormScreen';
import { HeaderLinkButton } from '../../components/HeaderLinkButton';
import { COLORS, FONTS, RADIUS, SPACING } from '../../constants/colors';
import { formatCnpj, isValidCnpj, maskCnpjInput } from '../../utils/cnpj';

type SelectedCity = {
  code: string;
  name: string;
  lat: number;
  lng: number;
};

export default function EditClientScreen() {
  const router = useRouter();
  const { user, can: canDo } = useAuth();
  const params = useLocalSearchParams<{ id: string }>();

  const { clients, updateClient, loading: clientsLoading } = useClients();
  const { cities, loading: geoLoading } = useGeoJSON();

  const client = useMemo(() => clients.find((c) => c.id === params.id), [clients, params.id]);

  const [name, setName] = useState('');
  const [cnpj, setCnpj] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [citySearch, setCitySearch] = useState('');
  const [selectedCity, setSelectedCity] = useState<SelectedCity | null>(null);
  const [showCityList, setShowCityList] = useState(false);
  const [categoryIds, setCategoryIds] = useState<string[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (!canDo('manage_clients')) router.replace('/(tabs)');
  }, [canDo, router]);

  useEffect(() => {
    if (!user) return;
    getAllowedCategoriesForUser(user.id, user.role)
      .then(setCategories)
      .finally(() => setLoadingCategories(false));
  }, [user]);

  useEffect(() => {
    if (!client || initialized) return;
    setName(client.name);
    setCnpj(client.cnpj ? formatCnpj(client.cnpj) : '');
    setPhone(client.phone || '');
    setNotes(client.notes || '');
    setCategoryIds(client.categoryIds ?? []);
    setCitySearch(client.city);
    setSelectedCity({
      code: client.cityCode,
      name: client.city,
      lat: client.lat ?? 0,
      lng: client.lng ?? 0,
    });
    setInitialized(true);
  }, [client, initialized]);

  useEffect(() => {
    if (categories.length === 1 && categoryIds.length === 0) {
      setCategoryIds([categories[0].id]);
    }
  }, [categories, categoryIds.length]);

  const filteredCities = useMemo(() => {
    if (!citySearch.trim() || citySearch === selectedCity?.name) return [];
    const q = citySearch.toLowerCase();
    return cities.filter((c) => c.name.toLowerCase().includes(q)).slice(0, 6);
  }, [cities, citySearch, selectedCity]);

  const handleSelectCity = (city: (typeof cities)[0]) => {
    setSelectedCity({
      code: city.code,
      name: city.name,
      lat: city.centroid[1],
      lng: city.centroid[0],
    });
    setCitySearch(city.name);
    setShowCityList(false);
  };

  const isValid =
    name.trim().length > 0 && !!selectedCity && categoryIds.length > 0;

  const handleSubmit = async () => {
    if (!isValid || !client || !selectedCity) return;
    if (!isValidCnpj(cnpj)) {
      Alert.alert('CNPJ inválido', 'Informe um CNPJ válido ou deixe o campo em branco.');
      return;
    }

    setSubmitting(true);
    try {
      await updateClient(client.id, {
        name: name.trim(),
        cnpj: cnpj.trim(),
        city: selectedCity.name,
        cityCode: selectedCity.code,
        lat: selectedCity.lat,
        lng: selectedCity.lng,
        phone: phone.trim() || undefined,
        notes: notes.trim() || undefined,
        categoryIds,
      });
      router.back();
    } catch {
      Alert.alert('Erro', 'Não foi possível atualizar o cliente.');
    } finally {
      setSubmitting(false);
    }
  };

  if (clientsLoading || (client && !initialized)) {
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

  const showCategoryField = categories.length > 1;

  return (
    <FormScreen
      title="Editar cliente"
      onBack={() => router.back()}
      headerRight={
        <HeaderLinkButton
          label="Salvar"
          onPress={handleSubmit}
          disabled={!isValid}
          loading={submitting}
        />
      }
    >
      <View style={styles.field}>
        <Text style={styles.label}>NOME DA LOJA</Text>
        <TextInput
          style={styles.input}
          placeholder="Ex: Boutique Moda Piauí"
          placeholderTextColor={COLORS.textPlaceholder}
          value={name}
          onChangeText={setName}
          returnKeyType="next"
          autoFocus
        />
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>CNPJ</Text>
        <TextInput
          style={styles.input}
          placeholder="00.000.000/0000-00"
          placeholderTextColor={COLORS.textPlaceholder}
          value={cnpj}
          onChangeText={(text) => setCnpj(maskCnpjInput(text))}
          keyboardType="number-pad"
          returnKeyType="next"
        />
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>CIDADE NO PIAUÍ</Text>
        <Text style={styles.hint}>O cliente aparece no mapa na cidade selecionada.</Text>
        <TextInput
          style={[styles.input, selectedCity && styles.inputSelected]}
          placeholder={geoLoading ? 'Carregando cidades...' : 'Buscar cidade...'}
          placeholderTextColor={COLORS.textPlaceholder}
          value={citySearch}
          onChangeText={(text) => {
            setCitySearch(text);
            if (text !== selectedCity?.name) setSelectedCity(null);
            setShowCityList(true);
          }}
          onFocus={() => setShowCityList(true)}
          editable={!geoLoading}
          returnKeyType="search"
        />
        {selectedCity ? (
          <View style={styles.cityBadge}>
            <Ionicons name="checkmark-circle" size={14} color={COLORS.success} />
            <Text style={styles.cityBadgeText}>{selectedCity.name} — PI</Text>
          </View>
        ) : null}
        {showCityList && filteredCities.length > 0 && !selectedCity ? (
          <View style={styles.cityList}>
            {filteredCities.map((city, index) => (
              <TouchableOpacity
                key={city.code}
                style={[styles.cityRow, index > 0 && styles.cityRowBorder]}
                onPress={() => handleSelectCity(city)}
                activeOpacity={0.7}
              >
                <Ionicons name="location-outline" size={16} color={COLORS.textMuted} />
                <Text style={styles.cityRowText}>{city.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        ) : null}
      </View>

      {showCategoryField ? (
        <View style={styles.field}>
          <Text style={styles.label}>CATEGORIAS</Text>
          <Text style={styles.hint}>Linhas de produto atendidas nesta loja.</Text>
          {loadingCategories ? (
            <ActivityIndicator size="small" color={COLORS.primary} style={styles.catLoading} />
          ) : (
            <CategoryMultiSelect
              categories={categories}
              selectedIds={categoryIds}
              onChange={setCategoryIds}
            />
          )}
        </View>
      ) : null}

      <View style={styles.field}>
        <Text style={styles.label}>TELEFONE</Text>
        <TextInput
          style={styles.input}
          placeholder="(86) 99999-9999"
          placeholderTextColor={COLORS.textPlaceholder}
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
          returnKeyType="next"
        />
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>OBSERVAÇÕES</Text>
        <TextInput
          style={[styles.input, styles.inputMultiline]}
          placeholder="Horário, contato na loja, referências..."
          placeholderTextColor={COLORS.textPlaceholder}
          value={notes}
          onChangeText={setNotes}
          multiline
          numberOfLines={3}
          textAlignVertical="top"
          returnKeyType="done"
        />
      </View>
    </FormScreen>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    backgroundColor: COLORS.backgroundSubtle,
    justifyContent: 'center',
    alignItems: 'center',
    gap: SPACING.md,
    paddingHorizontal: SPACING.xl,
  },
  notFoundText: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.md,
    textAlign: 'center',
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
  field: { gap: SPACING.sm },
  label: {
    color: COLORS.textMuted,
    fontSize: FONTS.sizes.xs,
    fontWeight: '600',
    letterSpacing: 0.6,
  },
  hint: {
    color: COLORS.textPlaceholder,
    fontSize: FONTS.sizes.xs,
    marginBottom: 2,
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
  inputSelected: {
    borderColor: COLORS.primary,
  },
  inputMultiline: {
    minHeight: 80,
    paddingTop: SPACING.md,
  },
  cityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  cityBadgeText: {
    color: COLORS.success,
    fontSize: FONTS.sizes.sm,
    fontWeight: '500',
  },
  cityList: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.surfaceBorder,
    overflow: 'hidden',
    marginTop: 4,
  },
  cityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  cityRowBorder: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.surfaceBorder,
  },
  cityRowText: {
    color: COLORS.textPrimary,
    fontSize: FONTS.sizes.md,
  },
  catLoading: {
    alignSelf: 'flex-start',
    marginVertical: SPACING.sm,
  },
});
