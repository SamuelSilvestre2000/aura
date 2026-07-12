import { getSupabase } from './client';

const AVATARS_BUCKET = 'avatars';

function isRemoteAvatarUrl(uri: string): boolean {
  return uri.includes(`/storage/v1/object/public/${AVATARS_BUCKET}/`);
}

/**
 * expo-image-picker devolve um URI local (file:// no nativo, blob:// na web)
 * que só existe naquele dispositivo/aba — precisa ser enviado para o Storage
 * do Supabase para virar uma URL permanente, acessível de qualquer sessão.
 */
export async function uploadUserAvatar(uri: string, userId: string): Promise<string> {
  if (isRemoteAvatarUrl(uri)) return uri;

  const response = await fetch(uri);
  const blob = await response.blob();
  const extension = blob.type.split('/').pop() || 'jpg';
  const path = `${userId}-${Date.now()}.${extension}`;

  const supabase = getSupabase();
  const { error } = await supabase.storage
    .from(AVATARS_BUCKET)
    .upload(path, blob, { contentType: blob.type || 'image/jpeg', upsert: true });
  if (error) throw new Error(error.message);

  const { data } = supabase.storage.from(AVATARS_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}
