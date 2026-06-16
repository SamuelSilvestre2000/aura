import React, { useEffect, useMemo, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useClients } from '../hooks/useClients';
import { useGeoJSON } from '../hooks/useGeoJSON';
import { COLORS, FONTS, RADIUS, SPACING } from '../constants/colors';

export type InitialCity = {
  code: string;
  name: string;
  lat: number;
  lng: number;
};

type Props = {
  visible: boolean;
  onClose: () => void;
  initialCity?: InitialCity | null;
  onCreated?: () => void;
};

export function NewClientSheet({ visible, onClose, initialCity = null, onCreated }: Props) {
  const { createClient } = useClients();
  const { cities, loading: geoLoading } = useGeoJSON();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [citySearch, setCitySearch] = useState('');
  const [selectedCity, setSelectedCity] = useState<InitialCity | null>(null);
  const [showCityList, setShowCityList] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setName('');
    setPhone('');
    setSelectedCity(initialCity);
    setCitySearch(initialCity?.name ?? '');
    setShowCityList(false);
    setSubmitting(false);
  }, [visible, initialCity]);

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

  const handleClose = () => {
    onClose();
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      Alert.alert('Atenção', 'Informe o nome da loja ou cliente.');
      return;
    }
    if (!selectedCity) {
      Alert.alert('Atenção', 'Selecione uma cidade da lista.');
      return;
    }

    setSubmitting(true);
    try {
      await createClient({
        name: name.trim(),
        city: selectedCity.name,
        cityCode: selectedCity.code,
        lat: selectedCity.lat,
        lng: selectedCity.lng,
        phone: phone.trim() || undefined,
      });
      onCreated?.();
      handleClose();
    } catch {
      Alert.alert('Erro', 'Não foi possível cadastrar o cliente.');
    } finally {
      setSubmitting(false);
    }
  };

  const isValid = name.trim().length > 0 && !!selectedCity;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <Pressable style={styles.overlay} onPress={handleClose}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.keyboard}
        >
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <View style={styles.handle} />
            <Text style={styles.title}>Novo cliente</Text>

            <ScrollView
              style={styles.scroll}
              contentContainerStyle={styles.scrollContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.field}>
                <Text style={styles.label}>Nome</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Ex: Boutique Moda Piauí"
                  placeholderTextColor={COLORS.textPlaceholder}
                  value={name}
                  onChangeText={setName}
                  returnKeyType="next"
                  autoFocus={!initialCity}
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>Cidade</Text>
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
                    <Text style={styles.cityBadgeText}>{selectedCity.name}</Text>
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
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>Telefone (opcional)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="(86) 99999-9999"
                  placeholderTextColor={COLORS.textPlaceholder}
                  value={phone}
                  onChangeText={setPhone}
                  keyboardType="phone-pad"
                  returnKeyType="done"
                />
              </View>
            </ScrollView>

            <View style={styles.actions}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={handleClose}
                activeOpacity={0.7}
              >
                <Text style={styles.cancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmBtn, !isValid && styles.confirmBtnDisabled]}
                onPress={handleSubmit}
                disabled={!isValid || submitting}
                activeOpacity={0.85}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.confirmText}>Criar</Text>
                )}
              </TouchableOpacity>
            </View>
          </Pressable>
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.25)',
    justifyContent: 'flex-end',
  },
  keyboard: {
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingHorizontal: SPACING.xl,
    paddingBottom: SPACING.xxl + 8,
    paddingTop: SPACING.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.surfaceBorder,
    maxHeight: '88%',
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.surfaceBorderStrong,
    alignSelf: 'center',
    marginBottom: SPACING.lg,
  },
  title: {
    color: COLORS.textPrimary,
    fontSize: FONTS.sizes.lg,
    fontWeight: '700',
    letterSpacing: -0.2,
    marginBottom: SPACING.lg,
  },
  scroll: {
    flexGrow: 0,
  },
  scrollContent: {
    gap: SPACING.lg,
    paddingBottom: SPACING.md,
  },
  field: {
    gap: SPACING.sm,
  },
  label: {
    color: COLORS.textMuted,
    fontSize: FONTS.sizes.xs,
    fontWeight: '600',
    letterSpacing: 0.4,
  },
  input: {
    backgroundColor: COLORS.backgroundSubtle,
    borderRadius: RADIUS.lg,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    color: COLORS.textPrimary,
    fontSize: FONTS.sizes.md,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
  },
  inputSelected: {
    borderColor: COLORS.primary,
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
  actions: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginTop: SPACING.lg,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  cancelText: {
    color: COLORS.textSecondary,
    fontWeight: '500',
    fontSize: FONTS.sizes.md,
  },
  confirmBtn: {
    flex: 1,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
  },
  confirmBtnDisabled: {
    opacity: 0.45,
  },
  confirmText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: FONTS.sizes.md,
  },
});
