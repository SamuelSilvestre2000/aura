import { Category, UserRole } from '../../types';
import { DEFAULT_ORG_ID } from '../../constants/organizations';
import { getSupabase } from './client';

type DbCategoryRow = {
  id: string;
  name: string;
  slug: string;
  organization_id: string | null;
  dimension_id: string | null;
};

const ROW_TO_CATEGORY = (row: DbCategoryRow): Category => ({
  id: row.id,
  name: row.name,
  slug: row.slug,
  organizationId: row.organization_id ?? undefined,
  dimensionId: row.dimension_id ?? undefined,
});

export async function listCategoriesRemote(
  organizationId: string = DEFAULT_ORG_ID
): Promise<Category[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .or(`organization_id.eq.${organizationId},organization_id.is.null`)
    .order('name', { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []).map(ROW_TO_CATEGORY);
}

export async function getCategoriesByUserIdRemote(userId: string): Promise<Category[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('user_categories')
    .select('categories(id, name, slug, organization_id, dimension_id)')
    .eq('user_id', userId);
  if (error) throw new Error(error.message);

  const rows = (data ?? []).flatMap((row) => {
    const cat = row.categories as DbCategoryRow | DbCategoryRow[] | null;
    if (!cat) return [];
    return Array.isArray(cat) ? cat : [cat];
  });
  return rows.map(ROW_TO_CATEGORY).sort((a, b) => a.name.localeCompare(b.name));
}

export async function getAllowedCategoriesForUserRemote(
  userId: string,
  role: UserRole
): Promise<Category[]> {
  if (role === 'admin') return listCategoriesRemote();
  return getCategoriesByUserIdRemote(userId);
}

export async function validateCategoryIdsForUserRemote(
  userId: string,
  role: UserRole,
  categoryIds: string[]
): Promise<void> {
  if (role === 'admin' || categoryIds.length === 0) return;

  const allowed = await getCategoriesByUserIdRemote(userId);
  const allowedSet = new Set(allowed.map((c) => c.id));

  for (const categoryId of categoryIds) {
    if (!allowedSet.has(categoryId)) {
      throw new Error('Você não tem permissão para usar esta categoria');
    }
  }
}

export async function validateOptionalCategoryForUserRemote(
  userId: string,
  role: UserRole,
  categoryId: string | null | undefined
): Promise<void> {
  if (role === 'admin') return;

  if (categoryId == null) {
    const allowed = await getCategoriesByUserIdRemote(userId);
    if (allowed.length < 2) {
      throw new Error('Selecione a categoria da coleção');
    }
    return;
  }

  await validateCategoryIdsForUserRemote(userId, role, [categoryId]);
}

export async function setUserCategoriesRemote(
  userId: string,
  categoryIds: string[]
): Promise<void> {
  const supabase = getSupabase();
  const uniqueIds = [...new Set(categoryIds)];

  const { error: deleteError } = await supabase
    .from('user_categories')
    .delete()
    .eq('user_id', userId);
  if (deleteError) throw new Error(deleteError.message);

  if (uniqueIds.length === 0) return;

  const { error: insertError } = await supabase
    .from('user_categories')
    .insert(uniqueIds.map((categoryId) => ({ user_id: userId, category_id: categoryId })));
  if (insertError) throw new Error(insertError.message);
}
