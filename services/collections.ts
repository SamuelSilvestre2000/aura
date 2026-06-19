import { Collection, UserRole } from '../types';
import { queryVisibleCollections } from './access';
import { getGoalsMapForUser } from './collectionGoals';
import { getSalesTotalsMapForUser } from './sales';
import { getDatabase, generateId } from './database';
import { DEFAULT_BRAND_ID, getDefaultBrandId, getDefaultOrganizationId } from './organizations';

export type CreateCollectionInput = {
  name: string;
  startDate: string;
  endDate: string;
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
});

export async function listCollectionsForUser(userId: string, role: UserRole): Promise<Collection[]> {
  const rows = await queryVisibleCollections(userId, role);
  const collections = rows.map(ROW_TO_COLLECTION);
  const goals = await getGoalsMapForUser(userId);
  const salesTotals = await getSalesTotalsMapForUser(userId);
  return collections.map((c) => ({
    ...c,
    myGoalAmount: goals.get(c.id) ?? null,
    mySoldAmount: salesTotals.get(c.id) ?? 0,
  }));
}

export async function createCollection(input: CreateCollectionInput): Promise<Collection> {
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

  await db.runAsync(
    `INSERT INTO collections (
      id, name, created_at, is_active, organization_id, brand_id, start_date, end_date
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, name, now, 1, organizationId, brandId, input.startDate, input.endDate]
  );

  return {
    id,
    name,
    createdAt: now,
    isActive: 1,
    organizationId,
    brandId,
    startDate: input.startDate,
    endDate: input.endDate,
    myGoalAmount: null,
    mySoldAmount: 0,
  };
}

export async function deleteCollection(id: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM collections WHERE id = ?', [id]);
}

export { DEFAULT_BRAND_ID };
