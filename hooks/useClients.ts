import { useState, useEffect, useCallback } from 'react';
import { Client } from '../types';
import {
  listClientsForUser,
  createClient as createClientService,
  updateClient as updateClientService,
  deleteClient as deleteClientService,
} from '../services/clients';
import { useAuth } from './useAuth';

type CreateClientData = Omit<Client, 'id' | 'createdAt' | 'state' | 'organizationId' | 'categoryIds'> & {
  categoryIds?: string[];
};

type UpdateClientData = Partial<Omit<Client, 'id' | 'createdAt'>>;

type UseClientsReturn = {
  clients: Client[];
  loading: boolean;
  getClientsByCity: (cityCode: string) => Client[];
  createClient: (data: CreateClientData) => Promise<Client>;
  updateClient: (id: string, data: UpdateClientData) => Promise<void>;
  deleteClient: (id: string) => Promise<void>;
  refresh: () => Promise<void>;
};

export function useClients(): UseClientsReturn {
  const { user } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) {
      setClients([]);
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const data = await listClientsForUser(user.id, user.role);
      setClients(data);
    } catch (err) {
      console.error('[useClients] Erro:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  const getClientsByCity = useCallback(
    (cityCode: string) => clients.filter((c) => c.cityCode === cityCode),
    [clients]
  );

  const createClient = useCallback(
    async (data: CreateClientData): Promise<Client> => {
      const actor = user ? { userId: user.id, role: user.role } : undefined;
      const newClient = await createClientService(data, actor);
      await load();
      return newClient;
    },
    [load, user]
  );

  const updateClient = useCallback(
    async (id: string, data: UpdateClientData) => {
      const actor = user ? { userId: user.id, role: user.role } : undefined;
      await updateClientService(id, data, actor);
      await load();
    },
    [load, user]
  );

  const deleteClient = useCallback(async (id: string) => {
    await deleteClientService(id);
    await load();
  }, [load]);

  return { clients, loading, getClientsByCity, createClient, updateClient, deleteClient, refresh: load };
}
