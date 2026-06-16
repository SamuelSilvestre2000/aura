import { useState, useEffect, useCallback } from 'react';
import { Purchase } from '../types';
import { getDatabase, generateId } from '../services/database';

type UsePurchasesReturn = {
  purchases: Purchase[];
  loading: boolean;
  togglePurchase: (clientId: string, collectionId: string) => Promise<void>;
  getPurchaseStatus: (clientId: string, collectionId: string) => boolean;
  getPurchasesByCollection: (collectionId: string) => Purchase[];
  refresh: () => Promise<void>;
};

export function usePurchases(): UsePurchasesReturn {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const db = await getDatabase();
      const rows = await db.getAllAsync<any>('SELECT * FROM purchases');
      setPurchases(
        rows.map((r) => ({
          id: r.id,
          clientId: r.client_id,
          collectionId: r.collection_id,
          purchased: r.purchased,
          purchasedAt: r.purchased_at || undefined,
        }))
      );
    } catch (err) {
      console.error('[usePurchases] Erro:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const togglePurchase = useCallback(
    async (clientId: string, collectionId: string) => {
      const db = await getDatabase();
      const existing = purchases.find(
        (p) => p.clientId === clientId && p.collectionId === collectionId
      );

      if (existing) {
        const newValue = existing.purchased === 1 ? 0 : 1;
        const now = newValue === 1 ? new Date().toISOString() : null;
        await db.runAsync(
          'UPDATE purchases SET purchased = ?, purchased_at = ? WHERE id = ?',
          [newValue, now, existing.id]
        );
      } else {
        // Criar novo registro de compra
        const id = generateId('pur');
        const now = new Date().toISOString();
        await db.runAsync(
          'INSERT INTO purchases (id, client_id, collection_id, purchased, purchased_at) VALUES (?, ?, ?, ?, ?)',
          [id, clientId, collectionId, 1, now]
        );
      }
      await load();
    },
    [purchases, load]
  );

  const getPurchaseStatus = useCallback(
    (clientId: string, collectionId: string): boolean => {
      const p = purchases.find(
        (p) => p.clientId === clientId && p.collectionId === collectionId
      );
      return p?.purchased === 1;
    },
    [purchases]
  );

  const getPurchasesByCollection = useCallback(
    (collectionId: string) => purchases.filter((p) => p.collectionId === collectionId),
    [purchases]
  );

  return {
    purchases,
    loading,
    togglePurchase,
    getPurchaseStatus,
    getPurchasesByCollection,
    refresh: load,
  };
}
