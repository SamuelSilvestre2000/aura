import * as SQLite from 'expo-sqlite';

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

export function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (dbPromise) return dbPromise;
  
  dbPromise = (async () => {
    const db = await SQLite.openDatabaseAsync('aura.db');
    await initDatabase(db);
    return db;
  })();
  
  return dbPromise;
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
      name TEXT NOT NULL,
      city TEXT NOT NULL,
      city_code TEXT NOT NULL,
      state TEXT DEFAULT 'PI',
      lat REAL,
      lng REAL,
      phone TEXT,
      notes TEXT,
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
  `);

  await migrateUsersTable(database);
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

  // Seed: coleção inicial se não existir nenhuma
  const count = await database.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM collections'
  );
  if (count?.count === 0) {
    const now = new Date().toISOString();
    try {
      await database.runAsync(
        'INSERT OR IGNORE INTO collections (id, name, created_at, is_active) VALUES (?, ?, ?, ?)',
        ['col_seed_1', 'Verão 2026', now, 1]
      );
    } catch {} // Ignorar possíveis erros de chave no dev hot reload
  }
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
