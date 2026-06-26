import { AccessMode, RepresentativeScope } from '../types';
import { getDatabase, generateId } from './database';
import { DEFAULT_ORG_ID } from '../constants/organizations';

const ROW_TO_SCOPE = (row: {
  id: string;
  user_id: string;
  organization_id: string;
  brand_id: string | null;
  access_mode: AccessMode;
  created_at: string;
}): RepresentativeScope => ({
  id: row.id,
  userId: row.user_id,
  organizationId: row.organization_id,
  brandId: row.brand_id,
  accessMode: row.access_mode,
  createdAt: row.created_at,
});

export async function getRepresentativeScopes(userId: string): Promise<RepresentativeScope[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<any>(
    'SELECT * FROM representative_scopes WHERE user_id = ? ORDER BY created_at ASC',
    [userId]
  );

  const scopes: RepresentativeScope[] = [];
  for (const row of rows) {
    const scope = ROW_TO_SCOPE(row);
    const categories = await db.getAllAsync<{ category_id: string }>(
      'SELECT category_id FROM representative_scope_categories WHERE scope_id = ?',
      [scope.id]
    );
    const territories = await db.getAllAsync<{ city_code: string }>(
      'SELECT city_code FROM representative_scope_territories WHERE scope_id = ?',
      [scope.id]
    );
    scopes.push({
      ...scope,
      categoryIds: categories.map((c) => c.category_id),
      cityCodes: territories.map((t) => t.city_code),
    });
  }
  return scopes;
}

export type CreateScopeData = {
  userId: string;
  organizationId?: string;
  brandId?: string | null;
  accessMode?: AccessMode;
  categoryIds?: string[];
  cityCodes?: string[];
};

/** Cria escopo padrão: acesso a todos os clientes da organização. */
export async function createRepresentativeScope(data: CreateScopeData): Promise<RepresentativeScope> {
  const db = await getDatabase();
  const now = new Date().toISOString();
  const id = generateId('scope');
  const organizationId = data.organizationId ?? DEFAULT_ORG_ID;
  const accessMode = data.accessMode ?? 'all_in_org';

  await db.runAsync(
    `INSERT INTO representative_scopes (id, user_id, organization_id, brand_id, access_mode, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [id, data.userId, organizationId, data.brandId ?? null, accessMode, now]
  );

  if (accessMode === 'by_category' && data.categoryIds?.length) {
    for (const categoryId of data.categoryIds) {
      await db.runAsync(
        'INSERT OR IGNORE INTO representative_scope_categories (scope_id, category_id) VALUES (?, ?)',
        [id, categoryId]
      );
    }
  }

  if (accessMode === 'by_territory' && data.cityCodes?.length) {
    for (const cityCode of data.cityCodes) {
      await db.runAsync(
        'INSERT OR IGNORE INTO representative_scope_territories (scope_id, city_code) VALUES (?, ?)',
        [id, cityCode]
      );
    }
  }

  const scopes = await getRepresentativeScopes(data.userId);
  const created = scopes.find((s) => s.id === id);
  if (!created) throw new Error('Falha ao criar escopo do representante');
  return created;
}

export async function ensureDefaultRepresentativeScope(userId: string): Promise<void> {
  const db = await getDatabase();
  const existing = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM representative_scopes WHERE user_id = ?',
    [userId]
  );
  if ((existing?.count ?? 0) > 0) return;
  await createRepresentativeScope({ userId, accessMode: 'all_in_org' });
}

/** Alinha escopo do representante às categorias vinculadas em user_categories. */
export async function syncRepresentativeScopeWithUserCategories(
  userId: string,
  categoryIds: string[]
): Promise<void> {
  const db = await getDatabase();
  const scope = await db.getFirstAsync<{ id: string }>(
    'SELECT id FROM representative_scopes WHERE user_id = ? ORDER BY created_at ASC LIMIT 1',
    [userId]
  );

  if (!scope) {
    await createRepresentativeScope({
      userId,
      accessMode: 'by_category',
      categoryIds,
    });
    return;
  }

  await db.runAsync('UPDATE representative_scopes SET access_mode = ? WHERE id = ?', [
    'by_category',
    scope.id,
  ]);
  await db.runAsync('DELETE FROM representative_scope_categories WHERE scope_id = ?', [scope.id]);

  for (const categoryId of categoryIds) {
    await db.runAsync(
      'INSERT OR IGNORE INTO representative_scope_categories (scope_id, category_id) VALUES (?, ?)',
      [scope.id, categoryId]
    );
  }
}
