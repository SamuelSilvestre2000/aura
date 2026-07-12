import { Collection, UserRole } from '../../types';
import { CategoryFilterValue } from '../../utils/categoryFilter';
import { generateId } from '../database';
import { GOAL_CATEGORY_ALL, GoalInput, resolveGoalAmount } from '../collectionGoals';
import { getSupabase } from './client';
import { queryVisibleCollectionsRemote } from './access';
import { getAllowedCategoriesForUserRemote, validateCategoryIdsForUserRemote, validateOptionalCategoryForUserRemote } from './categories';
import { getGoalsMapForUserRemote, setGoalsForUserRemote } from './collectionGoals';
import { getSalesTotalsMapForUserRemote } from './sales';
import { getDefaultBrandIdRemote, getDefaultOrganizationIdRemote } from './organizations';

export type CreateCollectionRemoteInput = {
  name: string;
  startDate: string;
  endDate: string;
  categoryId?: string | null;
  goals?: GoalInput[];
  userId?: string;
  userRole?: UserRole;
  /** Marca esta coleção como a vigente, desmarcando qualquer outra. */
  isVigente?: boolean;
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
  isVigente: !!row.is_vigente,
});

export async function listCollectionsForUserRemote(
  userId: string,
  role: UserRole,
  viewCategoryFilter: CategoryFilterValue = 'all'
): Promise<Collection[]> {
  const rows = await queryVisibleCollectionsRemote(userId, role);
  const collections = rows.map(ROW_TO_COLLECTION);
  const goals = await getGoalsMapForUserRemote(userId);
  const allCategories = await getAllowedCategoriesForUserRemote(userId, role);
  const salesTotals = await getSalesTotalsMapForUserRemote(userId, viewCategoryFilter);
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

export async function createCollectionRemote(
  input: CreateCollectionRemoteInput
): Promise<Collection> {
  const name = input.name.trim();
  if (!name) throw new Error('Informe o nome da coleção');
  if (!input.startDate || !input.endDate) throw new Error('Informe o período da coleção');
  if (input.endDate < input.startDate) {
    throw new Error('A data final deve ser igual ou posterior à data inicial');
  }

  const supabase = getSupabase();
  const now = new Date().toISOString();
  const id = generateId('col');
  const organizationId = await getDefaultOrganizationIdRemote();
  const brandId = await getDefaultBrandIdRemote();
  const categoryId = input.categoryId ?? null;

  if (input.userId) {
    const role: UserRole = input.userRole ?? 'representative';
    await validateOptionalCategoryForUserRemote(input.userId, role, categoryId);
    if (input.goals?.length) {
      await validateCategoryIdsForUserRemote(
        input.userId,
        role,
        input.goals.map((g) => g.categoryId)
      );
    }
  }

  const isVigente = input.isVigente ?? false;
  if (isVigente) {
    const { error: clearError } = await supabase
      .from('collections')
      .update({ is_vigente: false })
      .eq('organization_id', organizationId)
      .eq('is_vigente', true);
    if (clearError) throw new Error(clearError.message);
  }

  const { error } = await supabase.from('collections').insert({
    id,
    name,
    created_at: now,
    is_active: 1,
    organization_id: organizationId,
    brand_id: brandId,
    start_date: input.startDate,
    end_date: input.endDate,
    category_id: categoryId,
    is_vigente: isVigente,
  });
  if (error) throw new Error(error.message);

  if (input.userId && input.goals?.length) {
    await setGoalsForUserRemote(id, input.userId, input.goals);
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
    isVigente,
    myGoalAmount: null,
    mySoldAmount: 0,
  };
}

export async function closeCollectionRemote(id: string): Promise<void> {
  const supabase = getSupabase();
  const { data: row, error: fetchError } = await supabase
    .from('collections')
    .select('is_active')
    .eq('id', id)
    .maybeSingle();
  if (fetchError) throw new Error(fetchError.message);
  if (!row) throw new Error('Coleção não encontrada');
  if (row.is_active === 0) throw new Error('Coleção já está fechada');

  const { error } = await supabase.from('collections').update({ is_active: 0 }).eq('id', id);
  if (error) throw new Error(error.message);
}

export async function setCollectionVigenteRemote(id: string, isVigente: boolean): Promise<void> {
  const supabase = getSupabase();
  const { data: row, error: fetchError } = await supabase
    .from('collections')
    .select('organization_id, is_active')
    .eq('id', id)
    .maybeSingle();
  if (fetchError) throw new Error(fetchError.message);
  if (!row) throw new Error('Coleção não encontrada');
  if (isVigente && row.is_active === 0) {
    throw new Error('Não é possível marcar uma coleção fechada como vigente');
  }

  if (isVigente) {
    const { error: clearError } = await supabase
      .from('collections')
      .update({ is_vigente: false })
      .eq('organization_id', row.organization_id)
      .eq('is_vigente', true);
    if (clearError) throw new Error(clearError.message);
  }

  const { error } = await supabase.from('collections').update({ is_vigente: isVigente }).eq('id', id);
  if (error) throw new Error(error.message);
}

export async function deleteCollectionRemote(id: string): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase.from('collections').delete().eq('id', id);
  if (error) throw new Error(error.message);
}
