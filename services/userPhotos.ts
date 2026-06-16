import * as FileSystem from 'expo-file-system/legacy';
import * as ImagePicker from 'expo-image-picker';

const USERS_PHOTO_DIR = `${FileSystem.documentDirectory ?? ''}users/`;

export async function pickUserPhoto(): Promise<string | null> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) return null;

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.85,
  });

  if (result.canceled || !result.assets[0]?.uri) return null;
  return result.assets[0].uri;
}

export async function persistUserPhoto(tempUri: string, userId: string): Promise<string> {
  await FileSystem.makeDirectoryAsync(USERS_PHOTO_DIR, { intermediates: true });

  const extension = tempUri.split('.').pop()?.split('?')[0] || 'jpg';
  const destUri = `${USERS_PHOTO_DIR}${userId}.${extension}`;

  await FileSystem.copyAsync({ from: tempUri, to: destUri });
  return destUri;
}

export async function deleteUserPhoto(photoUri?: string | null): Promise<void> {
  if (!photoUri?.startsWith(USERS_PHOTO_DIR)) return;
  try {
    const info = await FileSystem.getInfoAsync(photoUri);
    if (info.exists) {
      await FileSystem.deleteAsync(photoUri, { idempotent: true });
    }
  } catch {
    // Ignorar falha ao remover arquivo local
  }
}
