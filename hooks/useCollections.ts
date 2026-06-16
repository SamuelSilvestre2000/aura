import { useState, useEffect, useCallback } from 'react';
import { Collection } from '../types';
import { getDatabase, generateId } from '../services/database';

type UseCollectionsReturn = {
  collections: Collection[];
  loading: boolean;
  activeCollection: Collection | null;
  createCollection: (name: string) => Promise<Collection>;
  deleteCollection: (id: string) => Promise<void>;
  setActiveCollection: (id: string) => Promise<void>;
  refresh: () => Promise<void>;
};

export function useCollections(): UseCollectionsReturn {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const db = await getDatabase();
      const rows = await db.getAllAsync<Collection>(
        'SELECT id, name, created_at as createdAt, is_active as isActive FROM collections ORDER BY created_at DESC'
      );
      setCollections(rows);
    } catch (err) {
      console.error('[useCollections] Erro:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const createCollection = useCallback(async (name: string): Promise<Collection> => {
    const db = await getDatabase();
    const now = new Date().toISOString();
    const id = generateId('col');
    await db.runAsync(
      'INSERT INTO collections (id, name, created_at, is_active) VALUES (?, ?, ?, ?)',
      [id, name, now, 1]
    );
    const newCol: Collection = { id, name, createdAt: now, isActive: 1 };
    await load();
    return newCol;
  }, [load]);

  const deleteCollection = useCallback(async (id: string) => {
    const db = await getDatabase();
    await db.runAsync('DELETE FROM collections WHERE id = ?', [id]);
    await load();
  }, [load]);

  const setActiveCollection = useCallback(async (id: string) => {
    // Simplesmente selecionar por UI - não é persistido o estado "selected", usamos o primeiro como padrão
    // A seleção ativa é gerenciada no state da tela principal
    await load();
  }, [load]);

  const activeCollection = collections.length > 0 ? collections[0] : null;

  return {
    collections,
    loading,
    activeCollection,
    createCollection,
    deleteCollection,
    setActiveCollection,
    refresh: load,
  };
}
