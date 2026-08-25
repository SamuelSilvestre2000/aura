import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
import { useClients } from '../../hooks/useClients';
import { useGeoJSON } from '../../hooks/useGeoJSON';
import { useAuth } from '../../hooks/useAuth';
import { usePanelNav } from '../../hooks/usePanelNav';
import { useIsDesktop } from '../../hooks/useIsDesktop';
import { getAllowedCategoriesForUser } from '../../services/categories';
import { Category } from '../../types';
import { CategoryMultiSelect } from '../../components/CategoryMultiSelect';
import { FormScreen } from '../../components/FormScreen';
import { FormSection } from '../../components/FormSection';
import { FormRow } from '../../components/FormRow';
import { HeaderLinkButton } from '../../components/HeaderLinkButton';
import { COLORS, FONTS, HIT_TARGET, RADIUS, SPACING } from '../../constants/colors';
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

type SelectedCity = {
  code: string;
  name: string;
  lat: number;
  lng: number;
};

type Props = { id?: string };

export default function EditClientScreen({ id: propId }: Props = {}) {
  const router = useRouter();
  const nav = usePanelNav();
  const isDesktop = useIsDesktop();
  const { user, can: canDo } = useAuth();
  const params = useLocalSearchParams<{ id: string }>();
  const id = propId ?? params.id;

  const { clients, updateClient, loading: clientsLoading, refresh: refreshClients } = useClients();
  const { cities, loading: geoLoading, refresh: refreshCities } = useGeoJSON();

  const client = useMemo(() => clients.find((c) => c.id === id), [clients, id]);

  const [name, setName] = useState('');
  const [tradeName, setTradeName] = useState('');
  const [cnpj, setCnpj] = useState('');
  const [municipalRegistration, setMunicipalRegistration] = useState('');
  const [street, setStreet] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [zipCode, setZipCode] = useState('');
  const [phone, setPhone] = useState('');
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('');
  const [instagram, setInstagram] = useState('');
  const [facebook, setFacebook] = useState('');
  const [notes, setNotes] = useState('');
  const [citySearch, setCitySearch] = useState('');
  const [selectedCity, setSelectedCity] = useState<SelectedCity | null>(null);
  const [showCityList, setShowCityList] = useState(false);
  const [categoryIds, setCategoryIds] = useState<string[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (canDo('manage_clients')) return;
    if (nav.isDesktop) {
      nav.back();
      return;
    }
    router.replace('/(tabs)');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canDo, router]);

  const loadCategories = useCallback(async () => {
    if (!user) return;
    setLoadingCategories(true);
    try {
      setCategories(await getAllowedCategoriesForUser(user.id, user.role));
    } finally {
      setLoadingCategories(false);
    }
  }, [user]);

  useEffect(() => {
    void loadCategories();
  }, [loadCategories]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([refreshClients(), refreshCities(), loadCategories()]);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (!client || initialized) return;
    setName(client.name);
    setTradeName(client.tradeName || '');
    setCnpj(client.cnpj ? formatCnpj(client.cnpj) : '');
    setMunicipalRegistration(client.municipalRegistration || '');
    setStreet(client.street || '');
    setNeighborhood(client.neighborhood || '');
    setZipCode(client.zipCode || '');
    setPhone(client.phone || '');
    setMobile(client.mobile || '');
    setEmail(client.email || '');
    setInstagram(client.instagram || '');
    setFacebook(client.facebook || '');
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
        tradeName: tradeName.trim() || undefined,
        cnpj: cnpj.trim(),
        municipalRegistration: municipalRegistration.trim() || undefined,
        street: street.trim() || undefined,
        neighborhood: neighborhood.trim() || undefined,
        zipCode: zipCode.trim() || undefined,
        city: selectedCity.name,
        cityCode: selectedCity.code,
        lat: selectedCity.lat,
        lng: selectedCity.lng,
        phone: phone.trim() || undefined,
        mobile: mobile.trim() || undefined,
        email: email.trim() || undefined,
        instagram: instagram.trim() || undefined,
        facebook: facebook.trim() || undefined,
        notes: notes.trim() || undefined,
        categoryIds,
      });
      nav.back();
    } catch {
      Alert.alert('Erro', 'Não foi possível atualizar o cliente.');
    } finally {
      setSubmitting(false);
    }
  };

  if (clientsLoading || (client && !initialized)) {
    return (
      <View style={[styles.center, isDesktop && styles.containerDesktop]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (!client) {
    return (
      <View style={[styles.center, isDesktop && styles.containerDesktop]}>
        <Ionicons name="person-outline" size={40} color={COLORS.textMuted} />
        <Text style={styles.notFoundText}>Cliente não encontrado</Text>
        <TouchableOpacity onPress={() => nav.back()} style={styles.outlineButton}>
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
      onBack={() => nav.back()}
      onRefresh={handleRefresh}
      refreshing={refreshing}
      headerRight={
        <HeaderLinkButton
          label="Salvar"
          onPress={handleSubmit}
          disabled={!isValid}
          loading={submitting}
        />
      }
    >
      <FormSection title="Informações básicas">
        <FormRow label="Nome da loja" required first>
          <TextInput
            style={styles.rowInput}
            placeholder="Ex: Boutique Moda Piauí"
            placeholderTextColor={COLORS.textPlaceholder}
            value={name}
            onChangeText={setName}
            returnKeyType="next"
            autoFocus
          />
        </FormRow>

        <FormRow label="Nome fantasia">
          <TextInput
            style={styles.rowInput}
            placeholder="Usado no dia a dia"
            placeholderTextColor={COLORS.textPlaceholder}
            value={tradeName}
            onChangeText={setTradeName}
            returnKeyType="next"
          />
        </FormRow>
      </FormSection>

      <FormSection title="Identificação">
        <FormRow label="CNPJ" first>
          <TextInput
            style={[styles.rowInput, styles.rowInputNumeric]}
            placeholder="00.000.000/0000-00"
            placeholderTextColor={COLORS.textPlaceholder}
            value={cnpj}
            onChangeText={(text) => setCnpj(maskCnpjInput(text))}
            keyboardType="number-pad"
            returnKeyType="next"
          />
        </FormRow>

        <FormRow label="Inscr. municipal">
          <TextInput
            style={[styles.rowInput, styles.rowInputNumeric]}
            placeholder="000000000"
            placeholderTextColor={COLORS.textPlaceholder}
            value={municipalRegistration}
            onChangeText={setMunicipalRegistration}
            keyboardType="number-pad"
            maxLength={20}
            returnKeyType="next"
          />
        </FormRow>
      </FormSection>

      <FormSection
        title="Endereço"
        footer="O cliente aparece no mapa na cidade selecionada."
      >
        <FormRow label="Cidade" required first alignTop={showCityList && !selectedCity}>
          <View style={styles.cityControl}>
            <TextInput
              style={styles.rowInput}
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
                    <Ionicons name="location-outline" size={16} color={COLORS.textSecondary} />
                    <Text style={styles.cityRowText}>{city.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            ) : null}
          </View>
        </FormRow>

        <FormRow label="Logradouro">
          <TextInput
            style={styles.rowInput}
            placeholder="Rua, avenida, número..."
            placeholderTextColor={COLORS.textPlaceholder}
            value={street}
            onChangeText={setStreet}
            returnKeyType="next"
          />
        </FormRow>

        <FormRow label="Bairro">
          <TextInput
            style={styles.rowInput}
            placeholder="Bairro"
            placeholderTextColor={COLORS.textPlaceholder}
            value={neighborhood}
            onChangeText={setNeighborhood}
            returnKeyType="next"
          />
        </FormRow>

        <FormRow label="CEP">
          <TextInput
            style={[styles.rowInput, styles.rowInputNumeric]}
            placeholder="00000-000"
            placeholderTextColor={COLORS.textPlaceholder}
            value={zipCode}
            onChangeText={(text) => setZipCode(maskCepInput(text))}
            keyboardType="number-pad"
            returnKeyType="next"
          />
        </FormRow>
      </FormSection>

      {showCategoryField ? (
        <FormSection
          title="Categorias"
          footer="Linhas de produto atendidas nesta loja."
          variant="plain"
        >
          {loadingCategories ? (
            <ActivityIndicator size="small" color={COLORS.primary} style={styles.catLoading} />
          ) : (
            <CategoryMultiSelect
              categories={categories}
              selectedIds={categoryIds}
              onChange={setCategoryIds}
            />
          )}
        </FormSection>
      ) : null}

      <FormSection title="Contato">
        <FormRow label="Telefone" first>
          <TextInput
            style={[styles.rowInput, styles.rowInputNumeric]}
            placeholder="(86) 3000-0000"
            placeholderTextColor={COLORS.textPlaceholder}
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            returnKeyType="next"
          />
        </FormRow>

        <FormRow label="Celular">
          <TextInput
            style={[styles.rowInput, styles.rowInputNumeric]}
            placeholder="(86) 99999-9999"
            placeholderTextColor={COLORS.textPlaceholder}
            value={mobile}
            onChangeText={setMobile}
            keyboardType="phone-pad"
            returnKeyType="next"
          />
        </FormRow>

        <FormRow label="Email">
          <TextInput
            style={styles.rowInput}
            placeholder="contato@loja.com.br"
            placeholderTextColor={COLORS.textPlaceholder}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="next"
          />
        </FormRow>
      </FormSection>

      <FormSection title="Redes sociais">
        <FormRow label="Instagram" first>
          <TextInput
            style={styles.rowInput}
            placeholder="@usuario"
            placeholderTextColor={COLORS.textPlaceholder}
            value={instagram}
            onChangeText={setInstagram}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="next"
          />
        </FormRow>

        <FormRow label="Facebook">
          <TextInput
            style={styles.rowInput}
            placeholder="facebook.com/loja"
            placeholderTextColor={COLORS.textPlaceholder}
            value={facebook}
            onChangeText={setFacebook}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="next"
          />
        </FormRow>
      </FormSection>

      <FormSection title="Observações" variant="plain">
        <TextInput
          style={styles.notesInput}
          placeholder="Horário, contato na loja, referências..."
          placeholderTextColor={COLORS.textPlaceholder}
          value={notes}
          onChangeText={setNotes}
          multiline
          numberOfLines={3}
          textAlignVertical="top"
          returnKeyType="done"
        />
      </FormSection>
    </FormScreen>
  );
}

const styles = StyleSheet.create({
  // No painel do desktop estas telas tambem flutuam sobre o mapa: fundo opaco
  // cobriria o vidro durante a transicao.
  containerDesktop: {
    backgroundColor: 'transparent',
  },
  rowInput: {
    color: COLORS.textPrimary,
    fontSize: FONTS.sizes.lg,
    paddingVertical: 0,
    textAlign: 'right',
  },
  rowInputNumeric: {
    ...FONTS.tabular,
  },
  cityControl: {
    gap: SPACING.sm,
  },
  notesInput: {
    minHeight: 88,
    color: COLORS.textPrimary,
    fontSize: FONTS.sizes.lg,
    padding: 0,
    textAlignVertical: 'top',
  },
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
