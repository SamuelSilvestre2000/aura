import { UserRole } from '../../types';
import { getSupabase } from './client';
import { getRepresentativeScopesRemote } from './scopes';
import { getUserOrganizationIdsRemote } from './organizations';

/**
 * Replica em JS a lógica de `services/access.ts` (SQL local), já que a RLS do
 * Supabase (migração 001) só isola por organização, não pelo escopo fino do
 * representante (categoria/território/atribuição).
 */

async function getUserCategoryIds(userId: string): Promise<Set<string>> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('user_categories')
    .select('category_id')
    .eq('user_id', userId);
  if (error) throw new Error(error.message);
  return new Set((data ?? []).map((row) => row.category_id as string));
}

async function getClientCategoryMap(clientIds: string[]): Promise<Map<string, Set<string>>> {
  const map = new Map<string, Set<string>>();
  if (clientIds.length === 0) return map;

  const supabase = getSupabase();
  const CHUNK_SIZE = 400;
  for (let i = 0; i < clientIds.length; i += CHUNK_SIZE) {
    const chunk = clientIds.slice(i, i + CHUNK_SIZE);
    const { data, error } = await supabase
      .from('client_categories')
      .select('client_id, category_id')
      .in('client_id', chunk);
    if (error) throw new Error(error.message);
    for (const row of data ?? []) {
      const set = map.get(row.client_id) ?? new Set<string>();
      set.add(row.category_id);
      map.set(row.client_id, set);
    }
  }
  return map;
}

async function getActiveAssignedClientIds(userId: string): Promise<Set<string>> {
  const supabase = getSupabase();
  const nowIso = new Date().toISOString();
  const { data, error } = await supabase
    .from('client_assignments')
    .select('client_id, valid_to')
    .eq('user_id', userId);
  if (error) throw new Error(error.message);

  const set = new Set<string>();
  for (const row of data ?? []) {
    if (!row.valid_to || row.valid_to >= nowIso) set.add(row.client_id);
  }
  return set;
}

export async function queryVisibleClientsRemote(userId: string, role: UserRole): Promise<any[]> {
  const supabase = getSupabase();

  if (role === 'admin') {
    const orgIds = await getUserOrganizationIdsRemote(userId);
    if (orgIds.length === 0) return [];
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .in('organization_id', orgIds)
      .order('name', { ascending: true });
    if (error) throw new Error(error.message);
    return data ?? [];
  }

  const scopes = await getRepresentativeScopesRemote(userId);
  if (scopes.length === 0) return [];

  const orgIds = [...new Set(scopes.map((s) => s.organizationId))];
  const { data, error } = await supabase.from('clients').select('*').in('organization_id', orgIds);
  if (error) throw new Error(error.message);
  const clients = (data ?? []) as any[];
  if (clients.length === 0) return [];

  const userCategoryIds = await getUserCategoryIds(userId);
  const clientCategoryMap = await getClientCategoryMap(clients.map((c) => c.id));
  const needsAssignment = scopes.some((s) => s.accessMode === 'by_assignment');
  const assignedClientIds = needsAssignment
    ? await getActiveAssignedClientIds(userId)
    : new Set<string>();

  const visible = clients.filter((client) => {
    const clientCategories = clientCategoryMap.get(client.id) ?? new Set<string>();
    const intersectsUserCategories = [...clientCategories].some((id) => userCategoryIds.has(id));
    if (!intersectsUserCategories) return false;

    return scopes.some((scope) => {
      if (scope.organizationId !== client.organization_id) return false;
      if (scope.brandId != null && scope.brandId !== client.brand_id) return false;

      switch (scope.accessMode) {
        case 'all_in_org':
          return true;
        case 'by_category':
          return (scope.categoryIds ?? []).some((id) => clientCategories.has(id));
        case 'by_territory':
          return (scope.cityCodes ?? []).includes(client.city_code);
        case 'by_assignment':
          return assignedClientIds.has(client.id);
        default:
          return false;
      }
    });
  });

  visible.sort((a, b) => String(a.name).localeCompare(String(b.name)));
  return visible;
}

export async function queryVisibleCollectionsRemote(
  userId: string,
  role: UserRole
): Promise<any[]> {
  const supabase = getSupabase();

  if (role === 'admin') {
    const orgIds = await getUserOrganizationIdsRemote(userId);
    if (orgIds.length === 0) return [];
    const { data, error } = await supabase
      .from('collections')
      .select('*')
      .in('organization_id', orgIds)
      .order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  }

  const scopes = await getRepresentativeScopesRemote(userId);
  if (scopes.length === 0) return [];

  const orgIds = [...new Set(scopes.map((s) => s.organizationId))];
  const { data, error } = await supabase
    .from('collections')
    .select('*')
    .in('organization_id', orgIds)
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  const collections = (data ?? []) as any[];
  if (collections.length === 0) return [];

  const userCategoryIds = await getUserCategoryIds(userId);
  const hasNullBrandScope = scopes.some((s) => s.brandId == null);
  const scopedBrandIds = new Set(
    scopes.filter((s) => s.brandId != null).map((s) => s.brandId as string)
  );

  return collections.filter((col) => {
    const brandOk = col.brand_id == null || hasNullBrandScope || scopedBrandIds.has(col.brand_id);
    if (!brandOk) return false;
    return col.category_id == null || userCategoryIds.has(col.category_id);
  });
}

export async function canUserAccessClientRemote(
  userId: string,
  role: UserRole,
  clientId: string
): Promise<boolean> {
  const rows = await queryVisibleClientsRemote(userId, role);
  return rows.some((r) => r.id === clientId);
}

export async function canUserAccessCollectionRemote(
  userId: string,
  role: UserRole,
  collectionId: string
): Promise<boolean> {
  const rows = await queryVisibleCollectionsRemote(userId, role);
  return rows.some((r) => r.id === collectionId);
}
