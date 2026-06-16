import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '../../hooks/useAuth';
import { getUserById, updateUser } from '../../services/users';
import { listCategories } from '../../services/categories';
import { pickUserPhoto } from '../../services/userPhotos';
import { User, Category } from '../../types';
import { ROLE_LABELS } from '../../constants/permissions';
import { CategoryMultiSelect } from '../../components/CategoryMultiSelect';
import { REP_PIN_OPTIONS } from '../../constants/userCategories';
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
        router.back();
        return;
      }
      try {
        const data = await getUserById(params.id);
        if (!data) {
          Alert.alert('Erro', 'Usuário não encontrado.');
          router.back();
          return;
        }
        setTargetUser(data);
        setName(data.name);
        setEmail(data.email ?? '');
        setSelectedCategoryIds(data.categories.map((item) => item.id));
        setPin(data.pin);
        setPhotoUri(data.photoUri ?? null);
      } finally {
        setLoading(false);
      }
    }

    load();
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

  const handleSubmit = async () => {
    if (!targetUser) return;

    setSubmitting(true);
    try {
      const updated = await updateUser(targetUser.id, {
        name,
        email: email.trim() || undefined,
        categoryIds: isRepresentative ? selectedCategoryIds : undefined,
        pin,
        photoUri: resolvePhotoPayload(),
      });

      if (sessionUser?.id === updated.id) {
        await refreshSession();
      }

      Alert.alert('Sucesso', 'Dados atualizados.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
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

  const isValid =
    name.trim().length > 0 &&
    pin.trim().length > 0 &&
    (!isRepresentative || (email.trim().length > 0 && selectedCategoryIds.length > 0));

  return (
    <View style={styles.container}>
      <SafeAreaView>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backBtnText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>
            Editar {ROLE_LABELS[targetUser.role]}
          </Text>
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
          <View style={styles.roleBadge}>
            <Text style={styles.roleBadgeText}>Perfil: {ROLE_LABELS[targetUser.role]}</Text>
          </View>

          <TouchableOpacity
            style={styles.photoPicker}
            onPress={handlePickPhoto}
            activeOpacity={0.8}
            disabled={pickingPhoto}
          >
            {photoUri ? (
              <Image source={{ uri: photoUri }} style={styles.photoImage} />
            ) : (
              <View style={styles.photoPlaceholder}>
                {pickingPhoto ? (
                  <ActivityIndicator color={COLORS.primary} />
                ) : (
                  <>
                    <Text style={styles.photoIcon}>📷</Text>
                    <Text style={styles.photoHint}>Alterar foto</Text>
                  </>
                )}
              </View>
            )}
          </TouchableOpacity>

          {photoUri && (
            <TouchableOpacity style={styles.removePhotoBtn} onPress={handleRemovePhoto}>
              <Text style={styles.removePhotoText}>Remover foto</Text>
            </TouchableOpacity>
          )}

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Nome completo *</Text>
            <TextInput
              style={styles.input}
              placeholder="Nome completo"
              placeholderTextColor={COLORS.textMuted}
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>
              E-mail {isRepresentative ? '*' : '(opcional)'}
            </Text>
            <TextInput
              style={styles.input}
              placeholder="nome@empresa.com"
              placeholderTextColor={COLORS.textMuted}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          {isRepresentative && (
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Categorias *</Text>
              <Text style={styles.fieldHint}>Pode selecionar mais de uma</Text>
              <CategoryMultiSelect
                categories={categories}
                selectedIds={selectedCategoryIds}
                onChange={setSelectedCategoryIds}
              />
            </View>
          )}

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>
              {isRepresentative ? 'Redefinir PIN *' : 'Alterar PIN *'}
            </Text>
            {isRepresentative ? (
              <>
                <Text style={styles.pinHint}>Selecione um número de 1 a 6</Text>
                <View style={styles.pinRow}>
                  {REP_PIN_OPTIONS.map((option) => {
                    const active = pin === option;
                    return (
                      <TouchableOpacity
                        key={option}
                        style={[styles.pinChip, active && styles.pinChipActive]}
                        onPress={() => setPin(option)}
                        activeOpacity={0.8}
                      >
                        <Text style={[styles.pinChipText, active && styles.pinChipTextActive]}>
                          {option}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </>
            ) : (
              <TextInput
                style={styles.input}
                placeholder="Novo PIN"
                placeholderTextColor={COLORS.textMuted}
                value={pin}
                onChangeText={setPin}
                keyboardType="number-pad"
                secureTextEntry
                maxLength={8}
              />
            )}
          </View>

          <TouchableOpacity
            style={[styles.submitButton, !isValid && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={!isValid || submitting}
          >
            {submitting ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.submitButtonText}>✓ Salvar alterações</Text>
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
  roleBadge: {
    alignSelf: 'center',
    backgroundColor: `${COLORS.primary}22`,
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderWidth: 1,
    borderColor: `${COLORS.primary}55`,
  },
  roleBadgeText: {
    color: COLORS.primaryLight,
    fontSize: FONTS.sizes.sm,
    fontWeight: '700',
  },
  photoPicker: { alignSelf: 'center' },
  photoImage: {
    width: 112,
    height: 112,
    borderRadius: 56,
    borderWidth: 3,
    borderColor: COLORS.primary,
  },
  photoPlaceholder: {
    width: 112,
    height: 112,
    borderRadius: 56,
    backgroundColor: COLORS.surface,
    borderWidth: 2,
    borderColor: COLORS.surfaceBorder,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
  },
  photoIcon: { fontSize: 28 },
  photoHint: {
    color: COLORS.textMuted,
    fontSize: FONTS.sizes.xs,
    fontWeight: '600',
  },
  removePhotoBtn: { alignSelf: 'center', marginTop: -SPACING.md },
  removePhotoText: {
    color: COLORS.error,
    fontSize: FONTS.sizes.sm,
    fontWeight: '600',
  },
  fieldGroup: { gap: SPACING.sm },
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
  fieldHint: {
    color: COLORS.textMuted,
    fontSize: FONTS.sizes.xs,
  },
  pinHint: {
    color: COLORS.textMuted,
    fontSize: FONTS.sizes.xs,
  },
  pinRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  pinChip: {
    flex: 1,
    aspectRatio: 1,
    maxWidth: 52,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.surface,
    borderWidth: 1.5,
    borderColor: COLORS.surfaceBorder,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pinChipActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary,
  },
  pinChipText: {
    color: COLORS.textPrimary,
    fontSize: FONTS.sizes.xl,
    fontWeight: '700',
  },
  pinChipTextActive: { color: '#fff' },
  submitButton: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.lg,
    paddingVertical: SPACING.lg,
    alignItems: 'center',
    marginTop: SPACING.md,
  },
  submitButtonDisabled: { opacity: 0.5 },
  submitButtonText: {
    color: '#fff',
    fontSize: FONTS.sizes.md,
    fontWeight: '700',
  },
});
