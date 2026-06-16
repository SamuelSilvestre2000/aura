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
import { useRouter } from 'expo-router';
import { useAuth } from '../../hooks/useAuth';
import { createRepresentative } from '../../services/users';
import { listCategories } from '../../services/categories';
import { pickUserPhoto } from '../../services/userPhotos';
import { Category } from '../../types';
import { CategoryMultiSelect } from '../../components/CategoryMultiSelect';
import { REP_PIN_OPTIONS, DEFAULT_REP_PIN } from '../../constants/userCategories';
import { COLORS, FONTS, RADIUS, SPACING } from '../../constants/colors';

export default function NewRepresentativeScreen() {
  const router = useRouter();
  const { can: canDo } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  const [pin, setPin] = useState(DEFAULT_REP_PIN);
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

  const handleSubmit = async () => {
    if (!name.trim()) {
      Alert.alert('Atenção', 'Informe o nome completo.');
      return;
    }
    if (!email.trim()) {
      Alert.alert('Atenção', 'Informe o e-mail.');
      return;
    }

    setSubmitting(true);
    try {
      await createRepresentative({
        name: name.trim(),
        email: email.trim(),
        categoryIds: selectedCategoryIds,
        pin,
        photoUri,
      });
      Alert.alert('Sucesso', 'Representante cadastrado.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Não foi possível cadastrar.';
      Alert.alert('Erro', msg.includes('UNIQUE') ? 'Já existe um usuário com este nome.' : msg);
    } finally {
      setSubmitting(false);
    }
  };

  const isValid =
    name.trim().length > 0 &&
    email.trim().length > 0 &&
    selectedCategoryIds.length > 0;

  return (
    <View style={styles.container}>
      <SafeAreaView>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backBtnText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Novo Representante</Text>
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
            <Text style={styles.roleBadgeText}>Perfil: Representante</Text>
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
                    <Text style={styles.photoHint}>Adicionar foto</Text>
                  </>
                )}
              </View>
            )}
          </TouchableOpacity>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Nome completo *</Text>
            <TextInput
              style={styles.input}
              placeholder="Ex: Maria Silva Santos"
              placeholderTextColor={COLORS.textMuted}
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>E-mail *</Text>
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

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Categorias *</Text>
            <Text style={styles.fieldHint}>Pode selecionar mais de uma</Text>
            <CategoryMultiSelect
              categories={categories}
              selectedIds={selectedCategoryIds}
              onChange={setSelectedCategoryIds}
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>PIN de acesso *</Text>
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
          </View>

          <TouchableOpacity
            style={[styles.submitButton, !isValid && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={!isValid || submitting}
          >
            {submitting ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.submitButtonText}>✓ Cadastrar Representante</Text>
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
  photoPicker: {
    alignSelf: 'center',
  },
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
  pinChipTextActive: {
    color: '#fff',
  },
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
