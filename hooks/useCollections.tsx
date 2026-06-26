import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { Collection } from '../types';
import {
  listCollectionsForUser,
  createCollection as createCollectionService,
  deleteCollection as deleteCollectionService,
  CreateCollectionInput,
} from '../services/collections';
import { CategoryFilterValue } from '../utils/categoryFilter';
import { useAuth } from './useAuth';

type CollectionsContextValue = {
  collections: Collection[];
  loading: boolean;
  activeCollection: Collection | null;
  createCollection: (input: CreateCollectionInput) => Promise<Collection>;
  deleteCollection: (id: string) => Promise<void>;
  setActiveCollection: (id: string) => Promise<void>;
  refresh: (viewCategoryFilter?: CategoryFilterValue) => Promise<void>;
};

const CollectionsContext = createContext<CollectionsContextValue | null>(null);

export function CollectionsProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(
    async (viewCategoryFilter: CategoryFilterValue = 'all') => {
      if (!user) {
        setCollections([]);
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const data = await listCollectionsForUser(user.id, user.role, viewCategoryFilter);
        setCollections(data);
      } catch (err) {
        console.error('[useCollections] Erro:', err);
      } finally {
        setLoading(false);
      }
    },
    [user]
  );

  useEffect(() => {
    void load();
  }, [load]);

  const createCollection = useCallback(
    async (input: CreateCollectionInput): Promise<Collection> => {
      const newCol = await createCollectionService(input);
      await load();
      return newCol;
    },
    [load]
  );

  const deleteCollection = useCallback(
    async (id: string) => {
      await deleteCollectionService(id);
      await load();
    },
    [load]
  );

  const setActiveCollection = useCallback(async (_id: string) => {
    await load();
  }, [load]);

  const activeCollection = collections.length > 0 ? collections[0] : null;

  const value = useMemo(
    () => ({
      collections,
      loading,
      activeCollection,
      createCollection,
      deleteCollection,
      setActiveCollection,
      refresh: load,
    }),
    [
      collections,
      loading,
      activeCollection,
      createCollection,
      deleteCollection,
      setActiveCollection,
      load,
    ]
  );

  return (
    <CollectionsContext.Provider value={value}>{children}</CollectionsContext.Provider>
  );
}

export function useCollections(): CollectionsContextValue {
  const ctx = useContext(CollectionsContext);
  if (!ctx) {
    throw new Error('useCollections deve ser usado dentro de CollectionsProvider');
  }
  return ctx;
}
