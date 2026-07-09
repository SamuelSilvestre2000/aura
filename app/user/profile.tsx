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
import { updateOwnProfile } from '../../services/users';
import { pickUserPhoto } from '../../services/userPhotos';
import { formatCategoryNames, isValidAccessPin, MAX_ACCESS_PIN_LENGTH } from '../../constants/userCategories';
import { isValidAuthPassword } from '../../services/users';
import { ROLE_LABELS } from '../../constants/permissions';
import { FormScreen } from '../../components/FormScreen';
import { HeaderLinkButton } from '../../components/HeaderLinkButton';
import { COLORS, FONTS, RADIUS, SPACING } from '../../constants/colors';

export default function ProfileScreen() {
  const router = useRouter();
  const { user, isAdmin, refresh: refreshSession, usesSupabase } = useAuth();

  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [changePin, setChangePin] = useState(false);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [photoRemoved, setPhotoRemoved] = useState(false);
  const [photoChanged, setPhotoChanged] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [pickingPhoto, setPickingPhoto] = useState(false);

  useEffect(() => {
    if (!user) {
      router.replace('/login');
      return;
    }
    if (isAdmin) {
      router.replace(`/user/edit?id=${user.id}`);
      return;
    }
    setPhotoUri(user.photoUri ?? null);
  }, [user, isAdmin, router]);

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

  const pinTouched = changePin && (newPin.length > 0 || confirmPin.length > 0);
  const pinValid =
    !pinTouched ||
    ((usesSupabase ? isValidAuthPassword(newPin) : isValidAccessPin(newPin)) &&
      newPin === confirmPin);
  const photoTouched = photoRemoved || photoChanged;
  const canSave = (pinTouched || photoTouched) && pinValid;

  const handleSubmit = async () => {
    if (!user || !canSave || submitting) return;

    if (pinTouched) {
      const validSecret = usesSupabase ? isValidAuthPassword(newPin) : isValidAccessPin(newPin);
      if (!validSecret) {
        Alert.alert(
          usesSupabase ? 'Senha inválida' : 'PIN inválido',
          usesSupabase
            ? 'Use uma senha com ao menos 6 caracteres.'
            : 'Use um PIN numérico de 4 a 8 dígitos.'
        );
        return;
      }
      if (newPin !== confirmPin) {
        Alert.alert(
          usesSupabase ? 'Senhas diferentes' : 'PINs diferentes',
          usesSupabase
            ? 'A senha e a confirmação precisam ser iguais.'
            : 'O PIN e a confirmação precisam ser iguais.'
        );
        return;
      }
    }

    setSubmitting(true);
    try {
      await updateOwnProfile(user.id, {
        pin: pinTouched ? newPin : undefined,
        photoUri: resolvePhotoPayload(),
      });
      await refreshSession();
      router.back();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Não foi possível salvar.';
      Alert.alert('Erro', msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (!user || isAdmin) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <FormScreen
      title="Minha conta"
      onBack={() => router.back()}
      headerRight={
        <HeaderLinkButton
          label="Salvar"
          onPress={handleSubmit}
          disabled={!canSave}
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

      <View style={styles.readOnlyCard}>
        <Text style={styles.readOnlyName}>{user.name}</Text>
        <Text style={styles.readOnlyMeta}>{ROLE_LABELS[user.role]}</Text>
        {user.email ? <Text style={styles.readOnlyMeta}>{user.email}</Text> : null}
        {user.categories.length > 0 ? (
          <Text style={styles.readOnlyCategory}>{formatCategoryNames(user.categories)}</Text>
        ) : null}
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>{usesSupabase ? 'SENHA' : 'PIN DE ACESSO'}</Text>
        {!changePin ? (
          <View style={styles.pinCard}>
            <Text style={styles.pinHint}>
              {usesSupabase
                ? 'Sua senha é pessoal e usada para entrar no app.'
                : 'Seu PIN é pessoal e usado para entrar no app.'}
            </Text>
            <TouchableOpacity
              style={styles.pinAction}
              onPress={() => setChangePin(true)}
              activeOpacity={0.75}
            >
              <Text style={styles.pinActionText}>
                {usesSupabase ? 'Alterar senha' : 'Alterar PIN'}
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.pinCard}>
            <Text style={styles.pinHint}>
              {usesSupabase
                ? 'Informe uma senha com ao menos 6 caracteres'
                : 'Informe um PIN numérico de 4 a 8 dígitos'}
            </Text>
            <TextInput
              style={styles.input}
              placeholder={usesSupabase ? 'Nova senha' : 'Novo PIN'}
              placeholderTextColor={COLORS.textPlaceholder}
              value={newPin}
              onChangeText={setNewPin}
              keyboardType={usesSupabase ? 'default' : 'number-pad'}
              secureTextEntry
              maxLength={usesSupabase ? 64 : MAX_ACCESS_PIN_LENGTH}
              autoFocus
            />
            <TextInput
              style={[
                styles.input,
                confirmPin.length > 0 && newPin !== confirmPin && styles.inputInvalid,
              ]}
              placeholder={usesSupabase ? 'Confirmar senha' : 'Confirmar PIN'}
              placeholderTextColor={COLORS.textPlaceholder}
              value={confirmPin}
              onChangeText={setConfirmPin}
              keyboardType={usesSupabase ? 'default' : 'number-pad'}
              secureTextEntry
              maxLength={usesSupabase ? 64 : MAX_ACCESS_PIN_LENGTH}
            />
            {confirmPin.length > 0 && newPin !== confirmPin ? (
              <Text style={styles.errorText}>
                {usesSupabase ? 'As senhas não coincidem.' : 'Os PINs não coincidem.'}
              </Text>
            ) : null}
            <TouchableOpacity
              style={styles.pinCancel}
              onPress={() => {
                setChangePin(false);
                setNewPin('');
                setConfirmPin('');
              }}
              activeOpacity={0.75}
            >
              <Text style={styles.pinCancelText}>Cancelar alteração</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
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
  readOnlyCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.surfaceBorder,
    gap: 4,
  },
  readOnlyName: {
    color: COLORS.textPrimary,
    fontSize: FONTS.sizes.md,
    fontWeight: '600',
  },
  readOnlyMeta: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.sm,
  },
  readOnlyCategory: {
    color: COLORS.primary,
    fontSize: FONTS.sizes.sm,
    fontWeight: '500',
    marginTop: 2,
  },
  field: { gap: SPACING.sm },
  label: {
    color: COLORS.textMuted,
    fontSize: FONTS.sizes.xs,
    fontWeight: '600',
    letterSpacing: 0.6,
  },
  pinCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.surfaceBorder,
    gap: SPACING.md,
  },
  pinHint: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.sm,
    lineHeight: 20,
  },
  pinAction: {
    alignSelf: 'flex-start',
    paddingVertical: 4,
  },
  pinActionText: {
    color: COLORS.primary,
    fontSize: FONTS.sizes.sm,
    fontWeight: '600',
  },
  pinCancel: {
    alignSelf: 'flex-start',
    paddingVertical: 4,
  },
  pinCancelText: {
    color: COLORS.textMuted,
    fontSize: FONTS.sizes.sm,
    fontWeight: '500',
  },
  input: {
    backgroundColor: COLORS.backgroundSubtle,
    borderRadius: RADIUS.lg,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    color: COLORS.textPrimary,
    fontSize: FONTS.sizes.md,
    letterSpacing: 4,
    textAlign: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.surfaceBorder,
  },
  inputInvalid: {
    borderColor: COLORS.error,
  },
  errorText: {
    color: COLORS.error,
    fontSize: FONTS.sizes.xs,
  },
});
