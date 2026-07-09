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
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Alert } from '../../utils/alert';
import { goBack } from '../../utils/navigation';
import { useAuth } from '../../hooks/useAuth';
import { getUserById, updateUser } from '../../services/users';
import { listCategories } from '../../services/categories';
import { pickUserPhoto } from '../../services/userPhotos';
import { User, Category } from '../../types';
import { ROLE_LABELS } from '../../constants/permissions';
import { CategoryMultiSelect } from '../../components/CategoryMultiSelect';
import { FormScreen } from '../../components/FormScreen';
import { HeaderLinkButton } from '../../components/HeaderLinkButton';
import { RepresentativePinField } from '../../components/RepresentativePinField';
import { COLORS, FONTS, RADIUS, SPACING } from '../../constants/colors';

export default function EditUserScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string }>();
  const { user: sessionUser, isAdmin, refresh: refreshSession } = useAuth();

  const [targetUser, setTargetUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  const [pin, setPin] = useState('');
  const [resetPinPending, setResetPinPending] = useState(false);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [photoRemoved, setPhotoRemoved] = useState(false);
  const [photoChanged, setPhotoChanged] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [pickingPhoto, setPickingPhoto] = useState(false);

  const isRepresentative = targetUser?.role === 'representative';

  useEffect(() => {
    if (!isAdmin) {
      router.replace('/(tabs)/settings');
      return;
    }

    async function load() {
      if (!params.id) {
        goBack(router);
        return;
      }
      try {
        const data = await getUserById(params.id);
        if (!data) {
          Alert.alert('Erro', 'Usuário não encontrado.');
          goBack(router);
          return;
        }
        setTargetUser(data);
        setName(data.name);
        setEmail(data.email ?? '');
        setSelectedCategoryIds(data.categories.map((item) => item.id));
        if (data.role !== 'representative') setPin(data.pin);
        setPhotoUri(data.photoUri ?? null);
      } finally {
        setLoading(false);
      }
    }

    void load();
    listCategories().then(setCategories);
  }, [isAdmin, params.id, router]);

  const handlePickPhoto = async () => {
    setPickingPhoto(true);
    try {
      const uri = await pickUserPhoto();
      if (uri) {
        setPhotoUri(uri);
        setPhotoChanged(true);
        setPhotoRemoved(false);
      }
    } finally {
      setPickingPhoto(false);
    }
  };

  const handleRemovePhoto = () => {
    setPhotoUri(null);
    setPhotoRemoved(true);
    setPhotoChanged(false);
  };

  const resolvePhotoPayload = (): string | null | undefined => {
    if (photoRemoved) return null;
    if (photoChanged && photoUri) return photoUri;
    return undefined;
  };

  const isValid =
    name.trim().length > 0 &&
    (!isRepresentative ? pin.trim().length > 0 : true) &&
    (!isRepresentative || (email.trim().length > 0 && selectedCategoryIds.length > 0));

  const handleSubmit = async () => {
    if (!targetUser || !isValid || submitting) return;

    setSubmitting(true);
    try {
      const updated = await updateUser(targetUser.id, {
        name: name.trim(),
        email: email.trim() || undefined,
        categoryIds: isRepresentative ? selectedCategoryIds : undefined,
        pin: isRepresentative ? undefined : pin,
        resetPinToDefault: isRepresentative ? resetPinPending : undefined,
        photoUri: resolvePhotoPayload(),
      });

      if (sessionUser?.id === updated.id) {
        await refreshSession();
      }

      goBack(router);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Não foi possível salvar.';
      Alert.alert('Erro', msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || !targetUser) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  const screenTitle = `Editar ${ROLE_LABELS[targetUser.role].toLowerCase()}`;

  return (
    <FormScreen
      title={screenTitle}
      onBack={() => goBack(router)}
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
        <View style={styles.photoActions}>
          <TouchableOpacity onPress={handlePickPhoto} activeOpacity={0.7} disabled={pickingPhoto}>
            <Text style={styles.photoAction}>
              {photoUri ? 'Alterar foto' : 'Adicionar foto'}
            </Text>
          </TouchableOpacity>
          {photoUri ? (
            <TouchableOpacity onPress={handleRemovePhoto} activeOpacity={0.7}>
              <Text style={styles.photoRemove}>Remover foto</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>NOME COMPLETO</Text>
        <TextInput
          style={styles.input}
          placeholder="Nome completo"
          placeholderTextColor={COLORS.textPlaceholder}
          value={name}
          onChangeText={setName}
          autoCapitalize="words"
        />
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>
          E-MAIL{isRepresentative ? '' : ' (OPCIONAL)'}
        </Text>
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

      {isRepresentative && (
        <View style={styles.field}>
          <Text style={styles.label}>CATEGORIAS</Text>
          <Text style={styles.hint}>Linhas que este representante atende</Text>
          <CategoryMultiSelect
            categories={categories}
            selectedIds={selectedCategoryIds}
            onChange={setSelectedCategoryIds}
          />
        </View>
      )}

      {isRepresentative ? (
        <RepresentativePinField
          mode="admin-edit"
          resetPending={resetPinPending}
          onReset={() => setResetPinPending(true)}
          onCancelReset={() => setResetPinPending(false)}
        />
      ) : (
        <View style={styles.field}>
          <Text style={styles.label}>ALTERAR PIN</Text>
          <TextInput
            style={styles.input}
            placeholder="Novo PIN"
            placeholderTextColor={COLORS.textPlaceholder}
            value={pin}
            onChangeText={setPin}
            keyboardType="number-pad"
            secureTextEntry
            maxLength={8}
          />
        </View>
      )}
    </FormScreen>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    backgroundColor: COLORS.backgroundSubtle,
    justifyContent: 'center',
    alignItems: 'center',
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
  photoActions: {
    alignItems: 'center',
    gap: 4,
  },
  photoAction: {
    color: COLORS.primary,
    fontSize: FONTS.sizes.sm,
    fontWeight: '600',
  },
  photoRemove: {
    color: COLORS.textMuted,
    fontSize: FONTS.sizes.sm,
    fontWeight: '500',
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
