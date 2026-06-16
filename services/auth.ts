import AsyncStorage from '@react-native-async-storage/async-storage';
import { User } from '../types';
import { findUserByNameAndPin, getUserById } from './users';

const SESSION_KEY = '@aura/session_user_id';

export async function getSessionUserId(): Promise<string | null> {
  return AsyncStorage.getItem(SESSION_KEY);
}

export async function getSessionUser(): Promise<User | null> {
  const userId = await getSessionUserId();
  if (!userId) return null;
  return getUserById(userId);
}

export async function login(name: string, pin: string): Promise<User | null> {
  const user = await findUserByNameAndPin(name, pin);
  if (!user) return null;
  await AsyncStorage.setItem(SESSION_KEY, user.id);
  return user;
}

export async function logout(): Promise<void> {
  await AsyncStorage.removeItem(SESSION_KEY);
}
