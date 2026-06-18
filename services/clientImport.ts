import * as SQLite from 'expo-sqlite';
import { DEFAULT_BRAND_ID, DEFAULT_ORG_ID } from '../constants/organizations';
import clientsBundle from '../data/clients-import.json';
import clientsInfantilBundle from '../data/clients-import-infantil.json';

const CAT_INFANTIL = 'cat_infantil';

type ImportClient = {
  id: string;
  externalCode: string;
  name: string;
  tradeName: string | null;
  legalName: string | null;
  street: string | null;
  neighborhood: string | null;
  city: string;
  cityCode: string;
  state: string;
  zipCode: string | null;
  phone: string | null;
  mobile?: string | null;
  email?: string | null;
  clientGroup: string | null;
  lat: number | null;
  lng: number | null;
  categoryIds: string[];
};

async function findClientByExternalCode(
  database: SQLite.SQLiteDatabase,
  externalCode: string,
  fallbackId: string
): Promise<string | null> {
  const row = await database.getFirstAsync<{ id: string }>(
    'SELECT id FROM clients WHERE external_code = ? OR id = ? LIMIT 1',
    [externalCode, fallbackId]
  );
  return row?.id ?? null;
}

async function addCategories(
  database: SQLite.SQLiteDatabase,
  clientId: string,
  categoryIds: string[]
): Promise<void> {
  for (const categoryId of categoryIds) {
    await database.runAsync(
      'INSERT OR IGNORE INTO client_categories (client_id, category_id) VALUES (?, ?)',
      [clientId, categoryId]
    );
  }
}

async function insertClient(
  database: SQLite.SQLiteDatabase,
  client: ImportClient,
  createdAt: string
): Promise<void> {
  await database.runAsync(
    `INSERT INTO clients (
      id, external_code, organization_id, brand_id, name, trade_name, legal_name,
      street, neighborhood, city, city_code, state, zip_code,
      lat, lng, phone, mobile, email, client_group, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      client.id,
      client.externalCode,
      DEFAULT_ORG_ID,
      DEFAULT_BRAND_ID,
      client.name,
      client.tradeName,
      client.legalName,
      client.street,
      client.neighborhood,
      client.city,
      client.cityCode,
      client.state,
      client.zipCode,
      client.lat,
      client.lng,
      client.phone,
      client.mobile ?? null,
      client.email ?? null,
      client.clientGroup,
      createdAt,
    ]
  );
}

/** Lista adulto — importação inicial (pula duplicados). */
export async function importBundledClientsIfNeeded(
  database: SQLite.SQLiteDatabase
): Promise<void> {
  const done = await database.getFirstAsync<{ value: string }>(
    'SELECT value FROM app_meta WHERE key = ?',
    ['clients_csv_import_v1']
  );
  if (done?.value === '1') return;

  const now = new Date().toISOString();
  const clients = (clientsBundle as { clients: ImportClient[] }).clients;
  let imported = 0;

  for (const client of clients) {
    const existingId = await findClientByExternalCode(
      database,
      client.externalCode,
      client.id
    );
    if (existingId) continue;

    await insertClient(database, client, now);
    await addCategories(database, client.id, client.categoryIds);
    imported++;
  }

  console.log(`[clientImport] Adulto: ${imported} clientes novos`);
  await database.runAsync(
    'INSERT OR REPLACE INTO app_meta (key, value) VALUES (?, ?)',
    ['clients_csv_import_v1', '1']
  );
}

/**
 * Lista infantil — novos clientes são criados; existentes ganham cat_infantil.
 */
export async function importInfantilBundledClientsIfNeeded(
  database: SQLite.SQLiteDatabase
): Promise<void> {
  const done = await database.getFirstAsync<{ value: string }>(
    'SELECT value FROM app_meta WHERE key = ?',
    ['clients_csv_import_infantil_v1']
  );
  if (done?.value === '1') return;

  const now = new Date().toISOString();
  const clients = (clientsInfantilBundle as { clients: ImportClient[] }).clients;
  let created = 0;
  let categoryAdded = 0;

  for (const client of clients) {
    const existingId = await findClientByExternalCode(
      database,
      client.externalCode,
      client.id
    );

    if (existingId) {
      const result = await database.runAsync(
        'INSERT OR IGNORE INTO client_categories (client_id, category_id) VALUES (?, ?)',
        [existingId, CAT_INFANTIL]
      );
      if (result.changes > 0) categoryAdded++;
      continue;
    }

    await insertClient(database, client, now);
    await addCategories(database, client.id, [CAT_INFANTIL]);
    created++;
  }

  console.log(
    `[clientImport] Infantil: ${created} novos, ${categoryAdded} categorias adicionadas a existentes`
  );
  await database.runAsync(
    'INSERT OR REPLACE INTO app_meta (key, value) VALUES (?, ?)',
    ['clients_csv_import_infantil_v1', '1']
  );
}
