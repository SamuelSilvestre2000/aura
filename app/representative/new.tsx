import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Alert } from '../../utils/alert';
import { useAuth } from '../../hooks/useAuth';
import { usePanelNav } from '../../hooks/usePanelNav';
import { createRepresentative } from '../../services/users';
import { listCategories } from '../../services/categories';
import { pickUserPhoto } from '../../services/userPhotos';
import { Category } from '../../types';
import { CategoryMultiSelect } from '../../components/CategoryMultiSelect';
import { FormScreen } from '../../components/FormScreen';
import { FormSection } from '../../components/FormSection';
import { FormRow } from '../../components/FormRow';
import { HeaderLinkButton } from '../../components/HeaderLinkButton';
import { RepresentativePinField } from '../../components/RepresentativePinField';
import { DEFAULT_REP_PIN, isValidAccessPin } from '../../constants/userCategories';
import { COLORS, FONTS, HIT_TARGET, RADIUS, SPACING } from '../../constants/colors';

export default function NewRepresentativeScreen() {
  const router = useRouter();
  const nav = usePanelNav();
  const { can: canDo } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  const [pin, setPin] = useState(DEFAULT_REP_PIN);
  const [useCustomPin, setUseCustomPin] = useState(false);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [pickingPhoto, setPickingPhoto] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const didInitCategoriesRef = useRef(false);

  useEffect(() => {
    if (canDo('manage_users')) return;
    if (nav.isDesktop) {
      nav.back();
      return;
    }
    router.replace('/(tabs)/settings');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canDo, router]);

  const loadCategories = useCallback(async () => {
    const items = await listCategories();
    setCategories(items);
    if (!didInitCategoriesRef.current) {
      setSelectedCategoryIds(items.map((item) => item.id));
      didInitCategoriesRef.current = true;
    }
  }, []);

  useEffect(() => {
    void loadCategories();
  }, [loadCategories]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await loadCategories();
    } finally {
      setRefreshing(false);
    }
  };

  const handlePickPhoto = async () => {
    setPickingPhoto(true);
    try {
      const uri = await pickUserPhoto();
      if (uri) setPhotoUri(uri);
    } finally {
      setPickingPhoto(false);
    }
  };

  const isValid =
    name.trim().length > 0 &&
    email.trim().length > 0 &&
    selectedCategoryIds.length > 0 &&
    (!useCustomPin || isValidAccessPin(pin));

  const handleSubmit = async () => {
    if (!isValid || submitting) return;

    setSubmitting(true);
    try {
      await createRepresentative({
        name: name.trim(),
        email: email.trim(),
        categoryIds: selectedCategoryIds,
        pin,
        photoUri,
      });
      nav.back();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Não foi possível cadastrar.';
      Alert.alert('Erro', msg.includes('UNIQUE') ? 'Já existe um usuário com este nome.' : msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <FormScreen
      title="Novo representante"
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
      <View style={styles.photoSection}>
        <TouchableOpacity
          style={styles.photoPicker}
          onPress={handlePickPhoto}
          activeOpacity={0.75}
          disabled={pickingPhoto}
        >
          {photoUri ? (
            <Image source={{ uri: photoUri }} style={styles.photoImage} />
          ) : (
            <View style={styles.photoPlaceholder}>
              {pickingPhoto ? (
                <ActivityIndicator color={COLORS.textMuted} />
              ) : (
                <Ionicons name="camera-outline" size={28} color={COLORS.textMuted} />
              )}
            </View>
          )}
        </TouchableOpacity>
        <TouchableOpacity onPress={handlePickPhoto} activeOpacity={0.7} disabled={pickingPhoto}>
          <Text style={styles.photoAction}>
            {photoUri ? 'Alterar foto' : 'Adicionar foto'}
          </Text>
        </TouchableOpacity>
      </View>

      <FormSection title="Identificação">
        <FormRow label="Nome" required first>
          <TextInput
            style={styles.rowInput}
            placeholder="Ex: Maria Silva Santos"
            placeholderTextColor={COLORS.textPlaceholder}
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
            autoFocus
          />
        </FormRow>

        <FormRow label="E-mail" required>
          <TextInput
            style={styles.rowInput}
            placeholder="nome@empresa.com"
            placeholderTextColor={COLORS.textPlaceholder}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />
        </FormRow>
      </FormSection>

      <FormSection
        title="Categorias"
        footer="Linhas que este representante atende."
        variant="plain"
      >
        <CategoryMultiSelect
          categories={categories}
          selectedIds={selectedCategoryIds}
          onChange={setSelectedCategoryIds}
        />
      </FormSection>

      <RepresentativePinField
        mode="create"
        value={pin}
        onChange={setPin}
        useCustomPin={useCustomPin}
        onUseCustomPinChange={setUseCustomPin}
      />
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
  photoSection: {
    alignItems: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.xs,
  },
  photoPicker: {
    borderRadius: RADIUS.full,
  },
  photoImage: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.surfaceBorder,
  },
  photoPlaceholder: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: COLORS.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.surfaceBorder,
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoAction: {
    color: COLORS.primary,
    fontSize: FONTS.sizes.sm,
    fontWeight: '600',
  },
});
