import { User, UserRole } from '../types';
import { REP_PIN_OPTIONS } from '../constants/userCategories';
import {
  attachCategoriesToUsers,
  getCategoriesByUserId,
  setUserCategories,
} from './categories';
import { deleteUserPhoto, persistUserPhoto } from './userPhotos';
import { getDatabase, generateId } from './database';
import { ensureUserOrganization } from './organizations';
import { createRepresentativeScope } from './scopes';

const ROW_TO_USER = (row: any): Omit<User, 'categories'> => ({
  id: row.id,
  name: row.name,
  role: row.role as UserRole,
  pin: row.pin,
  email: row.email || undefined,
  photoUri: row.photo_uri || undefined,
  createdAt: row.created_at,
});

async function hydrateUser(row: any): Promise<User> {
  const base = ROW_TO_USER(row);
  const categories = await getCategoriesByUserId(base.id);
  return { ...base, categories };
}

export async function listUsers(): Promise<User[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<any>(
    'SELECT * FROM users ORDER BY role ASC, name ASC'
  );
  return attachCategoriesToUsers(rows.map(ROW_TO_USER));
}

export async function getUserById(id: string): Promise<User | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<any>('SELECT * FROM users WHERE id = ?', [id]);
  return row ? hydrateUser(row) : null;
}

export async function findUserByNameAndPin(name: string, pin: string): Promise<User | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<any>(
    'SELECT * FROM users WHERE LOWER(name) = LOWER(?) AND pin = ?',
    [name.trim(), pin.trim()]
  );
  return row ? hydrateUser(row) : null;
}

export type CreateRepresentativeData = {
  name: string;
  email: string;
  categoryIds: string[];
  pin: string;
  photoUri?: string | null;
};

function isValidRepPin(pin: string): boolean {
  return (REP_PIN_OPTIONS as readonly string[]).includes(pin);
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export async function createRepresentative(data: CreateRepresentativeData): Promise<User> {
  const name = data.name.trim();
  const email = data.email.trim().toLowerCase();
  const pin = data.pin.trim();

  if (!name) throw new Error('Nome obrigatório');
  if (!isValidEmail(email)) throw new Error('E-mail inválido');
  if (!isValidRepPin(pin)) throw new Error('PIN inválido');
  if (data.categoryIds.length === 0) throw new Error('Selecione ao menos uma categoria');

  const db = await getDatabase();
  const now = new Date().toISOString();
  const id = generateId('usr');

  let photoUri: string | null = null;
  if (data.photoUri) {
    photoUri = await persistUserPhoto(data.photoUri, id);
  }

  try {
    await db.runAsync(
      `INSERT INTO users (id, name, role, pin, email, photo_uri, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, name, 'representative', pin, email, photoUri, now]
    );
    await setUserCategories(id, data.categoryIds);
    await ensureUserOrganization(id, 'representative');
    await createRepresentativeScope({
      userId: id,
      accessMode: 'all_in_org',
    });
  } catch (error) {
    if (photoUri) await deleteUserPhoto(photoUri);
    throw error;
  }

  const user = await getUserById(id);
  if (!user) throw new Error('Falha ao criar representante');
  return user;
}

export type UpdateUserData = {
  name: string;
  pin: string;
  email?: string;
  categoryIds?: string[];
  photoUri?: string | null;
};

function isTempPhotoUri(uri: string): boolean {
  return !uri.includes('/users/');
}

export async function updateUser(id: string, data: UpdateUserData): Promise<User> {
  const existing = await getUserById(id);
  if (!existing) throw new Error('Usuário não encontrado');

  const name = data.name.trim();
  const pin = data.pin.trim();

  if (!name) throw new Error('Nome obrigatório');
  if (!pin) throw new Error('PIN obrigatório');

  if (existing.role === 'representative') {
    if (!data.email || !isValidEmail(data.email)) throw new Error('E-mail inválido');
    if (!data.categoryIds || data.categoryIds.length === 0) {
      throw new Error('Selecione ao menos uma categoria');
    }
    if (!isValidRepPin(pin)) throw new Error('PIN deve ser de 1 a 6');
  } else if (data.email && !isValidEmail(data.email)) {
    throw new Error('E-mail inválido');
  }

  const db = await getDatabase();
  const duplicate = await db.getFirstAsync<{ id: string }>(
    'SELECT id FROM users WHERE LOWER(name) = LOWER(?) AND id != ?',
    [name, id]
  );
  if (duplicate) throw new Error('Já existe um usuário com este nome');

  let photoUri: string | null = existing.photoUri ?? null;

  if (data.photoUri === null) {
    await deleteUserPhoto(existing.photoUri);
    photoUri = null;
  } else if (data.photoUri && isTempPhotoUri(data.photoUri)) {
    await deleteUserPhoto(existing.photoUri);
    photoUri = await persistUserPhoto(data.photoUri, id);
  }

  const email =
    existing.role === 'representative'
      ? data.email!.trim().toLowerCase()
      : data.email?.trim().toLowerCase() || null;

  await db.runAsync(
    `UPDATE users SET name = ?, pin = ?, email = ?, photo_uri = ? WHERE id = ?`,
    [name, pin, email, photoUri, id]
  );

  if (existing.role === 'representative' && data.categoryIds) {
    await setUserCategories(id, data.categoryIds);
  }

  const updated = await getUserById(id);
  if (!updated) throw new Error('Falha ao atualizar usuário');
  return updated;
}

export async function deleteUser(id: string): Promise<void> {
  const db = await getDatabase();
  const user = await getUserById(id);
  if (!user || user.role === 'admin') return;

  await db.runAsync('DELETE FROM users WHERE id = ? AND role != ?', [id, 'admin']);
  await deleteUserPhoto(user.photoUri);
}
