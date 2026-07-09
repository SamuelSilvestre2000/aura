import React, { useEffect, useState } from 'react';
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
import { createRepresentative } from '../../services/users';
import { listCategories } from '../../services/categories';
import { pickUserPhoto } from '../../services/userPhotos';
import { Category } from '../../types';
import { CategoryMultiSelect } from '../../components/CategoryMultiSelect';
import { FormScreen } from '../../components/FormScreen';
import { HeaderLinkButton } from '../../components/HeaderLinkButton';
import { RepresentativePinField } from '../../components/RepresentativePinField';
import { DEFAULT_REP_PIN, isValidAccessPin } from '../../constants/userCategories';
import { COLORS, FONTS, RADIUS, SPACING } from '../../constants/colors';

export default function NewRepresentativeScreen() {
  const router = useRouter();
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

  useEffect(() => {
    if (!canDo('manage_users')) router.replace('/(tabs)/settings');
  }, [canDo, router]);

  useEffect(() => {
    listCategories().then((items) => {
      setCategories(items);
      setSelectedCategoryIds(items.map((item) => item.id));
    });
  }, []);

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
      router.back();
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

      <View style={styles.field}>
        <Text style={styles.label}>NOME COMPLETO</Text>
        <TextInput
          style={styles.input}
          placeholder="Ex: Maria Silva Santos"
          placeholderTextColor={COLORS.textPlaceholder}
          value={name}
          onChangeText={setName}
          autoCapitalize="words"
          autoFocus
        />
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>E-MAIL</Text>
        <TextInput
          style={styles.input}
          placeholder="nome@empresa.com"
          placeholderTextColor={COLORS.textPlaceholder}
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>CATEGORIAS</Text>
        <Text style={styles.hint}>Linhas que este representante atende</Text>
        <CategoryMultiSelect
          categories={categories}
          selectedIds={selectedCategoryIds}
          onChange={setSelectedCategoryIds}
        />
      </View>

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
});
