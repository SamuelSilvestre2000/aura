import { Sale } from '../types';
import { getDatabase, generateId } from './database';

export type RecordSaleInput = {
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

async function syncPurchaseFlag(
  clientId: string,
  collectionId: string,
  purchased: boolean,
  purchasedAt: string | null
): Promise<void> {
  const db = await getDatabase();
  const existing = await db.getFirstAsync<{ id: string }>(
    'SELECT id FROM purchases WHERE client_id = ? AND collection_id = ?',
    [clientId, collectionId]
  );

  if (existing) {
    await db.runAsync(
      'UPDATE purchases SET purchased = ?, purchased_at = ? WHERE id = ?',
      [purchased ? 1 : 0, purchasedAt, existing.id]
    );
    return;
  }

  if (!purchased) return;

  const id = generateId('pur');
  await db.runAsync(
    'INSERT INTO purchases (id, client_id, collection_id, purchased, purchased_at) VALUES (?, ?, ?, ?, ?)',
    [id, clientId, collectionId, 1, purchasedAt]
  );
}

export async function listSales(): Promise<Sale[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<{
    id: string;
    client_id: string;
    collection_id: string;
    user_id: string;
    amount: number;
    sold_at: string;
    created_at: string;
  }>('SELECT * FROM sales ORDER BY sold_at DESC');
  return rows.map(ROW_TO_SALE);
}

export async function getSaleForClientCollection(
  clientId: string,
  collectionId: string
): Promise<Sale | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{
    id: string;
    client_id: string;
    collection_id: string;
    user_id: string;
    amount: number;
    sold_at: string;
    created_at: string;
  }>(
    'SELECT * FROM sales WHERE client_id = ? AND collection_id = ?',
    [clientId, collectionId]
  );
  return row ? ROW_TO_SALE(row) : null;
}

export async function getSalesTotalsMapForUser(
  userId: string,
  categoryFilter: string = 'all'
): Promise<Map<string, number>> {
  const db = await getDatabase();
  const rows =
    categoryFilter === 'all'
      ? await db.getAllAsync<{ collection_id: string; total: number }>(
          `SELECT collection_id, COALESCE(SUM(amount), 0) as total
           FROM sales WHERE user_id = ?
           GROUP BY collection_id`,
          [userId]
        )
      : await db.getAllAsync<{ collection_id: string; total: number }>(
          `SELECT s.collection_id, COALESCE(SUM(s.amount), 0) as total
           FROM sales s
           INNER JOIN client_categories cc ON cc.client_id = s.client_id
           WHERE s.user_id = ? AND cc.category_id = ?
           GROUP BY s.collection_id`,
          [userId, categoryFilter]
        );
  const map = new Map<string, number>();
  for (const row of rows) {
    map.set(row.collection_id, row.total);
  }
  return map;
}

export async function getSalesTotalForUserAndCollection(
  userId: string,
  collectionId: string
): Promise<number> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ total: number }>(
    `SELECT COALESCE(SUM(amount), 0) as total
     FROM sales WHERE user_id = ? AND collection_id = ?`,
    [userId, collectionId]
  );
  return row?.total ?? 0;
}

export async function recordSale(input: RecordSaleInput): Promise<Sale> {
  if (input.amount <= 0) {
    throw new Error('Informe um valor de compra maior que zero');
  }

  const db = await getDatabase();
  const now = new Date().toISOString();
  const soldAt = input.soldAt ?? now;

  const existing = await db.getFirstAsync<{ id: string }>(
    'SELECT id FROM sales WHERE client_id = ? AND collection_id = ?',
    [input.clientId, input.collectionId]
  );

  if (existing) {
    await db.runAsync(
      `UPDATE sales SET user_id = ?, amount = ?, sold_at = ? WHERE id = ?`,
      [input.userId, input.amount, soldAt, existing.id]
    );
    await syncPurchaseFlag(input.clientId, input.collectionId, true, soldAt);
    const row = await db.getFirstAsync<any>('SELECT * FROM sales WHERE id = ?', [existing.id]);
    return ROW_TO_SALE(row);
  }

  const id = generateId('sale');
  await db.runAsync(
    `INSERT INTO sales (id, client_id, collection_id, user_id, amount, sold_at, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [id, input.clientId, input.collectionId, input.userId, input.amount, soldAt, now]
  );
  await syncPurchaseFlag(input.clientId, input.collectionId, true, soldAt);

  const row = await db.getFirstAsync<any>('SELECT * FROM sales WHERE id = ?', [id]);
  return ROW_TO_SALE(row!);
}

export async function clearSale(clientId: string, collectionId: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    'DELETE FROM sales WHERE client_id = ? AND collection_id = ?',
    [clientId, collectionId]
  );
  await syncPurchaseFlag(clientId, collectionId, false, null);
}
