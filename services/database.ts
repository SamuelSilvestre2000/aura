import * as SQLite from 'expo-sqlite';
import {
  DEFAULT_BRAND_ID,
  DEFAULT_DIMENSION_ID,
  DEFAULT_ORG_ID,
  DEFAULT_ORG_SLUG,
} from '../constants/organizations';
import { importBundledClientsIfNeeded, importInfantilBundledClientsIfNeeded } from './clientImport';

/** Nome interno estável — não alterar sem migração (dados ficam no dispositivo). */
const DATABASE_NAME = 'rep_piaui.db';
const LEGACY_DATABASE_NAME = 'aura.db';

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

export function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (dbPromise) return dbPromise;
  
  dbPromise = (async () => {
    const db = await SQLite.openDatabaseAsync(DATABASE_NAME);
    await initDatabase(db);
    await migrateFromAlternateDatabase(db);
    return db;
  })();
  
  return dbPromise;
}

/** Recupera dados se o app chegou a gravar em aura.db após o rename. */
async function migrateFromAlternateDatabase(database: SQLite.SQLiteDatabase): Promise<void> {
  const done = await database.getFirstAsync<{ value: string }>(
    "SELECT value FROM app_meta WHERE key = 'alternate_db_migrated_v1'"
  );
  if (done?.value === '1') return;

  let alternate: SQLite.SQLiteDatabase | null = null;
  try {
    alternate = await SQLite.openDatabaseAsync(LEGACY_DATABASE_NAME);
  } catch {
    await database.runAsync(
      "INSERT OR REPLACE INTO app_meta (key, value) VALUES ('alternate_db_migrated_v1', '1')"
    );
    return;
  }

  try {
    const mainClients = await database.getFirstAsync<{ count: number }>(
      'SELECT COUNT(*) as count FROM clients'
    );
    const altClients = await alternate.getFirstAsync<{ count: number }>(
      'SELECT COUNT(*) as count FROM clients'
    );
    const altCollections = await alternate.getFirstAsync<{ count: number }>(
      'SELECT COUNT(*) as count FROM collections'
    );

    const mainEmpty = (mainClients?.count ?? 0) === 0;
    const altHasData = (altClients?.count ?? 0) > 0 || (altCollections?.count ?? 0) > 1;

    if (mainEmpty && altHasData) {
      await copyTable(alternate, database, 'collections');
      await copyTable(alternate, database, 'clients');
      await copyTable(alternate, database, 'purchases');
      await copyTable(alternate, database, 'users');
      await copyTable(alternate, database, 'categories');
      await copyTable(alternate, database, 'user_categories');
    }
  } catch (err) {
    console.warn('[database] Migração aura.db ignorada:', err);
  } finally {
    await alternate.closeAsync();
    await database.runAsync(
      "INSERT OR REPLACE INTO app_meta (key, value) VALUES ('alternate_db_migrated_v1', '1')"
    );
  }
}

async function copyTable(
  from: SQLite.SQLiteDatabase,
  to: SQLite.SQLiteDatabase,
  table: string
): Promise<void> {
  const rows = await from.getAllAsync<Record<string, unknown>>(`SELECT * FROM ${table}`);
  if (rows.length === 0) return;

  const columns = Object.keys(rows[0]);
  const placeholders = columns.map(() => '?').join(', ');
  const sql = `INSERT OR REPLACE INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})`;

  for (const row of rows) {
    await to.runAsync(sql, columns.map((col) => row[col] as SQLite.SQLiteBindValue));
  }
}

async function initDatabase(database: SQLite.SQLiteDatabase): Promise<void> {
  await database.execAsync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS collections (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      created_at TEXT NOT NULL,
      is_active INTEGER DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS clients (
      id TEXT PRIMARY KEY,
      external_code TEXT,
      name TEXT NOT NULL,
      trade_name TEXT,
      legal_name TEXT,
      street TEXT,
      neighborhood TEXT,
      city TEXT NOT NULL,
      city_code TEXT NOT NULL,
      state TEXT DEFAULT 'PI',
      zip_code TEXT,
      lat REAL,
      lng REAL,
      phone TEXT,
      notes TEXT,
      client_group TEXT,
      organization_id TEXT,
      brand_id TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS purchases (
      id TEXT PRIMARY KEY,
      client_id TEXT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
      collection_id TEXT NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
      purchased INTEGER DEFAULT 0,
      purchased_at TEXT,
      UNIQUE(client_id, collection_id)
    );

    CREATE TABLE IF NOT EXISTS app_meta (
      key TEXT PRIMARY KEY,
      value TEXT
    );

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      role TEXT NOT NULL CHECK(role IN ('admin', 'representative')),
      pin TEXT NOT NULL,
      email TEXT,
      category TEXT,
      photo_uri TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS user_categories (
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      category_id TEXT NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
      PRIMARY KEY (user_id, category_id)
    );

    CREATE TABLE IF NOT EXISTS organizations (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS brands (
      id TEXT PRIMARY KEY,
      organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      slug TEXT NOT NULL,
      created_at TEXT NOT NULL,
      UNIQUE(organization_id, slug)
    );

    CREATE TABLE IF NOT EXISTS category_dimensions (
      id TEXT PRIMARY KEY,
      organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      sort_order INTEGER DEFAULT 0,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS client_categories (
      client_id TEXT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
      category_id TEXT NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
      PRIMARY KEY (client_id, category_id)
    );

    CREATE TABLE IF NOT EXISTS user_organizations (
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
      role TEXT NOT NULL CHECK(role IN ('admin', 'representative')),
      PRIMARY KEY (user_id, organization_id)
    );

    CREATE TABLE IF NOT EXISTS representative_scopes (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
      brand_id TEXT REFERENCES brands(id) ON DELETE SET NULL,
      access_mode TEXT NOT NULL CHECK(
        access_mode IN ('all_in_org', 'by_category', 'by_territory', 'by_assignment')
      ),
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS representative_scope_categories (
      scope_id TEXT NOT NULL REFERENCES representative_scopes(id) ON DELETE CASCADE,
      category_id TEXT NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
      PRIMARY KEY (scope_id, category_id)
    );

    CREATE TABLE IF NOT EXISTS representative_scope_territories (
      scope_id TEXT NOT NULL REFERENCES representative_scopes(id) ON DELETE CASCADE,
      city_code TEXT NOT NULL,
      PRIMARY KEY (scope_id, city_code)
    );

    CREATE TABLE IF NOT EXISTS client_assignments (
      id TEXT PRIMARY KEY,
      client_id TEXT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      assignment_type TEXT NOT NULL CHECK(assignment_type IN ('primary', 'shared', 'backup')),
      valid_from TEXT,
      valid_to TEXT,
      created_at TEXT NOT NULL,
      UNIQUE(client_id, user_id, assignment_type)
    );
  `);

  await migrateUsersTable(database);
  await migrateClientExtendedColumns(database);
  await seedCategories(database);
  await migrateLegacyUserCategories(database);

  const userCount = await database.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM users'
  );
  if (userCount?.count === 0) {
    const now = new Date().toISOString();
    try {
      await database.runAsync(
        'INSERT OR IGNORE INTO users (id, name, role, pin, created_at) VALUES (?, ?, ?, ?, ?)',
        ['usr_admin', 'Administrador', 'admin', '1234', now]
      );
    } catch {}
  }

  await migrateOrgModelV2(database);
  await migrateCollectionPeriodAndGoals(database);
  await migrateSalesV1(database);
  await migrateCollectionCategoryV1(database);
  await migrateRepScopeFromUserCategories(database);

  const count = await database.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM collections'
  );
  if (count?.count === 0) {
    const now = new Date().toISOString();
    try {
      await database.runAsync(
        `INSERT OR IGNORE INTO collections (
          id, name, created_at, is_active, organization_id, brand_id, start_date, end_date
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        ['col_seed_1', 'Verão 2026', now, 1, DEFAULT_ORG_ID, DEFAULT_BRAND_ID, '2026-01-01', '2026-06-30']
      );
    } catch {}
  }

  await importBundledClientsIfNeeded(database);
  await importInfantilBundledClientsIfNeeded(database);
}

async function addColumnIfMissing(
  database: SQLite.SQLiteDatabase,
  table: string,
  column: string,
  definition: string
): Promise<void> {
  const columns = await database.getAllAsync<{ name: string }>(`PRAGMA table_info(${table})`);
  if (!columns.some((c) => c.name === column)) {
    await database.execAsync(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
}

async function migrateOrgModelV2(database: SQLite.SQLiteDatabase): Promise<void> {
  const migrated = await database.getFirstAsync<{ value: string }>(
    "SELECT value FROM app_meta WHERE key = 'org_model_v2'"
  );
  if (migrated?.value === '1') return;

  await addColumnIfMissing(database, 'clients', 'organization_id', 'TEXT');
  await addColumnIfMissing(database, 'clients', 'brand_id', 'TEXT');
  await addColumnIfMissing(database, 'collections', 'organization_id', 'TEXT');
  await addColumnIfMissing(database, 'collections', 'brand_id', 'TEXT');
  await addColumnIfMissing(database, 'categories', 'organization_id', 'TEXT');
  await addColumnIfMissing(database, 'categories', 'dimension_id', 'TEXT');

  const now = new Date().toISOString();

  await database.runAsync(
    `INSERT OR IGNORE INTO organizations (id, name, slug, created_at) VALUES (?, ?, ?, ?)`,
    [DEFAULT_ORG_ID, 'Malwee Piauí', DEFAULT_ORG_SLUG, now]
  );

  await database.runAsync(
    `INSERT OR IGNORE INTO brands (id, organization_id, name, slug, created_at) VALUES (?, ?, ?, ?, ?)`,
    [DEFAULT_BRAND_ID, DEFAULT_ORG_ID, 'Malwee', 'malwee', now]
  );

  await database.runAsync(
    `INSERT OR IGNORE INTO category_dimensions (id, organization_id, name, sort_order, created_at)
     VALUES (?, ?, ?, ?, ?)`,
    [DEFAULT_DIMENSION_ID, DEFAULT_ORG_ID, 'Faixa etária', 0, now]
  );

  await database.runAsync(
    `UPDATE categories SET organization_id = ?, dimension_id = ?
     WHERE organization_id IS NULL`,
    [DEFAULT_ORG_ID, DEFAULT_DIMENSION_ID]
  );

  await database.runAsync(
    `UPDATE clients SET organization_id = ?, brand_id = COALESCE(brand_id, ?)
     WHERE organization_id IS NULL`,
    [DEFAULT_ORG_ID, DEFAULT_BRAND_ID]
  );

  await database.runAsync(
    `UPDATE collections SET organization_id = ?, brand_id = COALESCE(brand_id, ?)
     WHERE organization_id IS NULL`,
    [DEFAULT_ORG_ID, DEFAULT_BRAND_ID]
  );

  const users = await database.getAllAsync<{ id: string; role: string }>(
    'SELECT id, role FROM users'
  );
  for (const user of users) {
    await database.runAsync(
      `INSERT OR IGNORE INTO user_organizations (user_id, organization_id, role) VALUES (?, ?, ?)`,
      [user.id, DEFAULT_ORG_ID, user.role]
    );

    if (user.role === 'representative') {
      const scopeExists = await database.getFirstAsync<{ count: number }>(
        'SELECT COUNT(*) as count FROM representative_scopes WHERE user_id = ?',
        [user.id]
      );
      if ((scopeExists?.count ?? 0) === 0) {
        const scopeId = `scope_${user.id}_default`;
        await database.runAsync(
          `INSERT INTO representative_scopes (id, user_id, organization_id, brand_id, access_mode, created_at)
           VALUES (?, ?, ?, NULL, 'all_in_org', ?)`,
          [scopeId, user.id, DEFAULT_ORG_ID, now]
        );
      }
    }
  }

  await database.runAsync(
    "INSERT OR REPLACE INTO app_meta (key, value) VALUES ('org_model_v2', '1')"
  );
}

async function migrateCollectionPeriodAndGoals(database: SQLite.SQLiteDatabase): Promise<void> {
  const migrated = await database.getFirstAsync<{ value: string }>(
    "SELECT value FROM app_meta WHERE key = 'collection_period_goals_v1'"
  );
  if (migrated?.value === '1') return;

  await addColumnIfMissing(database, 'collections', 'start_date', 'TEXT');
  await addColumnIfMissing(database, 'collections', 'end_date', 'TEXT');

  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS collection_goals (
      id TEXT PRIMARY KEY,
      collection_id TEXT NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      goal_amount REAL NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE(collection_id, user_id)
    );
  `);

  const year = new Date().getFullYear();
  await database.runAsync(
    `UPDATE collections SET start_date = ?, end_date = ?
     WHERE start_date IS NULL OR end_date IS NULL`,
    [`${year}-01-01`, `${year}-12-31`]
  );

  await database.runAsync(
    "INSERT OR REPLACE INTO app_meta (key, value) VALUES ('collection_period_goals_v1', '1')"
  );
}

async function migrateCollectionCategoryV1(database: SQLite.SQLiteDatabase): Promise<void> {
  const migrated = await database.getFirstAsync<{ value: string }>(
    "SELECT value FROM app_meta WHERE key = 'collection_category_v1'"
  );
  if (migrated?.value === '1') return;

  await addColumnIfMissing(database, 'collections', 'category_id', 'TEXT');

  const goalsHasCategory = await database.getAllAsync<{ name: string }>(
    'PRAGMA table_info(collection_goals)'
  );
  if (!goalsHasCategory.some((c) => c.name === 'category_id')) {
    await database.execAsync(`
      CREATE TABLE IF NOT EXISTS collection_goals_v2 (
        id TEXT PRIMARY KEY,
        collection_id TEXT NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        category_id TEXT NOT NULL DEFAULT 'all',
        goal_amount REAL NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        UNIQUE(collection_id, user_id, category_id)
      );
    `);
    await database.execAsync(`
      INSERT OR IGNORE INTO collection_goals_v2 (
        id, collection_id, user_id, category_id, goal_amount, created_at, updated_at
      )
      SELECT id, collection_id, user_id, 'all', goal_amount, created_at, updated_at
      FROM collection_goals;
    `);
    await database.execAsync('DROP TABLE IF EXISTS collection_goals;');
    await database.execAsync('ALTER TABLE collection_goals_v2 RENAME TO collection_goals;');
  }

  await database.runAsync(
    "INSERT OR REPLACE INTO app_meta (key, value) VALUES ('collection_category_v1', '1')"
  );
}

async function migrateRepScopeFromUserCategories(
  database: SQLite.SQLiteDatabase
): Promise<void> {
  const migrated = await database.getFirstAsync<{ value: string }>(
    "SELECT value FROM app_meta WHERE key = 'rep_scope_user_categories_v1'"
  );
  if (migrated?.value === '1') return;

  const reps = await database.getAllAsync<{ id: string }>(
    "SELECT id FROM users WHERE role = 'representative'"
  );

  for (const rep of reps) {
    const cats = await database.getAllAsync<{ category_id: string }>(
      'SELECT category_id FROM user_categories WHERE user_id = ?',
      [rep.id]
    );
    const categoryIds = cats.map((c) => c.category_id);
    if (categoryIds.length === 0) continue;

    const scope = await database.getFirstAsync<{ id: string }>(
      'SELECT id FROM representative_scopes WHERE user_id = ? ORDER BY created_at ASC LIMIT 1',
      [rep.id]
    );
    if (!scope) continue;

    await database.runAsync('UPDATE representative_scopes SET access_mode = ? WHERE id = ?', [
      'by_category',
      scope.id,
    ]);
    await database.runAsync('DELETE FROM representative_scope_categories WHERE scope_id = ?', [
      scope.id,
    ]);
    for (const categoryId of categoryIds) {
      await database.runAsync(
        'INSERT OR IGNORE INTO representative_scope_categories (scope_id, category_id) VALUES (?, ?)',
        [scope.id, categoryId]
      );
    }
  }

  await database.runAsync(
    "INSERT OR REPLACE INTO app_meta (key, value) VALUES ('rep_scope_user_categories_v1', '1')"
  );
}

async function migrateSalesV1(database: SQLite.SQLiteDatabase): Promise<void> {
  const migrated = await database.getFirstAsync<{ value: string }>(
    "SELECT value FROM app_meta WHERE key = 'sales_v1'"
  );
  if (migrated?.value === '1') return;

  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS sales (
      id TEXT PRIMARY KEY,
      client_id TEXT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
      collection_id TEXT NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      amount REAL NOT NULL,
      sold_at TEXT NOT NULL,
      created_at TEXT NOT NULL,
      UNIQUE(client_id, collection_id)
    );
  `);

  await database.runAsync(
    "INSERT OR REPLACE INTO app_meta (key, value) VALUES ('sales_v1', '1')"
  );
}

async function migrateClientExtendedColumns(database: SQLite.SQLiteDatabase): Promise<void> {
  await addColumnIfMissing(database, 'clients', 'external_code', 'TEXT');
  await addColumnIfMissing(database, 'clients', 'trade_name', 'TEXT');
  await addColumnIfMissing(database, 'clients', 'legal_name', 'TEXT');
  await addColumnIfMissing(database, 'clients', 'street', 'TEXT');
  await addColumnIfMissing(database, 'clients', 'neighborhood', 'TEXT');
  await addColumnIfMissing(database, 'clients', 'zip_code', 'TEXT');
  await addColumnIfMissing(database, 'clients', 'client_group', 'TEXT');
  await addColumnIfMissing(database, 'clients', 'mobile', 'TEXT');
  await addColumnIfMissing(database, 'clients', 'email', 'TEXT');

  const migrated = await database.getFirstAsync<{ value: string }>(
    "SELECT value FROM app_meta WHERE key = 'client_extended_columns_v1'"
  );
  if (migrated?.value === '1') return;

  try {
    await database.execAsync(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_clients_external_code
        ON clients(external_code) WHERE external_code IS NOT NULL;
    `);
  } catch (err) {
    console.warn('[database] Índice external_code:', err);
  }

  await database.runAsync(
    "INSERT OR REPLACE INTO app_meta (key, value) VALUES ('client_extended_columns_v1', '1')"
  );
}

async function seedCategories(database: SQLite.SQLiteDatabase): Promise<void> {
  const count = await database.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM categories'
  );
  if (count?.count !== 0) return;

  const now = new Date().toISOString();
  await database.runAsync(
    'INSERT INTO categories (id, name, slug, created_at) VALUES (?, ?, ?, ?), (?, ?, ?, ?)',
    ['cat_adulto', 'Adulto', 'adulto', now, 'cat_infantil', 'Infantil', 'infantil', now]
  );
}

async function migrateLegacyUserCategories(database: SQLite.SQLiteDatabase): Promise<void> {
  const migrated = await database.getFirstAsync<{ value: string }>(
    "SELECT value FROM app_meta WHERE key = 'user_categories_migrated_v1'"
  );
  if (migrated?.value === '1') return;

  const users = await database.getAllAsync<{ id: string; category: string | null }>(
    'SELECT id, category FROM users WHERE category IS NOT NULL'
  );

  for (const user of users) {
    const slugs: string[] =
      user.category === 'ambas'
        ? ['adulto', 'infantil']
        : user.category === 'adulto' || user.category === 'infantil'
          ? [user.category]
          : [];

    for (const slug of slugs) {
      const category = await database.getFirstAsync<{ id: string }>(
        'SELECT id FROM categories WHERE slug = ?',
        [slug]
      );
      if (category) {
        await database.runAsync(
          'INSERT OR IGNORE INTO user_categories (user_id, category_id) VALUES (?, ?)',
          [user.id, category.id]
        );
      }
    }
  }

  await database.runAsync(
    "INSERT OR REPLACE INTO app_meta (key, value) VALUES ('user_categories_migrated_v1', '1')"
  );
}

async function migrateUsersTable(database: SQLite.SQLiteDatabase): Promise<void> {
  const columns = await database.getAllAsync<{ name: string }>('PRAGMA table_info(users)');
  const names = new Set(columns.map((c) => c.name));

  if (!names.has('email')) {
    await database.execAsync('ALTER TABLE users ADD COLUMN email TEXT');
  }
  if (!names.has('category')) {
    await database.execAsync('ALTER TABLE users ADD COLUMN category TEXT');
  }
  if (!names.has('photo_uri')) {
    await database.execAsync('ALTER TABLE users ADD COLUMN photo_uri TEXT');
  }
}

export function generateId(prefix: string = 'id'): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
