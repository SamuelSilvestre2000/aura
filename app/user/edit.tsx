import React, { useCallback, useEffect, useState } from 'react';
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
import { useAuth } from '../../hooks/useAuth';
import { usePanelNav } from '../../hooks/usePanelNav';
import { getUserById, updateUser } from '../../services/users';
import { listCategories } from '../../services/categories';
import { pickUserPhoto } from '../../services/userPhotos';
import { User, Category } from '../../types';
import { ROLE_LABELS } from '../../constants/permissions';
import { CategoryMultiSelect } from '../../components/CategoryMultiSelect';
import { FormScreen } from '../../components/FormScreen';
import { FormSection } from '../../components/FormSection';
import { FormRow } from '../../components/FormRow';
import { HeaderLinkButton } from '../../components/HeaderLinkButton';
import { RepresentativePinField } from '../../components/RepresentativePinField';
import { COLORS, FONTS, HIT_TARGET, RADIUS, SPACING } from '../../constants/colors';

type Props = { id?: string };

export default function EditUserScreen({ id: propId }: Props = {}) {
  const router = useRouter();
  const nav = usePanelNav();
  const params = useLocalSearchParams<{ id: string }>();
  const id = propId ?? params.id;
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
  const [refreshing, setRefreshing] = useState(false);

  const isRepresentative = targetUser?.role === 'representative';

  /** Só recarrega a lista de categorias — recarregar o usuário sobrescreveria edições em andamento. */
  const loadCategories = useCallback(async () => {
    setCategories(await listCategories());
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await loadCategories();
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (!isAdmin) {
      if (nav.isDesktop) {
        nav.back();
        return;
      }
      router.replace('/(tabs)/settings');
      return;
    }

    async function load() {
      if (!id) {
        nav.back();
        return;
      }
      try {
        const data = await getUserById(id);
        if (!data) {
          Alert.alert('Erro', 'Usuário não encontrado.');
          nav.back();
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
    void loadCategories();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin, id, router, loadCategories]);

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

      nav.back();
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
            <Image
              source={{ uri: photoUri }}
              style={styles.photoImage}
              onError={() => setPhotoUri(null)}
            />
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

      <FormSection title="Identificação">
        <FormRow label="Nome" required first>
          <TextInput
            style={styles.rowInput}
            placeholder="Nome completo"
            placeholderTextColor={COLORS.textPlaceholder}
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
          />
        </FormRow>

        <FormRow label="E-mail" required={isRepresentative}>
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

      {isRepresentative ? (
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
      ) : null}

      {isRepresentative ? (
        <RepresentativePinField
          mode="admin-edit"
          resetPending={resetPinPending}
          onReset={() => setResetPinPending(true)}
          onCancelReset={() => setResetPinPending(false)}
        />
      ) : (
        <FormSection title="Acesso">
          <FormRow label="Alterar PIN" first>
            <TextInput
              style={[styles.rowInput, styles.rowInputNumeric]}
              placeholder="Novo PIN"
              placeholderTextColor={COLORS.textPlaceholder}
              value={pin}
              onChangeText={setPin}
              keyboardType="number-pad"
              secureTextEntry
              maxLength={8}
            />
          </FormRow>
        </FormSection>
      )}
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
  rowInputNumeric: {
    ...FONTS.tabular,
  },
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
});
