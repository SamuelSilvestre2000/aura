import { Collection, UserRole } from '../types';
import { queryVisibleCollections } from './access';
import {
  getGoalsMapForUser,
  GOAL_CATEGORY_ALL,
  resolveGoalAmount,
  setGoalsForUser,
  GoalInput,
} from './collectionGoals';
import { listCategories, getAllowedCategoriesForUser, validateCategoryIdsForUser, validateOptionalCategoryForUser } from './categories';
import { getSalesTotalsMapForUser } from './sales';
import { getDatabase, generateId } from './database';
import { isSupabaseConfigured } from './supabase/client';
import {
  closeCollectionRemote,
  createCollectionRemote,
  deleteCollectionRemote,
  listCollectionsForUserRemote,
} from './supabase/collections';
import { DEFAULT_BRAND_ID, getDefaultBrandId, getDefaultOrganizationId } from './organizations';
import { CategoryFilterValue } from '../utils/categoryFilter';

export type CreateCollectionInput = {
  name: string;
  startDate: string;
  endDate: string;
  categoryId?: string | null;
  /** Metas do usuário que está criando, uma por categoria. */
  goals?: GoalInput[];
  userId?: string;
  userRole?: UserRole;
};

const ROW_TO_COLLECTION = (row: any): Collection => ({
  id: row.id,
  name: row.name,
  createdAt: row.created_at,
  isActive: row.is_active,
  organizationId: row.organization_id ?? undefined,
  brandId: row.brand_id ?? undefined,
  startDate: row.start_date ?? undefined,
  endDate: row.end_date ?? undefined,
  categoryId: row.category_id ?? null,
});

export async function listCollectionsForUser(
  userId: string,
  role: UserRole,
  viewCategoryFilter: CategoryFilterValue = 'all'
): Promise<Collection[]> {
  if (isSupabaseConfigured()) {
    return listCollectionsForUserRemote(userId, role, viewCategoryFilter);
  }

  const rows = await queryVisibleCollections(userId, role);
  const collections = rows.map(ROW_TO_COLLECTION);
  const goals = await getGoalsMapForUser(userId);
  const allCategories = await getAllowedCategoriesForUser(userId, role);
  const salesTotals = await getSalesTotalsMapForUser(userId, viewCategoryFilter);
  return collections.map((c) => ({
    ...c,
    myGoalAmount: resolveGoalAmount(
      goals,
      c.id,
      c.categoryId,
      viewCategoryFilter === 'all' ? GOAL_CATEGORY_ALL : viewCategoryFilter,
      allCategories
    ),
    mySoldAmount: salesTotals.get(c.id) ?? 0,
  }));
}

export async function createCollection(input: CreateCollectionInput): Promise<Collection> {
  if (isSupabaseConfigured()) return createCollectionRemote(input);

  const name = input.name.trim();
  if (!name) throw new Error('Informe o nome da coleção');
  if (!input.startDate || !input.endDate) throw new Error('Informe o período da coleção');
  if (input.endDate < input.startDate) {
    throw new Error('A data final deve ser igual ou posterior à data inicial');
  }

  const db = await getDatabase();
  const now = new Date().toISOString();
  const id = generateId('col');
  const organizationId = await getDefaultOrganizationId();
  const brandId = await getDefaultBrandId();
  const categoryId = input.categoryId ?? null;

  if (input.userId) {
    const role: UserRole = input.userRole ?? 'representative';
    await validateOptionalCategoryForUser(input.userId, role, categoryId);
    if (input.goals?.length) {
      await validateCategoryIdsForUser(
        input.userId,
        role,
        input.goals.map((g) => g.categoryId)
      );
    }
  }

  await db.runAsync(
    `INSERT INTO collections (
      id, name, created_at, is_active, organization_id, brand_id, start_date, end_date, category_id
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, name, now, 1, organizationId, brandId, input.startDate, input.endDate, categoryId]
  );

  if (input.userId && input.goals?.length) {
    await setGoalsForUser(id, input.userId, input.goals);
  }

  return {
    id,
    name,
    createdAt: now,
    isActive: 1,
    organizationId,
    brandId,
    startDate: input.startDate,
    endDate: input.endDate,
    categoryId,
    myGoalAmount: null,
    mySoldAmount: 0,
  };
}

export async function closeCollection(id: string): Promise<void> {
  if (isSupabaseConfigured()) return closeCollectionRemote(id);

  const db = await getDatabase();
  const row = await db.getFirstAsync<{ is_active: number }>(
    'SELECT is_active FROM collections WHERE id = ?',
    [id]
  );
  if (!row) throw new Error('Coleção não encontrada');
  if (row.is_active === 0) throw new Error('Coleção já está fechada');
  await db.runAsync('UPDATE collections SET is_active = 0 WHERE id = ?', [id]);
}

export async function deleteCollection(id: string): Promise<void> {
  if (isSupabaseConfigured()) return deleteCollectionRemote(id);

  const db = await getDatabase();
  await db.runAsync('DELETE FROM collections WHERE id = ?', [id]);
}

export { DEFAULT_BRAND_ID, GOAL_CATEGORY_ALL };
