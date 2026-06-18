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
import { listCategories } from '../../services/categories';
import { Category } from '../../types';
import { CategoryMultiSelect } from '../../components/CategoryMultiSelect';
import { FormScreen } from '../../components/FormScreen';
import { HeaderLinkButton } from '../../components/HeaderLinkButton';
import { COLORS, FONTS, RADIUS, SPACING } from '../../constants/colors';

export type InitialCity = {
  code: string;
  name: string;
  lat: number;
  lng: number;
};

export default function NewClientScreen() {
  const router = useRouter();
  const { can: canDo } = useAuth();
  const params = useLocalSearchParams<{
    city?: string;
    cityCode?: string;
    lat?: string;
    lng?: string;
  }>();

  const { createClient } = useClients();
  const { cities, loading: geoLoading } = useGeoJSON();

  const initialCity = useMemo<InitialCity | null>(() => {
    if (!params.cityCode) return null;
    return {
      code: params.cityCode,
      name: params.city || '',
      lat: parseFloat(params.lat || '0'),
      lng: parseFloat(params.lng || '0'),
    };
  }, [params.city, params.cityCode, params.lat, params.lng]);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [citySearch, setCitySearch] = useState(initialCity?.name ?? '');
  const [selectedCity, setSelectedCity] = useState<InitialCity | null>(initialCity);
  const [showCityList, setShowCityList] = useState(false);
  const [categoryIds, setCategoryIds] = useState<string[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!canDo('manage_clients')) router.replace('/(tabs)');
  }, [canDo, router]);

  useEffect(() => {
    setCitySearch(initialCity?.name ?? '');
    setSelectedCity(initialCity);
    listCategories()
      .then(setCategories)
      .finally(() => setLoadingCategories(false));
  }, [initialCity]);

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

  const cityLocked = !!initialCity;

  const handleSubmit = async () => {
    if (!isValid || !selectedCity) return;
    setSubmitting(true);
    try {
      await createClient({
        name: name.trim(),
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
      Alert.alert('Erro', 'Não foi possível cadastrar o cliente.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <FormScreen
      title="Novo cliente"
      onBack={() => router.back()}
      headerRight={
        <HeaderLinkButton
          label="Criar"
          onPress={handleSubmit}
          disabled={!isValid}
          loading={submitting}
        />
      }
    >
      <View style={styles.field}>
        <Text style={styles.label}>Nome da loja *</Text>
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
        <Text style={styles.label}>Cidade no Piauí *</Text>
        <Text style={styles.hint}>O cliente aparece no mapa na cidade selecionada.</Text>
        {cityLocked && selectedCity ? (
          <View style={[styles.input, styles.inputLocked]}>
            <Ionicons name="location" size={16} color={COLORS.primary} />
            <Text style={styles.lockedCityText}>{selectedCity.name}</Text>
          </View>
        ) : (
          <>
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
            {selectedCity && (
              <View style={styles.cityBadge}>
                <Ionicons name="checkmark-circle" size={14} color={COLORS.success} />
                <Text style={styles.cityBadgeText}>{selectedCity.name} — PI</Text>
              </View>
            )}
            {showCityList && filteredCities.length > 0 && !selectedCity && (
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
            )}
          </>
        )}
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Categoria *</Text>
        <Text style={styles.hint}>Linha de produto atendida nesta loja.</Text>
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

      <View style={styles.field}>
        <Text style={styles.label}>Telefone</Text>
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
        <Text style={styles.label}>Observações</Text>
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
  field: { gap: SPACING.sm },
  label: {
    color: COLORS.textMuted,
    fontSize: FONTS.sizes.xs,
    fontWeight: '600',
    letterSpacing: 0.4,
  },
  hint: {
    color: COLORS.textPlaceholder,
    fontSize: FONTS.sizes.xs,
    marginTop: -2,
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
  inputSelected: { borderColor: COLORS.primary },
  inputLocked: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.primaryBg,
    borderColor: COLORS.primary,
  },
  lockedCityText: {
    color: COLORS.textPrimary,
    fontSize: FONTS.sizes.md,
    fontWeight: '600',
    flex: 1,
  },
  inputMultiline: { minHeight: 80, paddingTop: SPACING.md },
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
