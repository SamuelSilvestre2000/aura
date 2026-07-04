import { AccessMode, RepresentativeScope } from '../../types';
import { DEFAULT_ORG_ID } from '../../constants/organizations';
import { generateId } from '../database';
import { getSupabase } from './client';

type DbScopeRow = {
  id: string;
  user_id: string;
  organization_id: string;
  brand_id: string | null;
  access_mode: AccessMode;
  created_at: string;
};

const ROW_TO_SCOPE = (row: DbScopeRow): RepresentativeScope => ({
  id: row.id,
  userId: row.user_id,
  organizationId: row.organization_id,
  brandId: row.brand_id,
  accessMode: row.access_mode,
  createdAt: row.created_at,
});

export async function getRepresentativeScopesRemote(
  userId: string
): Promise<RepresentativeScope[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('representative_scopes')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });
  if (error) throw new Error(error.message);

  const rows = (data ?? []) as DbScopeRow[];
  const scopes: RepresentativeScope[] = [];
  for (const row of rows) {
    const scope = ROW_TO_SCOPE(row);
    const [{ data: categories, error: catError }, { data: territories, error: terrError }] =
      await Promise.all([
        supabase
          .from('representative_scope_categories')
          .select('category_id')
          .eq('scope_id', scope.id),
        supabase
          .from('representative_scope_territories')
          .select('city_code')
          .eq('scope_id', scope.id),
      ]);
    if (catError) throw new Error(catError.message);
    if (terrError) throw new Error(terrError.message);

    scopes.push({
      ...scope,
      categoryIds: (categories ?? []).map((c) => c.category_id as string),
      cityCodes: (territories ?? []).map((t) => t.city_code as string),
    });
  }
  return scopes;
}

export type CreateScopeRemoteData = {
  userId: string;
  organizationId?: string;
  brandId?: string | null;
  accessMode?: AccessMode;
  categoryIds?: string[];
  cityCodes?: string[];
};

export async function createRepresentativeScopeRemote(
  data: CreateScopeRemoteData
): Promise<RepresentativeScope> {
  const supabase = getSupabase();
  const now = new Date().toISOString();
  const id = generateId('scope');
  const organizationId = data.organizationId ?? DEFAULT_ORG_ID;
  const accessMode = data.accessMode ?? 'all_in_org';

  const { error: scopeError } = await supabase.from('representative_scopes').insert({
    id,
    user_id: data.userId,
    organization_id: organizationId,
    brand_id: data.brandId ?? null,
    access_mode: accessMode,
    created_at: now,
  });
  if (scopeError) throw new Error(scopeError.message);

  if (accessMode === 'by_category' && data.categoryIds?.length) {
    const { error } = await supabase
      .from('representative_scope_categories')
      .insert(data.categoryIds.map((categoryId) => ({ scope_id: id, category_id: categoryId })));
    if (error) throw new Error(error.message);
  }

  if (accessMode === 'by_territory' && data.cityCodes?.length) {
    const { error } = await supabase
      .from('representative_scope_territories')
      .insert(data.cityCodes.map((cityCode) => ({ scope_id: id, city_code: cityCode })));
    if (error) throw new Error(error.message);
  }

  const scopes = await getRepresentativeScopesRemote(data.userId);
  const created = scopes.find((s) => s.id === id);
  if (!created) throw new Error('Falha ao criar escopo do representante');
  return created;
}

export async function ensureDefaultRepresentativeScopeRemote(userId: string): Promise<void> {
  const supabase = getSupabase();
  const { count, error } = await supabase
    .from('representative_scopes')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId);
  if (error) throw new Error(error.message);
  if ((count ?? 0) > 0) return;
  await createRepresentativeScopeRemote({ userId, accessMode: 'all_in_org' });
}

export async function syncRepresentativeScopeWithUserCategoriesRemote(
  userId: string,
  categoryIds: string[]
): Promise<void> {
  const supabase = getSupabase();
  const { data: scopeRow, error: scopeError } = await supabase
    .from('representative_scopes')
    .select('id')
    .eq('user_id', userId)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();
  if (scopeError) throw new Error(scopeError.message);

  if (!scopeRow) {
    await createRepresentativeScopeRemote({ userId, accessMode: 'by_category', categoryIds });
    return;
  }

  const { error: updateError } = await supabase
    .from('representative_scopes')
    .update({ access_mode: 'by_category' })
    .eq('id', scopeRow.id);
  if (updateError) throw new Error(updateError.message);

  const { error: deleteError } = await supabase
    .from('representative_scope_categories')
    .delete()
    .eq('scope_id', scopeRow.id);
  if (deleteError) throw new Error(deleteError.message);

  if (categoryIds.length > 0) {
    const { error: insertError } = await supabase
      .from('representative_scope_categories')
      .insert(categoryIds.map((categoryId) => ({ scope_id: scopeRow.id, category_id: categoryId })));
    if (insertError) throw new Error(insertError.message);
  }
}
