import { useState, useEffect, useCallback } from 'react';
import { Client } from '../types';
import { getDatabase, generateId } from '../services/database';

type CreateClientData = Omit<Client, 'id' | 'createdAt' | 'state'>;
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

const ROW_TO_CLIENT = (row: any): Client => ({
  id: row.id,
  name: row.name,
  city: row.city,
  cityCode: row.city_code,
  state: row.state,
  address: row.address || '',
  lat: row.lat,
  lng: row.lng,
  phone: row.phone || undefined,
  notes: row.notes || undefined,
  createdAt: row.created_at,
});

export function useClients(): UseClientsReturn {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const db = await getDatabase();
      const rows = await db.getAllAsync<any>(
        'SELECT * FROM clients ORDER BY name ASC'
      );
      setClients(rows.map(ROW_TO_CLIENT));
    } catch (err) {
      console.error('[useClients] Erro:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const getClientsByCity = useCallback(
    (cityCode: string) => clients.filter((c) => c.cityCode === cityCode),
    [clients]
  );

  const createClient = useCallback(
    async (data: CreateClientData): Promise<Client> => {
      const db = await getDatabase();
      const now = new Date().toISOString();
      const id = generateId('cli');
      await db.runAsync(
        `INSERT INTO clients (id, name, city, city_code, state, address, lat, lng, phone, notes, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          data.name,
          data.city,
          data.cityCode,
          'PI',
          data.address,
          data.lat,
          data.lng,
          data.phone ?? null,
          data.notes ?? null,
          now,
        ]
      );
      const newClient: Client = { ...data, id, state: 'PI', createdAt: now };
      await load();
      return newClient;
    },
    [load]
  );

  const updateClient = useCallback(
    async (id: string, data: UpdateClientData) => {
      const db = await getDatabase();
      const fields: string[] = [];
      const values: any[] = [];
      if (data.name !== undefined) { fields.push('name = ?'); values.push(data.name); }
      if (data.city !== undefined) { fields.push('city = ?'); values.push(data.city); }
      if (data.cityCode !== undefined) { fields.push('city_code = ?'); values.push(data.cityCode); }
      if (data.address !== undefined) { fields.push('address = ?'); values.push(data.address); }
      if (data.lat !== undefined) { fields.push('lat = ?'); values.push(data.lat); }
      if (data.lng !== undefined) { fields.push('lng = ?'); values.push(data.lng); }
      if (data.phone !== undefined) { fields.push('phone = ?'); values.push(data.phone); }
      if (data.notes !== undefined) { fields.push('notes = ?'); values.push(data.notes); }
      values.push(id);
      if (fields.length > 0) {
        await db.runAsync(`UPDATE clients SET ${fields.join(', ')} WHERE id = ?`, values);
        await load();
      }
    },
    [load]
  );

  const deleteClient = useCallback(async (id: string) => {
    const db = await getDatabase();
    await db.runAsync('DELETE FROM clients WHERE id = ?', [id]);
    await load();
  }, [load]);

  return { clients, loading, getClientsByCity, createClient, updateClient, deleteClient, refresh: load };
}
