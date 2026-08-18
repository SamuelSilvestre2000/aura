import { CollectionType } from '../types';
import { DEFAULT_ORG_ID } from '../constants/organizations';
import { getDatabase } from './database';
import { isSupabaseConfigured } from './supabase/client';
import { listCollectionTypesRemote } from './supabase/collectionTypes';

const ROW_TO_COLLECTION_TYPE = (row: any): CollectionType => ({
  id: row.id,
  name: row.name,
  slug: row.slug,
  sortOrder: row.sort_order,
  organizationId: row.organization_id ?? undefined,
  createdAt: row.created_at,
});

export async function listCollectionTypes(
  organizationId: string = DEFAULT_ORG_ID
): Promise<CollectionType[]> {
  if (isSupabaseConfigured()) return listCollectionTypesRemote(organizationId);

  const db = await getDatabase();
  const rows = await db.getAllAsync<any>(
    `SELECT * FROM collection_types
     WHERE organization_id = ? OR organization_id IS NULL
     ORDER BY sort_order ASC`,
    [organizationId]
  );
  return rows.map(ROW_TO_COLLECTION_TYPE);
}
