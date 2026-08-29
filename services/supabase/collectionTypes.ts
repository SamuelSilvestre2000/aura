import { CollectionType } from '../../types';
import { DEFAULT_ORG_ID } from '../../constants/organizations';
import { getSupabase } from './client';

type DbCollectionTypeRow = {
  id: string;
  name: string;
  slug: string;
  sort_order: number;
  organization_id: string | null;
  created_at: string;
};

const ROW_TO_COLLECTION_TYPE = (row: DbCollectionTypeRow): CollectionType => ({
  id: row.id,
  name: row.name,
  slug: row.slug,
  sortOrder: row.sort_order,
  organizationId: row.organization_id ?? undefined,
  createdAt: row.created_at,
});

export async function listCollectionTypesRemote(
  organizationId: string = DEFAULT_ORG_ID
): Promise<CollectionType[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('collection_types')
    .select('*')
    .or(`organization_id.eq.${organizationId},organization_id.is.null`)
    .order('sort_order', { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []).map(ROW_TO_COLLECTION_TYPE);
}
