import React, { useState, useEffect, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useClients } from '../../hooks/useClients';
import { useGeoJSON } from '../../hooks/useGeoJSON';
import { useAuth } from '../../hooks/useAuth';
import { getAllowedCategoriesForUser } from '../../services/categories';
import { CategoryMultiSelect } from '../../components/CategoryMultiSelect';
import { Category } from '../../types';
import { COLORS, FONTS, RADIUS, SPACING } from '../../constants/colors';

export default function EditClientScreen() {
  const router = useRouter();
  const { user, can: canDo } = useAuth();
  const params = useLocalSearchParams<{ id: string }>();

  const { clients, updateClient, loading: clientsLoading } = useClients();
  const { cities, loading: geoLoading } = useGeoJSON();

  const client = useMemo(() => clients.find((c) => c.id === params.id), [clients, params.id]);

  useEffect(() => {
    if (!canDo('manage_clients')) router.replace('/(tabs)');
  }, [canDo, router]);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [citySearch, setCitySearch] = useState('');
  const [selectedCity, setSelectedCity] = useState<{ code: string; name: string; lat: number; lng: number } | null>(null);
  const [showCityDropdown, setShowCityDropdown] = useState(false);
  const [categoryIds, setCategoryIds] = useState<string[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!user) return;
    getAllowedCategoriesForUser(user.id, user.role).then(setCategories);
  }, [user]);

  useEffect(() => {
    if (client) {
      setName(client.name);
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
    }
  }, [client]);

  const filteredCities = useMemo(() => {
    if (!citySearch.trim() || citySearch === selectedCity?.name) return [];
    const q = citySearch.toLowerCase();
    return cities.filter((c) => c.name.toLowerCase().includes(q)).slice(0, 8);
  }, [cities, citySearch, selectedCity]);

  const handleSelectCity = (city: (typeof cities)[0]) => {
    setSelectedCity({
      code: city.code,
      name: city.name,
      lat: city.centroid[1],
      lng: city.centroid[0],
    });
    setCitySearch(city.name);
    setShowCityDropdown(false);
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      Alert.alert('Atenção', 'Informe o nome da loja/cliente.');
      return;
    }
    if (!selectedCity) {
      Alert.alert('Atenção', 'Selecione a cidade do cliente para exibir no mapa.');
      return;
    }
    if (categoryIds.length === 0) {
      Alert.alert('Atenção', 'Selecione ao menos uma categoria.');
      return;
    }

    if (!client) return;

    setSubmitting(true);
    try {
      await updateClient(client.id, {
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
    } catch (err) {
      Alert.alert('Erro', 'Não foi possível atualizar o cliente.');
    } finally {
      setSubmitting(false);
    }
  };

  if (clientsLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (!client) {
    return (
      <View style={styles.center}>
        <Text style={styles.notFoundText}>Cliente não encontrado</Text>
        <TouchableOpacity onPress={() => router.back()} style={[styles.submitButton, { marginTop: SPACING.md }]}>
          <Text style={styles.submitButtonText}>Voltar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const isValid = name.trim().length > 0 && !!selectedCity && categoryIds.length > 0;

  return (
    <View style={styles.container}>
      <SafeAreaView>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backBtnText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Editar Cliente</Text>
          <TouchableOpacity
            onPress={handleSubmit}
            style={[styles.saveBtn, !isValid && styles.saveBtnDisabled]}
            disabled={!isValid || submitting}
          >
            {submitting ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.saveBtnText}>Salvar</Text>
            )}
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {/* Nome */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Nome da loja *</Text>
            <TextInput
              style={styles.input}
              placeholder="Ex: Boutique Moda Piauí"
              placeholderTextColor={COLORS.textMuted}
              value={name}
              onChangeText={setName}
              returnKeyType="next"
            />
          </View>

          {/* Cidade */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Cidade no Piauí *</Text>
            <Text style={styles.fieldHint}>Necessário para exibir o cliente no mapa.</Text>
            <View>
              <TextInput
                style={[styles.input, selectedCity && styles.inputSelected]}
                placeholder={geoLoading ? 'Carregando cidades...' : 'Buscar cidade...'}
                placeholderTextColor={COLORS.textMuted}
                value={citySearch}
                onChangeText={(t) => {
                  setCitySearch(t);
                  if (t !== selectedCity?.name) setSelectedCity(null);
                  setShowCityDropdown(true);
                }}
                editable={!geoLoading}
                returnKeyType="search"
              />
              {selectedCity && (
                <View style={styles.selectedBadge}>
                  <Text style={styles.selectedBadgeText}>✓ {selectedCity.name}</Text>
                </View>
              )}

              {/* Dropdown */}
              {showCityDropdown && filteredCities.length > 0 && !selectedCity && (
                <View style={styles.dropdown}>
                  {filteredCities.map((city) => (
                    <TouchableOpacity
                      key={city.code}
                      style={styles.dropdownItem}
                      onPress={() => handleSelectCity(city)}
                    >
                      <Text style={styles.dropdownItemText}>📍 {city.name}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Categoria *</Text>
            <CategoryMultiSelect
              categories={categories}
              selectedIds={categoryIds}
              onChange={setCategoryIds}
            />
          </View>

          {/* Telefone */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Telefone/WhatsApp</Text>
            <TextInput
              style={styles.input}
              placeholder="(86) 99999-9999"
              placeholderTextColor={COLORS.textMuted}
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              returnKeyType="next"
            />
          </View>

          {/* Notas */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Observações</Text>
            <TextInput
              style={[styles.input, styles.inputMultiline]}
              placeholder="Notas sobre o cliente, horário de atendimento, etc."
              placeholderTextColor={COLORS.textMuted}
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>

          {/* Botão salvar */}
          <TouchableOpacity
            style={[styles.submitButton, !isValid && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={!isValid || submitting}
          >
            {submitting ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.submitButtonText}>✓ Salvar Alterações</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  center: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.surfaceBorder,
    gap: SPACING.md,
  },
  backBtn: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backBtnText: { color: COLORS.primary, fontSize: 24 },
  headerTitle: {
    flex: 1,
    color: COLORS.textPrimary,
    fontSize: FONTS.sizes.lg,
    fontWeight: '700',
  },
  saveBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.md,
    paddingVertical: 8,
    minWidth: 70,
    alignItems: 'center',
  },
  saveBtnDisabled: { opacity: 0.5 },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: FONTS.sizes.sm },
  content: {
    padding: SPACING.lg,
    gap: SPACING.xl,
    paddingBottom: 60,
  },
  fieldGroup: { gap: SPACING.sm },
  fieldHint: {
    color: COLORS.textPlaceholder,
    fontSize: FONTS.sizes.xs,
    marginBottom: 2,
  },
  label: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.sm,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    color: COLORS.textPrimary,
    fontSize: FONTS.sizes.md,
    borderWidth: 1.5,
    borderColor: COLORS.surfaceBorder,
  },
  inputSelected: {
    borderColor: COLORS.primary,
  },
  inputMultiline: {
    minHeight: 100,
    paddingTop: SPACING.md,
  },
  selectedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.xs,
    paddingHorizontal: SPACING.sm,
  },
  selectedBadgeText: {
    color: COLORS.success,
    fontSize: FONTS.sizes.sm,
    fontWeight: '600',
  },
  dropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    zIndex: 100,
    backgroundColor: COLORS.surfaceElevated,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    overflow: 'hidden',
    marginTop: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  dropdownItem: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.surfaceBorder,
  },
  dropdownItemText: {
    color: COLORS.textPrimary,
    fontSize: FONTS.sizes.md,
  },
  submitButton: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.lg,
    paddingVertical: SPACING.lg,
    alignItems: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 6,
    marginTop: SPACING.md,
  },
  submitButtonDisabled: { opacity: 0.5, shadowOpacity: 0 },
  submitButtonText: {
    color: '#fff',
    fontSize: FONTS.sizes.md,
    fontWeight: '700',
  },
  notFoundText: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.lg,
  },
});
