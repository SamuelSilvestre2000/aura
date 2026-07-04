import { Purchase, Sale } from '../../types';
import { generateId } from '../database';
import { getSupabase } from './client';

export type RecordSaleRemoteInput = {
  clientId: string;
  collectionId: string;
  userId: string;
  amount: number;
  soldAt?: string;
};

const ROW_TO_SALE = (row: {
  id: string;
  client_id: string;
  collection_id: string;
  user_id: string;
  amount: number;
  sold_at: string;
  created_at: string;
}): Sale => ({
  id: row.id,
  clientId: row.client_id,
  collectionId: row.collection_id,
  userId: row.user_id,
  amount: row.amount,
  soldAt: row.sold_at,
  createdAt: row.created_at,
});

async function syncPurchaseFlagRemote(
  clientId: string,
  collectionId: string,
  purchased: boolean,
  purchasedAt: string | null
): Promise<void> {
  const supabase = getSupabase();
  const { data: existing, error: fetchError } = await supabase
    .from('purchases')
    .select('id')
    .eq('client_id', clientId)
    .eq('collection_id', collectionId)
    .maybeSingle();
  if (fetchError) throw new Error(fetchError.message);

  if (existing) {
    const { error } = await supabase
      .from('purchases')
      .update({ purchased: purchased ? 1 : 0, purchased_at: purchasedAt })
      .eq('id', existing.id);
    if (error) throw new Error(error.message);
    return;
  }

  if (!purchased) return;

  const id = generateId('pur');
  const { error } = await supabase.from('purchases').insert({
    id,
    client_id: clientId,
    collection_id: collectionId,
    purchased: 1,
    purchased_at: purchasedAt,
  });
  if (error) throw new Error(error.message);
}

export async function listSalesRemote(): Promise<Sale[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('sales')
    .select('*')
    .order('sold_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map(ROW_TO_SALE);
}

export async function listPurchasesRemote(): Promise<Purchase[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase.from('purchases').select('*');
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => ({
    id: row.id,
    clientId: row.client_id,
    collectionId: row.collection_id,
    purchased: row.purchased,
    purchasedAt: row.purchased_at || undefined,
  }));
}

export async function getSaleForClientCollectionRemote(
  clientId: string,
  collectionId: string
): Promise<Sale | null> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('sales')
    .select('*')
    .eq('client_id', clientId)
    .eq('collection_id', collectionId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? ROW_TO_SALE(data) : null;
}

export async function getSalesTotalsMapForUserRemote(
  userId: string,
  categoryFilter: string = 'all'
): Promise<Map<string, number>> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('sales')
    .select('collection_id, amount, client_id')
    .eq('user_id', userId);
  if (error) throw new Error(error.message);
  const rows = data ?? [];

  let allowedClientIds: Set<string> | null = null;
  if (categoryFilter !== 'all' && rows.length > 0) {
    const clientIds = [...new Set(rows.map((r) => r.client_id as string))];
    const { data: catRows, error: catError } = await supabase
      .from('client_categories')
      .select('client_id')
      .eq('category_id', categoryFilter)
      .in('client_id', clientIds);
    if (catError) throw new Error(catError.message);
    allowedClientIds = new Set((catRows ?? []).map((r) => r.client_id as string));
  }

  const map = new Map<string, number>();
  for (const row of rows) {
    if (allowedClientIds && !allowedClientIds.has(row.client_id as string)) continue;
    map.set(row.collection_id, (map.get(row.collection_id) ?? 0) + Number(row.amount));
  }
  return map;
}

export async function getSalesTotalForUserAndCollectionRemote(
  userId: string,
  collectionId: string
): Promise<number> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('sales')
    .select('amount')
    .eq('user_id', userId)
    .eq('collection_id', collectionId);
  if (error) throw new Error(error.message);
  return (data ?? []).reduce((sum, row) => sum + Number(row.amount), 0);
}

export async function recordSaleRemote(input: RecordSaleRemoteInput): Promise<Sale> {
  if (input.amount <= 0) {
    throw new Error('Informe um valor de compra maior que zero');
  }

  const supabase = getSupabase();
  const now = new Date().toISOString();
  const soldAt = input.soldAt ?? now;

  const { data: existing, error: fetchError } = await supabase
    .from('sales')
    .select('id')
    .eq('client_id', input.clientId)
    .eq('collection_id', input.collectionId)
    .maybeSingle();
  if (fetchError) throw new Error(fetchError.message);

  let saleId: string;
  if (existing) {
    const { error } = await supabase
      .from('sales')
      .update({ user_id: input.userId, amount: input.amount, sold_at: soldAt })
      .eq('id', existing.id);
    if (error) throw new Error(error.message);
    saleId = existing.id;
  } else {
    saleId = generateId('sale');
    const { error } = await supabase.from('sales').insert({
      id: saleId,
      client_id: input.clientId,
      collection_id: input.collectionId,
      user_id: input.userId,
      amount: input.amount,
      sold_at: soldAt,
      created_at: now,
    });
    if (error) throw new Error(error.message);
  }

  await syncPurchaseFlagRemote(input.clientId, input.collectionId, true, soldAt);

  const { data: row, error: getError } = await supabase
    .from('sales')
    .select('*')
    .eq('id', saleId)
    .single();
  if (getError) throw new Error(getError.message);
  return ROW_TO_SALE(row);
}

export async function clearSaleRemote(clientId: string, collectionId: string): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase
    .from('sales')
    .delete()
    .eq('client_id', clientId)
    .eq('collection_id', collectionId);
  if (error) throw new Error(error.message);
  await syncPurchaseFlagRemote(clientId, collectionId, false, null);
}
