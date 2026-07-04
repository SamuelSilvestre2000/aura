import { User } from '../types';
import { isSupabaseConfigured, getSupabase } from './supabase/client';
import {
  fetchAppUserByAuthId,
  linkCurrentAuthUser,
} from './supabase/users';

const SESSION_KEY = '@aura/session_user_id';

/** @deprecated Mantido só para fallback offline (SQLite). */
export async function getSessionUserIdLocal(): Promise<string | null> {
  const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
  return AsyncStorage.getItem(SESSION_KEY);
}

async function resolveAppUserFromSession(): Promise<User | null> {
  const supabase = getSupabase();
  const { data, error } = await supabase.auth.getSession();
  if (error) throw new Error(error.message);

  const authUser = data.session?.user;
  if (!authUser) return null;

  let appUser = await fetchAppUserByAuthId(authUser.id);
  if (!appUser) {
    appUser = await linkCurrentAuthUser();
  }
  return appUser;
}

export async function getSessionUser(): Promise<User | null> {
  if (isSupabaseConfigured()) {
    try {
      return await resolveAppUserFromSession();
    } catch {
      return null;
    }
  }

  const userId = await getSessionUserIdLocal();
  if (!userId) return null;
  const { getUserById } = await import('./users');
  return getUserById(userId);
}

export async function login(email: string, password: string): Promise<User | null> {
  if (isSupabaseConfigured()) {
    const supabase = getSupabase();
    const normalizedEmail = email.trim().toLowerCase();
    const { error } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password: password.trim(),
    });
    if (error) return null;

    try {
      return await linkCurrentAuthUser();
    } catch {
      await supabase.auth.signOut();
      return null;
    }
  }

  const { findUserByNameAndPin } = await import('./users');
  const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
  const user = await findUserByNameAndPin(email, password);
  if (!user) return null;
  await AsyncStorage.setItem(SESSION_KEY, user.id);
  return user;
}

export async function logout(): Promise<void> {
  if (isSupabaseConfigured()) {
    const supabase = getSupabase();
    await supabase.auth.signOut();
    return;
  }

  const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
  await AsyncStorage.removeItem(SESSION_KEY);
}

export async function requestPasswordReset(email: string): Promise<void> {
  if (!isSupabaseConfigured()) {
    throw new Error('Recuperação de senha disponível apenas com Supabase.');
  }
  const supabase = getSupabase();
  const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase());
  if (error) throw new Error(error.message);
}

export async function onAuthSessionChange(callback: (user: User | null) => void): Promise<() => void> {
  if (!isSupabaseConfigured()) return () => {};

  const supabase = getSupabase();
  const { data } = supabase.auth.onAuthStateChange(async (_event, session) => {
    if (!session?.user) {
      callback(null);
      return;
    }
    try {
      const appUser = await fetchAppUserByAuthId(session.user.id);
      callback(appUser ?? (await linkCurrentAuthUser()));
    } catch {
      callback(null);
    }
  });

  return () => data.subscription.unsubscribe();
}
