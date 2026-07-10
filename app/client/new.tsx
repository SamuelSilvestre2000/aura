import React, { useEffect, useMemo, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Alert } from '../../utils/alert';
import { goBack } from '../../utils/navigation';
import { useClients } from '../../hooks/useClients';
import { useGeoJSON } from '../../hooks/useGeoJSON';
import { useAuth } from '../../hooks/useAuth';
import { getAllowedCategoriesForUser } from '../../services/categories';
import { Category } from '../../types';
import { CategoryMultiSelect } from '../../components/CategoryMultiSelect';
import { FormScreen } from '../../components/FormScreen';
import { FormSection } from '../../components/FormSection';
import { HeaderLinkButton } from '../../components/HeaderLinkButton';
import { COLORS, FONTS, RADIUS, SPACING } from '../../constants/colors';
import { formatCnpj, isValidCnpj, maskCnpjInput } from '../../utils/cnpj';

function maskCepInput(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 5) return digits;
  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
}

/** Aceita fixo (10 dígitos) ou celular (11 dígitos), reformatando conforme digita. */
function maskPhoneInput(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 2) return digits.length ? `(${digits}` : '';
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

export type InitialCity = {
  code: string;
  name: string;
  lat: number;
  lng: number;
};

export default function NewClientScreen() {
  const router = useRouter();
  const { user, can: canDo } = useAuth();
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
  const [tradeName, setTradeName] = useState('');
  const [externalCode, setExternalCode] = useState('');
  const [cnpj, setCnpj] = useState('');
  const [street, setStreet] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [zipCode, setZipCode] = useState('');
  const [phone, setPhone] = useState('');
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('');
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
    if (!user) return;
    getAllowedCategoriesForUser(user.id, user.role)
      .then(setCategories)
      .finally(() => setLoadingCategories(false));
  }, [initialCity, user]);

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
    if (!isValidCnpj(cnpj)) {
      Alert.alert('CNPJ inválido', 'Informe um CNPJ válido ou deixe o campo em branco.');
      return;
    }
    setSubmitting(true);
    try {
      await createClient({
        name: name.trim(),
        tradeName: tradeName.trim() || undefined,
        externalCode: externalCode.trim() || undefined,
        cnpj: cnpj.trim() || undefined,
        street: street.trim() || undefined,
        neighborhood: neighborhood.trim() || undefined,
        city: selectedCity.name,
        cityCode: selectedCity.code,
        zipCode: zipCode.trim() || undefined,
        lat: selectedCity.lat,
        lng: selectedCity.lng,
        phone: phone.trim() || undefined,
        mobile: mobile.trim() || undefined,
        email: email.trim() || undefined,
        notes: notes.trim() || undefined,
        categoryIds,
      });
      goBack(router);
    } catch {
      Alert.alert('Erro', 'Não foi possível cadastrar o cliente.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <FormScreen
      title="Novo cliente"
      onBack={() => goBack(router)}
      headerRight={
        <HeaderLinkButton
          label="Criar"
          onPress={handleSubmit}
          disabled={!isValid}
          loading={submitting}
        />
      }
    >
      <FormSection title="Informações básicas">
        <View style={styles.field}>
          <Text style={styles.label}>
            Nome <Text style={styles.required}>*</Text>
          </Text>
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
          <Text style={styles.label}>Nome fantasia</Text>
          <TextInput
            style={styles.input}
            placeholder="Nome usado no dia a dia da loja"
            placeholderTextColor={COLORS.textPlaceholder}
            value={tradeName}
            onChangeText={setTradeName}
            returnKeyType="next"
          />
        </View>
      </FormSection>

      <FormSection title="Identificação">
        <View style={styles.field}>
          <Text style={styles.label}>Código</Text>
          <TextInput
            style={styles.input}
            placeholder="0000000"
            placeholderTextColor={COLORS.textPlaceholder}
            value={externalCode}
            onChangeText={setExternalCode}
            returnKeyType="next"
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
      </FormSection>

      <FormSection title="Endereço">
        <View style={styles.field}>
          <Text style={styles.label}>
            Cidade no Piauí <Text style={styles.required}>*</Text>
          </Text>
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
          <Text style={styles.label}>Logradouro</Text>
          <TextInput
            style={styles.input}
            placeholder="Rua, avenida, número..."
            placeholderTextColor={COLORS.textPlaceholder}
            value={street}
            onChangeText={setStreet}
            returnKeyType="next"
          />
        </View>

        <View style={styles.row}>
          <View style={[styles.field, styles.rowItemGrow]}>
            <Text style={styles.label}>Bairro</Text>
            <TextInput
              style={styles.input}
              placeholder="Bairro"
              placeholderTextColor={COLORS.textPlaceholder}
              value={neighborhood}
              onChangeText={setNeighborhood}
              returnKeyType="next"
            />
          </View>
          <View style={[styles.field, styles.rowItemSmall]}>
            <Text style={styles.label}>UF</Text>
            <View style={[styles.input, styles.inputLocked]}>
              <Text style={styles.lockedCityText}>PI</Text>
            </View>
          </View>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>CEP</Text>
          <TextInput
            style={styles.input}
            placeholder="00000-000"
            placeholderTextColor={COLORS.textPlaceholder}
            value={zipCode}
            onChangeText={(text) => setZipCode(maskCepInput(text))}
            keyboardType="number-pad"
            returnKeyType="next"
          />
        </View>
      </FormSection>

      <View style={styles.field}>
        <Text style={styles.label}>
          Categoria <Text style={styles.required}>*</Text>
        </Text>
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

      <FormSection title="Contato">
        <View style={styles.field}>
          <Text style={styles.label}>Telefone</Text>
          <TextInput
            style={styles.input}
            placeholder="(86) 3000-0000"
            placeholderTextColor={COLORS.textPlaceholder}
            value={phone}
            onChangeText={(text) => setPhone(maskPhoneInput(text))}
            keyboardType="phone-pad"
            maxLength={15}
            returnKeyType="next"
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Celular</Text>
          <TextInput
            style={styles.input}
            placeholder="(86) 99999-9999"
            placeholderTextColor={COLORS.textPlaceholder}
            value={mobile}
            onChangeText={(text) => setMobile(maskPhoneInput(text))}
            keyboardType="phone-pad"
            maxLength={15}
            returnKeyType="next"
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            placeholder="contato@loja.com.br"
            placeholderTextColor={COLORS.textPlaceholder}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="next"
          />
        </View>
      </FormSection>

      <FormSection title="Observações">
        <View style={styles.field}>
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
      </FormSection>
    </FormScreen>
  );
}

const styles = StyleSheet.create({
  field: { gap: SPACING.sm },
  row: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  rowItemGrow: { flex: 1 },
  rowItemSmall: { width: 72 },
  label: {
    color: COLORS.textPrimary,
    fontSize: FONTS.sizes.xs,
    fontWeight: '600',
    letterSpacing: 0.4,
  },
  required: {
    color: COLORS.error,
  },
  hint: {
    color: COLORS.textPlaceholder,
    fontSize: FONTS.sizes.xs,
    marginTop: -2,
    marginBottom: 2,
  },
  input: {
    backgroundColor: COLORS.backgroundSubtle,
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
