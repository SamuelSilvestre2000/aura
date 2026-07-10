import { Client, UserRole } from '../../types';
import { stripCnpj } from '../../utils/cnpj';
import { generateId } from '../database';
import { getSupabase } from './client';
import { queryVisibleClientsRemote } from './access';
import { validateCategoryIdsForUserRemote } from './categories';
import { getDefaultBrandIdRemote, getDefaultOrganizationIdRemote } from './organizations';

type CreateClientRemoteData = Omit<
  Client,
  'id' | 'createdAt' | 'state' | 'organizationId' | 'categoryIds'
> & {
  categoryIds?: string[];
  organizationId?: string;
  brandId?: string | null;
};

type UpdateClientRemoteData = Partial<Omit<Client, 'id' | 'createdAt'>>;

type ClientActor = { userId: string; role: UserRole };

const ROW_TO_CLIENT = (row: any): Client => ({
  id: row.id,
  externalCode: row.external_code || undefined,
  cnpj: row.cnpj || undefined,
  name: row.name,
  tradeName: row.trade_name || undefined,
  legalName: row.legal_name || undefined,
  street: row.street || undefined,
  neighborhood: row.neighborhood || undefined,
  city: row.city,
  cityCode: row.city_code,
  state: row.state,
  zipCode: row.zip_code || undefined,
  lat: row.lat,
  lng: row.lng,
  phone: row.phone || undefined,
  mobile: row.mobile || undefined,
  email: row.email || undefined,
  notes: row.notes || undefined,
  clientGroup: row.client_group || undefined,
  createdAt: row.created_at,
  organizationId: row.organization_id ?? undefined,
  brandId: row.brand_id ?? undefined,
});

async function attachClientCategoriesRemote(client: Client): Promise<Client> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('client_categories')
    .select('category_id')
    .eq('client_id', client.id);
  if (error) throw new Error(error.message);
  return { ...client, categoryIds: (data ?? []).map((r) => r.category_id as string) };
}

async function buildClientCategoryMap(clientIds: string[]): Promise<Map<string, string[]>> {
  const map = new Map<string, string[]>();
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
      const list = map.get(row.client_id) ?? [];
      list.push(row.category_id);
      map.set(row.client_id, list);
    }
  }
  return map;
}

export async function listClientsForUserRemote(
  userId: string,
  role: UserRole
): Promise<Client[]> {
  const rows = await queryVisibleClientsRemote(userId, role);
  const clients = rows.map(ROW_TO_CLIENT);
  if (clients.length === 0) return [];

  const categoryMap = await buildClientCategoryMap(clients.map((c) => c.id));
  return clients.map((c) => ({ ...c, categoryIds: categoryMap.get(c.id) ?? [] }));
}

export async function getClientByIdRemote(id: string): Promise<Client | null> {
  const supabase = getSupabase();
  const { data, error } = await supabase.from('clients').select('*').eq('id', id).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  return attachClientCategoriesRemote(ROW_TO_CLIENT(data));
}

export async function createClientRemote(
  data: CreateClientRemoteData,
  actor?: ClientActor
): Promise<Client> {
  if (actor && data.categoryIds?.length) {
    await validateCategoryIdsForUserRemote(actor.userId, actor.role, data.categoryIds);
  }

  const supabase = getSupabase();
  const now = new Date().toISOString();
  const id = generateId('cli');
  const organizationId = data.organizationId ?? (await getDefaultOrganizationIdRemote());
  const brandId = data.brandId !== undefined ? data.brandId : await getDefaultBrandIdRemote();

  const { error: insertError } = await supabase.from('clients').insert({
    id,
    organization_id: organizationId,
    brand_id: brandId,
    external_code: data.externalCode ?? null,
    name: data.name,
    trade_name: data.tradeName ?? null,
    cnpj: data.cnpj ? stripCnpj(data.cnpj) : null,
    street: data.street ?? null,
    neighborhood: data.neighborhood ?? null,
    city: data.city,
    city_code: data.cityCode,
    state: 'PI',
    zip_code: data.zipCode ?? null,
    lat: data.lat,
    lng: data.lng,
    phone: data.phone ?? null,
    mobile: data.mobile ?? null,
    email: data.email ?? null,
    notes: data.notes ?? null,
    created_at: now,
  });
  if (insertError) throw new Error(insertError.message);

  if (data.categoryIds?.length) {
    const { error: catError } = await supabase
      .from('client_categories')
      .insert(data.categoryIds.map((categoryId) => ({ client_id: id, category_id: categoryId })));
    if (catError) throw new Error(catError.message);
  }

  const client = await getClientByIdRemote(id);
  if (!client) throw new Error('Falha ao criar cliente');
  return client;
}

export async function updateClientRemote(
  id: string,
  data: UpdateClientRemoteData,
  actor?: ClientActor
): Promise<void> {
  if (actor && data.categoryIds?.length) {
    await validateCategoryIdsForUserRemote(actor.userId, actor.role, data.categoryIds);
  }

  const supabase = getSupabase();
  const patch: Record<string, unknown> = {};

  if (data.name !== undefined) patch.name = data.name;
  if (data.cnpj !== undefined) patch.cnpj = data.cnpj ? stripCnpj(data.cnpj) : null;
  if (data.city !== undefined) patch.city = data.city;
  if (data.cityCode !== undefined) patch.city_code = data.cityCode;
  if (data.lat !== undefined) patch.lat = data.lat;
  if (data.lng !== undefined) patch.lng = data.lng;
  if (data.phone !== undefined) patch.phone = data.phone;
  if (data.notes !== undefined) patch.notes = data.notes;
  if (data.brandId !== undefined) patch.brand_id = data.brandId;
  if (data.organizationId !== undefined) patch.organization_id = data.organizationId;

  if (Object.keys(patch).length > 0) {
    const { error } = await supabase.from('clients').update(patch).eq('id', id);
    if (error) throw new Error(error.message);
  }

  if (data.categoryIds !== undefined) {
    await setClientCategoriesRemote(id, data.categoryIds);
  }
}

export async function deleteClientRemote(id: string): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase.from('clients').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

export async function setClientCategoriesRemote(
  clientId: string,
  categoryIds: string[]
): Promise<void> {
  const supabase = getSupabase();
  const { error: deleteError } = await supabase
    .from('client_categories')
    .delete()
    .eq('client_id', clientId);
  if (deleteError) throw new Error(deleteError.message);

  if (categoryIds.length === 0) return;

  const { error: insertError } = await supabase
    .from('client_categories')
    .insert(categoryIds.map((categoryId) => ({ client_id: clientId, category_id: categoryId })));
  if (insertError) throw new Error(insertError.message);
}
