import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { Purchase, Sale } from '../types';
import { getDatabase } from '../services/database';
import { clearSale, listSales, recordSale as recordSaleService } from '../services/sales';

type PurchasesContextValue = {
  purchases: Purchase[];
  sales: Sale[];
  loading: boolean;
  getPurchaseStatus: (clientId: string, collectionId: string) => boolean;
  getSaleForClientCollection: (clientId: string, collectionId: string) => Sale | undefined;
  getSalesTotalByCollection: (collectionId: string) => number;
  recordSale: (clientId: string, collectionId: string, userId: string, amount: number) => Promise<void>;
  clearSale: (clientId: string, collectionId: string) => Promise<void>;
  refresh: () => Promise<void>;
};

const PurchasesContext = createContext<PurchasesContextValue | null>(null);

export function PurchasesProvider({ children }: { children: React.ReactNode }) {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const db = await getDatabase();
      const purchaseRows = await db.getAllAsync<any>('SELECT * FROM purchases');
      setPurchases(
        purchaseRows.map((r) => ({
          id: r.id,
          clientId: r.client_id,
          collectionId: r.collection_id,
          purchased: r.purchased,
          purchasedAt: r.purchased_at || undefined,
        }))
      );
      setSales(await listSales());
    } catch (err) {
      console.error('[usePurchases] Erro:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const getPurchaseStatus = useCallback(
    (clientId: string, collectionId: string): boolean => {
      const p = purchases.find(
        (item) => item.clientId === clientId && item.collectionId === collectionId
      );
      return p?.purchased === 1;
    },
    [purchases]
  );

  const getSaleForClientCollection = useCallback(
    (clientId: string, collectionId: string): Sale | undefined =>
      sales.find((s) => s.clientId === clientId && s.collectionId === collectionId),
    [sales]
  );

  const getSalesTotalByCollection = useCallback(
    (collectionId: string): number =>
      sales
        .filter((s) => s.collectionId === collectionId)
        .reduce((sum, s) => sum + s.amount, 0),
    [sales]
  );

  const recordSale = useCallback(
    async (clientId: string, collectionId: string, userId: string, amount: number) => {
      await recordSaleService({ clientId, collectionId, userId, amount });
      await load();
    },
    [load]
  );

  const clearSaleHandler = useCallback(
    async (clientId: string, collectionId: string) => {
      await clearSale(clientId, collectionId);
      await load();
    },
    [load]
  );

  const value = useMemo(
    () => ({
      purchases,
      sales,
      loading,
      getPurchaseStatus,
      getSaleForClientCollection,
      getSalesTotalByCollection,
      recordSale,
      clearSale: clearSaleHandler,
      refresh: load,
    }),
    [
      purchases,
      sales,
      loading,
      getPurchaseStatus,
      getSaleForClientCollection,
      getSalesTotalByCollection,
      recordSale,
      clearSaleHandler,
      load,
    ]
  );

  return (
    <PurchasesContext.Provider value={value}>{children}</PurchasesContext.Provider>
  );
}

export function usePurchases(): PurchasesContextValue {
  const ctx = useContext(PurchasesContext);
  if (!ctx) {
    throw new Error('usePurchases deve ser usado dentro de PurchasesProvider');
  }
  return ctx;
}