import * as SQLite from 'expo-sqlite';
import { Client, UserRole } from '../types';
import { queryVisibleClients } from './access';
import { validateCategoryIdsForUser } from './categories';
import { getDatabase, generateId } from './database';
import { isSupabaseConfigured } from './supabase/client';
import {
  createClientRemote,
  deleteClientRemote,
  getClientByIdRemote,
  listClientsForUserRemote,
  setClientCategoriesRemote,
  updateClientRemote,
} from './supabase/clients';
import {
  DEFAULT_BRAND_ID,
  DEFAULT_ORG_ID,
  getDefaultBrandId,
  getDefaultOrganizationId,
} from './organizations';
import { stripCnpj } from '../utils/cnpj';

type CreateClientData = Omit<Client, 'id' | 'createdAt' | 'state' | 'organizationId' | 'categoryIds'> & {
  categoryIds?: string[];
  organizationId?: string;
  brandId?: string | null;
};

type UpdateClientData = Partial<Omit<Client, 'id' | 'createdAt'>>;

async function buildClientCategoryMap(
  db: SQLite.SQLiteDatabase,
  clientIds: string[]
): Promise<Map<string, string[]>> {
  const map = new Map<string, string[]>();
  if (clientIds.length === 0) return map;

  const CHUNK_SIZE = 400;
  for (let i = 0; i < clientIds.length; i += CHUNK_SIZE) {
    const chunk = clientIds.slice(i, i + CHUNK_SIZE);
    const placeholders = chunk.map(() => '?').join(',');
    const rows = await db.getAllAsync<{ client_id: string; category_id: string }>(
      `SELECT client_id, category_id FROM client_categories WHERE client_id IN (${placeholders})`,
      chunk
    );
    for (const row of rows) {
      const list = map.get(row.client_id) ?? [];
      list.push(row.category_id);
      map.set(row.client_id, list);
    }
  }
  return map;
}

async function attachClientCategories(client: Client): Promise<Client> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<{ category_id: string }>(
    'SELECT category_id FROM client_categories WHERE client_id = ?',
    [client.id]
  );
  return { ...client, categoryIds: rows.map((r) => r.category_id) };
}

const ROW_TO_CLIENT = (row: any): Client => ({
  id: row.id,
  externalCode: row.external_code || undefined,
  cnpj: row.cnpj || undefined,
  municipalRegistration: row.municipal_registration || undefined,
  name: row.name,
  tradeName: row.trade_name || undefined,
  legalName: row.legal_name || undefined,
  street: row.street || undefined,
  neighborhood: row.neighborhood || undefined,
  city: row.city,
  cityCode: row.city_code,
  state: row.state,
  zipCode: row.zip_code || undefined,
  lat: row.lat,
  lng: row.lng,
  phone: row.phone || undefined,
  mobile: row.mobile || undefined,
  email: row.email || undefined,
  instagram: row.instagram || undefined,
  facebook: row.facebook || undefined,
  notes: row.notes || undefined,
  clientGroup: row.client_group || undefined,
  createdAt: row.created_at,
  organizationId: row.organization_id ?? undefined,
  brandId: row.brand_id ?? undefined,
});

export async function listClientsForUser(userId: string, role: UserRole): Promise<Client[]> {
  if (isSupabaseConfigured()) return listClientsForUserRemote(userId, role);

  const rows = await queryVisibleClients(userId, role);
  const clients = rows.map(ROW_TO_CLIENT);
  if (clients.length === 0) return [];

  const db = await getDatabase();
  const categoryMap = await buildClientCategoryMap(
    db,
    clients.map((c) => c.id)
  );
  return clients.map((c) => ({
    ...c,
    categoryIds: categoryMap.get(c.id) ?? [],
  }));
}

export async function getClientById(id: string): Promise<Client | null> {
  if (isSupabaseConfigured()) return getClientByIdRemote(id);

  const db = await getDatabase();
  const row = await db.getFirstAsync<any>('SELECT * FROM clients WHERE id = ?', [id]);
  if (!row) return null;
  return attachClientCategories(ROW_TO_CLIENT(row));
}

type ClientActor = { userId: string; role: UserRole };

export async function createClient(
  data: CreateClientData,
  actor?: ClientActor
): Promise<Client> {
  if (isSupabaseConfigured()) return createClientRemote(data, actor);

  if (actor && data.categoryIds?.length) {
    await validateCategoryIdsForUser(actor.userId, actor.role, data.categoryIds);
  }
  const db = await getDatabase();
  const now = new Date().toISOString();
  const id = generateId('cli');
  const organizationId = data.organizationId ?? (await getDefaultOrganizationId());
  const brandId = data.brandId !== undefined ? data.brandId : await getDefaultBrandId();

  await db.runAsync(
    `INSERT INTO clients (
      id, organization_id, brand_id, external_code, name, trade_name, cnpj, municipal_registration,
      street, neighborhood, city, city_code, state, zip_code,
      lat, lng, phone, mobile, email, instagram, facebook, notes, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      organizationId,
      brandId,
      data.externalCode ?? null,
      data.name,
      data.tradeName ?? null,
      data.cnpj ? stripCnpj(data.cnpj) : null,
      data.municipalRegistration ?? null,
      data.street ?? null,
      data.neighborhood ?? null,
      data.city,
      data.cityCode,
      'PI',
      data.zipCode ?? null,
      data.lat,
      data.lng,
      data.phone ?? null,
      data.mobile ?? null,
      data.email ?? null,
      data.instagram ?? null,
      data.facebook ?? null,
      data.notes ?? null,
      now,
    ]
  );

  if (data.categoryIds?.length) {
    for (const categoryId of data.categoryIds) {
      await db.runAsync(
        'INSERT OR IGNORE INTO client_categories (client_id, category_id) VALUES (?, ?)',
        [id, categoryId]
      );
    }
  }

  const client = await getClientById(id);
  if (!client) throw new Error('Falha ao criar cliente');
  return client;
}

export async function updateClient(
  id: string,
  data: UpdateClientData,
  actor?: ClientActor
): Promise<void> {
  if (isSupabaseConfigured()) return updateClientRemote(id, data, actor);

  if (actor && data.categoryIds?.length) {
    await validateCategoryIdsForUser(actor.userId, actor.role, data.categoryIds);
  }
  const db = await getDatabase();
  const fields: string[] = [];
  const values: SQLite.SQLiteBindValue[] = [];

  if (data.name !== undefined) { fields.push('name = ?'); values.push(data.name); }
  if (data.cnpj !== undefined) {
    fields.push('cnpj = ?');
    values.push(data.cnpj ? stripCnpj(data.cnpj) : null);
  }
  if (data.municipalRegistration !== undefined) {
    fields.push('municipal_registration = ?');
    values.push(data.municipalRegistration ?? null);
  }
  if (data.city !== undefined) { fields.push('city = ?'); values.push(data.city); }
  if (data.cityCode !== undefined) { fields.push('city_code = ?'); values.push(data.cityCode); }
  if (data.lat !== undefined) { fields.push('lat = ?'); values.push(data.lat); }
  if (data.lng !== undefined) { fields.push('lng = ?'); values.push(data.lng); }
  if (data.phone !== undefined) { fields.push('phone = ?'); values.push(data.phone); }
  if (data.instagram !== undefined) { fields.push('instagram = ?'); values.push(data.instagram); }
  if (data.facebook !== undefined) { fields.push('facebook = ?'); values.push(data.facebook); }
  if (data.notes !== undefined) { fields.push('notes = ?'); values.push(data.notes); }
  if (data.brandId !== undefined) { fields.push('brand_id = ?'); values.push(data.brandId); }
  if (data.organizationId !== undefined) { fields.push('organization_id = ?'); values.push(data.organizationId); }

  if (fields.length > 0) {
    values.push(id);
    await db.runAsync(`UPDATE clients SET ${fields.join(', ')} WHERE id = ?`, values);
  }

  if (data.categoryIds !== undefined) {
    await db.runAsync('DELETE FROM client_categories WHERE client_id = ?', [id]);
    for (const categoryId of data.categoryIds) {
      await db.runAsync(
        'INSERT OR IGNORE INTO client_categories (client_id, category_id) VALUES (?, ?)',
        [id, categoryId]
      );
    }
  }
}

export async function deleteClient(id: string): Promise<void> {
  if (isSupabaseConfigured()) return deleteClientRemote(id);

  const db = await getDatabase();
  await db.runAsync('DELETE FROM clients WHERE id = ?', [id]);
}

export async function setClientCategories(clientId: string, categoryIds: string[]): Promise<void> {
  if (isSupabaseConfigured()) return setClientCategoriesRemote(clientId, categoryIds);

  const db = await getDatabase();
  await db.runAsync('DELETE FROM client_categories WHERE client_id = ?', [clientId]);
  for (const categoryId of categoryIds) {
    await db.runAsync(
      'INSERT OR IGNORE INTO client_categories (client_id, category_id) VALUES (?, ?)',
      [clientId, categoryId]
    );
  }
}

// Re-export defaults for forms
export { DEFAULT_ORG_ID, DEFAULT_BRAND_ID };
