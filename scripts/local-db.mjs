#!/usr/bin/env node
/**
 * Banco SQLite local para inspeção no Cursor/VS Code.
 * Arquivo: .data/rep_piaui.db
 *
 * Uso:
 *   npm run db:init
 *   npm run db:path
 *   npm run db:tables
 *   npm run db:query -- "SELECT name, city FROM clients LIMIT 5"
 *   npm run db:pull          (Android debug + adb no PATH)
 */
import { DatabaseSync } from 'node:sqlite';
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  unlinkSync,
} from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const DATA_DIR = join(ROOT, '.data');
const DB_PATH = join(DATA_DIR, 'rep_piaui.db');
const ANDROID_PACKAGE = 'com.aura.app';

const DEFAULT_ORG_ID = 'org_default';
const DEFAULT_ORG_SLUG = 'malwee-piaui';
const DEFAULT_BRAND_ID = 'brand_malwee';
const DEFAULT_DIMENSION_ID = 'dim_faixa_etaria';

const SCHEMA_SQL = `
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS collections (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TEXT NOT NULL,
  is_active INTEGER DEFAULT 1,
  organization_id TEXT,
  brand_id TEXT,
  start_date TEXT,
  end_date TEXT,
  category_id TEXT
);

CREATE TABLE IF NOT EXISTS clients (
  id TEXT PRIMARY KEY,
  external_code TEXT,
  cnpj TEXT,
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
  mobile TEXT,
  email TEXT,
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
  organization_id TEXT,
  dimension_id TEXT,
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
  access_mode TEXT NOT NULL,
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
  assignment_type TEXT NOT NULL,
  valid_from TEXT,
  valid_to TEXT,
  created_at TEXT NOT NULL,
  UNIQUE(client_id, user_id, assignment_type)
);

CREATE TABLE IF NOT EXISTS collection_goals (
  id TEXT PRIMARY KEY,
  collection_id TEXT NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category_id TEXT NOT NULL DEFAULT 'all',
  goal_amount REAL NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(collection_id, user_id, category_id)
);

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

CREATE UNIQUE INDEX IF NOT EXISTS idx_clients_external_code
  ON clients(external_code) WHERE external_code IS NOT NULL;
`;

function openDb() {
  mkdirSync(DATA_DIR, { recursive: true });
  const db = new DatabaseSync(DB_PATH);
  ensureMigrations(db);
  return db;
}

function ensureMigrations(db) {
  if (!existsSync(DB_PATH)) return;
  const columns = db.prepare('PRAGMA table_info(clients)').all().map((row) => row.name);
  if (!columns.includes('cnpj')) {
    db.exec('ALTER TABLE clients ADD COLUMN cnpj TEXT');
  }
}

function seedBase(db) {
  const now = new Date().toISOString();

  db.prepare(
    `INSERT OR IGNORE INTO organizations (id, name, slug, created_at) VALUES (?, ?, ?, ?)`
  ).run(DEFAULT_ORG_ID, 'Malwee Piauí', DEFAULT_ORG_SLUG, now);

  db.prepare(
    `INSERT OR IGNORE INTO brands (id, organization_id, name, slug, created_at) VALUES (?, ?, ?, ?, ?)`
  ).run(DEFAULT_BRAND_ID, DEFAULT_ORG_ID, 'Malwee', 'malwee', now);

  db.prepare(
    `INSERT OR IGNORE INTO category_dimensions (id, organization_id, name, sort_order, created_at)
     VALUES (?, ?, ?, ?, ?)`
  ).run(DEFAULT_DIMENSION_ID, DEFAULT_ORG_ID, 'Faixa etária', 0, now);

  const catCount = db.prepare('SELECT COUNT(*) AS count FROM categories').get().count;
  if (catCount === 0) {
    db.prepare(
      `INSERT INTO categories (id, name, slug, organization_id, dimension_id, created_at)
       VALUES (?, ?, ?, ?, ?, ?), (?, ?, ?, ?, ?, ?)`
    ).run(
      'cat_adulto', 'Adulto', 'adulto', DEFAULT_ORG_ID, DEFAULT_DIMENSION_ID, now,
      'cat_infantil', 'Infantil', 'infantil', DEFAULT_ORG_ID, DEFAULT_DIMENSION_ID, now
    );
  }

  db.prepare(
    `INSERT OR IGNORE INTO users (id, name, role, pin, created_at) VALUES (?, ?, ?, ?, ?)`
  ).run('usr_admin', 'Administrador', 'admin', '1234', now);

  db.prepare(
    `INSERT OR IGNORE INTO user_organizations (user_id, organization_id, role) VALUES (?, ?, ?)`
  ).run('usr_admin', DEFAULT_ORG_ID, 'admin');

  const colCount = db.prepare('SELECT COUNT(*) AS count FROM collections').get().count;
  if (colCount === 0) {
    db.prepare(
      `INSERT INTO collections (
        id, name, created_at, is_active, organization_id, brand_id, start_date, end_date
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      'col_seed_1', 'Verão 2026', now, 1, DEFAULT_ORG_ID, DEFAULT_BRAND_ID, '2026-01-01', '2026-06-30'
    );
  }
}

function importBundle(db, relativePath, metaKey) {
  const done = db.prepare('SELECT value FROM app_meta WHERE key = ?').get(metaKey);
  if (done?.value === '1') return 0;

  const fullPath = join(ROOT, relativePath);
  if (!existsSync(fullPath)) return 0;

  const { clients } = JSON.parse(readFileSync(fullPath, 'utf8'));
  const now = new Date().toISOString();
  let imported = 0;

  const insert = db.prepare(`
    INSERT OR IGNORE INTO clients (
      id, external_code, organization_id, brand_id, name, cnpj, trade_name, legal_name,
      street, neighborhood, city, city_code, state, zip_code,
      lat, lng, phone, mobile, email, client_group, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const addCategory = db.prepare(
    'INSERT OR IGNORE INTO client_categories (client_id, category_id) VALUES (?, ?)'
  );

  for (const client of clients) {
    const result = insert.run(
      client.id,
      client.externalCode,
      DEFAULT_ORG_ID,
      DEFAULT_BRAND_ID,
      client.name,
      client.cnpj ? String(client.cnpj).replace(/\D/g, '') : null,
      client.tradeName,
      client.legalName,
      client.street,
      client.neighborhood,
      client.city,
      client.cityCode,
      client.state ?? 'PI',
      client.zipCode,
      client.lat,
      client.lng,
      client.phone,
      client.mobile ?? null,
      client.email ?? null,
      client.clientGroup,
      now
    );
    if (result.changes > 0) imported += 1;
    for (const categoryId of client.categoryIds ?? []) {
      addCategory.run(client.id, categoryId);
    }
  }

  db.prepare('INSERT OR REPLACE INTO app_meta (key, value) VALUES (?, ?)').run(metaKey, '1');
  return imported;
}

function initDb() {
  if (existsSync(DB_PATH)) unlinkSync(DB_PATH);
  const db = openDb();
  db.exec(SCHEMA_SQL);
  seedBase(db);
  const adult = importBundle(db, 'data/clients-import.json', 'local_import_adulto_v1');
  const infantil = importBundle(db, 'data/clients-import-infantil.json', 'local_import_infantil_v1');
  db.close();
  console.log(`Banco criado: ${DB_PATH}`);
  console.log(`Clientes importados: ${adult} adulto, ${infantil} infantil`);
  console.log('Abra este arquivo no Cursor: extensão "SQLite Viewer" ou "SQLite"');
}

function findAdb() {
  const candidates = [
    process.env.ADB,
    join(process.env.LOCALAPPDATA ?? '', 'Android', 'Sdk', 'platform-tools', 'adb.exe'),
    join(process.env.USERPROFILE ?? '', 'AppData', 'Local', 'Android', 'Sdk', 'platform-tools', 'adb.exe'),
  ].filter(Boolean);
  return candidates.find((p) => existsSync(p));
}

function pullFromDevice() {
  const adb = findAdb();
  if (!adb) {
    console.error('adb não encontrado. Instale Android SDK Platform-Tools ou defina ADB no PATH.');
    console.error('Alternativa: npm run db:init (cópia local com dados de seed/import JSON)');
    process.exit(1);
  }

  mkdirSync(DATA_DIR, { recursive: true });
  const remote = `/data/data/${ANDROID_PACKAGE}/databases/rep_piaui.db`;
  const tmp = join(DATA_DIR, 'rep_piaui.device.db');

  try {
    execSync(`"${adb}" devices`, { stdio: 'inherit' });
    execSync(`"${adb}" exec-out run-as ${ANDROID_PACKAGE} cat databases/rep_piaui.db > "${tmp}"`, {
      shell: true,
      stdio: 'inherit',
    });
    copyFileSync(tmp, DB_PATH);
    console.log(`Banco do dispositivo copiado para: ${DB_PATH}`);
  } catch (err) {
    console.error('Falha ao copiar do dispositivo. Use build debug + emulador/dispositivo conectado.');
    console.error(err.message);
    process.exit(1);
  }
}

function listTables(db) {
  const rows = db
    .prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
    .all();
  for (const row of rows) console.log(row.name);
}

function runQuery(db, sql) {
  const stmt = db.prepare(sql);
  if (!stmt.readonly && !/^SELECT/i.test(sql.trim())) {
    const result = stmt.run();
    console.log(`OK (${result.changes} linha(s) afetada(s))`);
    return;
  }
  const rows = stmt.all();
  if (rows.length === 0) {
    console.log('(sem resultados)');
    return;
  }
  console.table(rows);
}

const [command, ...rest] = process.argv.slice(2);
const sqlArg = rest.join(' ').trim();

switch (command ?? 'help') {
  case 'init':
    initDb();
    break;
  case 'pull':
    pullFromDevice();
    break;
  case 'path':
    console.log(DB_PATH);
    break;
  case 'tables': {
    if (!existsSync(DB_PATH)) {
      console.error('Banco não existe. Rode: npm run db:init');
      process.exit(1);
    }
    listTables(openDb());
    break;
  }
  case 'query': {
    if (!existsSync(DB_PATH)) {
      console.error('Banco não existe. Rode: npm run db:init');
      process.exit(1);
    }
    if (!sqlArg) {
      console.error('Informe o SQL. Ex.: npm run db:query -- "SELECT COUNT(*) FROM clients"');
      process.exit(1);
    }
    runQuery(openDb(), sqlArg);
    break;
  }
  default:
    console.log(`Banco local Aura — ${DB_PATH}

Comandos:
  npm run db:init    Cria .data/rep_piaui.db (schema + clientes dos JSON)
  npm run db:pull    Copia do Android (adb + app debug com.aura.app)
  npm run db:path    Mostra caminho do arquivo
  npm run db:tables  Lista tabelas
  npm run db:query -- "SELECT ..."

No Cursor: instale extensão "SQLite Viewer", depois abra o arquivo em .data/rep_piaui.db
`);
}
